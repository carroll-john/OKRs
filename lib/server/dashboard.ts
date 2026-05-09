import type { DashboardBlockerDto, DashboardStatus, DashboardSummaryMetrics } from '@/lib/server/types';

const STALE_DAYS = 10;
const MS_IN_DAY = 86_400_000;

export type SummaryInput = Array<{
  id: string;
  title: string;
  updates: Array<{
    weekStart: Date;
    status: DashboardStatus;
    blockers: string | null;
  }>;
}>;

export function isStaleUpdate(weekStart: Date | null | undefined, now = Date.now()) {
  return !weekStart || (now - weekStart.getTime()) / MS_IN_DAY > STALE_DAYS;
}

export function summarizeLatestUpdates(krs: SummaryInput, now = Date.now()): DashboardSummaryMetrics {
  let onTrack = 0;
  let atRisk = 0;
  let offTrack = 0;
  let staleUpdates = 0;
  const blockers: DashboardBlockerDto[] = [];

  for (const kr of krs) {
    const update = kr.updates[0];

    if (isStaleUpdate(update?.weekStart, now)) {
      staleUpdates += 1;
    }

    if (!update) continue;

    if (update.status === 'ON_TRACK') onTrack += 1;
    if (update.status === 'AT_RISK') atRisk += 1;
    if (update.status === 'OFF_TRACK') offTrack += 1;

    if (update.blockers?.trim()) {
      blockers.push({
        keyResultId: kr.id,
        keyResult: kr.title,
        blocker: update.blockers.trim(),
      });
    }
  }

  return {
    counts: { onTrack, atRisk, offTrack },
    staleUpdates,
    blockerCount: blockers.length,
    blockers,
  };
}
