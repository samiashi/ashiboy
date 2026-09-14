import { describe, expect, it } from 'vitest';
import { CASES } from '@/games/mystery/engine/cases';
import { createLobby, reduce, viewFor } from '@/games/mystery/engine/engine';
import { Action, GameState } from '@/games/mystery/engine/types';

const rng = () => 0.17; // a different fixed seed from engine.test.ts
const NOW = 2_000_000;
const run = (s: GameState, a: Action, now: number = NOW) => reduce(s, a, rng, now);

/** Lobby with 4 seated players: host + Ann + Bob + Cat. */
function makeTable(): GameState {
  let s = createLobby('h', 'Host', '🔍', 'tok-h');
  s = run(s, { t: 'join', id: 'p1', name: 'Ann', avatar: '🦊', token: 'tok-1' });
  s = run(s, { t: 'join', id: 'p2', name: 'Bob', avatar: '🐼', token: 'tok-2' });
  s = run(s, { t: 'join', id: 'p3', name: 'Cat', avatar: '🐸', token: 'tok-3' });
  return s;
}

/**
 * A scripted game night at one table, end to end on the second case file:
 * four seats join, a phone dies mid-search and rejoins, the host advances
 * early, the team misses once, solves, and rematches. Proves the room flows
 * work identically for every case in the list — real multi-device radio
 * behavior (PeerJS connect/reconnect) still needs physical phones on game
 * night; everything the engine owns is covered here.
 */
describe('full table night (The Final Curtain)', () => {
  it('plays lobby → search → alibis → verdict → rematch with a mid-game rejoin', () => {
    // Lobby: host + three guests.
    let s = makeTable();
    expect(s.players).toHaveLength(4);

    // The case opens; nobody's view leaks the solution.
    s = run(s, { t: 'start', id: 'h', caseId: 'curtain' });
    expect(s.phase).toBe('briefing');
    expect(s.caseId).toBe('curtain');
    expect(JSON.stringify(viewFor(s, 'p1'))).not.toContain('"solution"');

    // Search: two rooms turned over, then a locked door holds.
    s = run(s, { t: 'advance', id: 'h' });
    expect(s.phase).toBe('search');
    s = run(s, { t: 'search', id: 'p1', locationId: 'stage' });
    expect(s.cluesFound).toEqual(expect.arrayContaining(['goblet', 'chalkline']));
    const lockedOut = run(s, { t: 'search', id: 'p2', locationId: 'props' });
    expect(lockedOut).toBe(s);

    // Bob's phone dies mid-search; the seat waits, then he reclaims it.
    s = run(s, { t: 'disconnect', id: 'p2' });
    expect(s.players.find((p) => p.id === 'p2')?.connected).toBe(false);
    s = run(s, { t: 'search', id: 'p3', locationId: 'dressing' });
    expect(s.cluesFound).toContain('key-iron');
    s = run(s, { t: 'rejoin', id: 'p2', token: 'tok-2' });
    expect(s.players.find((p) => p.id === 'p2')?.connected).toBe(true);

    // Bob uses the found key on the prop room.
    s = run(s, { t: 'search', id: 'p2', locationId: 'props' });
    expect(s.cluesFound).toEqual(expect.arrayContaining(['bottle', 'shawl']));

    // Host advances early with tokens unspent — the night never stalls.
    s = run(s, { t: 'advance', id: 'h' });
    expect(s.phase).toBe('alibis');
    expect(s.searchLeft).toBe(3);

    // Alibis: one press cracks the director; host calls the verdict.
    s = run(s, { t: 'press', id: 'p1', suspectId: 'petra' });
    expect(viewFor(s, 'p3').suspects?.find((x) => x.id === 'petra')?.secret).toContain('prop room');
    s = run(s, { t: 'advance', id: 'h' });
    expect(s.phase).toBe('accusation');

    // Verdict: a public miss, then the solve — second try, tokens banked.
    s = run(s, {
      t: 'accuse',
      id: 'p3',
      suspectId: 'marcus',
      weaponId: 'dagger',
      locationId: 'gallery',
    });
    expect(s.phase).toBe('accusation');
    expect(s.attemptsLeft).toBe(1);
    s = run(s, {
      t: 'accuse',
      id: 'p1',
      suspectId: 'petra',
      weaponId: 'tonic',
      locationId: 'stage',
    });
    expect(s.phase).toBe('gameOver');
    expect(s.winner).toBe('solved');
    expect(s.stars).toBe(2);

    // Game over: every seat sees the same named truth, then a clean rematch.
    const truth = viewFor(s, 'p2');
    expect(truth.solution).toEqual({ suspectId: 'petra', weaponId: 'tonic', locationId: 'stage' });
    s = run(s, { t: 'playAgain', id: 'h' });
    expect(s.phase).toBe('lobby');
    expect(s.players).toHaveLength(4);
    expect(s.cluesFound).toEqual([]);
    expect(s.solution).toBeNull();
  });

  it('opens every case in the picker', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(2);
    for (const c of CASES) {
      const s = run(makeTable(), { t: 'start', id: 'h', caseId: c.id });
      expect(s.phase).toBe('briefing');
      expect(s.caseId).toBe(c.id);
      const view = viewFor(s, 'p1');
      expect(view.caseTitle).toBe(c.title);
      expect(view.suspects).toHaveLength(c.suspects.length);
      expect(view.locations).toHaveLength(c.locations.length);
    }
  });
});
