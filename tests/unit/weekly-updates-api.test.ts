import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({ prisma: {
  user: { findUnique: vi.fn() },
  keyResult: { findUnique: vi.fn() },
  membership: { findUnique: vi.fn() },
  weeklyUpdate: { create: vi.fn() },
} }));

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { POST } from '../../app/api/weekly-updates/route';

const mockedSession = getServerSession as unknown as ReturnType<typeof vi.fn>;

describe('weekly-updates POST authz and conflict', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthorized', async () => {
    mockedSession.mockResolvedValue(null);
    const res = await POST(new Request('http://localhost/api/weekly-updates', { method: 'POST', body: '{}' }) as any);
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is outside workspace', async () => {
    mockedSession.mockResolvedValue({ user: { email: 'a@a.com' } });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1' });
    (prisma.keyResult.findUnique as any).mockResolvedValue({ objective: { cycle: { workspaceId: 'w1' } } });
    (prisma.membership.findUnique as any).mockResolvedValue(null);

    const payload = { keyResultId: 'kr1', weekStart: '2026-05-06', value: 1, confidence: 'HIGH', status: 'ON_TRACK', nextStep: 'do' };
    const res = await POST(new Request('http://localhost/api/weekly-updates', { method: 'POST', body: JSON.stringify(payload) }) as any);
    expect(res.status).toBe(403);
  });

  it('returns 409 when duplicate update exists', async () => {
    mockedSession.mockResolvedValue({ user: { email: 'a@a.com' } });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1' });
    (prisma.keyResult.findUnique as any).mockResolvedValue({ objective: { cycle: { workspaceId: 'w1' } } });
    (prisma.membership.findUnique as any).mockResolvedValue({ id: 'm1' });
    (prisma.weeklyUpdate.create as any).mockRejectedValue({ code: 'P2002', name: 'PrismaClientKnownRequestError' });

    const payload = { keyResultId: 'kr1', weekStart: '2026-05-06', value: 1, confidence: 'HIGH', status: 'ON_TRACK', nextStep: 'do' };
    const res = await POST(new Request('http://localhost/api/weekly-updates', { method: 'POST', body: JSON.stringify(payload) }) as any);
    expect(res.status).toBe(409);
  });
});
