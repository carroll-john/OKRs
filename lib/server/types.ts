export type DashboardStatus = 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';

export type DashboardSummaryCounts = {
  onTrack: number;
  atRisk: number;
  offTrack: number;
};

export type DashboardBlockerDto = {
  keyResultId: string;
  keyResult: string;
  blocker: string;
};

export type DashboardSummaryMetrics = {
  counts: DashboardSummaryCounts;
  staleUpdates: number;
  blockerCount: number;
  blockers: DashboardBlockerDto[];
};

export type DashboardSummaryDto = DashboardSummaryMetrics & {
  workspaceId: string;
  cycleId: string;
};

export type DashboardExportFilters = {
  status?: DashboardStatus;
  staleOnly: boolean;
};
