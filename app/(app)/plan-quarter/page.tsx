import type { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getDemoQuarterPlan, isLocalDemoMode } from '@/lib/demo-data';
import type { QuarterPlan } from '@/lib/quarter-plan';
import { PlanQuarterClient } from './PlanQuarterClient';

type ObjectiveForPlan = Prisma.ObjectiveGetPayload<{
  include: {
    owner: { select: { user: { select: { name: true } } } };
    keyResults: {
      include: {
        owner: { select: { user: { select: { name: true } } } };
        initiatives: {
          include: {
            owner: { select: { user: { select: { name: true } } } };
          };
        };
      };
    };
  };
}>;

function mapPlan(workspaceName: string, cycleName: string, objectives: ObjectiveForPlan[]): QuarterPlan {
  return {
    workspaceName,
    cycleName,
    objectives: objectives.map((objective) => ({
      id: objective.id,
      title: objective.title,
      ownerName: objective.owner.user.name,
      keyResults: objective.keyResults.map((keyResult) => ({
        id: keyResult.id,
        title: keyResult.title,
        metricUnit: keyResult.metricUnit,
        baseline: keyResult.baseline,
        target: keyResult.target,
        ownerName: keyResult.owner.user.name,
        initiatives: keyResult.initiatives.map((initiative) => ({
          id: initiative.id,
          title: initiative.title,
          ownerName: initiative.owner.user.name,
          status: initiative.status,
          dueDate: initiative.dueDate ? initiative.dueDate.toISOString().slice(0, 10) : '',
          notes: initiative.notes ?? '',
        })),
      })),
    })),
  };
}

export default async function PlanQuarterPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/login');

  if (isLocalDemoMode()) {
    return <PlanQuarterClient initialPlan={getDemoQuarterPlan()} storageKey="okr-plan-demo-q2-2026" demoMode />;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { memberships: { include: { workspace: true } } },
  });

  if (!user || user.memberships.length === 0) {
    return <main className="p-6">No workspaces found.</main>;
  }

  const workspace = user.memberships[0].workspace;
  const activeCycle = await prisma.cycle.findFirst({
    where: { workspaceId: workspace.id, status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
  });

  if (!activeCycle) {
    return <main className="p-6">No active cycle found.</main>;
  }

  const objectives = await prisma.objective.findMany({
    where: { cycleId: activeCycle.id },
    include: {
      owner: { select: { user: { select: { name: true } } } },
      keyResults: {
        include: {
          owner: { select: { user: { select: { name: true } } } },
          initiatives: {
            include: {
              owner: { select: { user: { select: { name: true } } } },
            },
            orderBy: { dueDate: 'asc' },
          },
        },
        orderBy: { title: 'asc' },
      },
    },
    orderBy: { title: 'asc' },
  });

  return (
    <PlanQuarterClient
      initialPlan={mapPlan(workspace.name, activeCycle.name, objectives)}
      storageKey={`okr-plan-${workspace.id}-${activeCycle.id}`}
      demoMode={false}
    />
  );
}
