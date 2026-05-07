import { describe, expect, it } from 'vitest';
import { progress } from '../../lib/progress';

describe('progress', () => {
  it('clamps values in range', () => {
    expect(progress(10, 20, 30)).toBe(100);
    expect(progress(10, 20, 0)).toBe(0);
  });

  it('handles baseline equal target edge case', () => {
    expect(progress(10, 10, 9)).toBe(0);
    expect(progress(10, 10, 10)).toBe(100);
    expect(progress(10, 10, 11)).toBe(100);
  });

  it('supports reverse targets', () => {
    expect(progress(100, 0, 75)).toBe(25);
    expect(progress(100, 0, 150)).toBe(0);
    expect(progress(100, 0, -10)).toBe(100);
  });
});
