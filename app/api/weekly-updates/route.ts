import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(validationErrorPayload({ body: ['Request body must be valid JSON'] }), { status: 400 });
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
  const keyResult = await prisma.keyResult.findUnique({
    where: { id: data.keyResultId },
    include: { objective: { include: { cycle: true } } },
  });

  if (!keyResult) {
    return NextResponse.json({ error: 'Key result not found' }, { status: 404 });
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: keyResult.objective.cycle.workspaceId,
      },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await prisma.weeklyUpdate.create({
      data: {
        ...data,
        blockers: data.blockers ?? null,
        userId: user.id,
        weekStart: toUtcMonday(data.weekStart),
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    const maybeCode = (error as { code?: string } | null)?.code;
    if (maybeCode === 'P2002') {
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
}