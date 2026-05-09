import type { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getAllDemoDashboardObjectives, getDemoDashboardObjectives, isLocalDemoMode } from '@/lib/demo-data';
import {
  filterWorkflowObjectives,
  formatDate,
  formatStatus,
  getNeedsAttention,
  isKeyResultStale,
  keyResultProgress,
  summarizeWorkflow,
  type Confidence,
  type HealthStatus,
  type InitiativeStatus,
  type WorkflowFilters,
  type WorkflowObjective,
} from '@/lib/okr-workflow';

type DashboardSearchParams = WorkflowFilters & {
  workspaceId?: string;
  ownerId?: string;
};

type ObjectiveWithWorkflow = Prisma.ObjectiveGetPayload<{
  include: {
    owner: { select: { userId: true; user: { select: { name: true } } } };
    keyResults: {
      include: {
        owner: { select: { userId: true; user: { select: { name: true } } } };
        updates: { orderBy: { weekStart: 'desc' }; take: 1 };
        initiatives: {
          include: {
            owner: { select: { user: { select: { name: true } } } };
          };
        };
      };
    };
  };
}>;

const healthStatuses: HealthStatus[] = ['ON_TRACK', 'AT_RISK', 'OFF_TRACK'];
const confidenceLevels: Confidence[] = ['LOW', 'MEDIUM', 'HIGH'];
const initiativeStatuses: InitiativeStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'DONE'];

function mapObjectives(objectives: ObjectiveWithWorkflow[], ownerId?: string): WorkflowObjective[] {
  return objectives
    .map((objective) => ({
      id: objective.id,
      title: objective.title,
      ownerName: objective.owner.user.name,
      keyResults: objective.keyResults
        .filter((keyResult) => !ownerId || keyResult.owner.userId === ownerId || objective.owner.userId === ownerId)
        .map((keyResult) => {
          const latestUpdate = keyResult.updates[0] ?? null;
          return {
            id: keyResult.id,
            title: keyResult.title,
            metricUnit: keyResult.metricUnit,
            baseline: keyResult.baseline,
            target: keyResult.target,
            ownerName: keyResult.owner.user.name,
            latestUpdate: latestUpdate
              ? {
                  weekStart: latestUpdate.weekStart,
                  value: latestUpdate.value,
                  confidence: latestUpdate.confidence,
                  status: latestUpdate.status,
                  blockers: latestUpdate.blockers,
                  nextStep: latestUpdate.nextStep,
                }
              : null,
            initiatives: keyResult.initiatives.map((initiative) => ({
              id: initiative.id,
              title: initiative.title,
              ownerName: initiative.owner.user.name,
              status: initiative.status,
              dueDate: initiative.dueDate,
              notes: initiative.notes,
            })),
          };
        }),
    }))
    .filter((objective) => objective.keyResults.length > 0);
}

function badgeClass(value: HealthStatus | Confidence | InitiativeStatus | 'STALE') {
  const base = 'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium capitalize';
  const variants: Record<string, string> = {
    ON_TRACK: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    AT_RISK: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    OFF_TRACK: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    HIGH: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    MEDIUM: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    LOW: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    NOT_STARTED: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    IN_PROGRESS: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    BLOCKED: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    DONE: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    STALE: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  };
  return `${base} ${variants[value]}`;
}

function valueWithUnit(value: number, unit: string) {
  return unit === '%' ? `${value}%` : `${value} ${unit}`;
}

function statLabel(label: string, value: number, helper?: string) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
      {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
    </div>
  );
}

