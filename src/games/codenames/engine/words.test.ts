import { describe, expect, it } from 'vitest';
import { WORDS } from '@/games/codenames/engine/words';

describe('Codenames word list', () => {
  it('is big enough for endless rematches', () => {
    expect(WORDS.length).toBeGreaterThan(400);
  });

  it('contains only single lowercase words of readable length', () => {
    for (const word of WORDS) {
      // Also guards the generated list against proper nouns and compounds.
      expect(word).toMatch(/^[a-z]{3,10}$/);
    }
  });

  it('has no duplicates', () => {
    expect(new Set(WORDS).size).toBe(WORDS.length);
  });

  it('avoids singular/plural collisions that would make clues ambiguous', () => {
    const set = new Set(WORDS);
    const collisions = WORDS.filter((w) => set.has(`${w}s`) || set.has(`${w}es`));
    expect(collisions).toEqual([]);
  });
});
