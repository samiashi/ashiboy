import { describe, expect, it } from 'vitest';
import {
  createLobby,
  dealBoard,
  guessLimit,
  reduce,
  viewFor,
} from '@/games/codenames/engine/engine';
import { Action, GameState } from '@/games/codenames/engine/types';
import { WORDS } from '@/games/codenames/engine/words';

const rng = () => 0.42; // deterministic for tests
const NOW = 1_000_000;
const run = (s: GameState, a: Action, now: number = NOW) => reduce(s, a, rng, now);

const AVATAR = '🦊';

/** Lobby with 6 seated players: h/Ann/Bob red (h spymaster), Cat/Dan/Eve blue (Cat spymaster). */
function makeLobby(): GameState {
  let s = createLobby('h', 'Host', AVATAR, 'tok-h');
  const names = ['Ann', 'Bob', 'Cat', 'Dan', 'Eve'];
  names.forEach((name, i) => {
    s = run(s, { t: 'join', id: `p${i + 1}`, name, avatar: AVATAR, token: `tok${i + 1}` });
  });
  for (const [pid, team] of [
    ['h', 'red'],
    ['p1', 'red'],
    ['p2', 'red'],
    ['p3', 'blue'],
    ['p4', 'blue'],
    ['p5', 'blue'],
  ] as const) {
    s = run(s, { t: 'setTeam', id: 'h', targetId: pid, team });
  }
  s = run(s, { t: 'setSpymaster', id: 'h', targetId: 'h', value: true });
  s = run(s, { t: 'setSpymaster', id: 'h', targetId: 'p3', value: true });
  return s;
}

const startGame = () => run(makeLobby(), { t: 'start', id: 'h' });

const spymasterOf = (s: GameState, team: string) =>
  s.players.find((p) => p.team === team && p.isSpymaster)!.id;
const operativeOf = (s: GameState, team: string) =>
  s.players.find((p) => p.team === team && !p.isSpymaster)!.id;
const unrevealed = (s: GameState, kind: string) =>
  s.cards.map((c, i) => ({ ...c, i })).filter((c) => c.kind === kind && !c.revealed);

function giveClue(s: GameState, word = 'testword', number: number | 'unlimited' = 2) {
  return run(s, { t: 'giveClue', id: spymasterOf(s, s.turn.team), word, number });
}

describe('board deal', () => {
  it('deals 25 unique words with 9/8/7/1 key counts', () => {
    const s = startGame();
    expect(s.phase).toBe('clue');
    expect(s.cards).toHaveLength(25);
    const words = s.cards.map((c) => c.word);
    expect(new Set(words).size).toBe(25);
    expect(words.every((w) => WORDS.includes(w))).toBe(true);
    const count = (k: string) => s.cards.filter((c) => c.kind === k).length;
    expect(count(s.startingTeam!)).toBe(9);
    expect(count(s.startingTeam === 'red' ? 'blue' : 'red')).toBe(8);
    expect(count('bystander')).toBe(7);
    expect(count('assassin')).toBe(1);
    expect(s.turn.team).toBe(s.startingTeam);
    expect(s.turnEndsAt).toBe(NOW + 180_000);
  });

  it('dealBoard is deterministic given an rng', () => {
    const a = dealBoard(WORDS, 'red', rng);
    const b = dealBoard(WORDS, 'red', rng);
    expect(a).toEqual(b);
  });
});

