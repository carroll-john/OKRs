import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { progress } from '@/lib/progress';
import { Confidence, HealthStatus, CycleStatus } from '@prisma/client';

type DashboardSearchParams = {
  workspaceId?: string;
  ownerId?: string;
  status?: HealthStatus;
  confidence?: Confidence;
  staleOnly?: '1';
  blockersOnly?: '1';
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/login');

  const params = await searchParams;

  const memberships = await prisma.membership.findMany({
    where: { user: { email: session.user.email } },
    include: { workspace: true },
    orderBy: { workspace: { name: 'asc' } },
  });

  if (!memberships.length) {
    return (
      <main className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Weekly OKR Dashboard</h1>
        <p className="text-sm text-slate-600">You are not a member of any workspace.</p>
      </main>
    );
  }

  const activeWorkspaceId = memberships.some((m) => m.workspaceId === params.workspaceId)
    ? params.workspaceId!
    : memberships[0].workspaceId;

  const activeCycle = await prisma.cycle.findFirst({
    where: {
      workspaceId: activeWorkspaceId,
      status: CycleStatus.ACTIVE,
  const krs = await prisma.keyResult.findMany({
    include: {
      objective: {
        include: {
          owner: {
            include: { user: true },
          },
        },
      },
      owner: {
        include: { user: true },
      },
      updates: { orderBy: { weekStart: 'desc' }, take: 1 },
    },
    orderBy: { startDate: 'desc' },
    select: { id: true, name: true },
  });

  const members = await prisma.membership.findMany({
    where: { workspaceId: activeWorkspaceId },
    select: {
      userId: true,
      user: { select: { name: true } },
    },
    orderBy: { user: { name: 'asc' } },
  });

  const staleDate = new Date(Date.now() - 10 * 86400000);

  const krsRaw = activeCycle
    ? await prisma.keyResult.findMany({
        where: {
          objective: {
            cycleId: activeCycle.id,
            ...(params.ownerId ? { owner: { userId: params.ownerId } } : {}),
          },
        },
        include: {
          objective: {
            select: {
              title: true,
              owner: { select: { user: { select: { name: true, id: true } } } },
            },
          },
          updates: { orderBy: { weekStart: 'desc' }, take: 1 },
        },
      })
    : [];

  const krs = krsRaw.filter((kr) => {
    const u = kr.updates[0];
    const isStale = !u || u.weekStart < staleDate;

    if (params.status && u?.status !== params.status) return false;
    if (params.confidence && u?.confidence !== params.confidence) return false;
    if (params.blockersOnly && !u?.blockers?.trim()) return false;
    if (params.staleOnly && !isStale) return false;

    return true;
  });

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Weekly OKR Dashboard</h1>
      <p className="text-sm text-slate-600">Focus: progress, confidence, status, blockers, next step.</p>

      <form className="grid gap-2 md:grid-cols-6 bg-white border rounded p-3" method="GET">
        <select name="workspaceId" defaultValue={activeWorkspaceId} className="border rounded px-2 py-1">
          {memberships.map((m) => (
            <option key={m.workspaceId} value={m.workspaceId}>
              {m.workspace.name}
            </option>
          ))}
        </select>

        <select name="ownerId" defaultValue={params.ownerId ?? ''} className="border rounded px-2 py-1">
          <option value="">All team members</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.user.name}
            </option>
          ))}
        </select>

        <select name="status" defaultValue={params.status ?? ''} className="border rounded px-2 py-1">
          <option value="">All statuses</option>
          {Object.values(HealthStatus).map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select name="confidence" defaultValue={params.confidence ?? ''} className="border rounded px-2 py-1">
          <option value="">All confidence</option>
          {Object.values(Confidence).map((confidence) => (
            <option key={confidence} value={confidence}>
              {confidence}
            </option>
          ))}
        </select>

        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" name="staleOnly" value="1" defaultChecked={params.staleOnly === '1'} />
          stale only
        </label>

        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" name="blockersOnly" value="1" defaultChecked={params.blockersOnly === '1'} />
          blockers only
        </label>

        <button type="submit" className="md:col-span-6 bg-slate-900 text-white rounded px-3 py-1 w-fit">
          Apply filters
        </button>
      </form>

      {activeCycle ? (
        <p className="text-sm text-slate-600">Active cycle: {activeCycle.name}</p>
      ) : (
        <p className="text-sm text-amber-700">No active cycle for this workspace.</p>
      )}

      <div className="grid gap-3">
        {krs.map((kr) => {
          const u = kr.updates[0];
          const stale = !u || (Date.now() - new Date(u.weekStart).getTime()) / 86400000 > 10;

          return (
            <div key={kr.id} className="bg-white border rounded p-4">
              <p className="font-medium">
                {kr.objective.title} → {kr.title}
              </p>
              <p className="text-sm">Owner: {kr.objective.owner.user.name}</p>
              <p className="text-sm text-slate-600">
                KR owner: {kr.owner.user.name}
              </p>
              <p className="text-sm">
                Progress: {u ? progress(kr.baseline, kr.target, u.value) : 0}% | Confidence: {u?.confidence ?? 'N/A'} | Status:{' '}
                {u?.status ?? 'N/A'}
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
