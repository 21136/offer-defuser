import { describe, it, expect } from 'vitest';
import { weightedRandomIndex, weightedRandomIndexExcluding } from '@/utils/random';
import type { StepOption } from '@/models/step';

function makeOptions(weights: number[]): StepOption[] {
  return weights.map((w, i) => ({ text: `option-${i}`, weight: w }));
}

describe('weightedRandomIndex', () => {
  it('should return a valid index', () => {
    const options = makeOptions([1, 2, 3]);
    const result = weightedRandomIndex(options);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(3);
  });

  it('empty array should throw', () => {
    expect(() => weightedRandomIndex([])).toThrow('must not be empty');
  });

  it('single item should always return 0', () => {
    const options = makeOptions([5]);
    for (let i = 0; i < 100; i++) {
      expect(weightedRandomIndex(options)).toBe(0);
    }
  });

  it('weight distribution should be statistically reasonable (10000 samples)', () => {
    const options = makeOptions([1, 3, 6]); // total=10
    const counts = [0, 0, 0];

    for (let i = 0; i < 10000; i++) {
      const idx = weightedRandomIndex(options);
      counts[idx]++;
    }

    // option-2 (weight 6) should appear most, option-0 (weight 1) least
    expect(counts[2]).toBeGreaterThan(counts[1]);
    expect(counts[1]).toBeGreaterThan(counts[0]);
  });
});

describe('weightedRandomIndexExcluding', () => {
  it('should return an index different from the excluded one', () => {
    const options = makeOptions([1, 10, 1]);
    // With weight 10 on index 1, excluding it forces 0 or 2
    for (let i = 0; i < 50; i++) {
      const result = weightedRandomIndexExcluding(options, 1);
      expect(result).not.toBe(1);
    }
  });

  it('single item excluding only index should return 0', () => {
    const options = makeOptions([5]);
    expect(weightedRandomIndexExcluding(options, 0)).toBe(0);
  });
});
