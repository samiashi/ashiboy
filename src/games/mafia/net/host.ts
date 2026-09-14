import Peer, { type DataConnection } from 'peerjs';
import { createLobby, reduce, viewFor } from '@/games/mafia/engine/engine';
import {
  Action,
  ClientMessage,
  GameState,
  HostMessage,
  PlayerView,
} from '@/games/mafia/engine/types';
import { randomId, randomToken } from '@/shared/ids';

export { makeRoomCode } from '@/shared/ids';

/**
 * PeerJS id namespace for this game. Keeps room codes unique per site+game
 * on the public PeerJS cloud (future games get their own prefix).
 */
const PEER_PREFIX = 'ashiboy-mafia-';

/** Attaches the sender's player id to a wire message. Returns null for 'join' (host is already in). */
export function toAction(playerId: string, msg: ClientMessage): Action | null {
  if (!msg || typeof msg !== 'object' || typeof (msg as { t?: unknown }).t !== 'string') {
    return null;
  }
  switch (msg.t) {
    case 'join':
      return null;
    case 'setConfig':
      if (!msg.config || typeof msg.config !== 'object') return null;
      return { t: 'setConfig', id: playerId, config: msg.config };
    case 'start':
      return { t: 'start', id: playerId };
    case 'ackRole':
      return { t: 'ackRole', id: playerId };
    case 'nightAct':
      if (typeof msg.targetId !== 'string') return null;
      return { t: 'nightAct', id: playerId, targetId: msg.targetId };
    case 'advance':
      return { t: 'advance', id: playerId };
    case 'extendDiscussion':
      return { t: 'extendDiscussion', id: playerId };
    case 'skipNight':
      return { t: 'skipNight', id: playerId };
    case 'closeVote':
      return { t: 'closeVote', id: playerId };
    case 'remove':
      if (typeof msg.targetId !== 'string') return null;
      return { t: 'remove', id: playerId, targetId: msg.targetId };
    case 'vote':
      if (msg.targetId !== null && typeof msg.targetId !== 'string') return null;
      return { t: 'vote', id: playerId, targetId: msg.targetId };
    case 'playAgain':
      return { t: 'playAgain', id: playerId };
    default:
      return null;
  }
}

/** Sent to a device right before its ejected connection is closed. */
export const REMOVED_MESSAGE = 'You were removed from the game.';

/**
 * The authoritative game session, running on the host player's device.
 * Owns the full GameState (including everyone's secret roles), applies all
 * actions through the engine, and publishes a personalized PlayerView to
 * each connected device — never the raw state.
 *
 * Note: since the host device holds all secrets, a curious host could peek
 * via devtools. Accepted trade-off for a serverless party game.
 */
export class GameHost {
  readonly code: string;
  private readonly hostId: string;
  private peer: Peer;
  private state: GameState;
  private conns = new Map<string, DataConnection>();
  private destroyed = false;
  private timer?: number;

  constructor(
    code: string,
    hostName: string,
    hostAvatar: string,
    private onView: (view: PlayerView) => void,
    private onError: (message: string) => void,
  ) {
    this.code = code;
    this.hostId = randomId();
    this.state = createLobby(this.hostId, hostName, hostAvatar, randomToken());

    this.peer = new Peer(PEER_PREFIX + code);
    this.peer.on('open', () => this.publish());
    this.peer.on('connection', (conn) => this.handleConnection(conn));
    this.peer.on('error', (err: { type?: string }) => {
      if (err?.type === 'unavailable-id')
        this.onError('That room code is taken — try creating again.');
      else this.onError(`Network error (${err?.type ?? 'unknown'}). Check your connection.`);
    });
    // Host-side timer enforcement: advance expired discussions even when
    // every guest tab is backgrounded.
    this.timer = window.setInterval(() => {
      if (this.destroyed) return;
      if (
        this.state.phase === 'discussion' &&
        this.state.discussionEndsAt !== undefined &&
        Date.now() >= this.state.discussionEndsAt
      ) {
        this.dispatch({ t: 'advance', id: this.hostId });
      }
    }, 1000);
  }

  /** Entry point for the host's own UI. */
  send(msg: ClientMessage): void {
    const action = toAction(this.hostId, msg);
    if (action) this.dispatch(action);
  }