describe('lobby setup', () => {
  it('refuses to start below 4 players', () => {
    let s = createLobby('h', 'Host', AVATAR, 'tok');
    s = run(s, { t: 'start', id: 'h' });
    expect(s.phase).toBe('lobby');
  });

  it('requires exactly one spymaster and an operative per team', () => {
    let s = makeLobby();
    // Drop blue's spymaster.
    s = run(s, { t: 'setSpymaster', id: 'h', targetId: 'p3', value: false });
    expect(run(s, { t: 'start', id: 'h' }).phase).toBe('lobby');
  });

  it('lets players join their own team, host moves anyone', () => {
    let s = makeLobby();
    // Guest cannot move someone else.
    const before = s;
    s = run(s, { t: 'setTeam', id: 'p1', targetId: 'p2', team: 'blue' });
    expect(s).toBe(before);
    // Guest can move themself.
    s = run(s, { t: 'setTeam', id: 'p2', targetId: 'p2', team: 'blue' });
    expect(s.players.find((p) => p.id === 'p2')?.team).toBe('blue');
  });

  it('randomize splits evenly and clears spymasters', () => {
    let s = makeLobby();
    s = run(s, { t: 'randomize', id: 'h' });
    expect(s.players.filter((p) => p.team === 'red')).toHaveLength(3);
    expect(s.players.filter((p) => p.team === 'blue')).toHaveLength(3);
    expect(s.players.some((p) => p.isSpymaster)).toBe(false);
    // Non-hosts cannot randomize.
    expect(run(s, { t: 'randomize', id: 'p1' })).toBe(s);
  });

  it('ignores joins after the deal', () => {
    let s = startGame();
    s = run(s, { t: 'join', id: 'late', name: 'Late', avatar: AVATAR, token: 'tok' });
    expect(s.players).toHaveLength(6);
  });
});

describe('clues', () => {
  it('accepts a clue from the current spymaster and opens guessing', () => {
    let s = startGame();
    s = giveClue(s, 'animals', 2);
    expect(s.phase).toBe('guessing');
    expect(s.turn.clue).toEqual({ team: s.turn.team, word: 'animals', number: 2 });
    expect(s.clues).toHaveLength(1);
  });

  it('rejects clues from the wrong people and bad input', () => {
    let s = startGame();
    const other = s.turn.team === 'red' ? 'blue' : 'red';
    const before = s;
    // Operative tries.
    s = run(s, { t: 'giveClue', id: operativeOf(s, s.turn.team), word: 'x', number: 1 });
    expect(s).toBe(before);
    // Other team's spymaster tries.
    s = run(s, { t: 'giveClue', id: spymasterOf(s, other), word: 'x', number: 1 });
    expect(s).toBe(before);
    // Empty / multi-word / out-of-range.
    for (const bad of [
      { word: '   ', number: 1 },
      { word: 'two words', number: 1 },
      { word: 'ok', number: 10 },
    ] as const) {
      s = run(s, { t: 'giveClue', id: spymasterOf(s, s.turn.team), ...bad });
      expect(s.phase).toBe('clue');
    }
    // 0 and unlimited are legal.
    s = run(s, { t: 'giveClue', id: spymasterOf(s, s.turn.team), word: 'ok', number: 0 });
    expect(s.phase).toBe('guessing');
  });

  it('guess limits follow the official rules', () => {
    expect(guessLimit({ number: 3 })).toBe(4); // plus-one rule
    expect(guessLimit({ number: 1 })).toBe(2);
    expect(guessLimit({ number: 0 })).toBeNull(); // zero means unlimited
    expect(guessLimit({ number: 'unlimited' })).toBeNull();
    expect(guessLimit(null)).toBeNull();
  });
});

