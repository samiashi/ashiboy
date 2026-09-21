import Peer, { type DataConnection } from 'peerjs';
import { createLobby, reduce, viewFor } from '@/games/codenames/engine/engine';
import {
  Action,
  ClientMessage,
  GameState,
  HostMessage,
  PlayerView,
} from '@/games/codenames/engine/types';
import { randomId, randomToken } from '@/shared/ids';

export { makeRoomCode } from '@/shared/ids';

/**
 * PeerJS id namespace for this game. Keeps room codes unique per site+game
 * on the public PeerJS cloud.
 */
const PEER_PREFIX = 'ashiboy-codenames-';

/** Attaches the sender's player id to a wire message. Returns null for 'join' (host is already in). */
export function toAction(playerId: string, msg: ClientMessage): Action | null {
  if (!msg || typeof msg !== 'object' || typeof (msg as { t?: unknown }).t !== 'string') {
    return null;
  }
  switch (msg.t) {
    case 'join':
      return null;
    case 'remove':
      if (typeof msg.targetId !== 'string') return null;
      return { t: 'remove', id: playerId, targetId: msg.targetId };
    case 'setTeam':
      if (typeof msg.targetId !== 'string') return null;
      if (msg.team !== null && msg.team !== 'red' && msg.team !== 'blue') return null;
      return { t: 'setTeam', id: playerId, targetId: msg.targetId, team: msg.team };
    case 'setSpymaster':
      if (typeof msg.targetId !== 'string' || typeof msg.value !== 'boolean') return null;
      return { t: 'setSpymaster', id: playerId, targetId: msg.targetId, value: msg.value };
    case 'randomize':
      return { t: 'randomize', id: playerId };
    case 'setConfig':
      if (!msg.config || typeof msg.config !== 'object') return null;
      return { t: 'setConfig', id: playerId, config: msg.config };
    case 'start':
      return { t: 'start', id: playerId };
    case 'giveClue':
      // Shape-checked here; value-checked in the engine. Never let raw peer
      // input reach .trim() unchecked.
      if (typeof msg.word !== 'string') return null;
      if (msg.number !== 'unlimited' && typeof msg.number !== 'number') return null;
      return { t: 'giveClue', id: playerId, word: msg.word, number: msg.number };
    case 'guess':
      if (!Number.isInteger(msg.cardIndex)) return null;
      return { t: 'guess', id: playerId, cardIndex: msg.cardIndex };
    case 'endTurn':
      return { t: 'endTurn', id: playerId };
    case 'passTurn':
      return { t: 'passTurn', id: playerId };
    case 'extendTurn':
      return { t: 'extendTurn', id: playerId };
    case 'playAgain':
      return { t: 'playAgain', id: playerId };
    case 'toLobby':
      return { t: 'toLobby', id: playerId };
    default:
      return null;
  }
}

/** Sent to a device right before its ejected connection is closed. */
export const REMOVED_MESSAGE = 'You were removed from the game.';

/**
 * The authoritative game session, running on the host player's device.
 * Owns the full GameState (including the unrevealed key), applies all
 * actions through the engine, and publishes a personalized PlayerView to
 * each connected device — never the raw state.
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
    // Host-side timer enforcement: pass expired turns even when guests stall.
    this.timer = window.setInterval(() => {
      if (this.destroyed) return;
      if (
        (this.state.phase === 'clue' || this.state.phase === 'guessing') &&
        this.state.turnEndsAt !== undefined &&
        Date.now() >= this.state.turnEndsAt
      ) {
        this.dispatch({ t: 'passTurn', id: this.hostId });
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
        // One socket = one seat — ignore a second fresh join on the same conn.
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
