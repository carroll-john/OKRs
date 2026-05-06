import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { progress } from '@/lib/progress';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

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
  });

  type DashboardKr = (typeof krs)[number];

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Weekly OKR Dashboard</h1>
      <p className="text-sm text-slate-600">
        Focus: progress, confidence, status, blockers, next step.
      </p>
      <div className="grid gap-3">
        {krs.map((kr: DashboardKr) => {
          const u = kr.updates[0];
          const stale =
            !u || (Date.now() - new Date(u.weekStart).getTime()) / 86400000 > 10;

          return (
            <div key={kr.id} className="bg-white border rounded p-4">
              <p className="font-medium">
                {kr.objective.title} → {kr.title}
              </p>
              <p className="text-sm text-slate-600">
                KR owner: {kr.owner.user.name}
              </p>
              <p className="text-sm">
                Progress: {u ? progress(kr.baseline, kr.target, u.value) : 0}% |
                Confidence: {u?.confidence ?? 'N/A'} | Status: {u?.status ?? 'N/A'}
              </p>
              <p className="text-sm">Blockers: {u?.blockers || 'None'}</p>
              <p className="text-sm">Next step: {u?.nextStep || 'No update yet'}</p>
              {stale && (
                <p className="text-amber-600 text-sm mt-1">
                  Stale update: needs weekly check-in
                </p>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
