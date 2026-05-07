export const CONFIDENCE = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const HEALTH_STATUS = ['ON_TRACK', 'AT_RISK', 'OFF_TRACK'] as const;

export type WeeklyUpdateInput = {
  keyResultId: string;
  weekStart: string;
  value: number;
  confidence: (typeof CONFIDENCE)[number];
  status: (typeof HEALTH_STATUS)[number];
  blockers?: string;
  nextStep: string;
};

export function normalizeWeekStart(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid weekStart date');
  const day = date.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diffToMonday);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export function validateWeeklyUpdateInput(body: unknown): WeeklyUpdateInput {
  if (!body || typeof body !== 'object') throw new Error('Body is required');
  const input = body as Record<string, unknown>;
  for (const field of ['keyResultId', 'weekStart', 'value', 'confidence', 'status', 'nextStep'] as const) {
    if (input[field] === undefined || input[field] === null || input[field] === '') throw new Error(`Missing required field: ${field}`);
  }
  if (!CONFIDENCE.includes(input.confidence as any)) throw new Error('Invalid confidence');
  if (!HEALTH_STATUS.includes(input.status as any)) throw new Error('Invalid status');
  return { keyResultId: String(input.keyResultId), weekStart: String(input.weekStart), value: Number(input.value), confidence: input.confidence as any, status: input.status as any, blockers: input.blockers ? String(input.blockers) : undefined, nextStep: String(input.nextStep) };
}
