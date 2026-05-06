import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { progress } from '@/lib/progress';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { workspaceId?: string; cycleId?: string; status?: string; staleOnly?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { memberships: { include: { workspace: true } } },
  });
  if (!user || user.memberships.length === 0) {
    return <main className="p-6">No workspaces found.</main>;
  }

  const workspaceId = searchParams.workspaceId ?? user.memberships[0].workspaceId;
  const isMember = user.memberships.some((m) => m.workspaceId === workspaceId);
  if (!isMember) redirect('/dashboard');

  const cycles = await prisma.cycle.findMany({ where: { workspaceId }, orderBy: { startDate: 'desc' } });
  const cycleId = searchParams.cycleId ?? cycles[0]?.id;

  const krs = await prisma.keyResult.findMany({
    where: { objective: { cycleId, cycle: { workspaceId } } },
    include: {
      objective: { include: { owner: { include: { user: true } } } },
      updates: { orderBy: { weekStart: 'desc' }, take: 1 },
    },
  });

  const filteredKrs = krs.filter((kr) => {
    const u = kr.updates[0];
    const stale = !u || (Date.now() - new Date(u.weekStart).getTime()) / 86400000 > 10;
    if (searchParams.status && u?.status !== searchParams.status) return false;
    if (searchParams.staleOnly === '1' && !stale) return false;
    return true;
  });

  const params = new URLSearchParams();
  params.set('workspaceId', workspaceId);
  if (cycleId) params.set('cycleId', cycleId);
  if (searchParams.status) params.set('status', searchParams.status);
  if (searchParams.staleOnly === '1') params.set('staleOnly', '1');

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Weekly OKR Dashboard</h1>
      <p className="text-sm text-slate-600">Focus: progress, confidence, status, blockers, next step.</p>
      <div className="flex flex-wrap gap-2">
        <a href={`/api/dashboard/summary?${params.toString()}`} className="bg-slate-800 text-white px-3 py-2 rounded text-sm">
          Weekly summary
        </a>
        <a href={`/api/dashboard/export?${params.toString()}`} className="bg-slate-800 text-white px-3 py-2 rounded text-sm">
          Export CSV
        </a>
      </div>
      <div className="grid gap-3">
        {filteredKrs.map((kr) => {
          const u = kr.updates[0];
          const stale = !u || (Date.now() - new Date(u.weekStart).getTime()) / 86400000 > 10;

          return (
            <div key={kr.id} className="bg-white border rounded p-4">
              <p className="font-medium">{kr.objective.title} → {kr.title}</p>
              <p className="text-sm">Owner: {kr.objective.owner.user.name}</p>
              <p className="text-sm">
                Progress: {u ? progress(kr.baseline, kr.target, u.value) : 0}% | Confidence: {u?.confidence ?? 'N/A'} | Status: {u?.status ?? 'N/A'}
              </p>
              <p className="text-sm">Blockers: {u?.blockers || 'None'}</p>
              <p className="text-sm">Next step: {u?.nextStep || 'No update yet'}</p>
              {stale && <p className="text-amber-600 text-sm mt-1">Stale update: needs weekly check-in</p>}
            </div>
          );
        })}
      </div>
    </main>
  );
}
