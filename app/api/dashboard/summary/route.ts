import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, isWorkspaceMember } from '@/lib/server/authz';
import { getDashboardSummary } from '@/lib/server/dashboard-service';

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

  const member = await isWorkspaceMember(user.id, workspaceId);
  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(await getDashboardSummary(workspaceId, cycleId));
}
