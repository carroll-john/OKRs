import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { progress } from '@/lib/progress';

function csvEscape(value: string | number) {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
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

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { memberships: true },
  });

  const isMember = user?.memberships.some((m) => m.workspaceId === workspaceId);
  if (!user || !isMember) {
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
    const u = kr.updates[0];
    const stale = !u || (Date.now() - new Date(u.weekStart).getTime()) / 86400000 > 10;
    if (status && u?.status !== status) return false;
    if (staleOnly && !stale) return false;
    return true;
  });

  const headers = ['objective', 'KR', 'owner', 'progress %', 'confidence', 'status', 'blockers', 'next step', 'weekStart'];
  const rows = filtered.map((kr) => {
    const u = kr.updates[0];
    return [
      kr.objective.title,
      kr.title,
      kr.objective.owner.user.name,
      u ? progress(kr.baseline, kr.target, u.value) : 0,
      u?.confidence ?? '',
      u?.status ?? '',
      u?.blockers ?? '',
      u?.nextStep ?? '',
      u?.weekStart.toISOString().slice(0, 10) ?? '',
    ].map(csvEscape).join(',');
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
