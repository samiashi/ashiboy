export type Phase =
  | 'lobby' // players joining, host configures + picks the case
  | 'briefing' // case file is read out, team gets oriented
  | 'search' // mini-game 1: spend search tokens to reveal clues
  | 'alibis' // mini-game 2: spend pressure to reveal suspects' secrets
  | 'accusation' // mini-game 3: the team submits verdicts
  | 'gameOver'; // solved (stars) or cold (solution revealed)

export interface Player {
  id: string;
  name: string;
  avatar: string;
  /** Secret rejoin token — held only in host memory, never published in views. */
  token: string;
  isHost: boolean;
  connected: boolean;
}

export interface GameConfig {
  /** Shared location searches for the case. */
  searchTokens: number;
  /** Shared suspect presses for the case. */
  pressureTokens: number;
  /** Team verdict attempts. */
  accusationAttempts: number;
  /** Search phase length in seconds. 0 = untimed (host advances manually). */
  searchSeconds: number;
}

// ---------- case file schema (data, not code — new cases add an entry) ----------

export interface CaseSuspect {
  id: string;
  name: string;
  role: string;
  bio: string;
  /** Public from the briefing on — the story they tell. */
  alibi: string;
}

export interface CaseLocation {
  id: string;
  name: string;
  description: string;
  /** Searching requires this clue to be found first. Absent = open. */
  lockedByClueId?: string;
}

export interface CaseClue {
  id: string;
  locationId: string;
  title: string;
  detail: string;
}

export interface CaseSecret {
  suspectId: string;
  text: string;
}

export interface CaseWeapon {
  id: string;
  name: string;
}

export interface CaseSolution {
  suspectId: string;
  weaponId: string;
  locationId: string;
}

export interface MysteryCase {
  id: string;
  title: string;
  victim: string;
  brief: string;
  suspects: CaseSuspect[];
  locations: CaseLocation[];
  weapons: CaseWeapon[];
  clues: CaseClue[];
  secrets: CaseSecret[];
  solution: CaseSolution;
}

export interface VerdictAttempt {
  playerId: string;
  playerName: string;
  suspectId: string;
  weaponId: string;
  locationId: string;
  correct: boolean;
}

export interface GameState {
  phase: Phase;
  players: Player[];
  config: GameConfig;
  /** Active case id. Null until the host starts a case. */
  caseId: string | null;
  /** The sealed solution — host memory only, revealed via views at gameOver. */
  solution: CaseSolution | null;
  /** Display order (rng-shuffled at deal time) so replays feel fresh. */
  suspectOrder: string[];
  locationOrder: string[];
  locationsSearched: string[];
  cluesFound: string[];
  secretsRevealed: string[];
  searchLeft: number;
  pressureLeft: number;
  attemptsLeft: number;
  attempts: VerdictAttempt[];
  winner?: 'solved' | 'unsolved';
  /** 1–3 stars, set when solved. */
  stars?: 1 | 2 | 3;
  /** Host-clock deadline (epoch ms) for the search phase. Absent when untimed. */
  searchEndsAt?: number;
}

/** Actions applied by the host (authoritative). Player-originated actions carry the player's id. */
export type Action =
  | { t: 'join'; id: string; name: string; avatar: string; token: string }
  | { t: 'rejoin'; id: string; token: string }
  | { t: 'remove'; id: string; targetId: string }
  | { t: 'disconnect'; id: string }
  | { t: 'setConfig'; id: string; config: GameConfig }
  | { t: 'start'; id: string; caseId: string }
  | { t: 'search'; id: string; locationId: string }
  | { t: 'press'; id: string; suspectId: string }
  | { t: 'advance'; id: string }
  | { t: 'accuse'; id: string; suspectId: string; weaponId: string; locationId: string }
  | { t: 'playAgain'; id: string }
  | { t: 'toLobby'; id: string };

// ---------- wire protocol (for the future net/ layer; same session shape) ----------

/** Messages any device (including the host's own UI) can send. */
export type ClientMessage =
  | { t: 'join'; name: string; avatar: string; rejoin?: { playerId: string; token: string } }
  | { t: 'remove'; targetId: string }
  | { t: 'setConfig'; config: GameConfig }
  | { t: 'start'; caseId: string }
  | { t: 'search'; locationId: string }
  | { t: 'press'; suspectId: string }
  | { t: 'advance' }
  | { t: 'accuse'; suspectId: string; weaponId: string; locationId: string }
  | { t: 'playAgain' }
  | { t: 'toLobby' };

export type HostMessage =
  | { t: 'welcome'; playerId: string; token: string }
  | { t: 'state'; view: PlayerView }
  | { t: 'error'; message: string };

// ---------- personalized view (what a single device is allowed to know) ----------
//
// Co-op game: every investigator sees the same public board. The view still
// excludes the sealed solution (until gameOver), unfound clue details,
// unrevealed secret texts, and all rejoin tokens. Never send raw state.

export interface PublicPlayer {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  connected: boolean;
}

export interface ViewSuspect {
  id: string;
  name: string;
  role: string;
  bio: string;
  alibi: string;
  secretRevealed: boolean;
  /** Only when pressed. */
  secret?: string;
}

export interface ViewLocation {
  id: string;
  name: string;
  description: string;
  searched: boolean;
  /** True while its key clue is still missing. */
  locked: boolean;
}

export interface ViewClue {
  id: string;
  locationId: string;
  title: string;
  detail: string;
}

export interface ViewAttempt {
  playerName: string;
  suspectId: string;
  weaponId: string;
  locationId: string;
  correct: boolean;
}

export interface PlayerView {
  phase: Phase;
  players: PublicPlayer[];
  me: { id: string; name: string; isHost: boolean };
  /** lobby only */
  config?: GameConfig;
  /** lobby only: pickable cases (id + title + victim — never content). */
  cases?: { id: string; title: string; victim: string }[];
  /** briefing onward */
  caseTitle?: string;
  victim?: string;
  brief?: string;
  suspects?: ViewSuspect[];
  locations?: ViewLocation[];
  weapons?: { id: string; name: string }[];
  /** Found clues only. */
  clues?: ViewClue[];
  searchLeft?: number;
  pressureLeft?: number;
  attemptsLeft?: number;
  attempts?: ViewAttempt[];
  /** Search deadline + original length (search phase only, public info). */
  searchEndsAt?: number;
  searchDurationSec?: number;
  winner?: 'solved' | 'unsolved';
  stars?: 1 | 2 | 3;
  /** gameOver only: full solution reveal */
  solution?: CaseSolution;
}
