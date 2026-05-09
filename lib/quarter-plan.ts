import type { InitiativeStatus } from '@/lib/okr-workflow';

export type QuarterPlanInitiative = {
  id: string;
  title: string;
  ownerName: string;
  status: InitiativeStatus;
  dueDate: string;
  notes: string;
};

export type QuarterPlanKeyResult = {
  id: string;
  title: string;
  metricUnit: string;
  baseline: number;
  target: number;
  ownerName: string;
  initiatives: QuarterPlanInitiative[];
};

export type QuarterPlanObjective = {
  id: string;
  title: string;
  ownerName: string;
  keyResults: QuarterPlanKeyResult[];
};

export type QuarterPlan = {
  workspaceName: string;
  cycleName: string;
  objectives: QuarterPlanObjective[];
};

export function summarizeQuarterPlan(plan: Pick<QuarterPlan, 'objectives'>) {
  const keyResults = plan.objectives.flatMap((objective) => objective.keyResults);
  const initiatives = keyResults.flatMap((keyResult) => keyResult.initiatives);

  return {
    objectiveCount: plan.objectives.length,
    keyResultCount: keyResults.length,
    initiativeCount: initiatives.length,
    blockedInitiativeCount: initiatives.filter((initiative) => initiative.status === 'BLOCKED').length,
  };
}
