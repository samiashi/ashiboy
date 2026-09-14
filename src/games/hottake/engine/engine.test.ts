import { describe, expect, it } from 'vitest';
import { allPromptIds } from '@/games/hottake/engine/prompts';
import { createLobby, reduce, scoreRows, viewFor } from '@/games/hottake/engine/engine';
import { Action, GameState } from '@/games/hottake/engine/types';

const rng = () => 0.42; // deterministic for tests
const NOW = 1_000_000;
const run = (s: GameState, a: Action, now: number = NOW) => reduce(s, a, rng, now);

const AVATAR = '🎤';

/** Lobby with 3 seated players: host + Ann + Bob. */
function makeLobby(): GameState {
  let s = createLobby('h', 'Host', AVATAR, 'tok-h');
  s = run(s, { t: 'join', id: 'p1', name: 'Ann', avatar: AVATAR, token: 'tok-1' });
  s = run(s, { t: 'join', id: 'p2', name: 'Bob', avatar: AVATAR, token: 'tok-2' });
  return s;
}

const startGame = () => run(makeLobby(), { t: 'start', id: 'h' });

const startShort = () => {
  let s = makeLobby();
  s = run(s, {
    t: 'setConfig',
    id: 'h',
    config: { promptsPerGame: 1, answerSeconds: 60, voteSeconds: 30 },
  });
  return run(s, { t: 'start', id: 'h' });
};

/** Answer one prompt with all seats, landing in voting. */
function toVoting(s: GameState): GameState {
  s = run(s, { t: 'answer', id: 'h', text: 'host joke' });
  s = run(s, { t: 'answer', id: 'p1', text: 'ann joke' });
  return run(s, { t: 'answer', id: 'p2', text: 'bob joke' });
}

/** Vote for a ballot author by id (tests may read state; players never can). */
function voteFor(s: GameState, voterId: string, authorId: string): GameState {
  return run(s, { t: 'vote', id: voterId, seat: s.ballotOrder.indexOf(authorId) });
}

describe('lobby setup', () => {
  it('dedups join names like the other games', () => {
    let s = makeLobby();
    s = run(s, { t: 'join', id: 'p3', name: 'Ann', avatar: AVATAR, token: 'tok-3' });
    expect(s.players.find((p) => p.id === 'p3')?.name).toBe('Ann 2');
  });

  it('refuses to start below 3 players', () => {
    let s = createLobby('h', 'Host', AVATAR, 'tok-h');
    s = run(s, { t: 'start', id: 'h' });
    expect(s.phase).toBe('lobby');
  });

  it('deals unique prompts, zeroes scores, and sets a deadline', () => {
    const s = startGame();
    expect(s.phase).toBe('answering');
    expect(s.promptOrder).toHaveLength(3);
    expect(new Set(s.promptOrder).size).toBe(3);
    expect(s.promptOrder.every((id) => allPromptIds().includes(id))).toBe(true);
    expect(s.scores).toEqual({ h: 0, p1: 0, p2: 0 });
    expect(s.answerEndsAt).toBe(NOW + 60_000);
  });

  it('is deterministic for a fixed seed', () => {
    expect(startGame()).toEqual(startGame());
  });

  it('clamps config values', () => {
    let s = makeLobby();
    s = run(s, {
      t: 'setConfig',
      id: 'h',
      config: { promptsPerGame: 99, answerSeconds: -5, voteSeconds: 999 },
    });
    expect(s.config).toEqual({ promptsPerGame: 5, answerSeconds: 0, voteSeconds: 120 });
  });

  it('only the host drives setup and rejoin restores seats', () => {
    const lobby = makeLobby();
    expect(run(lobby, { t: 'start', id: 'p1' })).toBe(lobby);
    expect(run(lobby, { t: 'advance', id: 'p1' })).toBe(lobby);
    let s = startGame();
    s = run(s, { t: 'disconnect', id: 'p1' });
    s = run(s, { t: 'rejoin', id: 'p1', token: 'tok-1' });
    expect(s.players.find((p) => p.id === 'p1')?.connected).toBe(true);
  });

  it('ignores joins after the deal', () => {
    let s = startGame();
    s = run(s, { t: 'join', id: 'late', name: 'Late', avatar: AVATAR, token: 'tok' });
    expect(s.players).toHaveLength(3);
  });
});

