import { describe, expect, it } from 'vitest';
import { checkWin, createLobby, reduce, suggestConfig, viewFor } from '@/games/mafia/engine/engine';
import { Action, GameConfig, GameState, Role } from '@/games/mafia/engine/types';

const rng = () => 0.42; // deterministic for tests
const run = (s: GameState, a: Action) => reduce(s, a, rng);

function makeGame(names: string[], config?: Partial<GameConfig>) {
  let s = createLobby('p0', names[0], '🦊', 'tok0');
  for (let i = 1; i < names.length; i++) {
    s = run(s, { t: 'join', id: `p${i}`, name: names[i], avatar: '🐼', token: `tok${i}` });
  }
  if (config) s = run(s, { t: 'setConfig', id: 'p0', config: { ...s.config, ...config } });
  s = run(s, { t: 'start', id: 'p0' });
  return s;
}

const byRole = (s: GameState, role: Role) =>
  s.players.filter((p) => p.role === role).map((p) => p.id);

/** Ack all roles and play a night with the given actions. */
function everyoneReady(s: GameState) {
  for (const p of s.players) s = run(s, { t: 'ackRole', id: p.id });
  return s;
}

describe('lobby & setup', () => {
  it('suggests sensible configs', () => {
    expect(suggestConfig(3)).toEqual({
      mafiaCount: 1,
      hasDetective: false,
      hasDoctor: false,
      discussionSeconds: 180,
    });
    expect(suggestConfig(5)).toEqual({
      mafiaCount: 1,
      hasDetective: true,
      hasDoctor: true,
      discussionSeconds: 180,
    });
    expect(suggestConfig(8).mafiaCount).toBe(2);
    expect(suggestConfig(12).mafiaCount).toBe(3);
  });

  it('dedupes duplicate names', () => {
    const s = makeGame(['Sam', 'Sam', 'Sam']);
    expect(s.players.map((p) => p.name)).toEqual(['Sam', 'Sam 2', 'Sam 3']);
  });

  it('refuses to start below 3 players', () => {
    const s = makeGame(['A', 'B']);
    expect(s.phase).toBe('lobby');
  });

  it('deals the configured roles and enters roleReveal', () => {
    const s = makeGame(['A', 'B', 'C', 'D', 'E', 'F'], {
      mafiaCount: 2,
      hasDetective: true,
      hasDoctor: true,
    });
    expect(s.phase).toBe('roleReveal');
    const count = (r: Role) => s.players.filter((p) => p.role === r).length;
    expect(count('mafia')).toBe(2);
    expect(count('detective')).toBe(1);
    expect(count('doctor')).toBe(1);
    expect(count('villager')).toBe(2);
  });

  it('ignores joins after the game started', () => {
    let s = makeGame(['A', 'B', 'C']);
    s = run(s, { t: 'join', id: 'late', name: 'Late', avatar: '🐙', token: 'tokLate' });
    expect(s.players).toHaveLength(3);
  });

  it('only the host can start or advance', () => {
    let s = createLobby('p0', 'A', '🦊', 'tok0');
    s = run(s, { t: 'join', id: 'p1', name: 'B', avatar: '🐼', token: 'tok1' });
    s = run(s, { t: 'join', id: 'p2', name: 'C', avatar: '🐸', token: 'tok2' });
    s = reduce(s, { t: 'start', id: 'p1' }, rng); // not the host
    expect(s.phase).toBe('lobby');
  });
});

