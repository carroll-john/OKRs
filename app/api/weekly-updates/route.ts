import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { normalizeWeekStart, validateWeeklyUpdateInput } from '@/lib/weekly-update';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = validateWeeklyUpdateInput(await req.json());
    const weekStart = normalizeWeekStart(parsed.weekStart);

    const kr = await prisma.keyResult.findUnique({
      where: { id: parsed.keyResultId },
      include: { objective: { include: { cycle: true } } },
    });
    if (!kr) return NextResponse.json({ error: 'Key result not found' }, { status: 404 });

    const membership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId: kr.objective.cycle.workspaceId } },
    });
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const update = await prisma.weeklyUpdate.create({ data: { ...parsed, userId: user.id, weekStart } });
    return NextResponse.json(update);
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Conflict' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}
