import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

const STALE_DAYS = 10;

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

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { memberships: true },
  });

  const isMember = user?.memberships.some((m) => m.workspaceId === workspaceId);
  if (!user || !isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const krs = await prisma.keyResult.findMany({
    where: { objective: { cycleId, cycle: { workspaceId } } },
    include: {
      updates: { orderBy: { weekStart: 'desc' }, take: 1 },
    },
  });

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

    if ((now - update.weekStart.getTime()) / 86400000 > STALE_DAYS) {
      staleUpdates += 1;
    }

    if (update.status === 'ON_TRACK') onTrack += 1;
    if (update.status === 'AT_RISK') atRisk += 1;
    if (update.status === 'OFF_TRACK') offTrack += 1;

    if (update.blockers?.trim()) {
      blockers.push({ keyResultId: kr.id, keyResult: kr.title, blocker: update.blockers.trim() });
    }
  }

  return NextResponse.json({
    workspaceId,
    cycleId,
    counts: { onTrack, atRisk, offTrack },
    staleUpdates,
    blockerCount: blockers.length,
    blockers,
  });
}
