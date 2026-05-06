import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.weeklyUpdate.findMany({
    include: { keyResult: true },
    orderBy: { weekStart: 'asc' },
  });

  const header = ['keyResultId', 'weekStart', 'value', 'confidence', 'status', 'blockers', 'nextStep'];
  const body = rows.map((r) => [r.keyResultId, r.weekStart.toISOString().slice(0, 10), r.value, r.confidence, r.status, r.blockers ?? '', r.nextStep].join(','));
  const csv = [header.join(','), ...body].join('\n');

  return new NextResponse(csv, { headers: { 'content-type': 'text/csv; charset=utf-8' } });
}
