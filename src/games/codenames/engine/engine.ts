import { WORDS } from '@/games/codenames/engine/words';
import {
  Action,
  BoardCard,
  CardKind,
  GameConfig,
  GameState,
  Player,
  PlayerView,
  Team,
} from '@/games/codenames/engine/types';

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 20;
export const BOARD_SIZE = 25;
export const EXTEND_MS = 60_000;

export type Rng = () => number;

const otherTeam = (t: Team): Team => (t === 'red' ? 'blue' : 'red');

export function suggestConfig(): GameConfig {
  return { turnSeconds: 180 };
}

export function createLobby(
  hostId: string,
  hostName: string,
  avatar: string,
  token: string,
): GameState {
  return {
    phase: 'lobby',
    players: [makePlayer(hostId, hostName, avatar, token, true)],
    config: suggestConfig(),
    cards: [],
    startingTeam: null,
    turn: { team: 'red', clue: null, guessesMade: 0 },
    clues: [],
  };
}

function makePlayer(
  id: string,
  name: string,
  avatar: string,
  token: string,
  isHost: boolean,
): Player {
  return {
    id,
    name: name.trim().slice(0, 20),
    avatar: avatar || '🎭',
    token,
    team: null,
    isSpymaster: false,
    isHost,
    connected: true,
  };
}

function findPlayer(state: GameState, id: string): Player | undefined {
  return state.players.find((p) => p.id === id);
}

