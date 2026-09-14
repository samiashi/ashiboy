export type Phase =
  | 'lobby' // players joining, host configures
  | 'answering' // everyone writes an answer to the shared prompt
  | 'voting' // anonymous ballot, vote for the funniest (not your own)
  | 'scoreboard' // authorship + votes revealed, running totals
  | 'gameOver'; // podium + full history

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
  /** Prompts per game. */
  promptsPerGame: number;
  /** Answering length in seconds. 0 = untimed (host closes manually). */
  answerSeconds: number;
  /** Voting length in seconds. 0 = untimed (host closes manually). */
  voteSeconds: number;
}

export interface Prompt {
  id: string;
  text: string;
}

export interface RoundEntry {
  authorId: string;
  authorName: string;
  text: string;
  votes: number;
}

export interface RoundResult {
  promptId: string;
  promptText: string;
  entries: RoundEntry[];
  voterCount: number;
}

export interface GameState {
  phase: Phase;
  players: Player[];
  config: GameConfig;
  /** rng-shuffled prompt ids for this game. Empty until start. */
  promptOrder: string[];
  promptIndex: number;
  /** Current prompt's non-blank answer authors (rng-shuffled ballot order). */
  ballotOrder: string[];
  /** playerId -> answer text for the current prompt. */
  answers: Record<string, string>;
  /** voterId -> ballot seat index for the current prompt. */
  votes: Record<string, number>;
  scores: Record<string, number>;
  history: RoundResult[];
  /** Winner ids, set at gameOver (ties share the crown). */
  winners: string[];
  /** Host-clock deadline (epoch ms) for answering. Absent when untimed. */
  answerEndsAt?: number;
  /** Host-clock deadline (epoch ms) for voting. Absent when untimed. */
  voteEndsAt?: number;
}

/** Actions applied by the host (authoritative). Player-originated actions carry the player's id. */
export type Action =
  | { t: 'join'; id: string; name: string; avatar: string; token: string }
  | { t: 'rejoin'; id: string; token: string }
  | { t: 'remove'; id: string; targetId: string }
  | { t: 'disconnect'; id: string }
  | { t: 'setConfig'; id: string; config: GameConfig }
  | { t: 'start'; id: string }
  | { t: 'answer'; id: string; text: string }
  | { t: 'vote'; id: string; seat: number }
  | { t: 'advance'; id: string }
  | { t: 'playAgain'; id: string };

// ---------- wire protocol (for the future net/ layer; same session shape) ----------

/** Messages any device (including the host's own UI) can send. */
export type ClientMessage =
  | { t: 'join'; name: string; avatar: string; rejoin?: { playerId: string; token: string } }
  | { t: 'remove'; targetId: string }
  | { t: 'setConfig'; config: GameConfig }
  | { t: 'start' }
  | { t: 'answer'; text: string }
  | { t: 'vote'; seat: number }
  | { t: 'advance' }
  | { t: 'playAgain' };

export type HostMessage =
  | { t: 'welcome'; playerId: string; token: string }
  | { t: 'state'; view: PlayerView }
  | { t: 'error'; message: string };

// ---------- personalized view (what a single device is allowed to know) ----------
//
// The secrets here are texts and authorship: answers stay sealed while
// writing, and the ballot stays anonymous while voting. Never send raw state.

export interface PublicPlayer {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  connected: boolean;
}

export interface BallotItem {
  seat: number;
  text: string;
}

export interface ScoreRow {
  id: string;
  name: string;
  score: number;
}

export interface PlayerView {
  phase: Phase;
  players: PublicPlayer[];
  me: { id: string; name: string; isHost: boolean };
  /** lobby only */
  config?: GameConfig;
  /** answering/voting/scoreboard: 1-based progress through the game. */
  promptNumber?: number;
  promptsTotal?: number;
  /** answering/voting: the shared prompt text. */
  promptText?: string;
  /** answering only */
  myText?: string;
  submittedIds?: string[];
  answerEndsAt?: number;
  answerDurationSec?: number;
  /** voting only: anonymous ballot + my own vote + who has voted. */
  ballot?: BallotItem[];
  myVote?: number | null;
  voterIds?: string[];
  voteEndsAt?: number;
  voteDurationSec?: number;
  /** scoreboard only: the just-finished round, fully revealed. */
  lastResult?: RoundResult;
  /** scoreboard/gameOver: running totals, highest first. */
  scores?: ScoreRow[];
  /** gameOver only */
  history?: RoundResult[];
  winners?: { id: string; name: string }[];
}
