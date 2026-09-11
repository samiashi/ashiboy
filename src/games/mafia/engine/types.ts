export type Role = 'mafia' | 'detective' | 'doctor' | 'villager';

export type Phase =
  | 'lobby' // players joining, host configures
  | 'roleReveal' // everyone privately checks their role
  | 'night' // mafia / detective / doctor act in secret
  | 'dayReveal' // app narrates the night's outcome
  | 'discussion' // table talk (out loud), host advances to vote
  | 'voting' // everyone votes on their own device
  | 'voteResult' // outcome + role of the eliminated player
  | 'gameOver'; // winner + full role reveal

export interface Player {
  id: string;
  name: string;
  avatar: string;
  /** Secret rejoin token — held only in host memory, never published in views. */
  token: string;
  isHost: boolean;
  connected: boolean;
  alive: boolean;
  role?: Role;
  ready: boolean;
}

export interface GameConfig {
  mafiaCount: number;
  hasDetective: boolean;
  hasDoctor: boolean;
}

export interface NightState {
  /** mafia player id -> target id */
  mafiaTargets: Record<string, string>;
  detectiveTarget?: string;
  doctorTarget?: string;
}

export interface GameState {
  phase: Phase;
  players: Player[];
  config: GameConfig;
  round: number;
  night: NightState;
  /** voter id -> target id (null = abstain) */
  votes: Record<string, string | null>;
  /** diedId undefined => nobody died (saved or mafia picked no one) */
  lastNight?: { diedId?: string };
  lastInvestigation?: { targetId: string; isMafia: boolean };
  lastVote?: { eliminatedId?: string; tie: boolean };
  winner?: 'mafia' | 'town';
}

/** Actions applied by the host (authoritative). Player-originated actions carry the player's id. */
export type Action =
  | { t: 'join'; id: string; name: string; avatar: string; token: string }
  | { t: 'rejoin'; id: string; token: string }
  | { t: 'remove'; id: string; targetId: string }
  | { t: 'disconnect'; id: string }
  | { t: 'setConfig'; id: string; config: GameConfig }
  | { t: 'start'; id: string }
  | { t: 'ackRole'; id: string }
  | { t: 'nightAct'; id: string; targetId: string }
  | { t: 'advance'; id: string }
  | { t: 'skipNight'; id: string }
  | { t: 'closeVote'; id: string }
  | { t: 'vote'; id: string; targetId: string | null }
  | { t: 'playAgain'; id: string };

// ---------- wire protocol ----------

/** Messages any device (including the host's own UI) can send. */
export type ClientMessage =
  | { t: 'join'; name: string; avatar: string; rejoin?: { playerId: string; token: string } }
  | { t: 'remove'; targetId: string }
  | { t: 'setConfig'; config: GameConfig }
  | { t: 'start' }
  | { t: 'ackRole' }
  | { t: 'nightAct'; targetId: string }
  | { t: 'advance' }
  | { t: 'skipNight' }
  | { t: 'closeVote' }
  | { t: 'vote'; targetId: string | null }
  | { t: 'playAgain' };

export type HostMessage =
  | { t: 'welcome'; playerId: string; token: string }
  | { t: 'state'; view: PlayerView }
  | { t: 'error'; message: string };

// ---------- personalized view (what a single device is allowed to know) ----------

export interface PublicPlayer {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  connected: boolean;
  alive: boolean;
  ready: boolean;
}

export interface PlayerView {
  phase: Phase;
  round: number;
  players: PublicPlayer[];
  me: { id: string; name: string; isHost: boolean; alive: boolean; role?: Role };
  /** lobby only */
  config?: GameConfig;
  /** mafia only: the other mafia members */
  mafiaTeammates?: { id: string; name: string }[];
  /** mafia only, during night: live picks of each mafia member (id -> target id) */
  mafiaPicks?: Record<string, string | undefined>;
  /** my valid targets tonight (role-dependent) */
  nightOptions?: string[];
  myNightPick?: string;
  /** how many night actors still need to act */
  nightPending?: number;
  lastNight?: { diedId?: string };
  /** detective only */
  investigation?: { targetId: string; isMafia: boolean };
  votes?: Record<string, string | null>;
  myVote?: string | null;
  lastVote?: { eliminatedId?: string; tie: boolean; eliminatedRole?: Role };
  winner?: 'mafia' | 'town';
  /** gameOver only: full role reveal */
  allRoles?: Record<string, Role>;
}