/** Samples 25 words and assigns 9 / 8 / 7 / 1 per the official key counts. */
export function dealBoard(words: string[], startingTeam: Team, rng: Rng): BoardCard[] {
  const pool = [...words];
  for (let i = 0; i < BOARD_SIZE; i++) {
    const j = i + Math.floor(rng() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const other = otherTeam(startingTeam);
  const kinds: CardKind[] = [];
  for (let i = 0; i < 9; i++) kinds.push(startingTeam);
  for (let i = 0; i < 8; i++) kinds.push(other);
  for (let i = 0; i < 7; i++) kinds.push('bystander');
  kinds.push('assassin');
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }
  return pool.slice(0, BOARD_SIZE).map((word, i) => ({ word, kind: kinds[i], revealed: false }));
}

function teamComplete(cards: BoardCard[], team: Team): boolean {
  return cards.filter((c) => c.kind === team).every((c) => c.revealed);
}

/** How many guesses this turn allows (null = unlimited). */
export function guessLimit(clue: { number: number | 'unlimited' } | null): number | null {
  if (!clue || clue.number === 'unlimited') return null;
  if (clue.number <= 0) return null; // a 0 clue means unlimited
  return clue.number + 1; // the official plus-one rule
}

function passTurn(state: GameState, now: number): GameState {
  const next = otherTeam(state.turn.team);
  return {
    ...state,
    phase: 'clue',
    turn: { team: next, clue: null, guessesMade: 0 },
    turnEndsAt: state.config.turnSeconds > 0 ? now + state.config.turnSeconds * 1000 : undefined,
  };
}

/**
 * The single state transition function. Pure and deterministic for a given
 * (action, rng, now); the host device is the only place it runs.
 */
export function reduce(
  state: GameState,
  action: Action,
  rng: Rng = Math.random,
  now: number = Date.now(),
): GameState {
  switch (action.t) {
    case 'join': {
      if (state.phase !== 'lobby' || state.players.length >= MAX_PLAYERS) return state;
      let name = action.name.trim().slice(0, 20) || `Player ${state.players.length + 1}`;
      let suffix = 2;
      while (state.players.some((p) => p.name === name))
        name = `${action.name.trim().slice(0, 20)} ${suffix++}`;
      return {
        ...state,
        players: [
          ...state.players,
          makePlayer(action.id, name, action.avatar, action.token, false),
        ],
      };
    }

    case 'rejoin': {
      const me = findPlayer(state, action.id);
      if (!me || me.token !== action.token || me.connected) return state;
      return {
        ...state,
        players: state.players.map((p) => (p.id === action.id ? { ...p, connected: true } : p)),
      };
    }

    case 'remove': {
      const me = findPlayer(state, action.id);
      const target = findPlayer(state, action.targetId);
      if (!me?.isHost || !target || target.isHost) return state;
      if (state.phase === 'lobby') {
        return { ...state, players: state.players.filter((p) => p.id !== target.id) };
      }
      return {
        ...state,
        players: state.players.map((p) => (p.id === target.id ? { ...p, connected: false } : p)),
      };
    }

    case 'disconnect': {
      if (state.phase === 'lobby') {
        return { ...state, players: state.players.filter((p) => p.id !== action.id) };
      }
      return {
        ...state,
        players: state.players.map((p) => (p.id === action.id ? { ...p, connected: false } : p)),
      };
    }

    case 'setTeam': {
      if (state.phase !== 'lobby') return state;
      const me = findPlayer(state, action.id);
      const target = findPlayer(state, action.targetId);
      if (!me || !target) return state;
      if (action.id !== action.targetId && !me.isHost) return state; // own seat, or host moves anyone
      if (action.team !== null && action.team !== 'red' && action.team !== 'blue') return state;
      return {
        ...state,
        players: state.players.map((p) => (p.id === target.id ? { ...p, team: action.team } : p)),
      };
    }

    case 'setSpymaster': {
      if (state.phase !== 'lobby') return state;
      const me = findPlayer(state, action.id);
      const target = findPlayer(state, action.targetId);
      if (!me || !target) return state;
      if (action.id !== action.targetId && !me.isHost) return state;
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === target.id ? { ...p, isSpymaster: !!action.value } : p,
        ),
      };
    }

    case 'randomize': {
      const me = findPlayer(state, action.id);
      if (!me?.isHost || state.phase !== 'lobby') return state;
      const order = [...state.players];
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      const ids = new Set(order.slice(0, Math.ceil(order.length / 2)).map((p) => p.id));
      return {
        ...state,
        // Even split, spymasters cleared so both sides re-star cleanly.
        players: state.players.map((p) => ({
          ...p,
          team: ids.has(p.id) ? ('red' as Team) : ('blue' as Team),
          isSpymaster: false,
        })),
      };
    }

    case 'setConfig': {
      const me = findPlayer(state, action.id);
      if (!me?.isHost || state.phase !== 'lobby') return state;
      return {
        ...state,
        config: {
          turnSeconds: Math.max(0, Math.round(action.config.turnSeconds) || 0),
        },
      };
    }

    case 'start': {
      const me = findPlayer(state, action.id);
      if (!me?.isHost || state.phase !== 'lobby') return state;
      if (state.players.length < MIN_PLAYERS) return state;
      // Each side needs exactly one spymaster and at least one operative.
      for (const team of ['red', 'blue'] as Team[]) {
        const members = state.players.filter((p) => p.team === team);
        if (members.filter((p) => p.isSpymaster).length !== 1) return state;
        if (members.filter((p) => !p.isSpymaster).length < 1) return state;
      }
      const startingTeam: Team = rng() < 0.5 ? 'red' : 'blue';
      return {
        ...state,
        phase: 'clue',
        cards: dealBoard(WORDS, startingTeam, rng),
        startingTeam,
        turn: { team: startingTeam, clue: null, guessesMade: 0 },
        clues: [],
        turnEndsAt:
          state.config.turnSeconds > 0 ? now + state.config.turnSeconds * 1000 : undefined,
        winner: undefined,
      };
    }

    case 'giveClue': {
      if (state.phase !== 'clue') return state;
      const me = findPlayer(state, action.id);
      if (!me || !me.connected || !me.isSpymaster || me.team !== state.turn.team) return state;
      const word = action.word.trim().slice(0, 30);
      if (word.length === 0 || word.includes(' ')) return state; // one word only
      const count = action.number;
      if (typeof count === 'number' && (!Number.isInteger(count) || count < 0 || count > 9)) {
        return state;
      }
      const clue = { team: state.turn.team, word, number: count };
      return {
        ...state,
        phase: 'guessing',
        turn: { ...state.turn, clue, guessesMade: 0 },
        clues: [...state.clues, clue],
      };
    }

    case 'guess': {
      if (state.phase !== 'guessing') return state;
      const me = findPlayer(state, action.id);
      if (!me || !me.connected || me.isSpymaster || me.team !== state.turn.team) return state;
      const card = state.cards[action.cardIndex];
      if (!card || card.revealed || !state.turn.clue) return state;

      const cards = state.cards.map((c, i) =>
        i === action.cardIndex ? { ...c, revealed: true } : c,
      );
      const team = state.turn.team;
      const other = otherTeam(team);

      if (card.kind === 'assassin') {
        return { ...state, cards, winner: other, phase: 'gameOver', turnEndsAt: undefined };
      }
      if (teamComplete(cards, team)) {
        return { ...state, cards, winner: team, phase: 'gameOver', turnEndsAt: undefined };
      }
      // Gifting the opponent their last word wins it for them — even mid-turn.
      if (teamComplete(cards, other)) {
        return { ...state, cards, winner: other, phase: 'gameOver', turnEndsAt: undefined };
      }
      if (card.kind === team) {
        const guessesMade = state.turn.guessesMade + 1;
        const limit = guessLimit(state.turn.clue);
        const next = { ...state, cards, turn: { ...state.turn, guessesMade } };
        return limit !== null && guessesMade >= limit ? passTurn(next, now) : next;
      }
      return passTurn({ ...state, cards }, now);
    }

    case 'endTurn': {
      if (state.phase !== 'guessing') return state;
      const me = findPlayer(state, action.id);
      if (!me || !me.connected || me.isSpymaster || me.team !== state.turn.team) return state;
      if (state.turn.guessesMade < 1) return state; // at least one guess is mandatory
      return passTurn(state, now);
    }

    case 'passTurn': {
      if (state.phase !== 'clue' && state.phase !== 'guessing') return state;
      const me = findPlayer(state, action.id);
      if (!me) return state;
      // The host may pass anytime; anyone may pass once the timer expires.
      const expired = state.turnEndsAt !== undefined && now >= state.turnEndsAt;
      if (!me.isHost && !expired) return state;
      return passTurn(state, now);
    }

    case 'extendTurn': {
      const me = findPlayer(state, action.id);
      if (!me?.isHost) return state;
      if (
        (state.phase !== 'clue' && state.phase !== 'guessing') ||
        state.turnEndsAt === undefined
      ) {
        return state;
      }
      return { ...state, turnEndsAt: state.turnEndsAt + EXTEND_MS };
    }

    case 'playAgain': {
      const me = findPlayer(state, action.id);
      if (!me?.isHost || state.phase !== 'gameOver') return state;
      return {
        ...state,
        phase: 'lobby',
        cards: [],
        startingTeam: null,
        turn: { team: 'red', clue: null, guessesMade: 0 },
        clues: [],
        turnEndsAt: undefined,
        winner: undefined,
      };
    }
  }
}

