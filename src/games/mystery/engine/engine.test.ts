import { describe, expect, it } from 'vitest';
import { CASES, getCase } from '@/games/mystery/engine/cases';
import { createLobby, reduce, suggestConfig, viewFor } from '@/games/mystery/engine/engine';
import { Action, GameState } from '@/games/mystery/engine/types';

const rng = () => 0.42; // deterministic for tests
const NOW = 1_000_000;
const run = (s: GameState, a: Action, now: number = NOW) => reduce(s, a, rng, now);

const AVATAR = '🔍';
const CORRECT = { suspectId: 'wren', weaponId: 'laudanum', locationId: 'conservatory' };

/** Lobby with 3 seated players: host + Ann + Bob. */
function makeLobby(): GameState {
  let s = createLobby('h', 'Host', AVATAR, 'tok-h');
  s = run(s, { t: 'join', id: 'p1', name: 'Ann', avatar: AVATAR, token: 'tok-1' });
  s = run(s, { t: 'join', id: 'p2', name: 'Bob', avatar: AVATAR, token: 'tok-2' });
  return s;
}

const startCase = (s: GameState, caseId = 'masquerade') => run(s, { t: 'start', id: 'h', caseId });
const toSearch = () => run(startCase(makeLobby()), { t: 'advance', id: 'h' });
const toAlibis = () => run(toSearch(), { t: 'advance', id: 'h' });
const toAccusation = () => run(toAlibis(), { t: 'advance', id: 'h' });

describe('case data integrity', () => {
  it('ships at least one case whose solution references real entries', () => {
    expect(CASES.length).toBeGreaterThan(0);
    for (const c of CASES) {
      expect(c.suspects.map((s) => s.id)).toContain(c.solution.suspectId);
      expect(c.weapons.map((w) => w.id)).toContain(c.solution.weaponId);
      expect(c.locations.map((l) => l.id)).toContain(c.solution.locationId);
      for (const clue of c.clues) {
        expect(c.locations.map((l) => l.id)).toContain(clue.locationId);
      }
      for (const secret of c.secrets) {
        expect(c.suspects.map((s) => s.id)).toContain(secret.suspectId);
      }
      for (const loc of c.locations) {
        if (loc.lockedByClueId) {
          expect(c.clues.map((cl) => cl.id)).toContain(loc.lockedByClueId);
        }
      }
    }
  });
});

describe('lobby setup', () => {
  it('dedups join names like the other games', () => {
    let s = makeLobby();
    s = run(s, { t: 'join', id: 'p3', name: 'Ann', avatar: AVATAR, token: 'tok-3' });
    expect(s.players.find((p) => p.id === 'p3')?.name).toBe('Ann 2');
  });

  it('starts solo with just the host', () => {
    const solo = createLobby('h', 'Host', AVATAR, 'tok-h');
    const s = run(solo, { t: 'start', id: 'h', caseId: 'masquerade' });
    expect(s.phase).toBe('briefing');
    expect(s.players).toHaveLength(1);
  });

  it('a solo detective can work the whole case', () => {
    let s = run(createLobby('h', 'Host', AVATAR, 'tok-h'), {
      t: 'start',
      id: 'h',
      caseId: 'masquerade',
    });
    s = run(s, { t: 'advance', id: 'h' });
    s = run(s, { t: 'search', id: 'h', locationId: 'conservatory' });
    s = run(s, { t: 'advance', id: 'h' });
    expect(s.phase).toBe('alibis');
    s = run(s, { t: 'press', id: 'h', suspectId: 'wren' });
    s = run(s, { t: 'advance', id: 'h' });
    expect(s.phase).toBe('accusation');
    s = run(s, {
      t: 'accuse',
      id: 'h',
      suspectId: 'wren',
      weaponId: 'laudanum',
      locationId: 'conservatory',
    });
    expect(s.phase).toBe('gameOver');
    expect(s.winner).toBe('solved');
  });

  it('rejects unknown case ids', () => {
    expect(startCase(makeLobby(), 'nope').phase).toBe('lobby');
  });

  it('deals tokens from config and seals the solution at start', () => {
    const s = startCase(makeLobby());
    expect(s.phase).toBe('briefing');
    expect(s.caseId).toBe('masquerade');
    expect(s.solution).toEqual(getCase('masquerade')!.solution);
    expect(s.searchLeft).toBe(6);
    expect(s.pressureLeft).toBe(3);
    expect(s.attemptsLeft).toBe(2);
  });

  it('is deterministic for a fixed seed and shuffles display order', () => {
    const a = startCase(makeLobby());
    const b = startCase(makeLobby());
    expect(a).toEqual(b);
    const ids = getCase('masquerade')!
      .suspects.map((s) => s.id)
      .sort();
    expect([...a.suspectOrder].sort()).toEqual(ids);
  });

  it('clamps config values', () => {
    let s = makeLobby();
    s = run(s, {
      t: 'setConfig',
      id: 'h',
      config: { searchTokens: 99, pressureTokens: 99, accusationAttempts: 0, searchSeconds: -5 },
    });
    expect(s.config).toEqual({
      searchTokens: 12,
      pressureTokens: 6,
      accusationAttempts: 1,
      searchSeconds: 0,
    });
  });

  it('only the host drives setup and rejoin restores seats', () => {
    const lobby = makeLobby();
    expect(run(lobby, { t: 'start', id: 'p1', caseId: 'masquerade' })).toBe(lobby);
    expect(run(lobby, { t: 'advance', id: 'p1' })).toBe(lobby);
    let s = toSearch();
    s = run(s, { t: 'disconnect', id: 'p1' });
    expect(s.players.find((p) => p.id === 'p1')?.connected).toBe(false);
    s = run(s, { t: 'rejoin', id: 'p1', token: 'tok-1' });
    expect(s.players.find((p) => p.id === 'p1')?.connected).toBe(true);
  });

  it('ignores joins after the case starts', () => {
    let s = toSearch();
    s = run(s, { t: 'join', id: 'late', name: 'Late', avatar: AVATAR, token: 'tok' });
    expect(s.players).toHaveLength(3);
  });
});