describe('night', () => {
  it('starts after everyone acknowledged their role', () => {
    let s = makeGame(['A', 'B', 'C', 'D']);
    s = everyoneReady(s);
    expect(s.phase).toBe('night');
    expect(s.round).toBe(1);
  });

  it('mafia kills a victim when all night actors acted', () => {
    let s = makeGame(['A', 'B', 'C', 'D'], {
      mafiaCount: 1,
      hasDetective: false,
      hasDoctor: false,
    });
    s = everyoneReady(s);
    const [mafia] = byRole(s, 'mafia');
    const [victim] = byRole(s, 'villager');
    s = run(s, { t: 'nightAct', id: mafia, targetId: victim });
    expect(s.phase).toBe('dayReveal');
    expect(s.lastNight?.diedId).toBe(victim);
    expect(s.players.find((p) => p.id === victim)?.alive).toBe(false);
  });

  it('with 2 mafia, waits for both picks', () => {
    let s = makeGame(['A', 'B', 'C', 'D', 'E', 'F', 'G'], {
      mafiaCount: 2,
      hasDetective: false,
      hasDoctor: false,
    });
    s = everyoneReady(s);
    const [m1, m2] = byRole(s, 'mafia');
    const [victim] = byRole(s, 'villager');
    s = run(s, { t: 'nightAct', id: m1, targetId: victim });
    expect(s.phase).toBe('night');
    s = run(s, { t: 'nightAct', id: m2, targetId: victim });
    expect(s.phase).toBe('dayReveal');
  });

  it('doctor save prevents the kill', () => {
    let s = makeGame(['A', 'B', 'C', 'D', 'E'], {
      mafiaCount: 1,
      hasDetective: false,
      hasDoctor: true,
    });
    s = everyoneReady(s);
    const [mafia] = byRole(s, 'mafia');
    const [doctor] = byRole(s, 'doctor');
    const [victim] = byRole(s, 'villager');
    s = run(s, { t: 'nightAct', id: mafia, targetId: victim });
    s = run(s, { t: 'nightAct', id: doctor, targetId: victim });
    expect(s.phase).toBe('dayReveal');
    expect(s.lastNight?.diedId).toBeUndefined();
    expect(s.players.every((p) => p.alive)).toBe(true);
  });

  it('detective learns the truth privately', () => {
    let s = makeGame(['A', 'B', 'C', 'D'], { mafiaCount: 1, hasDetective: true, hasDoctor: false });
    s = everyoneReady(s);
    const [mafia] = byRole(s, 'mafia');
    const [detective] = byRole(s, 'detective');
    s = run(s, { t: 'nightAct', id: mafia, targetId: detective });
    s = run(s, { t: 'nightAct', id: detective, targetId: mafia });
    const detView = viewFor(s, detective);
    const mafiaView = viewFor(s, mafia);
    expect(detView.investigation).toEqual({ targetId: mafia, isMafia: true });
    expect(mafiaView.investigation).toBeUndefined();
  });

  it('villagers and mafia cannot act out of role', () => {
    let s = makeGame(['A', 'B', 'C', 'D'], {
      mafiaCount: 1,
      hasDetective: false,
      hasDoctor: false,
    });
    s = everyoneReady(s);
    const [mafia] = byRole(s, 'mafia');
    const [v1, v2] = byRole(s, 'villager');
    // villager tries to act
    const s2 = run(s, { t: 'nightAct', id: v1, targetId: v2 });
    expect(s2).toBe(s);
    // mafia tries to kill another mafia (friendly fire)
    const s3 = run(s, { t: 'nightAct', id: mafia, targetId: mafia });
    expect(s3.night.mafiaTargets[mafia]).toBeUndefined();
  });
});

describe('day & voting', () => {
  function toVoting() {
    let s = makeGame(['A', 'B', 'C', 'D', 'E'], {
      mafiaCount: 1,
      hasDetective: false,
      hasDoctor: false,
    });
    s = everyoneReady(s);
    const [mafia] = byRole(s, 'mafia');
    const [victim] = byRole(s, 'villager');
    s = run(s, { t: 'nightAct', id: mafia, targetId: victim });
    s = run(s, { t: 'advance', id: 'p0' }); // dayReveal -> discussion
    s = run(s, { t: 'advance', id: 'p0' }); // discussion -> voting
    return { s, mafia };
  }

  it('plurality vote eliminates and reveals the role', () => {
    let { s, mafia } = toVoting();
    const alive = s.players.filter((p) => p.alive);
    // town votes for the mafia; the mafia abstains (can't vote for self)
    for (const p of alive)
      s = run(s, { t: 'vote', id: p.id, targetId: p.id === mafia ? null : mafia });
    expect(s.phase).toBe('gameOver'); // last mafia eliminated -> town wins
    expect(s.winner).toBe('town');
    const view = viewFor(s, alive[0].id);
    expect(view.lastVote?.eliminatedId).toBe(mafia);
    expect(view.lastVote?.eliminatedRole).toBe('mafia');
  });

  it('a tie eliminates nobody', () => {
    let { s } = toVoting();
    const alive = s.players.filter((p) => p.alive);
    const [a, b] = alive.map((p) => p.id);
    s = run(s, { t: 'vote', id: alive[0].id, targetId: b });
    s = run(s, { t: 'vote', id: alive[1].id, targetId: a });
    s = run(s, { t: 'vote', id: alive[2].id, targetId: null });
    s = run(s, { t: 'vote', id: alive[3].id, targetId: null });
    expect(s.phase).toBe('voteResult');
    expect(s.lastVote?.tie).toBe(true);
    expect(s.lastVote?.eliminatedId).toBeUndefined();
    expect(s.players.filter((p) => p.alive)).toHaveLength(4);
  });

  it('dead players cannot vote', () => {
    let { s } = toVoting();
    const dead = s.players.find((p) => !p.alive)!;
    const alive = s.players.filter((p) => p.alive);
    const s2 = run(s, { t: 'vote', id: dead.id, targetId: alive[0].id });
    expect(s2.votes[dead.id]).toBeUndefined();
  });

  it('after voteResult the host advances to the next night', () => {
    let { s } = toVoting();
    const alive = s.players.filter((p) => p.alive);
    for (const p of alive) s = run(s, { t: 'vote', id: p.id, targetId: null }); // all abstain -> tie
    s = run(s, { t: 'advance', id: 'p0' });
    expect(s.phase).toBe('night');
    expect(s.round).toBe(2);
  });
});

