import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { progress } from '@/lib/progress';
import { getAuthenticatedUser, isWorkspaceMember } from '@/lib/server/authz';
import { csvEscape } from '@/lib/server/csv';

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

  const status = url.searchParams.get('status');
  const staleOnly = url.searchParams.get('staleOnly') === '1';

  const member = await isWorkspaceMember(user.id, workspaceId);
  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const krs = await prisma.keyResult.findMany({
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

  const filtered = krs.filter((kr) => {
    const update = kr.updates[0];
    const stale = !update || (Date.now() - update.weekStart.getTime()) / 86400000 > 10;
    if (status && update?.status !== status) return false;
    if (staleOnly && !stale) return false;
    return true;
  });

  const headers = ['objective', 'KR', 'owner', 'progress %', 'confidence', 'status', 'blockers', 'next step', 'weekStart'];
  const rows = filtered.map((kr) => {
    const update = kr.updates[0];
    return [
      kr.objective.title,
      kr.title,
      kr.objective.owner.user.name,
      update ? progress(kr.baseline, kr.target, update.value) : 0,
      update?.confidence ?? '',
      update?.status ?? '',
      update?.blockers ?? '',
      update?.nextStep ?? '',
      update?.weekStart.toISOString().slice(0, 10) ?? '',
    ]
      .map(csvEscape)
      .join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="okr-export-${cycleId}.csv"`,
    },
  });
}
