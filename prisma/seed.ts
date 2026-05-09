import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({ where: { email: 'manager@demo.com' }, update: {}, create: { email: 'manager@demo.com', name: 'Demo Manager', passwordHash: hash } });
  const workspace = await prisma.workspace.create({ data: { name: 'Product & Eng Team' } });
  const membership = await prisma.membership.create({ data: { userId: user.id, workspaceId: workspace.id, role: "MANAGER" } });
  const cycle = await prisma.cycle.create({ data: { workspaceId: workspace.id, name: 'Q2 2026', startDate: new Date('2026-04-01'), endDate: new Date('2026-06-30') } });
  const obj = await prisma.objective.create({ data: { cycleId: cycle.id, title: 'Improve activation', ownerMembershipId: membership.id } });
  const kr = await prisma.keyResult.create({ data: { id: 'cm_seed_kr_id', objectiveId: obj.id, ownerMembershipId: membership.id, title: 'Increase activation rate', metricUnit: '%', baseline: 28, target: 40 } });
  await prisma.initiative.createMany({
    data: [
      { keyResultId: kr.id, ownerMembershipId: membership.id, title: 'Ship revised onboarding variant', status: 'IN_PROGRESS', dueDate: new Date('2026-05-22'), notes: 'Variant copy and instrumentation are in progress.' },
      { keyResultId: kr.id, ownerMembershipId: membership.id, title: 'Resolve experiment analysis delay', status: 'BLOCKED', dueDate: new Date('2026-05-15'), notes: 'Waiting on event quality checks.' },
      { keyResultId: kr.id, ownerMembershipId: membership.id, title: 'Publish activation learnings', status: 'NOT_STARTED', dueDate: new Date('2026-06-07') },
    ],
  });
  await prisma.weeklyUpdate.create({ data: { keyResultId: kr.id, userId: user.id, weekStart: new Date('2026-05-04'), value: 31, confidence: "MEDIUM", status: "AT_RISK", blockers: 'Experiment analysis delayed', nextStep: 'Ship revised onboarding variant' } });
}
main().finally(() => prisma.$disconnect());