describe('search mini-game', () => {
  it('sets a search deadline when timed, none when untimed', () => {
    expect(toSearch().searchEndsAt).toBe(NOW + 180_000);
    let s = makeLobby();
    s = run(s, {
      t: 'setConfig',
      id: 'h',
      config: { ...suggestConfig(), searchSeconds: 0 },
    });
    s = run(run(s, { t: 'start', id: 'h', caseId: 'masquerade' }), { t: 'advance', id: 'h' });
    expect(s.searchEndsAt).toBeUndefined();
  });

  it('reveals a location’s clues for one token', () => {
    let s = toSearch();
    s = run(s, { t: 'search', id: 'p1', locationId: 'conservatory' });
    expect(s.searchLeft).toBe(5);
    expect(s.locationsSearched).toEqual(['conservatory']);
    expect(s.cluesFound).toEqual(['glass']);
  });

  it('ignores re-searches without charging', () => {
    let s = toSearch();
    s = run(s, { t: 'search', id: 'p1', locationId: 'conservatory' });
    const before = s;
    s = run(s, { t: 'search', id: 'p2', locationId: 'conservatory' });
    expect(s).toBe(before);
    expect(s.searchLeft).toBe(5);
  });

  it('keeps the cellar locked until the brass key is found', () => {
    let s = toSearch();
    const before = run(s, { t: 'search', id: 'p1', locationId: 'cellar' });
    expect(before).toBe(s);
    expect(before.searchLeft).toBe(6);
    s = run(s, { t: 'search', id: 'p1', locationId: 'library' });
    expect(s.cluesFound).toContain('key-brass');
    s = run(s, { t: 'search', id: 'p1', locationId: 'cellar' });
    expect(s.locationsSearched).toContain('cellar');
    expect(s.cluesFound).toEqual(expect.arrayContaining(['vial', 'handkerchief']));
  });

  it('auto-advances to alibis on the last token', () => {
    let s = makeLobby();
    s = run(s, {
      t: 'setConfig',
      id: 'h',
      config: { ...suggestConfig(), searchTokens: 1 },
    });
    s = run(run(s, { t: 'start', id: 'h', caseId: 'masquerade' }), { t: 'advance', id: 'h' });
    s = run(s, { t: 'search', id: 'p1', locationId: 'conservatory' });
    expect(s.phase).toBe('alibis');
  });

  it('auto-advances once every location is searched', () => {
    let s = toSearch();
    for (const loc of ['conservatory', 'ballroom', 'library', 'cellar']) {
      s = run(s, { t: 'search', id: 'p1', locationId: loc });
    }
    expect(s.phase).toBe('alibis');
    expect(s.searchLeft).toBe(2);
  });

  it('lets the host advance early', () => {
    expect(run(toSearch(), { t: 'advance', id: 'h' }).phase).toBe('alibis');
  });
});

