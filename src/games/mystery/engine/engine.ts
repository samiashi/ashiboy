import { CASES, getCase } from '@/games/mystery/engine/cases';
import {
  Action,
  GameConfig,
  GameState,
  MysteryCase,
  Player,
  PlayerView,
} from '@/games/mystery/engine/types';

/** Solo-friendly: every action is any-player, so one detective is enough. */
export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 20;

export type Rng = () => number;

export function suggestConfig(): GameConfig {
  return { searchTokens: 6, pressureTokens: 3, accusationAttempts: 2, searchSeconds: 180 };
}

const clampInt = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof v === 'number' ? Math.round(v) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

function clampConfig(raw: GameConfig): GameConfig {
  const d = suggestConfig();
  return {
    searchTokens: clampInt(raw.searchTokens, 1, 12, d.searchTokens),
    pressureTokens: clampInt(raw.pressureTokens, 1, 6, d.pressureTokens),
    accusationAttempts: clampInt(raw.accusationAttempts, 1, 3, d.accusationAttempts),
    searchSeconds: clampInt(raw.searchSeconds, 0, 600, d.searchSeconds),
  };
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
    caseId: null,
    solution: null,
    suspectOrder: [],
    locationOrder: [],
    locationsSearched: [],
    cluesFound: [],
    secretsRevealed: [],
    searchLeft: 0,
    pressureLeft: 0,
    attemptsLeft: 0,
    attempts: [],
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
    avatar: avatar.slice(0, 8) || '🎭',
    token,
    isHost,
    connected: true,
  };
}

/** Shared join-name normalization: fallback, dedup, and 20-char cap. */
function uniqueName(rawName: string, players: Player[]): string {
  const base = rawName.trim().slice(0, 20) || `Player ${players.length + 1}`;
  let name = base;
  let suffix = 2;
  // Slice the base (not the suffixed name) so the counter is never cut off.
  // Without this a 20-char base loops forever on duplicates.
  let guard = 0;
  while (players.some((p) => p.name === name)) {
    const tail = ` ${suffix++}`;
    name = `${base.slice(0, Math.max(0, 20 - tail.length))}${tail}`;
    if (++guard > 1000) return `${base.slice(0, 12)}-${Date.now().toString(36)}`;
  }
  return name;
}

function findPlayer(state: GameState, id: string): Player | undefined {
  return state.players.find((p) => p.id === id);
}