  private dispatch(action: Action): void {
    if (this.destroyed) return;
    this.state = reduce(this.state, action);
    if (action.t === 'remove') {
      // Tell the ejected device why it's going, then revoke its connection.
      // Removed from the map first so its close handler no-ops via the
      // ownership check in drop().
      const conn = this.conns.get(action.targetId);
      if (conn) {
        this.conns.delete(action.targetId);
        try {
          conn.send({ t: 'error', message: REMOVED_MESSAGE } satisfies HostMessage);
        } catch {
          /* already gone */
        }
        try {
          conn.close();
        } catch {
          /* already gone */
        }
      }
    }
    this.publish();
  }

  private handleConnection(conn: DataConnection): void {
    let playerId: string | undefined;

    conn.on('data', (raw) => {
      const msg = raw as ClientMessage;
      if (!msg || typeof msg !== 'object') return;

      if (msg.t === 'join') {
        // Rejoin attempt: reclaim an existing seat (verified by secret token).
        if (msg.rejoin) {
          const targetId = msg.rejoin!.playerId;
          // Same socket switching seats would orphan the old seat as a
          // forever-connected ghost — release it first.
          if (playerId !== undefined && playerId !== targetId) {
            if (this.conns.get(playerId) === conn) {
              this.conns.delete(playerId);
              this.dispatch({ t: 'disconnect', id: playerId });
            }
          }
          const seat = this.state.players.find((p) => p.id === msg.rejoin!.playerId);
          if (!seat || seat.token !== msg.rejoin.token) {
            conn.send({ t: 'error', message: 'rejoin-failed' } satisfies HostMessage);
            return;
          }
          playerId = seat.id;
          const prev = this.conns.get(playerId);
          this.conns.set(playerId, conn);
          if (prev && prev !== conn) {
            // A stale tab still holds this seat — revoke it so only the new
            // connection can act. (Its close handler no-ops thanks to the
            // ownership check in drop().)
            try {
              prev.close();
            } catch {
              /* already gone */
            }
          }
          this.dispatch({ t: 'rejoin', id: playerId, token: msg.rejoin.token });
          conn.send({ t: 'welcome', playerId, token: seat.token } satisfies HostMessage);
          return;
        }
        if (this.state.phase !== 'lobby') {
          conn.send({
            t: 'error',
            message: 'That game has already started.',
          } satisfies HostMessage);
          return;
        }
        // One socket = one seat. A second fresh join on the same connection
        // (crafted client / double-tap) would orphan the first seat as a ghost.
        if (playerId !== undefined) return;
        playerId = randomId();
        const token = randomToken();
        this.conns.set(playerId, conn);
        const before = this.state.players.length;
        this.dispatch({
          t: 'join',
          id: playerId,
          name: String(msg.name ?? '').slice(0, 20),
          avatar: String(msg.avatar ?? '').slice(0, 8),
          token,
        });
        // The engine can still reject (full room, duplicate id) — don't hand
        // out a welcome for a seat that doesn't exist.
        const landed = this.state.players.some((p) => p.id === playerId);
        if (!landed || this.state.players.length === before) {
          this.conns.delete(playerId);
          conn.send({ t: 'error', message: 'Room is full.' } satisfies HostMessage);
          playerId = undefined;
          return;
        }
        conn.send({ t: 'welcome', playerId, token } satisfies HostMessage);
        return;
      }

      if (!playerId) return; // must join first
      try {
        const action = toAction(playerId, msg);
        if (action) this.dispatch(action);
      } catch {
        // Malformed wire input must never take down the host.
      }
    });

    const drop = () => {
      if (!playerId) return;
      // Only drop if this connection still owns the seat — a rejoin may have
      // rebound the seat to a newer connection already.
      if (this.conns.get(playerId) === conn) {
        this.conns.delete(playerId);
        this.dispatch({ t: 'disconnect', id: playerId });
      }
      playerId = undefined;
    };
    conn.on('close', drop);
    conn.on('error', drop);
  }

  private publish(): void {
    for (const p of this.state.players) {
      if (!p.connected) continue;
      let view: PlayerView;
      try {
        view = viewFor(this.state, p.id);
      } catch {
        continue;
      }
      if (p.id === this.hostId) {
        try {
          this.onView(view);
        } catch {
          /* host view handler must never break the broadcast */
        }
      } else {
        try {
          this.conns.get(p.id)?.send({ t: 'state', view } satisfies HostMessage);
        } catch {
          /* one dead guest must not strand the rest of the table */
        }
      }
    }
  }

  destroy(): void {
    this.destroyed = true;
    window.clearInterval(this.timer);
    this.peer.destroy();
  }
}
