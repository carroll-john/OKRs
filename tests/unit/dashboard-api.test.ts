import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/authz', () => ({
  getAuthenticatedUser: vi.fn(),
  isWorkspaceMember: vi.fn(),
}));

vi.mock('@/lib/server/dashboard-service', () => ({
  getDashboardSummary: vi.fn(),
  getDashboardExportCsv: vi.fn(),
  parseDashboardStatus: vi.fn((value: string | null) => {
    if (!value) return undefined;
    return ['ON_TRACK', 'AT_RISK', 'OFF_TRACK'].includes(value) ? value : undefined;
  }),
}));

import { getAuthenticatedUser, isWorkspaceMember } from '@/lib/server/authz';
import { getDashboardExportCsv, getDashboardSummary } from '@/lib/server/dashboard-service';
import { GET as exportGET } from '../../app/api/dashboard/export/route';
import { GET as summaryGET } from '../../app/api/dashboard/summary/route';

const mockedUser = getAuthenticatedUser as unknown as ReturnType<typeof vi.fn>;
const mockedMember = isWorkspaceMember as unknown as ReturnType<typeof vi.fn>;
const mockedSummary = getDashboardSummary as unknown as ReturnType<typeof vi.fn>;
const mockedExportCsv = getDashboardExportCsv as unknown as ReturnType<typeof vi.fn>;

describe('dashboard API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 from summary when unauthorized', async () => {
    mockedUser.mockResolvedValue(null);

    const res = await summaryGET(new Request('http://localhost/api/dashboard/summary?workspaceId=w1&cycleId=c1') as any);

    expect(res.status).toBe(401);
  });

  it('returns 400 from summary when required IDs are missing', async () => {
    mockedUser.mockResolvedValue({ id: 'u1', email: 'a@example.com' });

    const res = await summaryGET(new Request('http://localhost/api/dashboard/summary?workspaceId=w1') as any);

    expect(res.status).toBe(400);
    expect(mockedSummary).not.toHaveBeenCalled();
  });

  it('returns 403 from summary when user is outside the workspace', async () => {
    mockedUser.mockResolvedValue({ id: 'u1', email: 'a@example.com' });
    mockedMember.mockResolvedValue(false);

    const res = await summaryGET(new Request('http://localhost/api/dashboard/summary?workspaceId=w1&cycleId=c1') as any);

    expect(res.status).toBe(403);
    expect(mockedMember).toHaveBeenCalledWith('u1', 'w1');
    expect(mockedSummary).not.toHaveBeenCalled();
  });

  it('returns dashboard summary for workspace members', async () => {
    const summary = {
      workspaceId: 'w1',
      cycleId: 'c1',
      counts: { onTrack: 1, atRisk: 0, offTrack: 0 },
      staleUpdates: 0,
      blockerCount: 0,
      blockers: [],
    };
    mockedUser.mockResolvedValue({ id: 'u1', email: 'a@example.com' });
    mockedMember.mockResolvedValue(true);
    mockedSummary.mockResolvedValue(summary);

    const res = await summaryGET(new Request('http://localhost/api/dashboard/summary?workspaceId=w1&cycleId=c1') as any);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(summary);
    expect(mockedSummary).toHaveBeenCalledWith('w1', 'c1');
  });

  it('returns 400 from export for invalid status filters', async () => {
    mockedUser.mockResolvedValue({ id: 'u1', email: 'a@example.com' });

    const res = await exportGET(new Request('http://localhost/api/dashboard/export?workspaceId=w1&cycleId=c1&status=GREEN') as any);

    expect(res.status).toBe(400);
    expect(mockedExportCsv).not.toHaveBeenCalled();
  });

  it('returns filtered CSV export for workspace members', async () => {
    mockedUser.mockResolvedValue({ id: 'u1', email: 'a@example.com' });
    mockedMember.mockResolvedValue(true);
    mockedExportCsv.mockResolvedValue('objective,KR\nGrow revenue,Reach 10k');

    const res = await exportGET(
      new Request('http://localhost/api/dashboard/export?workspaceId=w1&cycleId=c1&status=ON_TRACK&staleOnly=1') as any,
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/csv');
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="okr-export-c1.csv"');
    expect(await res.text()).toBe('objective,KR\nGrow revenue,Reach 10k');
    expect(mockedExportCsv).toHaveBeenCalledWith('w1', 'c1', { status: 'ON_TRACK', staleOnly: true });
  });
});
