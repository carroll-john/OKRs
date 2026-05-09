import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, isWorkspaceMember } from '@/lib/server/authz';
import { getDashboardExportCsv, parseDashboardStatus } from '@/lib/server/dashboard-service';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get('workspaceId');
  const cycleId = url.searchParams.get('cycleId');
  if (!workspaceId || !cycleId) {
    return NextResponse.json({ error: 'workspaceId and cycleId are required' }, { status: 400 });
  }

  const rawStatus = url.searchParams.get('status');
  const status = parseDashboardStatus(rawStatus);
  if (rawStatus && !status) {
    return NextResponse.json({ error: 'status must be ON_TRACK, AT_RISK, or OFF_TRACK' }, { status: 400 });
  }

  const staleOnly = url.searchParams.get('staleOnly') === '1';

  const member = await isWorkspaceMember(user.id, workspaceId);
  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const csv = await getDashboardExportCsv(workspaceId, cycleId, { status, staleOnly });
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="okr-export-${cycleId}.csv"`,
    },
  });
}
