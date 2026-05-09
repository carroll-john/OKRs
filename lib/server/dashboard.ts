const STALE_DAYS = 10;
const MS_IN_DAY = 86_400_000;

export type SummaryInput = Array<{
  id: string;
  title: string;
  updates: Array<{
    weekStart: Date;
    status: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
    blockers: string | null;
  }>;
}>;

export function summarizeLatestUpdates(krs: SummaryInput) {
  const now = Date.now();

  let onTrack = 0;
  let atRisk = 0;
  let offTrack = 0;
  let staleUpdates = 0;
  const blockers: Array<{ keyResultId: string; keyResult: string; blocker: string }> = [];

  for (const kr of krs) {
    const update = kr.updates[0];

    if (!update) {
      staleUpdates += 1;
      continue;
    }

    if ((now - update.weekStart.getTime()) / MS_IN_DAY > STALE_DAYS) {
      staleUpdates += 1;
    }

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
