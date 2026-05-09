import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, isWorkspaceMember } from '@/lib/server/authz';
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

function conflictPayload() {
  return {
    error: {
      code: 'CONFLICT',
      message: 'A weekly update already exists for this key result and week',
      fieldErrors: {
        keyResultId: ['An update already exists for this week'],
        weekStart: ['An update already exists for this week'],
      },
    },
  };
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
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

  const data = parsed.data;
  const keyResult = await prisma.keyResult.findUnique({
    where: { id: data.keyResultId },
    include: { objective: { include: { cycle: true } } },
  });

  if (!keyResult) {
    return NextResponse.json({ error: 'Key result not found' }, { status: 404 });
  }

  const member = await isWorkspaceMember(user.id, keyResult.objective.cycle.workspaceId);
  if (!member) {
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
      return NextResponse.json(conflictPayload(), { status: 409 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(conflictPayload(), { status: 409 });
    }

    throw error;
  }
}