describe('host skip (anti-stall)', () => {
  it('skipNight resolves the night with the actions so far', () => {
    let s = makeGame(['A', 'B', 'C', 'D', 'E'], {
      mafiaCount: 1,
      hasDetective: false,
      hasDoctor: true,
    });
    s = everyoneReady(s);
    const [mafia] = byRole(s, 'mafia');
    const [victim] = byRole(s, 'villager');
    s = run(s, { t: 'nightAct', id: mafia, targetId: victim });
    expect(s.phase).toBe('night'); // doctor still missing
    s = run(s, { t: 'skipNight', id: 'p0' });
    expect(s.phase).toBe('dayReveal');
    expect(s.lastNight?.diedId).toBe(victim);
  });

  it('skipNight with no picks ends the night peacefully', () => {
    let s = makeGame(['A', 'B', 'C', 'D'], {
      mafiaCount: 1,
      hasDetective: false,
      hasDoctor: false,
    });
    s = everyoneReady(s);
    s = run(s, { t: 'skipNight', id: 'p0' });
    expect(s.phase).toBe('dayReveal');
    expect(s.lastNight?.diedId).toBeUndefined();
  });

  it('closeVote resolves with the votes cast so far', () => {
    let s = makeGame(['A', 'B', 'C', 'D', 'E'], {
      mafiaCount: 1,
      hasDetective: false,
      hasDoctor: false,
    });
    s = everyoneReady(s);
    const [mafia] = byRole(s, 'mafia');
    const [victim] = byRole(s, 'villager');
    s = run(s, { t: 'nightAct', id: mafia, targetId: victim });
    s = run(s, { t: 'advance', id: 'p0' });
    s = run(s, { t: 'advance', id: 'p0' });
    expect(s.phase).toBe('voting');
    const voters = s.players.filter((p) => p.alive && p.id !== mafia);
    // Two townies vote for the mafia; the rest are AFK.
    s = run(s, { t: 'vote', id: voters[0].id, targetId: mafia });
    s = run(s, { t: 'vote', id: voters[1].id, targetId: mafia });
    expect(s.phase).toBe('voting'); // still waiting on the rest
    s = run(s, { t: 'closeVote', id: 'p0' });
    expect(s.lastVote?.eliminatedId).toBe(mafia);
  });

  it('non-hosts cannot skip or close', () => {
    let s = makeGame(['A', 'B', 'C', 'D'], {
      mafiaCount: 1,
      hasDetective: false,
      hasDoctor: false,
    });
    s = everyoneReady(s);
    expect(run(s, { t: 'skipNight', id: 'p1' })).toBe(s);
  });
});