/**
 * Builds the per-device view of the state. This is the privacy boundary:
 * card kinds are only included once revealed — or always for spymasters
 * (the key). Never send raw GameState to clients.
 */
export function viewFor(state: GameState, playerId: string): PlayerView {
  const me = findPlayer(state, playerId);
  if (!me) throw new Error(`unknown player: ${playerId}`);

  const view: PlayerView = {
    phase: state.phase,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      team: p.team,
      isSpymaster: p.isSpymaster,
      isHost: p.isHost,
      connected: p.connected,
    })),
    me: {
      id: me.id,
      name: me.name,
      avatar: me.avatar,
      team: me.team,
      isSpymaster: me.isSpymaster,
      isHost: me.isHost,
    },
  };

  if (state.phase === 'lobby') {
    view.config = state.config;
    return view;
  }

  // Spymasters always see the key; everyone sees it once the game is over.
  const showKinds = me.isSpymaster || state.phase === 'gameOver';
  view.cards = state.cards.map((c) => ({
    word: c.word,
    revealed: c.revealed,
    ...(c.revealed || showKinds ? { kind: c.kind } : {}),
  }));

  if (state.phase === 'clue' || state.phase === 'guessing') {
    const limit = guessLimit(state.turn.clue);
    view.turn = {
      team: state.turn.team,
      clue: state.turn.clue,
      guessesMade: state.turn.guessesMade,
      guessesLeft:
        state.turn.clue === null || limit === null
          ? null
          : Math.max(0, limit - state.turn.guessesMade),
    };
    view.clues = state.clues;
    view.startingTeam = state.startingTeam;
    if (state.turnEndsAt !== undefined) {
      view.turnEndsAt = state.turnEndsAt;
      view.turnDurationSec = state.config.turnSeconds;
    }
  }

  if (state.phase === 'gameOver') {
    view.winner = state.winner;
    view.clues = state.clues;
    view.startingTeam = state.startingTeam;
  }

  view.remaining = {
    red: state.cards.filter((c) => c.kind === 'red' && !c.revealed).length,
    blue: state.cards.filter((c) => c.kind === 'blue' && !c.revealed).length,
  };

  return view;
}