/** Fisher-Yates order shuffle — display order only, deterministic per rng. */
function shuffled(ids: string[], rng: Rng): string[] {
  const order = [...ids];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function requireCase(state: GameState): MysteryCase | null {
  if (state.caseId === null) return null;
  return getCase(state.caseId) ?? null;
}

/** 1–3 stars: first-verdict bonus + unspent-token bonus. */
function rateStars(firstTry: boolean, resourcesLeft: number): 1 | 2 | 3 {
  const stars = 1 + (firstTry ? 1 : 0) + (resourcesLeft >= 3 ? 1 : 0);
  return Math.min(3, Math.max(1, stars)) as 1 | 2 | 3;
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
      if (findPlayer(state, action.id)) return state;
      const name = uniqueName(action.name, state.players);
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
      if (!me?.isHost || !me.connected || !target || target.isHost) return state;
      if (state.phase === 'lobby') {
        return { ...state, players: state.players.filter((p) => p.id !== target.id) };
      }
      // Mid-game ejection revokes the token so the seat can't be reclaimed.
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === target.id ? { ...p, connected: false, token: `removed-${p.id}` } : p,
        ),
      };
    }

    case 'disconnect': {
      const leaving = findPlayer(state, action.id);
      if (!leaving) return state;
      if (state.phase === 'lobby') {
        if (leaving.isHost) return state;
        return { ...state, players: state.players.filter((p) => p.id !== action.id) };
      }
      return {
        ...state,
        players: state.players.map((p) => (p.id === action.id ? { ...p, connected: false } : p)),
      };
    }

    case 'setConfig': {
      const me = findPlayer(state, action.id);
      if (!me?.isHost || !me.connected || state.phase !== 'lobby') return state;
      return { ...state, config: clampConfig(action.config) };
    }

    case 'start': {
      const me = findPlayer(state, action.id);
      if (!me?.isHost || !me.connected || state.phase !== 'lobby') return state;
      if (state.players.length < MIN_PLAYERS) return state;
      const c = getCase(action.caseId);
      if (!c) return state;
      return {
        ...state,
        phase: 'briefing',
        caseId: c.id,
        solution: { ...c.solution },
        suspectOrder: shuffled(
          c.suspects.map((s) => s.id),
          rng,
        ),
        locationOrder: shuffled(
          c.locations.map((l) => l.id),
          rng,
        ),
        locationsSearched: [],
        cluesFound: [],
        secretsRevealed: [],
        searchLeft: state.config.searchTokens,
        pressureLeft: state.config.pressureTokens,
        attemptsLeft: state.config.accusationAttempts,
        attempts: [],
        winner: undefined,
        stars: undefined,
        searchEndsAt: undefined,
      };
    }

    case 'advance': {
      const me = findPlayer(state, action.id);
      if (!me?.isHost || !me.connected) return state;
      if (state.phase === 'briefing') {
        return {
          ...state,
          phase: 'search',
          searchEndsAt:
            state.config.searchSeconds > 0 ? now + state.config.searchSeconds * 1000 : undefined,
        };
      }
      if (state.phase === 'search') return { ...state, phase: 'alibis', searchEndsAt: undefined };
      if (state.phase === 'alibis')
        return { ...state, phase: 'accusation', searchEndsAt: undefined };
      return state;
    }

    case 'search': {
      if (state.phase !== 'search') return state;
      const me = findPlayer(state, action.id);
      if (!me || !me.connected) return state;
      const c = requireCase(state);
      if (!c || !state.solution) return state;
      const loc = c.locations.find((l) => l.id === action.locationId);
      if (!loc || state.locationsSearched.includes(loc.id)) return state;
      // Locked rooms cost nothing until their key clue is found.
      if (loc.lockedByClueId && !state.cluesFound.includes(loc.lockedByClueId)) return state;
      if (state.searchLeft <= 0) return state;
      const fresh = c.clues
        .filter((clue) => clue.locationId === loc.id && !state.cluesFound.includes(clue.id))
        .map((clue) => clue.id);
      const next: GameState = {
        ...state,
        locationsSearched: [...state.locationsSearched, loc.id],
        cluesFound: [...state.cluesFound, ...fresh],
        searchLeft: state.searchLeft - 1,
      };
      const exhausted = next.searchLeft <= 0;
      const everythingSearched = c.locations.every((l) => next.locationsSearched.includes(l.id));
      return exhausted || everythingSearched
        ? { ...next, phase: 'alibis', searchEndsAt: undefined }
        : next;
    }

    case 'press': {
      if (state.phase !== 'alibis') return state;
      const me = findPlayer(state, action.id);
      if (!me || !me.connected) return state;
      const c = requireCase(state);
      if (!c || !state.solution) return state;
      if (!c.suspects.some((s) => s.id === action.suspectId)) return state;
      if (state.secretsRevealed.includes(action.suspectId)) return state;
      if (state.pressureLeft <= 0) return state;
      const next: GameState = {
        ...state,
        secretsRevealed: [...state.secretsRevealed, action.suspectId],
        pressureLeft: state.pressureLeft - 1,
      };
      const exhausted = next.pressureLeft <= 0;
      const everyonePressed = c.suspects.every((s) => next.secretsRevealed.includes(s.id));
      return exhausted || everyonePressed ? { ...next, phase: 'accusation' } : next;
    }

    case 'accuse': {
      if (state.phase !== 'accusation') return state;
      const me = findPlayer(state, action.id);
      if (!me || !me.connected) return state;
      const c = requireCase(state);
      if (!c || !state.solution) return state;
      if (state.attemptsLeft <= 0) return state;
      if (!c.suspects.some((s) => s.id === action.suspectId)) return state;
      if (!c.weapons.some((w) => w.id === action.weaponId)) return state;
      if (!c.locations.some((l) => l.id === action.locationId)) return state;
      const correct =
        action.suspectId === state.solution.suspectId &&
        action.weaponId === state.solution.weaponId &&
        action.locationId === state.solution.locationId;
      const attempts = [
        ...state.attempts,
        {
          playerId: me.id,
          playerName: me.name,
          suspectId: action.suspectId,
          weaponId: action.weaponId,
          locationId: action.locationId,
          correct,
        },
      ];
      if (correct) {
        return {
          ...state,
          attempts,
          phase: 'gameOver',
          winner: 'solved',
          stars: rateStars(attempts.length === 1, state.searchLeft + state.pressureLeft),
        };
      }
      const attemptsLeft = state.attemptsLeft - 1;
      return attemptsLeft <= 0
        ? { ...state, attempts, attemptsLeft, phase: 'gameOver', winner: 'unsolved' }
        : { ...state, attempts, attemptsLeft };
    }

    case 'playAgain': {
      const me = findPlayer(state, action.id);
      if (!me?.isHost || !me.connected || state.phase !== 'gameOver') return state;
      // One-tap rematch: same case, fresh tokens, back to the briefing.
      // Use "Back to lobby" (toLobby) to switch cases.
      const c = state.caseId ? getCase(state.caseId) : undefined;
      if (!c) {
        return {
          ...state,
          phase: 'lobby',
          caseId: null,
          solution: null,
          suspectOrder: [],
          locationOrder: [],
          locationsSearched: [],
          cluesFound: [],
          secretsRevealed: [],
          searchLeft: 0,
          pressureLeft: 0,
          attemptsLeft: 0,
          attempts: [],
          winner: undefined,
          stars: undefined,
          searchEndsAt: undefined,
        };
      }
      return {
        ...state,
        phase: 'briefing',
        solution: { ...c.solution },
        suspectOrder: shuffled(
          c.suspects.map((s) => s.id),
          rng,
        ),
        locationOrder: shuffled(
          c.locations.map((l) => l.id),
          rng,
        ),
        locationsSearched: [],
        cluesFound: [],
        secretsRevealed: [],
        searchLeft: state.config.searchTokens,
        pressureLeft: state.config.pressureTokens,
        attemptsLeft: state.config.accusationAttempts,
        attempts: [],
        winner: undefined,
        stars: undefined,
        searchEndsAt: undefined,
      };
    }

    case 'toLobby': {
      const me = findPlayer(state, action.id);
      if (!me?.isHost || !me.connected || state.phase !== 'gameOver') return state;
      return {
        ...state,
        phase: 'lobby',
        caseId: null,
        solution: null,
        suspectOrder: [],
        locationOrder: [],
        locationsSearched: [],
        cluesFound: [],
        secretsRevealed: [],
        searchLeft: 0,
        pressureLeft: 0,
        attemptsLeft: 0,
        attempts: [],
        winner: undefined,
        stars: undefined,
        searchEndsAt: undefined,
      };
    }
  }
}

