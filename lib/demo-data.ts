import type { WorkflowFilters, WorkflowObjective } from '@/lib/okr-workflow';
import { filterWorkflowObjectives } from '@/lib/okr-workflow';
import type { QuarterPlan } from '@/lib/quarter-plan';

export const DEMO_EMAIL = 'manager@demo.com';
export const DEMO_PASSWORD = 'password123';
export const DEMO_USER = {
  id: 'demo-user',
  email: DEMO_EMAIL,
  name: 'Demo Manager',
};

export function isLocalDemoMode() {
  return !process.env.DATABASE_URL;
}

const demoObjectives: WorkflowObjective[] = [
  {
    id: 'demo-objective-activation',
    title: 'Improve activation',
    ownerName: 'Demo Manager',
    keyResults: [
      {
        id: 'cm_seed_kr_id',
        title: 'Increase activation rate',
        metricUnit: '%',
        baseline: 28,
        target: 40,
        ownerName: 'Demo Manager',
        latestUpdate: {
          weekStart: new Date('2026-05-04'),
          value: 31,
          confidence: 'MEDIUM',
          status: 'AT_RISK',
          blockers: 'Experiment analysis delayed',
          nextStep: 'Ship revised onboarding variant',
        },
        initiatives: [
          {
            id: 'demo-initiative-onboarding',
            title: 'Ship revised onboarding variant',
            ownerName: 'Demo Manager',
            status: 'IN_PROGRESS',
            dueDate: new Date('2026-05-22'),
            notes: 'Variant copy and instrumentation are in progress.',
          },
          {
            id: 'demo-initiative-analysis',
            title: 'Resolve experiment analysis delay',
            ownerName: 'Demo Manager',
            status: 'BLOCKED',
            dueDate: new Date('2026-05-15'),
            notes: 'Waiting on event quality checks.',
          },
          {
            id: 'demo-initiative-learnings',
            title: 'Publish activation learnings',
            ownerName: 'Demo Manager',
            status: 'NOT_STARTED',
            dueDate: new Date('2026-06-07'),
            notes: null,
          },
        ],
      },
      {
        id: 'demo-stale-kr',
        title: 'Reduce setup friction',
        metricUnit: 'steps',
        baseline: 5,
        target: 2,
        ownerName: 'Demo Manager',
        latestUpdate: null,
        initiatives: [
          {
            id: 'demo-initiative-setup-audit',
            title: 'Audit account setup drop-off points',
            ownerName: 'Demo Manager',
            status: 'DONE',
            dueDate: new Date('2026-04-30'),
            notes: 'Baseline friction map completed.',
          },
          {
            id: 'demo-initiative-empty-state',
            title: 'Simplify first project empty state',
            ownerName: 'Demo Manager',
            status: 'IN_PROGRESS',
            dueDate: new Date('2026-05-29'),
            notes: null,
          },
        ],
      },
    ],
  },
];

export function getDemoDashboardObjectives(filters: WorkflowFilters = {}) {
  return filterWorkflowObjectives(demoObjectives, filters);
}

export function getAllDemoDashboardObjectives() {
  return demoObjectives;
}

export function getDemoQuarterPlan(): QuarterPlan {
  return {
    workspaceName: 'Product & Eng Team',
    cycleName: 'Q2 2026',
    objectives: demoObjectives.map((objective) => ({
      id: objective.id,
      title: objective.title,
      ownerName: objective.ownerName,
      keyResults: objective.keyResults.map((keyResult) => ({
        id: keyResult.id,
        title: keyResult.title,
        metricUnit: keyResult.metricUnit,
        baseline: keyResult.baseline,
        target: keyResult.target,
        ownerName: keyResult.ownerName,
        initiatives: keyResult.initiatives.map((initiative) => ({
          id: initiative.id,
          title: initiative.title,
          ownerName: initiative.ownerName,
          status: initiative.status,
          dueDate: initiative.dueDate ? initiative.dueDate.toISOString().slice(0, 10) : '',
          notes: initiative.notes ?? '',
        })),
      })),
    })),
  };
}
