import { progress } from '@/lib/progress';

export type HealthStatus = 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
export type Confidence = 'LOW' | 'MEDIUM' | 'HIGH';
export type InitiativeStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';

export type WorkflowFilters = {
  status?: HealthStatus;
  confidence?: Confidence;
  initiativeStatus?: InitiativeStatus;
  staleOnly?: '1';
  blockersOnly?: '1';
};

export type WorkflowUpdate = {
  weekStart: Date;
  value: number;
  confidence: Confidence;
  status: HealthStatus;
  blockers: string | null;
  nextStep: string;
};

export type WorkflowInitiative = {
  id: string;
  title: string;
  ownerName: string;
  status: InitiativeStatus;
  dueDate: Date | null;
  notes: string | null;
};

export type WorkflowKeyResult = {
  id: string;
  title: string;
  metricUnit: string;
  baseline: number;
  target: number;
  ownerName: string;
  latestUpdate: WorkflowUpdate | null;
  initiatives: WorkflowInitiative[];
};

export type WorkflowObjective = {
  id: string;
  title: string;
  ownerName: string;
  keyResults: WorkflowKeyResult[];
};

export type NeedsAttentionItem = {
  id: string;
  objectiveTitle: string;
  keyResultTitle: string;
  reason: string;
  detail: string;
  severity: 'high' | 'medium';
};

export const STALE_DAYS = 10;

export function keyResultProgress(keyResult: Pick<WorkflowKeyResult, 'baseline' | 'target' | 'latestUpdate'>) {
  return keyResult.latestUpdate ? progress(keyResult.baseline, keyResult.target, keyResult.latestUpdate.value) : 0;
}

export function isKeyResultStale(update: Pick<WorkflowUpdate, 'weekStart'> | null, now = Date.now()) {
  return !update || (now - update.weekStart.getTime()) / 86_400_000 > STALE_DAYS;
}

export function formatDate(value: Date | null) {
  if (!value) return 'No date';
  return value.toISOString().slice(0, 10);
}

export function formatStatus(value: string) {
  return value.toLowerCase().replaceAll('_', ' ');
}

export function filterWorkflowObjectives(objectives: WorkflowObjective[], filters: WorkflowFilters) {
  return objectives
    .map((objective) => ({
      ...objective,
      keyResults: objective.keyResults.filter((keyResult) => {
        const update = keyResult.latestUpdate;
        if (filters.status && update?.status !== filters.status) return false;
        if (filters.confidence && update?.confidence !== filters.confidence) return false;
        if (filters.blockersOnly && !update?.blockers?.trim()) return false;
        if (filters.staleOnly && !isKeyResultStale(update)) return false;
        if (filters.initiativeStatus && !keyResult.initiatives.some((initiative) => initiative.status === filters.initiativeStatus)) return false;
        return true;
      }),
    }))
    .filter((objective) => objective.keyResults.length > 0);
}

export function summarizeWorkflow(objectives: WorkflowObjective[]) {
  const keyResults = objectives.flatMap((objective) => objective.keyResults);
  const initiatives = keyResults.flatMap((keyResult) => keyResult.initiatives);
  const withUpdates = keyResults.filter((keyResult) => keyResult.latestUpdate);

  const averageProgress = keyResults.length
    ? Math.round(keyResults.reduce((total, keyResult) => total + keyResultProgress(keyResult), 0) / keyResults.length)
    : 0;

  return {
    objectiveCount: objectives.length,
    keyResultCount: keyResults.length,
    initiativeCount: initiatives.length,
    averageProgress,
    onTrackCount: withUpdates.filter((keyResult) => keyResult.latestUpdate?.status === 'ON_TRACK').length,
    atRiskCount: withUpdates.filter((keyResult) => keyResult.latestUpdate?.status === 'AT_RISK').length,
    offTrackCount: withUpdates.filter((keyResult) => keyResult.latestUpdate?.status === 'OFF_TRACK').length,
    staleKeyResultCount: keyResults.filter((keyResult) => isKeyResultStale(keyResult.latestUpdate)).length,
    blockedInitiativeCount: initiatives.filter((initiative) => initiative.status === 'BLOCKED').length,
    doneInitiativeCount: initiatives.filter((initiative) => initiative.status === 'DONE').length,
  };
}

export function getNeedsAttention(objectives: WorkflowObjective[]): NeedsAttentionItem[] {
  const items: NeedsAttentionItem[] = [];

  for (const objective of objectives) {
    for (const keyResult of objective.keyResults) {
      const update = keyResult.latestUpdate;
      if (update?.blockers?.trim()) {
        items.push({
          id: `${keyResult.id}-blocker`,
          objectiveTitle: objective.title,
          keyResultTitle: keyResult.title,
          reason: 'KR blocker',
          detail: update.blockers.trim(),
          severity: 'high',
        });
      }

      if (update?.status === 'OFF_TRACK' || update?.status === 'AT_RISK') {
        items.push({
          id: `${keyResult.id}-health`,
          objectiveTitle: objective.title,
          keyResultTitle: keyResult.title,
          reason: formatStatus(update.status),
          detail: update.nextStep,
          severity: update.status === 'OFF_TRACK' ? 'high' : 'medium',
        });
      }

      if (isKeyResultStale(update)) {
        items.push({
          id: `${keyResult.id}-stale`,
          objectiveTitle: objective.title,
          keyResultTitle: keyResult.title,
          reason: 'stale KR update',
          detail: 'Needs this week check-in',
          severity: 'medium',
        });
      }

      for (const initiative of keyResult.initiatives) {
        if (initiative.status === 'BLOCKED') {
          items.push({
            id: `${initiative.id}-blocked`,
            objectiveTitle: objective.title,
            keyResultTitle: keyResult.title,
            reason: 'blocked initiative',
            detail: initiative.title,
            severity: 'high',
          });
        }
      }
    }
  }

  return items.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1));
}