/**
 * Builds the per-device view of the state. This is the privacy boundary:
 * the sealed solution, unfound clue details, unrevealed secret texts, and
 * all rejoin tokens never leave the host. Never send raw GameState.
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
      isHost: p.isHost,
      connected: p.connected,
    })),
    me: { id: me.id, name: me.name, isHost: me.isHost },
  };

  if (state.phase === 'lobby') {
    view.config = state.config;
    view.cases = CASES.map((c) => ({ id: c.id, title: c.title, victim: c.victim }));
    return view;
  }

  const c = requireCase(state);
  if (!c) throw new Error('case missing for active game');

  view.caseTitle = c.title;
  view.victim = c.victim;
  view.brief = c.brief;

  const suspectById = new Map(c.suspects.map((s) => [s.id, s]));
  const secretBySuspect = new Map(c.secrets.map((s) => [s.suspectId, s.text]));
  const orderedSuspects = [
    ...state.suspectOrder.filter((id) => suspectById.has(id)),
    ...c.suspects.map((s) => s.id).filter((id) => !state.suspectOrder.includes(id)),
  ];
  view.suspects = orderedSuspects.map((id) => {
    const s = suspectById.get(id)!;
    const revealed = state.secretsRevealed.includes(id);
    return {
      id: s.id,
      name: s.name,
      role: s.role,
      bio: s.bio,
      alibi: s.alibi,
      secretRevealed: revealed,
      ...(revealed && secretBySuspect.has(id) ? { secret: secretBySuspect.get(id)! } : {}),
    };
  });

  const locationById = new Map(c.locations.map((l) => [l.id, l]));
  const orderedLocations = [
    ...state.locationOrder.filter((id) => locationById.has(id)),
    ...c.locations.map((l) => l.id).filter((id) => !state.locationOrder.includes(id)),
  ];
  view.locations = orderedLocations.map((id) => {
    const l = locationById.get(id)!;
    return {
      id: l.id,
      name: l.name,
      description: l.description,
      searched: state.locationsSearched.includes(id),
      locked: !!l.lockedByClueId && !state.cluesFound.includes(l.lockedByClueId),
    };
  });

  view.weapons = c.weapons.map((w) => ({ id: w.id, name: w.name }));
  view.clues = c.clues
    .filter((clue) => state.cluesFound.includes(clue.id))
    .map((clue) => ({
      id: clue.id,
      locationId: clue.locationId,
      title: clue.title,
      detail: clue.detail,
    }));
  view.searchLeft = state.searchLeft;
  view.pressureLeft = state.pressureLeft;
  view.attemptsLeft = state.attemptsLeft;
  view.attempts = state.attempts.map((a) => ({
    playerName: a.playerName,
    suspectId: a.suspectId,
    weaponId: a.weaponId,
    locationId: a.locationId,
    correct: a.correct,
  }));

  if (state.phase === 'search' && state.searchEndsAt !== undefined) {
    view.searchEndsAt = state.searchEndsAt;
    view.searchDurationSec = state.config.searchSeconds;
  }

  if (state.phase === 'gameOver') {
    view.winner = state.winner;
    view.stars = state.stars;
    if (state.solution) view.solution = { ...state.solution };
  }

  return view;
}
