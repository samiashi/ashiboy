export type Team = 'red' | 'blue';
export type CardKind = 'red' | 'blue' | 'bystander' | 'assassin';
export type Phase = 'lobby' | 'clue' | 'guessing' | 'gameOver';

/** Clue number: 0–9, or 'unlimited' (∞ button). 0 also means unlimited guesses. */
export type ClueNumber = number | 'unlimited';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  /** Secret rejoin token — held only in host memory, never published in views. */
  token: string;
  team: Team | null;
  isSpymaster: boolean;
  isHost: boolean;
  connected: boolean;
}

export interface BoardCard {
  word: string;
  kind: CardKind;
  revealed: boolean;
}

export interface Clue {
  team: Team;
  word: string;
  number: ClueNumber;
}

export interface TurnState {
  team: Team;
  clue: Clue | null;
  guessesMade: number;
}

export interface GameConfig {
  /** Per-turn length in seconds (clue + guesses). 0 = untimed. */
  turnSeconds: number;
}

export interface GameState {
  phase: Phase;
  players: Player[];
  config: GameConfig;
  cards: BoardCard[];
  startingTeam: Team | null;
  turn: TurnState;
  clues: Clue[];
  /** Host-clock deadline (epoch ms) for the current turn. Absent when untimed. */
  turnEndsAt?: number;
  winner?: Team;
}

/** Actions applied by the host (authoritative). Player-originated actions carry the player's id. */
export type Action =
  | { t: 'join'; id: string; name: string; avatar: string; token: string }
  | { t: 'rejoin'; id: string; token: string }
  | { t: 'remove'; id: string; targetId: string }
  | { t: 'disconnect'; id: string }
  | { t: 'setTeam'; id: string; targetId: string; team: Team | null }
  | { t: 'setSpymaster'; id: string; targetId: string; value: boolean }
  | { t: 'randomize'; id: string }
  | { t: 'setConfig'; id: string; config: GameConfig }
  | { t: 'start'; id: string }
  | { t: 'giveClue'; id: string; word: string; number: ClueNumber }
  | { t: 'guess'; id: string; cardIndex: number }
  | { t: 'endTurn'; id: string }
  | { t: 'passTurn'; id: string }
  | { t: 'extendTurn'; id: string }
  | { t: 'playAgain'; id: string };

// ---------- wire protocol ----------

/** Messages any device (including the host's own UI) can send. */
export type ClientMessage =
  | { t: 'join'; name: string; avatar: string; rejoin?: { playerId: string; token: string } }
  | { t: 'remove'; targetId: string }
  | { t: 'setTeam'; targetId: string; team: Team | null }
  | { t: 'setSpymaster'; targetId: string; value: boolean }
  | { t: 'randomize' }
  | { t: 'setConfig'; config: GameConfig }
  | { t: 'start' }
  | { t: 'giveClue'; word: string; number: ClueNumber }
  | { t: 'guess'; cardIndex: number }
  | { t: 'endTurn' }
  | { t: 'passTurn' }
  | { t: 'extendTurn' }
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
  team: Team | null;
  isSpymaster: boolean;
  isHost: boolean;
  connected: boolean;
}

export interface ViewCard {
  word: string;
  revealed: boolean;
  /** Included when revealed (public) or when the viewer is a spymaster (the key). */
  kind?: CardKind;
}

export interface PlayerView {
  phase: Phase;
  players: PublicPlayer[];
  me: {
    id: string;
    name: string;
    avatar: string;
    team: Team | null;
    isSpymaster: boolean;
    isHost: boolean;
  };
  /** lobby only */
  config?: GameConfig;
  /** clue/guessing only */
  turn?: {
    team: Team;
    clue: Clue | null;
    guessesMade: number;
    /** Guesses remaining this turn (null = unlimited). Null before any clue too. */
    guessesLeft: number | null;
  };
  /** clue/guessing/gameOver. Kinds hidden from operatives until revealed. */
  cards?: ViewCard[];
  startingTeam?: Team | null;
  /** All past clues, newest last. */
  clues?: Clue[];
  /** clue/guessing only, when timed. */
  turnEndsAt?: number;
  turnDurationSec?: number;
  winner?: Team;
  /** Remaining unrevealed counts per side (public info). */
  remaining?: Record<Team, number>;
}