describe('discussion timer', () => {
  const NOW = 1_000_000;
  const runAt = (s: GameState, a: Action, now: number) => reduce(s, a, rng, now);

  function toDiscussion(discussionSeconds = 180) {
    let s = makeGame(['A', 'B', 'C', 'D', 'E'], {
      mafiaCount: 1,
      hasDetective: false,
      hasDoctor: false,
      discussionSeconds,
    });
    s = everyoneReady(s);
    const [mafia] = byRole(s, 'mafia');
    const [victim] = byRole(s, 'villager');
    s = run(s, { t: 'nightAct', id: mafia, targetId: victim });
    return runAt(s, { t: 'advance', id: 'p0' }, NOW); // dayReveal -> discussion
  }

  it('sets a deadline on entering discussion', () => {
    const s = toDiscussion(120);
    expect(s.phase).toBe('discussion');
    expect(s.discussionEndsAt).toBe(NOW + 120_000);
  });

  it('leaves the timer off when configured to 0', () => {
    const s = toDiscussion(0);
    expect(s.phase).toBe('discussion');
    expect(s.discussionEndsAt).toBeUndefined();
  });

  it('lets the host advance early, but nobody else until expiry', () => {
    const s = toDiscussion(120);
    const guest = s.players.find((p) => !p.isHost)!;
    expect(runAt(s, { t: 'advance', id: guest.id }, NOW + 10_000).phase).toBe('discussion');
    expect(runAt(s, { t: 'advance', id: guest.id }, NOW + 120_000).phase).toBe('voting');
    expect(runAt(s, { t: 'advance', id: 'p0' }, NOW + 10_000).phase).toBe('voting');
  });

  it('host extend pushes the deadline by a minute', () => {
    let s = toDiscussion(60);
    s = runAt(s, { t: 'extendDiscussion', id: 'p0' }, NOW + 10_000);
    expect(s.discussionEndsAt).toBe(NOW + 120_000);
    const guest = s.players.find((p) => !p.isHost)!;
    expect(runAt(s, { t: 'extendDiscussion', id: guest.id }, NOW + 10_000)).toBe(s);
    const untimed = toDiscussion(0);
    expect(runAt(untimed, { t: 'extendDiscussion', id: 'p0' }, NOW)).toBe(untimed);
  });

  it('exposes the deadline to every device during discussion', () => {
    const s = toDiscussion(60);
    const v = viewFor(s, s.players[1].id);
    expect(v.discussionEndsAt).toBe(NOW + 60_000);
    expect(v.discussionDurationSec).toBe(60);
  });
});

describe('win conditions', () => {
  it('town wins when all mafia are dead', () => {
    const mk = (roles: Role[]) =>
      roles.map((role, i) => ({
        id: `p${i}`,
        name: `P${i}`,
        avatar: '🦊',
        token: `tok${i}`,
        isHost: i === 0,
        connected: true,
        alive: true,
        ready: false,
        role,
      }));
    expect(checkWin(mk(['villager', 'villager', 'detective']))).toBe('town');
  });

  it('mafia wins at parity (night kill)', () => {
    // 3 players: 1 mafia vs 2 town. One night kill -> 1v1 -> mafia wins immediately.
    let s = makeGame(['A', 'B', 'C'], { mafiaCount: 1, hasDetective: false, hasDoctor: false });
    s = everyoneReady(s);
    const [mafia] = byRole(s, 'mafia');
    const [victim] = byRole(s, 'villager');
    s = run(s, { t: 'nightAct', id: mafia, targetId: victim });
    expect(s.phase).toBe('gameOver');
    expect(s.winner).toBe('mafia');
  });
});

describe('view privacy', () => {
  it('never exposes other players roles before gameOver', () => {
    let s = makeGame(['A', 'B', 'C', 'D'], { mafiaCount: 1, hasDetective: true, hasDoctor: false });
    s = everyoneReady(s);
    const view = viewFor(s, s.players[0].id);
    expect(view.players.every((p) => !('role' in p))).toBe(true);
    expect(view.allRoles).toBeUndefined();
  });

  it('shows mafia teammates only to mafia', () => {
    let s = makeGame(['A', 'B', 'C', 'D', 'E', 'F', 'G'], {
      mafiaCount: 2,
      hasDetective: false,
      hasDoctor: false,
    });
    s = everyoneReady(s);
    const [m1, m2] = byRole(s, 'mafia');
    const [villager] = byRole(s, 'villager');
    expect(viewFor(s, m1).mafiaTeammates?.map((t) => t.id)).toEqual([m2]);
    expect(viewFor(s, villager).mafiaTeammates).toBeUndefined();
  });

  it('reveals all roles at gameOver', () => {
    let s = makeGame(['A', 'B', 'C'], { mafiaCount: 1, hasDetective: false, hasDoctor: false });
    s = everyoneReady(s);
    const [mafia] = byRole(s, 'mafia');
    const [victim] = byRole(s, 'villager');
    s = run(s, { t: 'nightAct', id: mafia, targetId: victim });
    const view = viewFor(s, victim);
    expect(view.winner).toBe('mafia');
    expect(Object.keys(view.allRoles ?? {})).toHaveLength(3);
  });
});

