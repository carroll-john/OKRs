import { describe, expect, it } from 'vitest';
import { summarizeQuarterPlan, type QuarterPlan } from '../../lib/quarter-plan';

const plan: QuarterPlan = {
  workspaceName: 'Product & Eng Team',
  cycleName: 'Q2 2026',
  objectives: [
    {
      id: 'obj1',
      title: 'Improve activation',
      ownerName: 'Demo Manager',
      keyResults: [
        {
          id: 'kr1',
          title: 'Increase activation rate',
          metricUnit: '%',
          baseline: 28,
          target: 40,
          ownerName: 'Demo Manager',
          initiatives: [
            {
              id: 'init1',
              title: 'Ship revised onboarding variant',
              ownerName: 'Demo Manager',
              status: 'IN_PROGRESS',
              dueDate: '2026-05-22',
              notes: '',
            },
            {
              id: 'init2',
              title: 'Resolve analysis delay',
              ownerName: 'Demo Manager',
              status: 'BLOCKED',
              dueDate: '2026-05-15',
              notes: 'Waiting on event quality checks.',
            },
          ],
        },
      ],
    },
  ],
};

describe('quarter plan helpers', () => {
  it('summarizes the entered quarterly OKR structure', () => {
    expect(summarizeQuarterPlan(plan)).toEqual({
      objectiveCount: 1,
      keyResultCount: 1,
      initiativeCount: 2,
      blockedInitiativeCount: 1,
    });
  });
});
