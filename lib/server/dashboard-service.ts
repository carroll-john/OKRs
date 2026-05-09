import { prisma } from '@/lib/db';
import { progress } from '@/lib/progress';
import { isStaleUpdate, summarizeLatestUpdates } from '@/lib/server/dashboard';
import { csvEscape } from '@/lib/server/csv';
import type { DashboardExportFilters, DashboardStatus, DashboardSummaryDto } from '@/lib/server/types';

const EXPORT_HEADERS = ['objective', 'KR', 'owner', 'progress %', 'confidence', 'status', 'blockers', 'next step', 'weekStart'];
const DASHBOARD_STATUSES: DashboardStatus[] = ['ON_TRACK', 'AT_RISK', 'OFF_TRACK'];

export function parseDashboardStatus(value: string | null): DashboardStatus | undefined {
  if (!value) return undefined;
  return DASHBOARD_STATUSES.includes(value as DashboardStatus) ? (value as DashboardStatus) : undefined;
}

export async function getDashboardSummary(workspaceId: string, cycleId: string): Promise<DashboardSummaryDto> {
  const keyResults = await prisma.keyResult.findMany({
    where: { objective: { cycleId, cycle: { workspaceId } } },
    include: {
      updates: { orderBy: { weekStart: 'desc' }, take: 1 },
    },
  });

  return {
    workspaceId,
    cycleId,
    ...summarizeLatestUpdates(keyResults),
  };
}

export async function getDashboardExportCsv(workspaceId: string, cycleId: string, filters: DashboardExportFilters): Promise<string> {
  const keyResults = await prisma.keyResult.findMany({
    where: {
      objective: {
        cycleId,
        cycle: { workspaceId },
      },
    },
    include: {
      objective: { include: { owner: { include: { user: true } } } },
      updates: { orderBy: { weekStart: 'desc' }, take: 1 },
    },
  });

  const rows = keyResults
    .filter((keyResult) => {
      const update = keyResult.updates[0];
      if (filters.status && update?.status !== filters.status) return false;
      if (filters.staleOnly && !isStaleUpdate(update?.weekStart)) return false;
      return true;
    })
    .map((keyResult) => {
      const update = keyResult.updates[0];
      return [
        keyResult.objective.title,
        keyResult.title,
        keyResult.objective.owner.user.name,
        update ? progress(keyResult.baseline, keyResult.target, update.value) : 0,
        update?.confidence ?? '',
        update?.status ?? '',
        update?.blockers ?? '',
        update?.nextStep ?? '',
        update?.weekStart.toISOString().slice(0, 10) ?? '',
      ]
        .map(csvEscape)
        .join(',');
    });

  return [EXPORT_HEADERS.join(','), ...rows].join('\n');
}