describe('guessing', () => {
  it('correct guesses continue, wrong guesses pass the turn', () => {
    let s = giveClue(startGame(), 'test', 2);
    const team = s.turn.team;
    const op = operativeOf(s, team);
    const [first, second] = unrevealed(s, team);
    const [bystander] = unrevealed(s, 'bystander');

    s = run(s, { t: 'guess', id: op, cardIndex: first.i });
    expect(s.phase).toBe('guessing');
    expect(s.turn.guessesMade).toBe(1);

    s = run(s, { t: 'guess', id: op, cardIndex: second.i });
    expect(s.turn.guessesMade).toBe(2);

    s = run(s, { t: 'guess', id: op, cardIndex: bystander.i });
    expect(s.phase).toBe('clue');
    expect(s.turn.team).not.toBe(team);
    expect(s.turn.clue).toBeNull();
  });

  it('enforces the plus-one limit, then passes automatically', () => {
    let s = giveClue(startGame(), 'test', 1); // 2 guesses max
    const team = s.turn.team;
    const op = operativeOf(s, team);
    const own = unrevealed(s, team);
    s = run(s, { t: 'guess', id: op, cardIndex: own[0].i });
    expect(s.phase).toBe('guessing');
    s = run(s, { t: 'guess', id: op, cardIndex: own[1].i });
    expect(s.phase).toBe('clue'); // limit reached
  });

  it('a 0 clue allows unlimited correct guesses', () => {
    let s = giveClue(startGame(), 'test', 0);
    const team = s.turn.team;
    const op = operativeOf(s, team);
    const own = unrevealed(s, team);
    for (const card of own.slice(0, 3)) s = run(s, { t: 'guess', id: op, cardIndex: card.i });
    expect(s.phase).toBe('guessing');
    expect(s.turn.guessesMade).toBe(3);
  });

  it('requires at least one guess before ending the turn', () => {
    let s = giveClue(startGame(), 'test', 2);
    const before = s;
    s = run(s, { t: 'endTurn', id: operativeOf(s, s.turn.team) });
    expect(s).toBe(before);
    const [first] = unrevealed(s, s.turn.team);
    s = run(s, { t: 'guess', id: operativeOf(s, s.turn.team), cardIndex: first.i });
    s = run(s, { t: 'endTurn', id: operativeOf(s, s.turn.team) });
    expect(s.phase).toBe('clue');
  });

  it('opponent words count for them and pass the turn', () => {
    let s = giveClue(startGame(), 'test', 3);
    const team = s.turn.team;
    const other = team === 'red' ? 'blue' : 'red';
    const otherBefore = unrevealed(s, other).length;
    const [gift] = unrevealed(s, other);
    s = run(s, { t: 'guess', id: operativeOf(s, team), cardIndex: gift.i });
    expect(s.phase).toBe('clue');
    expect(unrevealed(s, other)).toHaveLength(otherBefore - 1);
  });

  it('rejects guesses from spymasters, the other team, and covered cards', () => {
    let s = giveClue(startGame(), 'test', 2);
    const team = s.turn.team;
    const other = team === 'red' ? 'blue' : 'red';
    const [first] = unrevealed(s, team);
    const before = s;
    s = run(s, { t: 'guess', id: spymasterOf(s, team), cardIndex: first.i });
    expect(s).toBe(before);
    s = run(s, { t: 'guess', id: operativeOf(s, other), cardIndex: first.i });
    expect(s).toBe(before);
    s = run(s, { t: 'guess', id: operativeOf(s, team), cardIndex: first.i });
    s = run(s, { t: 'guess', id: operativeOf(s, team), cardIndex: first.i }); // already revealed
    expect(s.turn.guessesMade).toBe(1);
  });
});

describe('winning', () => {
  it('wins immediately when the last word is covered', () => {
    let s = giveClue(startGame(), 'test', 9);
    const team = s.turn.team;
    const op = operativeOf(s, team);
    for (const card of unrevealed(s, team)) {
      s = run(s, { t: 'guess', id: op, cardIndex: card.i });
    }
    expect(s.phase).toBe('gameOver');
    expect(s.winner).toBe(team);
  });

  it('wins on the opponent’s turn when they gift the last word', () => {
    let s = startGame();
    const team = s.turn.team;
    // Clear all but one of our words, then end the turn early.
    s = giveClue(s, 'test', 8);
    const op = operativeOf(s, team);
    const own = unrevealed(s, team);
    for (const card of own.slice(0, 8)) s = run(s, { t: 'guess', id: op, cardIndex: card.i });
    s = run(s, { t: 'endTurn', id: op });
    expect(s.phase).toBe('clue');

    // Opponent's operative touches our last word.
    const other = team === 'red' ? 'blue' : 'red';
    s = run(s, {
      t: 'giveClue',
      id: spymasterOf(s, other),
      word: 'oops',
      number: 1,
    });
    const [last] = unrevealed(s, team);
    s = run(s, { t: 'guess', id: operativeOf(s, other), cardIndex: last.i });
    expect(s.phase).toBe('gameOver');
    expect(s.winner).toBe(team);
  });

  it('touching the assassin loses immediately', () => {
    let s = giveClue(startGame(), 'test', 1);
    const team = s.turn.team;
    const other = team === 'red' ? 'blue' : 'red';
    const [boom] = unrevealed(s, 'assassin');
    s = run(s, { t: 'guess', id: operativeOf(s, team), cardIndex: boom.i });
    expect(s.phase).toBe('gameOver');
    expect(s.winner).toBe(other);
  });
});