describe('answering', () => {
  it('stores and overwrites answers, last tap wins', () => {
    let s = startGame();
    s = run(s, { t: 'answer', id: 'p1', text: 'first' });
    s = run(s, { t: 'answer', id: 'p1', text: 'second' });
    expect(s.answers['p1']).toBe('second');
    expect(s.phase).toBe('answering');
  });

  it('treats empty submits as take-backs', () => {
    let s = startGame();
    s = run(s, { t: 'answer', id: 'p1', text: 'joke' });
    s = run(s, { t: 'answer', id: 'p1', text: '   ' });
    expect(s.answers['p1']).toBeUndefined();
  });

  it('opens voting by itself once everyone connected has answered', () => {
    const s = toVoting(startGame());
    expect(s.phase).toBe('voting');
    expect(s.ballotOrder).toHaveLength(3);
    expect(s.votes).toEqual({});
    expect(s.voteEndsAt).toBe(NOW + 30_000);
  });

  it('never waits on disconnected players', () => {
    let s = startGame();
    s = run(s, { t: 'disconnect', id: 'p2' });
    s = run(s, { t: 'answer', id: 'h', text: 'host joke' });
    s = run(s, { t: 'answer', id: 'p1', text: 'ann joke' });
    expect(s.phase).toBe('voting');
    expect(s.ballotOrder).toHaveLength(2);
  });

  it('blanks the missing when the host closes early', () => {
    let s = startGame();
    s = run(s, { t: 'answer', id: 'h', text: 'host joke' });
    s = run(s, { t: 'advance', id: 'h' });
    expect(s.phase).toBe('voting');
    expect(s.ballotOrder).toEqual(['h']);
  });

  it('records an empty round when nobody wrote anything', () => {
    let s = startShort();
    s = run(s, { t: 'advance', id: 'h' });
    expect(s.phase).toBe('scoreboard');
    expect(s.history).toHaveLength(1);
    expect(s.history[0].entries).toEqual([]);
    // …and the night goes on to the verdict screen regardless.
    s = run(s, { t: 'advance', id: 'h' });
    expect(s.phase).toBe('gameOver');
  });

  it('drops ejected seats from the ballot', () => {
    let s = startGame();
    s = run(s, { t: 'answer', id: 'p2', text: 'bob joke' });
    s = run(s, { t: 'remove', id: 'h', targetId: 'p2' });
    s = run(s, { t: 'answer', id: 'h', text: 'host joke' });
    s = run(s, { t: 'advance', id: 'h' });
    expect(s.ballotOrder).toEqual(['h']);
  });
});

describe('voting', () => {
  it('ignores self-votes and unknown seats', () => {
    let s = toVoting(startGame());
    const before = s;
    s = voteFor(s, 'p1', 'p1');
    expect(s).toBe(before);
    s = run(s, { t: 'vote', id: 'p1', seat: 99 });
    expect(s).toBe(before);
    expect(s.votes).toEqual({});
  });

  it('lets voters change their mind, last tap wins', () => {
    let s = toVoting(startGame());
    s = voteFor(s, 'p1', 'h');
    s = voteFor(s, 'p1', 'p2');
    expect(s.votes['p1']).toBe(s.ballotOrder.indexOf('p2'));
    expect(s.phase).toBe('voting');
  });

  it('tallies 100 points a vote once everyone connected has voted', () => {
    let s = toVoting(startGame());
    s = voteFor(s, 'h', 'p1');
    s = voteFor(s, 'p1', 'p2');
    s = voteFor(s, 'p2', 'p1');
    expect(s.phase).toBe('scoreboard');
    expect(s.scores['p1']).toBe(200);
    expect(s.scores['p2']).toBe(100);
    expect(s.scores['h']).toBe(0);
    const result = s.history[0];
    expect(result.voterCount).toBe(3);
    expect(result.entries.find((e) => e.authorId === 'p1')).toMatchObject({
      authorName: 'Ann',
      text: 'ann joke',
      votes: 2,
    });
  });

  it('lets blank authors still vote', () => {
    let s = startGame();
    s = run(s, { t: 'answer', id: 'h', text: 'host joke' });
    s = run(s, { t: 'advance', id: 'h' });
    s = voteFor(s, 'p1', 'h');
    s = voteFor(s, 'p2', 'h');
    s = voteFor(s, 'h', 'h'); // self-vote ignored, host still hasn't voted…
    expect(s.phase).toBe('voting');
    // …so a valid stand-in: host has no one else to vote for here but the
    // engine still waits on them rather than stranding the round.
    expect(s.votes['h']).toBeUndefined();
  });
});

