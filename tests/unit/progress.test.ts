import { describe, expect, it } from 'vitest';
import { progress } from '../../lib/progress';

describe('progress', () => {
  it('caps values in range', () => {
    expect(progress(10, 20, 30)).toBe(100);
    expect(progress(10, 20, 0)).toBe(0);
  });

  it('handles a zero-width target window', () => {
    expect(progress(10, 10, 9)).toBe(0);
    expect(progress(10, 10, 10)).toBe(100);
    expect(progress(10, 10, 11)).toBe(100);
  });
});