describe('alibis mini-game', () => {
  it('reveals one secret per pressure', () => {
    let s = toAlibis();
    s = run(s, { t: 'press', id: 'p1', suspectId: 'silas' });
    expect(s.pressureLeft).toBe(2);
    expect(s.secretsRevealed).toEqual(['silas']);
  });

  it('ignores re-presses and unknown suspects without charging', () => {
    let s = toAlibis();
    s = run(s, { t: 'press', id: 'p1', suspectId: 'silas' });
    const before = s;
    s = run(s, { t: 'press', id: 'p2', suspectId: 'silas' });
    expect(s).toBe(before);
    s = run(s, { t: 'press', id: 'p2', suspectId: 'ghost' });
    expect(s).toBe(before);
  });

  it('auto-advances to the verdict when pressure runs out', () => {
    let s = makeLobby();
    s = run(s, {
      t: 'setConfig',
      id: 'h',
      config: { ...suggestConfig(), pressureTokens: 1 },
    });
    s = run(run(s, { t: 'start', id: 'h', caseId: 'masquerade' }), { t: 'advance', id: 'h' });
    s = run(run(s, { t: 'advance', id: 'h' }), { t: 'press', id: 'p1', suspectId: 'wren' });
    expect(s.phase).toBe('accusation');
  });

  it('auto-advances once every suspect is pressed', () => {
    let s = makeLobby();
    s = run(s, {
      t: 'setConfig',
      id: 'h',
      config: { ...suggestConfig(), pressureTokens: 4 },
    });
    s = run(run(s, { t: 'start', id: 'h', caseId: 'masquerade' }), { t: 'advance', id: 'h' });
    s = run(s, { t: 'advance', id: 'h' });
    for (const suspect of ['silas', 'odette', 'wren', 'tomas']) {
      s = run(s, { t: 'press', id: 'p1', suspectId: suspect });
    }
    expect(s.phase).toBe('accusation');
  });
});

describe('verdict mini-game', () => {
  it('ignores verdicts with unknown ids without charging', () => {
    let s = toAccusation();
    const before = s;
    s = run(s, {
      t: 'accuse',
      id: 'p1',
      suspectId: 'ghost',
      weaponId: 'laudanum',
      locationId: 'x',
    });
    expect(s).toBe(before);
    expect(s.attemptsLeft).toBe(2);
  });

  it('logs wrong verdicts publicly and burns an attempt', () => {
    let s = toAccusation();
    s = run(s, {
      t: 'accuse',
      id: 'p1',
      suspectId: 'silas',
      weaponId: 'shears',
      locationId: 'ballroom',
    });
    expect(s.phase).toBe('accusation');
    expect(s.attemptsLeft).toBe(1);
    expect(s.attempts).toHaveLength(1);
    expect(s.attempts[0].correct).toBe(false);
    const view = viewFor(s, 'p2');
    expect(view.attempts).toEqual([
      {
        playerName: 'Ann',
        suspectId: 'silas',
        weaponId: 'shears',
        locationId: 'ballroom',
        correct: false,
      },
    ]);
  });

  it('solves the case with three stars on a clean first verdict', () => {
    let s = toAccusation();
    s = run(s, { t: 'accuse', id: 'p1', ...CORRECT });
    expect(s.phase).toBe('gameOver');
    expect(s.winner).toBe('solved');
    expect(s.stars).toBe(3);
  });

  it('rates a second-try solve lower', () => {
    let s = toAccusation();
    s = run(s, {
      t: 'accuse',
      id: 'p1',
      suspectId: 'silas',
      weaponId: 'shears',
      locationId: 'ballroom',
    });
    s = run(s, { t: 'accuse', id: 'p2', ...CORRECT });
    expect(s.winner).toBe('solved');
    expect(s.stars).toBe(2);
  });

  it('goes cold with a solution reveal on the last wrong verdict', () => {
    let s = toAccusation();
    s = run(s, {
      t: 'accuse',
      id: 'p1',
      suspectId: 'silas',
      weaponId: 'shears',
      locationId: 'ballroom',
    });
    s = run(s, {
      t: 'accuse',
      id: 'p2',
      suspectId: 'odette',
      weaponId: 'opener',
      locationId: 'library',
    });
    expect(s.phase).toBe('gameOver');
    expect(s.winner).toBe('unsolved');
    expect(viewFor(s, 'h').solution).toEqual(CORRECT);
  });

  it('rematches to the same briefing with fresh tokens', () => {
    let s = toAccusation();
    s = run(s, { t: 'accuse', id: 'p1', ...CORRECT });
    s = run(s, { t: 'playAgain', id: 'h' });
    expect(s.phase).toBe('briefing');
    expect(s.caseId).not.toBeNull();
    expect(s.solution).not.toBeNull();
    expect(s.players).toHaveLength(3);
    expect(s.attempts).toEqual([]);
    expect(s.searchLeft).toBe(s.config.searchTokens);
    expect(s.pressureLeft).toBe(s.config.pressureTokens);
  });

  it('returns to the lobby to switch cases', () => {
    let s = toAccusation();
    s = run(s, { t: 'accuse', id: 'p1', ...CORRECT });
    s = run(s, { t: 'toLobby', id: 'h' });
    expect(s.phase).toBe('lobby');
    expect(s.caseId).toBeNull();
    expect(s.solution).toBeNull();
  });
});

