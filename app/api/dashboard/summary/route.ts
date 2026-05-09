import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, isWorkspaceMember } from '@/lib/server/authz';
import { summarizeLatestUpdates } from '@/lib/server/dashboard';

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

  const krs = await prisma.keyResult.findMany({
    where: { objective: { cycleId, cycle: { workspaceId } } },
    include: {
      updates: { orderBy: { weekStart: 'desc' }, take: 1 },
    },
  });

  const summary = summarizeLatestUpdates(krs);

  return NextResponse.json({
    workspaceId,
    cycleId,
    ...summary,
  });
}