describe('scoreboard and game over', () => {
  it('walks prompts in order, then crowns the winner', () => {
    let s = makeLobby();
    s = run(s, {
      t: 'setConfig',
      id: 'h',
      config: { promptsPerGame: 2, answerSeconds: 0, voteSeconds: 0 },
    });
    s = run(s, { t: 'start', id: 'h' });
    s = toVoting(s);
    s = voteFor(s, 'h', 'p1');
    s = voteFor(s, 'p1', 'p2');
    s = voteFor(s, 'p2', 'p1');
    expect(s.phase).toBe('scoreboard');
    s = run(s, { t: 'advance', id: 'h' });
    expect(s.phase).toBe('answering');
    expect(s.promptIndex).toBe(1);
    s = toVoting(s);
    s = voteFor(s, 'h', 'p2');
    s = voteFor(s, 'p1', 'p2');
    s = voteFor(s, 'p2', 'h');
    s = run(s, { t: 'advance', id: 'h' });
    expect(s.phase).toBe('gameOver');
    expect(s.winners).toEqual(['p2']);
    expect(scoreRows(s).map((r) => [r.id, r.score])).toEqual([
      ['p2', 300],
      ['p1', 200],
      ['h', 100],
    ]);
  });

  it('shares the crown on a tie', () => {
    let s = toVoting(startShort());
    s = voteFor(s, 'h', 'p1');
    s = voteFor(s, 'p1', 'p2');
    s = voteFor(s, 'p2', 'h');
    s = run(s, { t: 'advance', id: 'h' });
    expect(s.phase).toBe('gameOver');
    expect([...s.winners].sort()).toEqual(['h', 'p1', 'p2']);
  });

  it('rematches back to a clean lobby', () => {
    let s = toVoting(startShort());
    s = voteFor(s, 'h', 'p1');
    s = voteFor(s, 'p1', 'p2');
    s = voteFor(s, 'p2', 'p1');
    s = run(s, { t: 'advance', id: 'h' });
    s = run(s, { t: 'playAgain', id: 'h' });
    expect(s.phase).toBe('lobby');
    expect(s.players).toHaveLength(3);
    expect(s.promptOrder).toEqual([]);
    expect(s.scores).toEqual({});
    expect(s.history).toEqual([]);
  });
});

describe('view privacy', () => {
  it('seals other players’ texts while answering', () => {
    let s = startGame();
    s = run(s, { t: 'answer', id: 'p2', text: 'XYZZY-PLUGH secret joke' });
    const dumped = JSON.stringify(viewFor(s, 'p1'));
    expect(dumped).not.toContain('XYZZY-PLUGH');
    expect(dumped).not.toContain('tok-');
    expect(dumped).not.toContain('"answers"');
    // …but your own draft comes back to you.
    expect(JSON.stringify(viewFor(s, 'p2'))).toContain('XYZZY-PLUGH');
  });

  it('keeps the ballot anonymous while voting', () => {
    const s = toVoting(startGame());
    const dumped = JSON.stringify(viewFor(s, 'p1'));
    expect(dumped).toContain('ann joke');
    expect(dumped).not.toContain('"authorId"');
    expect(dumped).not.toContain('"votes"');
    expect(dumped).not.toContain('tok-');
  });

  it('reveals authorship only on the scoreboard', () => {
    let s = toVoting(startGame());
    s = voteFor(s, 'h', 'p1');
    s = voteFor(s, 'p1', 'p2');
    s = voteFor(s, 'p2', 'p1');
    const view = viewFor(s, 'p2');
    expect(view.lastResult?.entries.find((e) => e.authorId === 'p1')).toMatchObject({
      authorName: 'Ann',
      votes: 2,
    });
    expect(JSON.stringify(view)).not.toContain('tok-');
  });

  it('never leaks tokens in any phase', () => {
    let s = startGame();
    const phases: GameState[] = [s];
    s = toVoting(s);
    phases.push(s);
    s = voteFor(s, 'h', 'p1');
    s = voteFor(s, 'p1', 'p2');
    s = voteFor(s, 'p2', 'h');
    phases.push(s);
    s = run(s, { t: 'advance', id: 'h' });
    phases.push(s);
    for (const state of phases) {
      for (const p of ['h', 'p1', 'p2']) {
        expect(JSON.stringify(viewFor(state, p))).not.toContain('tok-');
      }
    }
  });
});
