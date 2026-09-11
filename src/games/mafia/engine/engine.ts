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
    config: { mafiaCount: 1, hasDetective: true, hasDoctor: true },
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
    avatar: avatar || '🎭',
    token,
    isHost,
    connected: true,
    alive: true,
    ready: false,
  };
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
export function checkWin(players: Player[]): 'mafia' | 'town' | undefined {
  const alive = players.filter((p) => p.alive);
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
export function reduce(state: GameState, action: Action, rng: Rng = Math.random): GameState {
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

    case 'disconnect': {
      if (state.phase === 'lobby') {
        return { ...state, players: state.players.filter((p) => p.id !== action.id) };
      }
      // Mid-game: keep the player in the roster so the game can continue.
      return {
        ...state,
        players: state.players.map((p) => (p.id === action.id ? { ...p, connected: false } : p)),
      };
    }

    case 'remove': {
      // Host-only ejection (wrong seat, duplicate). Lobby: the seat vanishes.
      // Mid-game: equivalent to disconnecting (seat kept so the game continues).
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

    case 'setConfig': {
      const me = findPlayer(state, action.id);
      if (!me?.isHost || state.phase !== 'lobby') return state;
      const max = Math.max(1, state.players.length - 2);
      return {
        ...state,
        config: {
          mafiaCount: clamp(Math.round(action.config.mafiaCount) || 1, 1, max),
          hasDetective: !!action.config.hasDetective,
          hasDoctor: !!action.config.hasDoctor,
        },
      };
    }

    case 'start': {
      const me = findPlayer(state, action.id);
      if (!me?.isHost || state.phase !== 'lobby') return state;
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

      return {
        ...state,
        phase: 'roleReveal',
        round: 0,
        winner: undefined,
        lastNight: undefined,
        lastInvestigation: undefined,
        lastVote: undefined,
        votes: {},
        night: { mafiaTargets: {} },
        players: state.players.map((p, i) => ({ ...p, role: bag[i], alive: true, ready: false })),
      };
    }

    case 'ackRole': {
      if (state.phase !== 'roleReveal') return state;
      const players = state.players.map((p) => (p.id === action.id ? { ...p, ready: true } : p));
      const next = { ...state, players };
      const everyoneReady = players.every((p) => !p.connected || p.ready);
      return everyoneReady ? startNight(next) : next;
    }

    case 'nightAct': {
      if (state.phase !== 'night') return state;
      const me = findPlayer(state, action.id);
      const target = findPlayer(state, action.targetId);
      if (!me || !target || !me.alive || !target.alive) return state;

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
      if (!me?.isHost) return state;
      if (state.phase === 'dayReveal') return { ...state, phase: 'discussion' };
      if (state.phase === 'discussion') return { ...state, phase: 'voting', votes: {} };
      if (state.phase === 'voteResult') return startNight(state);
      return state;
    }

    case 'skipNight': {
      // Host override for a stalled night (missing actor). Resolves with
      // whatever actions are in — missing actors simply don't act.
      const me = findPlayer(state, action.id);
      if (!me?.isHost || state.phase !== 'night') return state;
      return resolveNight(state, rng);
    }

    case 'closeVote': {
      // Host override for a stalled vote. Missing voters are left uncounted,
      // which affects the tally exactly like abstaining.
      const me = findPlayer(state, action.id);
      if (!me?.isHost || state.phase !== 'voting') return state;
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
      if (!me?.isHost || state.phase !== 'gameOver') return state;
      return {
        ...state,
        phase: 'lobby',
        round: 0,
        winner: undefined,
        lastNight: undefined,
        lastInvestigation: undefined,
        lastVote: undefined,
        votes: {},
        night: { mafiaTargets: {} },
        players: state.players.map((p) => ({ ...p, role: undefined, alive: true, ready: false })),
      };
    }
  }
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
    players: state.players.map((p) => ({ ...p, ready: false })),
  };
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
  const counts = new Map<string, number>();
  for (const t of Object.values(state.votes)) {
    if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  let topId: string | undefined;
  let topCount = 0;
  let tied = true;
  for (const [id, c] of counts) {
    if (c > topCount) {
      topId = id;
      topCount = c;
      tied = false;
    } else if (c === topCount) {
      tied = true;
    }
  }
  const eliminatedId = topId && !tied ? topId : undefined;
  const players = eliminatedId
    ? state.players.map((p) => (p.id === eliminatedId ? { ...p, alive: false } : p))
    : state.players;
  const winner = checkWin(players);
  return {
    ...state,
    players,
    lastVote: { eliminatedId, tie: !eliminatedId },
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
          .filter((p) => p.alive && p.role !== 'mafia')
          .map((p) => p.id);
        view.myNightPick = state.night.mafiaTargets[me.id];
        const picks: Record<string, string | undefined> = {};
        for (const p of state.players) {
          if (p.role === 'mafia') picks[p.id] = state.night.mafiaTargets[p.id];
        }
        view.mafiaPicks = picks;
      } else if (me.role === 'detective') {
        view.nightOptions = state.players.filter((p) => p.alive && p.id !== me.id).map((p) => p.id);
        view.myNightPick = state.night.detectiveTarget;
      } else if (me.role === 'doctor') {
        view.nightOptions = state.players.filter((p) => p.alive).map((p) => p.id);
        view.myNightPick = state.night.doctorTarget;
      }
    }
    return view;
  }

  // Day phases and beyond.
  view.lastNight = state.lastNight;
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