describe('turn timer', () => {
  it('guest pass is rejected before expiry, accepted after', () => {
    let s = giveClue(startGame(), 'test', 2);
    const otherOp = operativeOf(s, s.turn.team === 'red' ? 'blue' : 'red');
    const team = s.turn.team;
    expect(run(s, { t: 'passTurn', id: otherOp }, NOW + 10_000).phase).toBe('guessing');
    s = run(s, { t: 'passTurn', id: otherOp }, NOW + 200_000);
    expect(s.phase).toBe('clue');
    expect(s.turn.team).not.toBe(team);
  });

  it('host passes and extends anytime', () => {
    let s = giveClue(startGame(), 'test', 2);
    s = run(s, { t: 'extendTurn', id: 'h' });
    expect(s.turnEndsAt).toBe(NOW + 240_000);
    const team = s.turn.team;
    s = run(s, { t: 'passTurn', id: 'h' });
    expect(s.turn.team).not.toBe(team);
    expect(s.turn.clue).toBeNull();
  });

  it('untimed games have no deadline', () => {
    let s = makeLobby();
    s = run(s, { t: 'setConfig', id: 'h', config: { turnSeconds: 0 } });
    s = run(s, { t: 'start', id: 'h' });
    expect(s.turnEndsAt).toBeUndefined();
  });
});

describe('views keep the key secret', () => {
  it('operatives never see unrevealed kinds; spymasters see everything', () => {
    const s = giveClue(startGame(), 'test', 1);
    const opView = viewFor(s, operativeOf(s, s.turn.team));
    expect(opView.cards!.filter((c) => !c.revealed && c.kind !== undefined)).toHaveLength(0);
    const spyView = viewFor(s, spymasterOf(s, s.turn.team));
    expect(spyView.cards!.filter((c) => !c.revealed && c.kind === undefined)).toHaveLength(0);
    expect(JSON.stringify(opView)).not.toContain('assassin');
  });

  it('revealed cards and counts are public', () => {
    let s = giveClue(startGame(), 'test', 1);
    const [first] = unrevealed(s, s.turn.team);
    s = run(s, { t: 'guess', id: operativeOf(s, s.turn.team), cardIndex: first.i });
    const v = viewFor(s, operativeOf(s, s.turn.team === 'red' ? 'blue' : 'red'));
    expect(v.cards!.find((c) => c.word === first.word)?.kind).toBe(first.kind);
    expect(v.remaining!.red + v.remaining!.blue).toBeLessThanOrEqual(17);
    expect(v.clues).toHaveLength(1);
  });

  it('exposes config only in the lobby', () => {
    expect(viewFor(makeLobby(), 'h').config).toEqual({ turnSeconds: 180 });
    expect(viewFor(startGame(), 'h').config).toBeUndefined();
  });
});

describe('rejoin, remove, play again', () => {
  it('a disconnected player rejoins with their token', () => {
    let s = startGame();
    s = run(s, { t: 'disconnect', id: 'p1' });
    s = run(s, { t: 'rejoin', id: 'p1', token: 'tok1' });
    expect(s.players.find((p) => p.id === 'p1')?.connected).toBe(true);
  });

  it('host removes lobby seats', () => {
    let s = makeLobby();
    s = run(s, { t: 'remove', id: 'h', targetId: 'p5' });
    expect(s.players.map((p) => p.id)).not.toContain('p5');
  });

  it('play again keeps teams, deals a fresh board', () => {
    let s = giveClue(startGame(), 'test', 1);
    const [boom] = unrevealed(s, 'assassin');
    s = run(s, { t: 'guess', id: operativeOf(s, s.turn.team), cardIndex: boom.i });
    expect(s.phase).toBe('gameOver');
    const teamsBefore = s.players.map((p) => [p.id, p.team, p.isSpymaster]);
    s = run(s, { t: 'playAgain', id: 'h' });
    expect(s.phase).toBe('lobby');
    expect(s.players.map((p) => [p.id, p.team, p.isSpymaster])).toEqual(teamsBefore);
    expect(s.cards).toHaveLength(0);
    expect(s.winner).toBeUndefined();
  });
});
