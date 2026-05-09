import { describe, expect, it } from 'vitest';
import {
  filterWorkflowObjectives,
  getNeedsAttention,
  isKeyResultStale,
  keyResultProgress,
  summarizeWorkflow,
  type WorkflowObjective,
} from '../../lib/okr-workflow';

const objectives: WorkflowObjective[] = [
  {
    id: 'obj1',
    title: 'Improve activation',
    ownerName: 'Demo Manager',
    keyResults: [
      {
        id: 'kr1',
        title: 'Increase activation rate',
        metricUnit: '%',
        baseline: 20,
        target: 40,
        ownerName: 'Demo Manager',
        latestUpdate: {
          weekStart: new Date('2026-05-04'),
          value: 30,
          confidence: 'MEDIUM',
          status: 'AT_RISK',
          blockers: 'Experiment analysis delayed',
          nextStep: 'Ship revised onboarding variant',
        },
        initiatives: [
          {
            id: 'init1',
            title: 'Resolve experiment analysis delay',
            ownerName: 'Demo Manager',
            status: 'BLOCKED',
            dueDate: new Date('2026-05-15'),
            notes: null,
          },
        ],
      },
      {
        id: 'kr2',
        title: 'Reduce setup friction',
        metricUnit: 'steps',
        baseline: 5,
        target: 2,
        ownerName: 'Demo Manager',
        latestUpdate: null,
        initiatives: [
          {
            id: 'init2',
            title: 'Audit setup flow',
            ownerName: 'Demo Manager',
            status: 'DONE',
            dueDate: new Date('2026-04-30'),
            notes: null,
          },
        ],
      },
    ],
  },
];

describe('okr workflow helpers', () => {
  it('calculates KR progress and stale state', () => {
    expect(keyResultProgress(objectives[0].keyResults[0])).toBe(50);
    expect(isKeyResultStale(null)).toBe(true);
    expect(isKeyResultStale({ weekStart: new Date('2026-05-01') }, new Date('2026-05-09').getTime())).toBe(false);
  });

  it('summarizes objectives, key results, initiatives, and attention counts', () => {
    const summary = summarizeWorkflow(objectives);

    expect(summary.objectiveCount).toBe(1);
    expect(summary.keyResultCount).toBe(2);
    expect(summary.initiativeCount).toBe(2);
    expect(summary.averageProgress).toBe(25);
    expect(summary.atRiskCount).toBe(1);
    expect(summary.blockedInitiativeCount).toBe(1);
    expect(summary.doneInitiativeCount).toBe(1);
  });

  it('filters by KR and initiative status', () => {
    expect(filterWorkflowObjectives(objectives, { status: 'AT_RISK' })[0].keyResults.map((kr) => kr.id)).toEqual(['kr1']);
    expect(filterWorkflowObjectives(objectives, { initiativeStatus: 'DONE' })[0].keyResults.map((kr) => kr.id)).toEqual(['kr2']);
    expect(filterWorkflowObjectives(objectives, { blockersOnly: '1' })[0].keyResults.map((kr) => kr.id)).toEqual(['kr1']);
  });

  it('creates a needs-attention queue from blockers, health, stale KRs, and blocked initiatives', () => {
    const items = getNeedsAttention(objectives);

    expect(items.map((item) => item.reason)).toContain('KR blocker');
    expect(items.map((item) => item.reason)).toContain('at risk');
    expect(items.map((item) => item.reason)).toContain('stale KR update');
    expect(items.map((item) => item.reason)).toContain('blocked initiative');
  });
});
