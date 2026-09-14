import Peer, { type DataConnection } from 'peerjs';
import { ClientMessage, HostMessage, PlayerView } from '@/games/mafia/engine/types';
import { clearSession, saveSession } from '@/games/mafia/net/persistence';

const PEER_PREFIX = 'ashiboy-mafia-';

export interface RejoinTicket {
  playerId: string;
  token: string;
}

/** Shown when a rejoin attempt proves the room no longer exists. */
export const ROOM_GONE_MESSAGE = 'That room is gone — ask the host for a new code.';

/**
 * A guest session. Connects to the host's peer, receives personalized
 * PlayerViews, and sends this player's actions. Holds no game logic.
 *
 * On a successful join, the seat (code + player id + rejoin token) is saved
 * to localStorage, so a player who closes their tab can reclaim their seat
 * later. If a rejoin is rejected (seat no longer exists — e.g. the game was
 * still in the lobby when they left), it falls back to a fresh join once.
 */
export class GameClient {
  private peer?: Peer;
  private conn?: DataConnection;
  private destroyed = false;
  private silent = false;
  private gen = 0;
  playerId?: string;

  constructor(
    private onView: (view: PlayerView) => void,
    private onError: (message: string) => void,
  ) {}

  join(code: string, name: string, avatar: string, rejoin?: RejoinTicket): void {
    const normalized = code.trim().toUpperCase();
    const myGen = ++this.gen;
    this.silent = false;
    this.peer = new Peer();
    this.peer.on('open', () => {
      if (myGen !== this.gen || this.destroyed) return;
      const conn = this.peer!.connect(PEER_PREFIX + normalized, { reliable: true });
      this.conn = conn;

      conn.on('open', () => {
        if (myGen !== this.gen) return;
        conn.send({ t: 'join', name, avatar, rejoin } satisfies ClientMessage);
      });
      conn.on('data', (raw) => {
        if (myGen !== this.gen) return;
        const msg = raw as HostMessage;
        if (!msg || typeof msg !== 'object') return;

        if (msg.t === 'welcome') {
          this.playerId = msg.playerId;
          saveSession({ code: normalized, playerId: msg.playerId, token: msg.token, name, avatar });
        } else if (msg.t === 'state') {
          this.onView(msg.view);
        } else if (msg.t === 'error') {
          if (msg.message === 'rejoin-failed' && rejoin) {
            // Seat is gone (e.g. left during lobby) — take a fresh seat instead.
            // Tear down the rejected connection first so it doesn't linger on the host.
            clearSession();
            const oldConn = this.conn;
            const oldPeer = this.peer;
            this.conn = undefined;
            this.peer = undefined;
            this.silent = true;
            try {
              oldConn?.close();
            } catch {
              /* already gone */
            }
            try {
              oldPeer?.destroy();
            } catch {
              /* already gone */
            }
            this.join(normalized, name, avatar);
            return;
          }
          if (
            msg.message === 'That game has already started.' ||
            msg.message === 'You were removed from the game.' ||
            msg.message === 'Room is full.'
          ) {
            // Our seat is dead — don't park a misleading rejoin card.
            clearSession();
          }
          this.onError(msg.message);
        }
      });
      conn.on('close', () => {
        if (myGen !== this.gen) return;
        if (!this.destroyed && !this.silent) this.onError('Lost connection to the host.');
      });
    });
    this.peer.on('error', (err: { type?: string }) => {
      if (err?.type === 'peer-unavailable') {
        if (rejoin) {
          // We were reclaiming a seat, so the room itself is gone (host left).
          // Drop the dead seat instead of parking the player on it.
          clearSession();
          this.onError(ROOM_GONE_MESSAGE);
        } else {
          this.onError('Room not found — check the code.');
        }
      } else {
        this.onError(`Network error (${err?.type ?? 'unknown'}). Check your connection.`);
      }
    });
  }

  send(msg: ClientMessage): void {
    this.conn?.send(msg);
  }

  destroy(): void {
    this.destroyed = true;
    this.peer?.destroy();
  }
}