function FilterForm({
  params,
  memberships,
  members,
  activeWorkspaceId,
}: {
  params: DashboardSearchParams;
  memberships?: Array<{ workspaceId: string; workspace: { name: string } }>;
  members?: Array<{ userId: string; user: { name: string } }>;
  activeWorkspaceId?: string;
}) {
  return (
    <form className="grid gap-3 rounded border border-slate-200 bg-white p-4 md:grid-cols-6" method="GET">
      {memberships && activeWorkspaceId && (
        <label className="grid gap-1 text-sm text-slate-600">
          Workspace
          <select name="workspaceId" defaultValue={activeWorkspaceId} className="rounded border border-slate-300 bg-white px-2 py-2 text-slate-950">
            {memberships.map((membership) => (
              <option key={membership.workspaceId} value={membership.workspaceId}>{membership.workspace.name}</option>
            ))}
          </select>
        </label>
      )}

      {members && (
        <label className="grid gap-1 text-sm text-slate-600">
          Owner
          <select name="ownerId" defaultValue={params.ownerId ?? ''} className="rounded border border-slate-300 bg-white px-2 py-2 text-slate-950">
            <option value="">All owners</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>{member.user.name}</option>
            ))}
          </select>
        </label>
      )}

      <label className="grid gap-1 text-sm text-slate-600">
        KR status
        <select name="status" defaultValue={params.status ?? ''} className="rounded border border-slate-300 bg-white px-2 py-2 text-slate-950">
          <option value="">All statuses</option>
          {healthStatuses.map((status) => (
            <option key={status} value={status}>{formatStatus(status)}</option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-sm text-slate-600">
        Confidence
        <select name="confidence" defaultValue={params.confidence ?? ''} className="rounded border border-slate-300 bg-white px-2 py-2 text-slate-950">
          <option value="">All confidence</option>
          {confidenceLevels.map((confidence) => (
            <option key={confidence} value={confidence}>{formatStatus(confidence)}</option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-sm text-slate-600">
        Initiative status
        <select name="initiativeStatus" defaultValue={params.initiativeStatus ?? ''} className="rounded border border-slate-300 bg-white px-2 py-2 text-slate-950">
          <option value="">All initiatives</option>
          {initiativeStatuses.map((status) => (
            <option key={status} value={status}>{formatStatus(status)}</option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap items-end gap-4 text-sm text-slate-700 md:col-span-6">
        <label className="inline-flex min-h-10 items-center gap-2">
          <input type="checkbox" name="staleOnly" value="1" defaultChecked={params.staleOnly === '1'} /> stale KRs
        </label>
        <label className="inline-flex min-h-10 items-center gap-2">
          <input type="checkbox" name="blockersOnly" value="1" defaultChecked={params.blockersOnly === '1'} /> KR blockers
        </label>
        <button type="submit" className="min-h-10 rounded bg-slate-950 px-4 py-2 text-sm font-medium text-white">Apply filters</button>
        <a href="/dashboard" className="inline-flex min-h-10 items-center rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Reset</a>
      </div>
    </form>
  );
}

function DashboardView({
  title,
  subtitle,
  params,
  objectives,
  allObjectives,
  memberships,
  members,
  activeWorkspaceId,
  activeCycleName,
  exportHref,
  demoMode,
}: {
  title: string;
  subtitle: string;
  params: DashboardSearchParams;
  objectives: WorkflowObjective[];
  allObjectives: WorkflowObjective[];
  memberships?: Array<{ workspaceId: string; workspace: { name: string } }>;
  members?: Array<{ userId: string; user: { name: string } }>;
  activeWorkspaceId?: string;
  activeCycleName?: string;
  exportHref?: string;
  demoMode?: boolean;
}) {
  const summary = summarizeWorkflow(allObjectives);
  const needsAttention = getNeedsAttention(allObjectives);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
          <p className="mt-1 text-sm text-slate-600">Active cycle: {activeCycleName ?? 'No active cycle'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {demoMode && <span className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-amber-200">Local demo mode</span>}
          {exportHref && <a href={exportHref} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">Export CSV</a>}
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6" aria-label="Quarter summary">
        {statLabel('Objectives', summary.objectiveCount)}
        {statLabel('Key results', summary.keyResultCount, `${summary.averageProgress}% avg progress`)}
        {statLabel('Initiatives', summary.initiativeCount, `${summary.doneInitiativeCount} done`)}
        {statLabel('At risk', summary.atRiskCount)}
        {statLabel('Stale KRs', summary.staleKeyResultCount)}
        {statLabel('Blocked', summary.blockedInitiativeCount, 'initiatives')}
      </section>

      <FilterForm params={params} memberships={memberships} members={members} activeWorkspaceId={activeWorkspaceId} />

      <section className="rounded border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold">Needs attention</h2>
          <p className="text-sm text-slate-500">Blocked initiatives, stale KR updates, and KRs that are not healthy.</p>
        </div>
        {needsAttention.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {needsAttention.slice(0, 6).map((item) => (
              <div key={item.id} className="grid gap-2 px-4 py-3 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="text-sm font-medium">{item.objectiveTitle} / {item.keyResultTitle}</p>
                  <p className="text-sm text-slate-600">{item.detail}</p>
                </div>
                <span className={item.severity === 'high' ? badgeClass('OFF_TRACK') : badgeClass('AT_RISK')}>{item.reason}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-5 text-sm text-slate-600">No blocked, stale, or at-risk work right now.</p>
        )}
      </section>

      <section className="space-y-4" aria-label="Objectives and key results">
        {objectives.length > 0 ? objectives.map((objective) => (
          <article key={objective.id} className="overflow-hidden rounded border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Objective</p>
              <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold">{objective.title}</h2>
                <p className="text-sm text-slate-600">Owner: {objective.ownerName}</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {objective.keyResults.map((keyResult) => {
                const latestUpdate = keyResult.latestUpdate;
                const krProgress = keyResultProgress(keyResult);
                const stale = isKeyResultStale(latestUpdate);
                return (
                  <section key={keyResult.id} className="grid gap-4 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Key result</p>
                          <h3 className="mt-1 text-base font-semibold">{keyResult.title}</h3>
                          <p className="mt-1 text-sm text-slate-600">Owner: {keyResult.ownerName}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {latestUpdate ? <span className={badgeClass(latestUpdate.status)}>{formatStatus(latestUpdate.status)}</span> : <span className={badgeClass('STALE')}>no update</span>}
                          {latestUpdate && <span className={badgeClass(latestUpdate.confidence)}>{formatStatus(latestUpdate.confidence)}</span>}
                          {stale && <span className={badgeClass('STALE')}>stale</span>}
                        </div>
                      </div>

                      <div>
                        <div className="mb-1 flex justify-between text-sm text-slate-600">
                          <span>Progress</span>
                          <span>{krProgress}%</span>
                        </div>
                        <div className="h-2 rounded bg-slate-100">
                          <div className="h-2 rounded bg-slate-950" style={{ width: `${krProgress}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Baseline {valueWithUnit(keyResult.baseline, keyResult.metricUnit)} / target {valueWithUnit(keyResult.target, keyResult.metricUnit)}
                          {latestUpdate ? ` / latest ${valueWithUnit(latestUpdate.value, keyResult.metricUnit)} on ${formatDate(latestUpdate.weekStart)}` : ' / no weekly update yet'}
                        </p>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                        <p><span className="font-medium text-slate-950">Blocker:</span> {latestUpdate?.blockers || 'None'}</p>
                        <p><span className="font-medium text-slate-950">Next step:</span> {latestUpdate?.nextStep || 'Needs weekly check-in'}</p>
                      </div>
                    </div>

                    <div className="rounded border border-slate-200">
                      <div className="border-b border-slate-200 px-3 py-2">
                        <p className="text-sm font-medium">Initiatives</p>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {keyResult.initiatives.length > 0 ? keyResult.initiatives.map((initiative) => (
                          <div key={initiative.id} className="px-3 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-medium">{initiative.title}</p>
                              <span className={badgeClass(initiative.status)}>{formatStatus(initiative.status)}</span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">Owner: {initiative.ownerName} / Due: {formatDate(initiative.dueDate)}</p>
                            {initiative.notes && <p className="mt-1 text-sm text-slate-600">{initiative.notes}</p>}
                          </div>
                        )) : (
                          <p className="px-3 py-4 text-sm text-slate-500">No initiatives linked to this KR yet.</p>
                        )}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </article>
        )) : (
          <div className="rounded border border-slate-200 bg-white px-4 py-8 text-sm text-slate-600">No results match the current filters.</div>
        )}
      </section>
    </main>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: DashboardSearchParams;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/login');

  const params = searchParams ?? {};
  if (isLocalDemoMode()) {
    return (
      <DashboardView
        title="Quarterly OKR Review"
        subtitle="Product & Eng Team"
        params={params}
        objectives={getDemoDashboardObjectives(params)}
        allObjectives={getAllDemoDashboardObjectives()}
        activeCycleName="Q2 2026"
        demoMode
      />
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { memberships: { include: { workspace: true } } },
  });

  if (!user || user.memberships.length === 0) {
    return <main className="p-6">No workspaces found.</main>;
  }

  const activeWorkspaceId = user.memberships.some((membership) => membership.workspaceId === params.workspaceId)
    ? params.workspaceId!
    : user.memberships[0].workspaceId;

  const activeWorkspace = user.memberships.find((membership) => membership.workspaceId === activeWorkspaceId)?.workspace;
  const activeCycle = await prisma.cycle.findFirst({
    where: { workspaceId: activeWorkspaceId, status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
  });

  const members = await prisma.membership.findMany({
    where: { workspaceId: activeWorkspaceId },
    select: { userId: true, user: { select: { name: true } } },
    orderBy: { user: { name: 'asc' } },
  });

  const rawObjectives: ObjectiveWithWorkflow[] = activeCycle
    ? await prisma.objective.findMany({
        where: { cycleId: activeCycle.id },
        include: {
          owner: { select: { userId: true, user: { select: { name: true } } } },
          keyResults: {
            include: {
              owner: { select: { userId: true, user: { select: { name: true } } } },
              updates: { orderBy: { weekStart: 'desc' }, take: 1 },
              initiatives: {
                include: {
                  owner: { select: { user: { select: { name: true } } } },
                },
                orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
              },
            },
            orderBy: { title: 'asc' },
          },
        },
        orderBy: { title: 'asc' },
      })
    : [];

  const allObjectives = mapObjectives(rawObjectives, params.ownerId);
  const objectives = filterWorkflowObjectives(allObjectives, params);

  return (
    <DashboardView
      title="Quarterly OKR Review"
      subtitle={activeWorkspace?.name ?? 'Unknown workspace'}
      params={params}
      objectives={objectives}
      allObjectives={allObjectives}
      memberships={user.memberships}
      members={members}
      activeWorkspaceId={activeWorkspaceId}
      activeCycleName={activeCycle?.name}
      exportHref={activeCycle ? `/api/dashboard/export?workspaceId=${encodeURIComponent(activeWorkspaceId)}&cycleId=${encodeURIComponent(activeCycle.id)}` : undefined}
    />
  );
}
