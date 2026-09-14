import {
  Action,
  GameConfig,
  GameState,
  Player,
  PlayerView,
  Role,
} from '@/games/mafia/engine/types';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 20;

export type Rng = () => number;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Sensible default setup for a given player count. */
export function suggestConfig(playerCount: number): GameConfig {
  return {
    mafiaCount: clamp(Math.round(playerCount / 4), 1, Math.max(1, playerCount - 2)),
    hasDetective: playerCount >= 4,
    hasDoctor: playerCount >= 5,
    discussionSeconds: 180,
    skipFirstVote: true,
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
    config: {
      mafiaCount: 1,
      hasDetective: true,
      hasDoctor: true,
      discussionSeconds: 180,
      skipFirstVote: true,
    },
    round: 0,
    night: { mafiaTargets: {} },
    votes: {},
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
    alive: true,
    ready: false,
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

function shuffle<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Town wins when no mafia remain; mafia win when they reach parity with the town. */
/* Ejected seats leave win math so a kicked ghost can't hold the game hostage.
   Merely disconnected seats still count — they may rejoin, and dropping them
   would hand the other side an undeserved instant win. */
function isEjected(p: Player): boolean {
  return p.token.startsWith('removed-');
}
export function checkWin(players: Player[]): 'mafia' | 'town' | undefined {
  const alive = players.filter((p) => p.alive && !isEjected(p));
  const mafia = alive.filter((p) => p.role === 'mafia').length;
  const town = alive.length - mafia;
  if (mafia === 0) return 'town';
  if (mafia >= town) return 'mafia';
  return undefined;
}

/**
 * The single state transition function. Pure and deterministic (pass `rng`
 * for reproducible tests); the host device is the only place it runs.
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

    case 'disconnect': {
      const leaving = findPlayer(state, action.id);
      if (!leaving) return state;
      if (state.phase === 'lobby') {
        // The host's tab is the room — never leave a hostless lobby behind.
        if (leaving.isHost) return state;
        return { ...state, players: state.players.filter((p) => p.id !== action.id) };
      }
      // Mid-game: keep the seat so the game can continue, but drop its
      // pending vote/pick so an absent player can't decide outcomes.
      const night: GameState['night'] = {
        ...state.night,
        mafiaTargets: { ...state.night.mafiaTargets },
      };
      delete night.mafiaTargets[action.id];
      // Drop picks aimed at the leaver — offline seats can't be night-killed.
      for (const [actor, target] of Object.entries(night.mafiaTargets)) {
        if (target === action.id) delete night.mafiaTargets[actor];
      }
      if (
        night.detectiveTarget &&
        (leaving.role === 'detective' || night.detectiveTarget === action.id)
      ) {
        // A disconnected detective's pending pick shouldn't linger.
        night.detectiveTarget = undefined;
      }
      if (night.doctorTarget && (leaving.role === 'doctor' || night.doctorTarget === action.id)) {
        night.doctorTarget = undefined;
      }
      const votes = { ...state.votes };
      delete votes[action.id];
      const next: GameState = {
        ...state,
        night,
        votes,
        players: state.players.map((p) => (p.id === action.id ? { ...p, connected: false } : p)),
      };
      return autoResolve(next, rng);
    }

    case 'remove': {
      // Host-only ejection (wrong seat, duplicate). Lobby: the seat vanishes.
      // Mid-game: the seat is kept so the game continues, but its token is
      // revoked so the ejected device can't reclaim it.
      const me = findPlayer(state, action.id);
      const target = findPlayer(state, action.targetId);
      if (!me?.isHost || !me.connected || !target || target.isHost) return state;
      if (state.phase === 'lobby') {
        return { ...state, players: state.players.filter((p) => p.id !== target.id) };
      }
      const night: GameState['night'] = {
        ...state.night,
        mafiaTargets: { ...state.night.mafiaTargets },
      };
      delete night.mafiaTargets[target.id];
      for (const [actor, picked] of Object.entries(night.mafiaTargets)) {
        if (picked === target.id) delete night.mafiaTargets[actor];
      }
      if (
        night.detectiveTarget &&
        (target.role === 'detective' || night.detectiveTarget === target.id)
      ) {
        night.detectiveTarget = undefined;
      }
      if (night.doctorTarget && (target.role === 'doctor' || night.doctorTarget === target.id)) {
        night.doctorTarget = undefined;
      }
      const votes = { ...state.votes };
      delete votes[target.id];
      const next: GameState = {
        ...state,
        night,
        votes,
        players: state.players.map((p) =>
          p.id === target.id ? { ...p, connected: false, token: `removed-${p.id}` } : p,
        ),
      };
      return autoResolve(next, rng);
    }

    case 'setConfig': {
      const me = findPlayer(state, action.id);
      if (!me?.isHost || !me.connected || state.phase !== 'lobby') return state;
      const max = Math.max(1, state.players.length - 2);
      return {
        ...state,
        config: {
          mafiaCount: clamp(Math.round(action.config.mafiaCount) || 1, 1, max),
          hasDetective: !!action.config.hasDetective,
          hasDoctor: !!action.config.hasDoctor,
          discussionSeconds: clamp(Math.round(action.config.discussionSeconds) || 0, 0, 600),
          skipFirstVote: !!action.config.skipFirstVote,
        },
      };
    }

    case 'start': {
      const me = findPlayer(state, action.id);
      if (!me?.isHost || !me.connected || state.phase !== 'lobby') return state;
      const n = state.players.length;
      if (n < MIN_PLAYERS) return state;

      const mafiaCount = clamp(state.config.mafiaCount, 1, n - 2);
      const townCount = n - mafiaCount;
      const bag: Role[] = Array.from({ length: mafiaCount }, () => 'mafia' as Role);
      const specials: Role[] = [];
      if (state.config.hasDetective) specials.push('detective');
      if (state.config.hasDoctor) specials.push('doctor');
      for (const s of specials.slice(0, townCount)) bag.push(s);
      while (bag.length < n) bag.push('villager');
      shuffle(bag, rng);

      const players = state.players.map((p, i) => ({
        ...p,
        role: bag[i],
        alive: true,
        ready: false,
      }));
      // A misconfigured setup can already be mafia parity (e.g. 4p / 2 mafia).
      // End immediately instead of playing a decided game.
      const winner = checkWin(players);
      return {
        ...state,
        phase: winner ? 'gameOver' : 'roleReveal',
        round: 0,
        winner,
        lastNight: undefined,
        lastInvestigation: undefined,
        lastVote: undefined,
        votes: {},
        discussionEndsAt: undefined,
        night: { mafiaTargets: {} },
        players,
      };
    }

    case 'ackRole': {
      if (state.phase !== 'roleReveal') return state;
      const me = findPlayer(state, action.id);
      if (!me || !me.connected) return state;
      const players = state.players.map((p) => (p.id === action.id ? { ...p, ready: true } : p));
      const next = { ...state, players };
      const everyoneReady = players.every((p) => !p.connected || p.ready);
      return everyoneReady ? startNight(next) : next;
    }

    case 'nightAct': {
      if (state.phase !== 'night') return state;
      const me = findPlayer(state, action.id);
      const target = findPlayer(state, action.targetId);
      if (!me || !target || !me.alive || !me.connected) return state;
      if (!target.alive || !target.connected) return state;

      const night: GameState['night'] = {
        ...state.night,
        mafiaTargets: { ...state.night.mafiaTargets },
      };
      if (me.role === 'mafia') {
        if (target.role === 'mafia') return state; // no friendly fire
        night.mafiaTargets[me.id] = target.id;
      } else if (me.role === 'detective') {
        if (target.id === me.id) return state;
        night.detectiveTarget = target.id;
      } else if (me.role === 'doctor') {
        night.doctorTarget = target.id; // may protect anyone alive, including self
      } else {
        return state; // villagers sleep
      }

      const next = { ...state, night };
      return pendingActors(next).length === 0 ? resolveNight(next, rng) : next;
    }

    case 'advance': {
      const me = findPlayer(state, action.id);
      if (!me || !me.connected) return state;
      if (state.phase === 'roleReveal') {
        // Host fallback so one stalled device can't park the table forever.
        if (!me.isHost) return state;
        return startNight(state);
      }
      if (state.phase === 'dayReveal') {
        if (!me.isHost) return state;
        return beginDiscussion(state, now);
      }
      if (state.phase === 'discussion') {
        // The host may advance anytime; anyone alive may advance once the timer expires.
        const expired = state.discussionEndsAt !== undefined && now >= state.discussionEndsAt;
        if (!me.isHost) {
          if (!expired || !me.alive) return state;
        }
        // Day 1 with the house rule on is discussion only — straight to night 2.
        if (state.round === 1 && state.config.skipFirstVote) return startNight(state);
        return { ...state, phase: 'voting', votes: {}, discussionEndsAt: undefined };
      }
      if (state.phase === 'voteResult') {
        if (!me.isHost) return state;
        return startNight(state);
      }
      return state;
    }

    case 'extendDiscussion': {
      const me = findPlayer(state, action.id);
      if (!me?.isHost || state.phase !== 'discussion' || state.discussionEndsAt === undefined) {
        return state;
      }
      // Extend from now when the deadline already passed, not from the stale base.
      return { ...state, discussionEndsAt: Math.max(state.discussionEndsAt, now) + 60_000 };
    }

    case 'skipNight': {
      // Host override for a stalled night (missing actor). Resolves with
      // whatever actions are in — missing actors simply don't act.
      const me = findPlayer(state, action.id);
      if (!me?.isHost || !me.connected || state.phase !== 'night') return state;
      return resolveNight(state, rng);
    }

    case 'closeVote': {
      // Host override for a stalled vote. Missing voters are left uncounted,
      // which affects the tally exactly like abstaining.
      const me = findPlayer(state, action.id);
      if (!me?.isHost || !me.connected || state.phase !== 'voting') return state;
      return resolveVote(state);
    }

    case 'vote': {
      if (state.phase !== 'voting') return state;
      const me = findPlayer(state, action.id);
      if (!me || !me.alive || !me.connected) return state;
      if (action.targetId !== null) {
        const target = findPlayer(state, action.targetId);
        if (!target || !target.alive || target.id === me.id) return state;
      }
      const votes = { ...state.votes, [me.id]: action.targetId };
      const next = { ...state, votes };
      const waitingOn = next.players.filter((p) => p.alive && p.connected && !(p.id in votes));
      return waitingOn.length === 0 ? resolveVote(next) : next;
    }

    case 'playAgain': {
      const me = findPlayer(state, action.id);
      if (!me?.isHost || !me.connected || state.phase !== 'gameOver') return state;
      // Drop seats that never reconnected — starting with phantom roles helps nobody.
      const players = state.players
        .filter((p) => p.connected)
        .map((p) => ({ ...p, role: undefined, alive: true, ready: false }));
      return {
        ...state,
        phase: 'lobby',
        round: 0,
        winner: undefined,
        lastNight: undefined,
        lastInvestigation: undefined,
        lastVote: undefined,
        votes: {},
        discussionEndsAt: undefined,
        night: { mafiaTargets: {} },
        players,
      };
    }
  }
}

function beginDiscussion(state: GameState, now: number): GameState {
  const seconds = state.config.discussionSeconds;
  return {
    ...state,
    phase: 'discussion',
    discussionEndsAt: seconds > 0 ? now + seconds * 1000 : undefined,
  };
}

function startNight(state: GameState): GameState {
  return {
    ...state,
    phase: 'night',
    round: state.round + 1,
    night: { mafiaTargets: {} },
    votes: {},
    lastNight: undefined,
    lastInvestigation: undefined,
    lastVote: undefined,
    discussionEndsAt: undefined,
    players: state.players.map((p) => ({ ...p, ready: false })),
  };
}

/** After a disconnect/eject, finish phases that are no longer waiting on anyone. */
function autoResolve(state: GameState, rng: Rng): GameState {
  if (state.phase === 'roleReveal') {
    const everyoneReady = state.players.every((p) => !p.connected || p.ready);
    if (everyoneReady) return startNight(state);
    return state;
  }
  if (state.phase === 'night' && pendingActors(state).length === 0) {
    return resolveNight(state, rng);
  }
  if (state.phase === 'voting') {
    const waitingOn = state.players.filter((p) => p.alive && p.connected && !(p.id in state.votes));
    if (waitingOn.length === 0) return resolveVote(state);
  }
  return state;
}

/** Alive, connected players whose night action is still missing. */
function pendingActors(state: GameState): Player[] {
  return state.players.filter((p) => {
    if (!p.alive || !p.connected) return false;
    if (p.role === 'mafia') return state.night.mafiaTargets[p.id] === undefined;
    if (p.role === 'detective') return state.night.detectiveTarget === undefined;
    if (p.role === 'doctor') return state.night.doctorTarget === undefined;
    return false;
  });
}

function resolveNight(state: GameState, rng: Rng): GameState {
  // Mafia victim: most-voted target among mafia picks; ties broken at random.
  const picks = Object.values(state.night.mafiaTargets);
  let diedId: string | undefined;
  if (picks.length > 0) {
    const counts = new Map<string, number>();
    for (const t of picks) counts.set(t, (counts.get(t) ?? 0) + 1);
    const top = Math.max(...counts.values());
    const tied = [...counts.entries()].filter(([, c]) => c === top).map(([id]) => id);
    const victim = tied[Math.floor(rng() * tied.length)];
    if (victim !== state.night.doctorTarget) diedId = victim;
  }

  const players = diedId
    ? state.players.map((p) => (p.id === diedId ? { ...p, alive: false } : p))
    : state.players;

  const investigation = state.night.detectiveTarget
    ? {
        targetId: state.night.detectiveTarget,
        isMafia: findPlayer(state, state.night.detectiveTarget)?.role === 'mafia',
      }
    : undefined;

  const winner = checkWin(players);
  return {
    ...state,
    players,
    night: { mafiaTargets: {} },
    lastNight: { diedId },
    lastInvestigation: investigation,
    winner,
    phase: winner ? 'gameOver' : 'dayReveal',
  };
}

function resolveVote(state: GameState): GameState {
  // Only living, connected seats count — stale votes from leavers are dropped.
  const counts = new Map<string, number>();
  for (const [voterId, t] of Object.entries(state.votes)) {
    const voter = findPlayer(state, voterId);
    if (!voter || !voter.alive || !voter.connected) continue;
    if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  let topId: string | undefined;
  let topCount = 0;
  let tied = false;
  for (const [id, c] of counts) {
    if (c > topCount) {
      topId = id;
      topCount = c;
      tied = false;
    } else if (c === topCount) {
      tied = true;
    }
  }
  // Zero votes is "no majority", not a tie.
  const eliminatedId = topId && !tied ? topId : undefined;
  const tie = counts.size > 0 && !eliminatedId;
  const players = eliminatedId
    ? state.players.map((p) => (p.id === eliminatedId ? { ...p, alive: false } : p))
    : state.players;
  const winner = checkWin(players);
  return {
    ...state,
    players,
    lastVote: { eliminatedId, tie },
    winner,
    phase: winner ? 'gameOver' : 'voteResult',
  };
}

/**
 * Builds the per-device view of the state. This is the privacy boundary:
 * secrets (other players' roles, night picks) are only included for the
 * player allowed to see them. Never send raw GameState to clients.
 */
export function viewFor(state: GameState, playerId: string): PlayerView {
  const me = findPlayer(state, playerId);
  if (!me) throw new Error(`unknown player: ${playerId}`);

  const view: PlayerView = {
    phase: state.phase,
    round: state.round,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.isHost,
      connected: p.connected,
      alive: p.alive,
      ready: p.ready,
    })),
    me: { id: me.id, name: me.name, isHost: me.isHost, alive: me.alive, role: me.role },
  };

  if (state.phase === 'lobby') {
    view.config = state.config;
    return view;
  }

  if (me.role === 'mafia') {
    view.mafiaTeammates = state.players
      .filter((p) => p.role === 'mafia' && p.id !== me.id)
      .map((p) => ({ id: p.id, name: p.name }));
  }

  if (state.phase === 'night') {
    view.nightPending = pendingActors(state).length;
    if (me.alive) {
      if (me.role === 'mafia') {
        view.nightOptions = state.players
          .filter((p) => p.alive && p.connected && p.role !== 'mafia')
          .map((p) => p.id);
        view.myNightPick = state.night.mafiaTargets[me.id];
        const picks: Record<string, string | undefined> = {};
        for (const p of state.players) {
          if (p.role === 'mafia') picks[p.id] = state.night.mafiaTargets[p.id];
        }
        view.mafiaPicks = picks;
      } else if (me.role === 'detective') {
        view.nightOptions = state.players
          .filter((p) => p.alive && p.connected && p.id !== me.id)
          .map((p) => p.id);
        view.myNightPick = state.night.detectiveTarget;
      } else if (me.role === 'doctor') {
        view.nightOptions = state.players.filter((p) => p.alive && p.connected).map((p) => p.id);
        view.myNightPick = state.night.doctorTarget;
      }
    }
    return view;
  }

  // Day phases and beyond.
  view.lastNight = state.lastNight;
  if (state.phase === 'discussion') {
    if (state.discussionEndsAt !== undefined) {
      view.discussionEndsAt = state.discussionEndsAt;
      view.discussionDurationSec = state.config.discussionSeconds;
    }
    if (state.round === 1 && state.config.skipFirstVote) view.skipsVote = true;
  }
  if (me.role === 'detective' && state.lastInvestigation) {
    view.investigation = state.lastInvestigation;
  }

  if (state.phase === 'voting' || state.phase === 'voteResult' || state.phase === 'gameOver') {
    view.votes = state.votes;
    if (state.phase === 'voting' && me.alive) view.myVote = state.votes[me.id];
  }

  if ((state.phase === 'voteResult' || state.phase === 'gameOver') && state.lastVote) {
    view.lastVote = {
      ...state.lastVote,
      eliminatedRole: state.lastVote.eliminatedId
        ? findPlayer(state, state.lastVote.eliminatedId)?.role
        : undefined,
    };
  }

  if (state.phase === 'gameOver') {
    view.winner = state.winner;
    const roles: Record<string, Role> = {};
    for (const p of state.players) if (p.role) roles[p.id] = p.role;
    view.allRoles = roles;
  }

  return view;
}
