import { progress } from '@/lib/progress';

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

export type DemoDashboardSearchParams = {
  status?: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
  confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
  staleOnly?: '1';
  blockersOnly?: '1';
};

const demoKeyResults = [
  {
    id: 'cm_seed_kr_id',
    objective: 'Improve activation',
    keyResult: 'Increase activation rate',
    objectiveOwner: 'Demo Manager',
    keyResultOwner: 'Demo Manager',
    baseline: 28,
    target: 40,
    update: {
      weekStart: new Date('2026-05-04'),
      value: 31,
      confidence: 'MEDIUM' as const,
      status: 'AT_RISK' as const,
      blockers: 'Experiment analysis delayed',
      nextStep: 'Ship revised onboarding variant',
    },
  },
  {
    id: 'demo-stale-kr',
    objective: 'Improve activation',
    keyResult: 'Reduce setup friction',
    objectiveOwner: 'Demo Manager',
    keyResultOwner: 'Demo Manager',
    baseline: 5,
    target: 2,
    update: null,
  },
];

export function getDemoDashboardKeyResults(params: DemoDashboardSearchParams = {}) {
  return demoKeyResults
    .map((kr) => {
      const isStale = !kr.update || (Date.now() - kr.update.weekStart.getTime()) / 86_400_000 > 10;
      return {
        ...kr,
        progress: kr.update ? progress(kr.baseline, kr.target, kr.update.value) : 0,
        isStale,
      };
    })
    .filter((kr) => {
      if (params.status && kr.update?.status !== params.status) return false;
      if (params.confidence && kr.update?.confidence !== params.confidence) return false;
      if (params.blockersOnly && !kr.update?.blockers?.trim()) return false;
      if (params.staleOnly && !kr.isStale) return false;
      return true;
    });
}
