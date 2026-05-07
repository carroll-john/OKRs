import { describe, expect, it } from 'vitest';
import { normalizeWeekStart, validateWeeklyUpdateInput } from '../../lib/weekly-update';

describe('weekly update validation', () => {
  it('normalizes weekStart to Monday UTC', () => {
    expect(normalizeWeekStart('2026-05-06').toISOString()).toBe('2026-05-04T00:00:00.000Z');
    expect(normalizeWeekStart('2026-05-04').toISOString()).toBe('2026-05-04T00:00:00.000Z');
  });

  it('enforces required fields', () => {
    expect(() => validateWeeklyUpdateInput({})).toThrow('Missing required field: keyResultId');
  });

  it('validates enums', () => {
    expect(() => validateWeeklyUpdateInput({ keyResultId: 'kr1', weekStart: '2026-05-06', value: 1, confidence: 'MID', status: 'ON_TRACK', nextStep: 'x' })).toThrow('Invalid confidence');
    expect(() => validateWeeklyUpdateInput({ keyResultId: 'kr1', weekStart: '2026-05-06', value: 1, confidence: 'HIGH', status: 'GREEN', nextStep: 'x' })).toThrow('Invalid status');
  });
});
