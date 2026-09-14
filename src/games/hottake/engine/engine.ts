import { allPromptIds, getPrompt } from '@/games/hottake/engine/prompts';
import {
  Action,
  GameConfig,
  GameState,
  Player,
  PlayerView,
  RoundResult,
  ScoreRow,
} from '@/games/hottake/engine/types';

export const MIN_PLAYERS = 3;
/** Vote rounds get long past this — a deliberate room-size cap. */
export const MAX_PLAYERS = 12;
export const POINTS_PER_VOTE = 100;
export const MAX_ANSWER = 120;

export type Rng = () => number;

export function suggestConfig(): GameConfig {
  return { promptsPerGame: 3, answerSeconds: 60, voteSeconds: 30 };
}

const clampInt = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof v === 'number' ? Math.round(v) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

function clampConfig(raw: GameConfig): GameConfig {
  const d = suggestConfig();
  return {
    promptsPerGame: clampInt(raw.promptsPerGame, 1, 5, d.promptsPerGame),
    answerSeconds: clampInt(raw.answerSeconds, 0, 300, d.answerSeconds),
    voteSeconds: clampInt(raw.voteSeconds, 0, 120, d.voteSeconds),
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
    promptOrder: [],
    promptIndex: 0,
    ballotOrder: [],
    answers: {},
    votes: {},
    scores: {},
    history: [],
    winners: [],
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

/** Ejected seats stay listed but leave the game entirely (answers dropped). */
function isGone(p: Player): boolean {
  return !p.connected && p.token.startsWith('removed-');
}

/** Fisher-Yates shuffle — prompt and ballot order, deterministic per rng. */
function shuffled(ids: string[], rng: Rng): string[] {
  const order = [...ids];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function currentPromptId(state: GameState): string {
  return state.promptOrder[state.promptIndex];
}

function openAnswering(state: GameState, now: number): GameState {
  return {
    ...state,
    phase: 'answering',
    ballotOrder: [],
    answers: {},
    votes: {},
    answerEndsAt:
      state.config.answerSeconds > 0 ? now + state.config.answerSeconds * 1000 : undefined,
    voteEndsAt: undefined,
  };
}

/** Closes answering: blanks for the missing, shuffled anonymous ballot. */
function closeAnswering(state: GameState, rng: Rng, now: number): GameState {
  const ballotOrder = shuffled(
    Object.keys(state.answers).filter((id) => {
      const p = findPlayer(state, id);
      return p && !isGone(p) && state.answers[id].trim().length > 0;
    }),
    rng,
  );
  if (ballotOrder.length === 0) {
    // Nobody wrote a thing — record the blank round and move on.
    const prompt = getPrompt(currentPromptId(state));
    const history: RoundResult[] = [
      ...state.history,
      {
        promptId: currentPromptId(state),
        promptText: prompt?.text ?? '',
        entries: [],
        voterCount: 0,
      },
    ];
    return {
      ...state,
      phase: 'scoreboard',
      ballotOrder,
      answers: {},
      votes: {},
      history,
      answerEndsAt: undefined,
    };
  }
  return {
    ...state,
    phase: 'voting',
    ballotOrder,
    votes: {},
    answerEndsAt: undefined,
    voteEndsAt: state.config.voteSeconds > 0 ? now + state.config.voteSeconds * 1000 : undefined,
  };
}

/** Tallies the ballot at 100 points a vote and reveals the round. */
function tallyAndScoreboard(state: GameState): GameState {
  const counts = new Map<string, number>();
  let validVotes = 0;
  for (const [voterId, seat] of Object.entries(state.votes)) {
    const voter = findPlayer(state, voterId);
    // Ghost votes from ejected/offline seats must not score.
    if (!voter || !voter.connected || isGone(voter)) continue;
    const authorId = state.ballotOrder[seat];
    if (!authorId || authorId === voterId) continue; // defensive; vote() already guards
    const author = findPlayer(state, authorId);
    if (!author || isGone(author)) continue;
    counts.set(authorId, (counts.get(authorId) ?? 0) + 1);
    validVotes++;
  }
  const scores = { ...state.scores };
  for (const [authorId, count] of counts) {
    scores[authorId] = (scores[authorId] ?? 0) + count * POINTS_PER_VOTE;
  }
  const prompt = getPrompt(currentPromptId(state));
  const history: RoundResult[] = [
    ...state.history,
    {
      promptId: currentPromptId(state),
      promptText: prompt?.text ?? '',
      entries: state.ballotOrder.map((authorId) => {
        const p = findPlayer(state, authorId);
        return {
          authorId,
          authorName: p?.name ?? '?',
          text: state.answers[authorId] ?? '',
          votes: counts.get(authorId) ?? 0,
        };
      }),
      voterCount: validVotes,
    },
  ];
  return {
    ...state,
    phase: 'scoreboard',
    scores,
    history,
    answers: {},
    votes: {},
    voteEndsAt: undefined,
  };
}

/** Running totals, highest first (name breaks ties deterministically). */
/* Ejected seats leave the podium — their old points stay in state but are hidden. */
export function scoreRows(state: GameState): ScoreRow[] {
  return state.players
    .filter((p) => !isGone(p))
    .map((p) => ({ id: p.id, name: p.name, score: state.scores[p.id] ?? 0 }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function everyoneAnswered(state: GameState): boolean {
  const connected = state.players.filter((p) => p.connected);
  return (
    connected.length > 0 && connected.every((p) => (state.answers[p.id] ?? '').trim().length > 0)
  );
}

function everyoneVoted(state: GameState): boolean {
  const connected = state.players.filter((p) => p.connected && !isGone(p));
  // A player with no legal vote (sole author of a 1-entry ballot) can't stall.
  const required = connected.filter((p) => state.ballotOrder.some((a) => a !== p.id));
  return required.every((p) => state.votes[p.id] !== undefined);
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
      // Drop their answer + vote so a ghost can't score or stall.
      const answers = { ...state.answers };
      delete answers[target.id];
      const votes = { ...state.votes };
      delete votes[target.id];
      const ballotOrder = state.ballotOrder.filter((id) => id !== target.id);
      const next: GameState = {
        ...state,
        answers,
        votes,
        ballotOrder,
        players: state.players.map((p) =>
          p.id === target.id ? { ...p, connected: false, token: `removed-${p.id}` } : p,
        ),
      };
      if (next.phase === 'voting' && everyoneVoted(next)) return tallyAndScoreboard(next);
      return next;
    }

    case 'disconnect': {
      const leaving = findPlayer(state, action.id);
      if (!leaving) return state;
      if (state.phase === 'lobby') {
        if (leaving.isHost) return state;
        return { ...state, players: state.players.filter((p) => p.id !== action.id) };
      }
      const votes = { ...state.votes };
      delete votes[action.id];
      const next: GameState = {
        ...state,
        votes,
        players: state.players.map((p) => (p.id === action.id ? { ...p, connected: false } : p)),
      };
      if (next.phase === 'voting' && everyoneVoted(next)) return tallyAndScoreboard(next);
      return next;
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
      // Prefer prompts not used in the previous game (kept in promptOrder
      // through playAgain) so "fresh prompts" holds when the pool allows it.
      const previous = new Set(state.promptOrder);
      const fresh = allPromptIds().filter((id) => !previous.has(id));
      const pool = fresh.length >= state.config.promptsPerGame ? fresh : allPromptIds();
      const promptOrder = shuffled(pool, rng).slice(0, state.config.promptsPerGame);
      const scores: Record<string, number> = {};
      for (const p of state.players) scores[p.id] = 0;
      return openAnswering(
        {
          ...state,
          promptOrder,
          promptIndex: 0,
          scores,
          history: [],
          winners: [],
        },
        now,
      );
    }

    case 'answer': {
      if (state.phase !== 'answering') return state;
      const me = findPlayer(state, action.id);
      if (!me || !me.connected || typeof action.text !== 'string') return state;
      const clean = action.text.trim().slice(0, MAX_ANSWER);
      const answers = { ...state.answers };
      // Empty submit = take it back (no blank stored).
      if (clean.length === 0) delete answers[me.id];
      else answers[me.id] = clean;
      const next = { ...state, answers };
      return everyoneAnswered(next) ? closeAnswering(next, rng, now) : next;
    }

    case 'vote': {
      if (state.phase !== 'voting') return state;
      const me = findPlayer(state, action.id);
      if (!me || !me.connected || !Number.isInteger(action.seat)) return state;
      const authorId = state.ballotOrder[action.seat];
      if (!authorId || authorId === me.id) return state; // unknown seat or self-vote
      const next = { ...state, votes: { ...state.votes, [me.id]: action.seat } };
      return everyoneVoted(next) ? tallyAndScoreboard(next) : next;
    }

    case 'advance': {
      const me = findPlayer(state, action.id);
      if (!me?.isHost || !me.connected) return state;
      if (state.phase === 'answering') return closeAnswering(state, rng, now);
      if (state.phase === 'voting') return tallyAndScoreboard(state);
      if (state.phase === 'scoreboard') {
        if (state.promptIndex + 1 < state.promptOrder.length) {
          return openAnswering({ ...state, promptIndex: state.promptIndex + 1 }, now);
        }
        const rows = scoreRows(state);
        const top = rows.length > 0 ? rows[0].score : 0;
        return {
          ...state,
          phase: 'gameOver',
          winners: rows.filter((r) => r.score === top).map((r) => r.id),
        };
      }
      return state;
    }

    case 'playAgain': {
      const me = findPlayer(state, action.id);
      if (!me?.isHost || !me.connected || state.phase !== 'gameOver') return state;
      return {
        ...state,
        phase: 'lobby',
        // Keep promptOrder so the next start() can prefer unused prompts.
        promptIndex: 0,
        ballotOrder: [],
        answers: {},
        votes: {},
        scores: {},
        history: [],
        winners: [],
        answerEndsAt: undefined,
        voteEndsAt: undefined,
      };
    }
  }
}

/**
 * Builds the per-device view of the state. This is the privacy boundary:
 * answer texts stay sealed while writing, the ballot stays anonymous while
 * voting, and all rejoin tokens never leave the host. Never send raw state.
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
    return view;
  }

  const prompt = getPrompt(currentPromptId(state));
  view.promptNumber = state.promptIndex + 1;
  view.promptsTotal = state.promptOrder.length;
  view.promptText = prompt?.text ?? '';

  if (state.phase === 'answering') {
    view.myText = state.answers[me.id] ?? '';
    view.submittedIds = Object.keys(state.answers).filter(
      (id) => state.answers[id].trim().length > 0,
    );
    if (state.answerEndsAt !== undefined) {
      view.answerEndsAt = state.answerEndsAt;
      view.answerDurationSec = state.config.answerSeconds;
    }
    return view;
  }

  if (state.phase === 'voting') {
    view.ballot = state.ballotOrder.map((authorId, seat) => ({
      seat,
      text: state.answers[authorId] ?? '',
    }));
    view.myVote = state.votes[me.id] ?? null;
    view.voterIds = Object.keys(state.votes);
    if (state.voteEndsAt !== undefined) {
      view.voteEndsAt = state.voteEndsAt;
      view.voteDurationSec = state.config.voteSeconds;
    }
    return view;
  }

  view.scores = scoreRows(state);

  if (state.phase === 'scoreboard') {
    view.lastResult = state.history[state.history.length - 1];
    return view;
  }

  // gameOver
  view.history = state.history;
  const byId = new Map(state.players.map((p) => [p.id, p.name]));
  view.winners = state.winners.map((id) => ({ id, name: byId.get(id) ?? '?' }));
  return view;
}