describe('view privacy', () => {
  it('lobby views carry Pick-a-case metadata only — no content, no tokens', () => {
    const dumped = JSON.stringify(viewFor(makeLobby(), 'p1'));
    expect(dumped).not.toContain('tok-');
    expect(dumped).not.toContain('solution');
    expect(dumped).not.toContain('bitter almonds');
    expect(dumped).not.toContain('disconnected for a month');
    expect(viewFor(makeLobby(), 'p1').cases).toEqual([
      { id: 'masquerade', title: 'Murder at the Masquerade', victim: 'Lady Evangeline Hart' },
      { id: 'curtain', title: 'The Final Curtain', victim: 'Vivienne Kale' },
      { id: 'lighthouse', title: 'Light Out at Gull Rock', victim: 'Elias Crowe' },
    ]);
  });

  it('hides unfound clues, unrevealed secrets, and the solution mid-case', () => {
    let s = toSearch();
    s = run(s, { t: 'search', id: 'p1', locationId: 'conservatory' });
    const dumped = JSON.stringify(viewFor(s, 'p2'));
    // Found clue is public…
    expect(dumped).toContain('bitter almonds');
    // …but everything still sealed stays sealed.
    expect(dumped).not.toContain('solution');
    expect(dumped).not.toContain('tok-');
    expect(dumped).not.toContain('dust undisturbed');
    expect(dumped).not.toContain('W. H.');
    expect(dumped).not.toContain('disconnected for a month');
    expect(dumped).not.toContain('never went in');
    expect(dumped).not.toContain('for air');
    expect(dumped).not.toContain('kept a copy of the key');
    const view = viewFor(s, 'p2');
    expect(view.clues).toHaveLength(1);
    expect(view.suspects!.every((x) => !x.secretRevealed && x.secret === undefined)).toBe(true);
  });

  it('reveals only the pressed suspect’s secret', () => {
    let s = toAlibis();
    s = run(s, { t: 'press', id: 'p1', suspectId: 'silas' });
    const dumped = JSON.stringify(viewFor(s, 'p2'));
    expect(dumped).toContain('disconnected for a month');
    expect(dumped).not.toContain('never went in');
    expect(dumped).not.toContain('for air');
    expect(dumped).not.toContain('kept a copy of the key');
  });

  it('never leaks the solution through wrong verdicts', () => {
    let s = toAccusation();
    s = run(s, {
      t: 'accuse',
      id: 'p1',
      suspectId: 'silas',
      weaponId: 'shears',
      locationId: 'ballroom',
    });
    const view = viewFor(s, 'p2');
    expect(view.solution).toBeUndefined();
    expect(JSON.stringify(view)).not.toContain('"solution"');
  });

  it('shows every investigator the same board, differing only in `me`', () => {
    let s = toSearch();
    s = run(s, { t: 'search', id: 'p1', locationId: 'ballroom' });
    const a = viewFor(s, 'p1');
    const b = viewFor(s, 'p2');
    const { me: _ma, ...restA } = a;
    const { me: _mb, ...restB } = b;
    expect(restA).toEqual(restB);
    expect(a.me.id).toBe('p1');
    expect(b.me.id).toBe('p2');
  });

  it('reveals the full solution only at game over', () => {
    let s = toAccusation();
    s = run(s, { t: 'accuse', id: 'p1', ...CORRECT });
    const view = viewFor(s, 'p2');
    expect(view.winner).toBe('solved');
    expect(view.solution).toEqual(CORRECT);
    expect(JSON.stringify(view)).not.toContain('tok-');
  });

  it('clamps pressure tokens to at least 1 and clears stale deadlines', () => {
    let s = makeLobby();
    s = run(s, {
      t: 'setConfig',
      id: 'h',
      config: { ...s.config, pressureTokens: 0 },
    });
    expect(s.config.pressureTokens).toBe(1);
    s = run(startCase(s), { t: 'advance', id: 'h' });
    s = run(s, { t: 'advance', id: 'h' });
    expect(s.phase).toBe('alibis');
    expect(s.searchEndsAt).toBeUndefined();
  });
});