describe('host remove (kick)', () => {
  it('host can remove a lobby seat', () => {
    let s = createLobby('p0', 'A', '🦊', 'tok0');
    s = run(s, { t: 'join', id: 'p1', name: 'B', avatar: '🐼', token: 'tok1' });
    s = run(s, { t: 'remove', id: 'p0', targetId: 'p1' });
    expect(s.players.map((p) => p.id)).toEqual(['p0']);
  });

  it('non-hosts cannot remove, and the host cannot be removed', () => {
    let s = createLobby('p0', 'A', '🦊', 'tok0');
    s = run(s, { t: 'join', id: 'p1', name: 'B', avatar: '🐼', token: 'tok1' });
    expect(run(s, { t: 'remove', id: 'p1', targetId: 'p0' })).toBe(s);
    expect(run(s, { t: 'remove', id: 'p0', targetId: 'p0' })).toBe(s);
  });

  it('mid-game remove marks the seat disconnected but keeps it', () => {
    let s = makeGame(['A', 'B', 'C', 'D']);
    s = run(s, { t: 'remove', id: 'p0', targetId: 'p2' });
    expect(s.players).toHaveLength(4);
    expect(s.players.find((p) => p.id === 'p2')?.connected).toBe(false);
  });
});

describe('reconnections', () => {
  it('a disconnected player can rejoin mid-game with their token', () => {
    let s = makeGame(['A', 'B', 'C', 'D'], {
      mafiaCount: 1,
      hasDetective: false,
      hasDoctor: false,
    });
    s = everyoneReady(s);
    s = run(s, { t: 'disconnect', id: 'p2' });
    expect(s.players.find((p) => p.id === 'p2')?.connected).toBe(false);
    s = run(s, { t: 'rejoin', id: 'p2', token: 'tok2' });
    expect(s.players.find((p) => p.id === 'p2')?.connected).toBe(true);
    expect(s.phase).toBe('night'); // game undisturbed
  });

  it('rejects a rejoin with the wrong token', () => {
    let s = makeGame(['A', 'B', 'C', 'D'], {
      mafiaCount: 1,
      hasDetective: false,
      hasDoctor: false,
    });
    s = everyoneReady(s);
    s = run(s, { t: 'disconnect', id: 'p2' });
    s = run(s, { t: 'rejoin', id: 'p2', token: 'wrong' });
    expect(s.players.find((p) => p.id === 'p2')?.connected).toBe(false);
  });

  it('night waits for a reconnected actor again', () => {
    let s = makeGame(['A', 'B', 'C', 'D'], {
      mafiaCount: 1,
      hasDetective: false,
      hasDoctor: false,
    });
    s = everyoneReady(s);
    const [mafia] = byRole(s, 'mafia');
    // mafia disconnects mid-night: night resolves without them is impossible (they are the only actor)
    // but a villager disconnect/reconnect must not stall the night
    const villager = byRole(s, 'villager')[0];
    s = run(s, { t: 'disconnect', id: villager });
    s = run(s, { t: 'nightAct', id: mafia, targetId: byRole(s, 'villager')[1] });
    expect(s.phase).toBe('dayReveal'); // resolved without the disconnected villager
  });

  it('avatars are exposed in views, tokens are not', () => {
    let s = makeGame(['A', 'B', 'C']);
    const view = viewFor(s, 'p1');
    expect(view.players.find((p) => p.id === 'p0')?.avatar).toBe('🦊');
    expect(JSON.stringify(view)).not.toContain('tok0');
    expect(JSON.stringify(view)).not.toContain('tok1');
  });
});

describe('play again', () => {
  it('resets to lobby keeping players and config', () => {
    let s = makeGame(['A', 'B', 'C'], { mafiaCount: 1, hasDetective: false, hasDoctor: false });
    s = everyoneReady(s);
    const [mafia] = byRole(s, 'mafia');
    const [victim] = byRole(s, 'villager');
    s = run(s, { t: 'nightAct', id: mafia, targetId: victim });
    expect(s.phase).toBe('gameOver');
    s = run(s, { t: 'playAgain', id: 'p0' });
    expect(s.phase).toBe('lobby');
    expect(s.players).toHaveLength(3);
    expect(s.players.every((p) => p.alive && p.role === undefined)).toBe(true);
  });
});
