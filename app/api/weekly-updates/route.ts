import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
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
import { toUtcMonday, weeklyUpdateSchema } from '@/lib/validation/weeklyUpdate';

function validationErrorPayload(fieldErrors: Record<string, string[] | undefined>) {
  return {
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      fieldErrors,
    },
  };
}
import { Confidence, HealthStatus, Role } from '@prisma/client';

const createWeeklyUpdateSchema = z.object({
  keyResultId: z.string().cuid(),
  weekStart: z.coerce.date(),
  value: z.number().finite(),
  confidence: z.nativeEnum(Confidence),
  status: z.nativeEnum(HealthStatus),
  blockers: z.string().trim().optional().nullable(),
  nextStep: z.string().trim().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      validationErrorPayload({ body: ['Request body must be valid JSON'] }),
      { status: 400 },
    );
  }

  const parsed = weeklyUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(validationErrorPayload(parsed.error.flatten().fieldErrors), { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }

  const data = parsed.data;

  try {
    const update = await prisma.weeklyUpdate.create({
      data: {
        ...data,
        blockers: data.blockers ?? null,
        userId: user.id,
        weekStart: toUtcMonday(data.weekStart),
      },
    });

    return NextResponse.json(update);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: 'A weekly update already exists for this key result and week',
            fieldErrors: {
              keyResultId: ['An update already exists for this week'],
              weekStart: ['An update already exists for this week'],
            },
          },
        },
        { status: 409 },
      );
    }

    throw error;
  }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawBody = await req.json().catch(() => null);
  const parsed = createWeeklyUpdateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { keyResultId, weekStart, value, confidence, status, blockers, nextStep } = parsed.data;

  const keyResultExists = await prisma.keyResult.findUnique({
    where: { id: keyResultId },
    select: { id: true },
  });

  if (!keyResultExists) {
    return NextResponse.json({ error: 'Key result not found' }, { status: 404 });
  }

  const keyResult = await prisma.keyResult.findFirst({
    where: {
      id: keyResultId,
      objective: {
        cycle: {
          workspace: {
            memberships: {
              some: {
                userId: user.id,
              },
            },
          },
        },
      },
    },
    select: {
      id: true,
      objective: {
        select: {
          owner: {
            select: {
              userId: true,
            },
          },
          cycle: {
            select: {
              workspace: {
                select: {
                  id: true,
                  memberships: {
                    where: { userId: user.id },
                    select: { role: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!keyResult) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const membership = keyResult.objective.cycle.workspace.memberships[0];
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const isManagerOrOwner = membership.role === Role.MANAGER || membership.role === Role.OWNER;
  const isAssignedMember = keyResult.objective.owner.userId === user.id;

  if (!isManagerOrOwner && !isAssignedMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const update = await prisma.weeklyUpdate.create({
    data: {
      keyResultId,
      userId: user.id,
      weekStart,
      value,
      confidence,
      status,
      blockers,
      nextStep,
    },
  });

  return NextResponse.json(update);
}
