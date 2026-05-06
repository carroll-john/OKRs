import { z } from 'zod';

const CONFIDENCE_VALUES = ['LOW', 'MEDIUM', 'HIGH'] as const;
const HEALTH_STATUS_VALUES = ['ON_TRACK', 'AT_RISK', 'OFF_TRACK'] as const;

export const weeklyUpdateSchema = z.object({
  keyResultId: z.string().min(1, 'Key result is required'),
  weekStart: z.coerce.date(),
  value: z
    .coerce
    .number({ invalid_type_error: 'Value must be a number' })
    .finite('Value must be a finite number')
    .min(-1000000, 'Value is too low')
    .max(1000000, 'Value is too high'),
  confidence: z.enum(CONFIDENCE_VALUES),
  status: z.enum(HEALTH_STATUS_VALUES),
  blockers: z.string().trim().optional().nullable(),
  nextStep: z.string().trim().min(1, 'Next step is required'),
});

export type WeeklyUpdateInput = z.infer<typeof weeklyUpdateSchema>;

export function toUtcMonday(date: Date): Date {
  const utcDay = date.getUTCDay();
  const offset = (utcDay + 6) % 7;
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - offset);
  return monday;
}
