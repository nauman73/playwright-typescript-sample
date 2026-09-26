import { z } from 'zod';
import { db } from '@/db/client';
import { showings, type Showing } from '@/db/schema';
import { checkSlot } from '@/lib/booking-rules';
import { isoDateTime } from '@/lib/clock';
import { config } from '@/lib/config';
import { AppError } from './errors';
import { getProperty } from './properties';

// propertyId is a plain string here so that a non-UUID id reaches getProperty and gives 404.
export const bookingInput = z.object({
  propertyId: z.string(),
  startsAt: isoDateTime,
  prospectName: z.string().trim().min(1).max(200),
  prospectEmail: z.string().trim().pipe(z.email()),
  prospectPhone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/),
});

export type ShowingDto = ReturnType<typeof toDto>;

export const toDto = (s: Showing) => ({
  id: s.id,
  propertyId: s.propertyId,
  startsAt: s.startsAt.toISOString(),
  prospectName: s.prospectName,
  prospectEmail: s.prospectEmail,
  prospectPhone: s.prospectPhone,
  status: s.status,
});

/**
 * True when the error is a PostgreSQL unique violation (SQLSTATE 23505). Drizzle wraps driver
 * errors in a DrizzleQueryError, so the check follows the `cause` chain.
 */
export function isUniqueViolation(error: unknown): boolean {
  for (let e: unknown = error, depth = 0; e && depth < 5; depth++) {
    if ((e as { code?: unknown }).code === '23505') return true;
    e = (e as { cause?: unknown }).cause;
  }
  return false;
}

/** Throws 422 with the rule code when the start time breaks a booking rule. */
export function assertSlot(startsAt: Date, now: Date) {
  const rule = checkSlot(startsAt, now, config.timeZone);
  if (rule) throw new AppError(rule, 422);
}

export async function bookShowing(input: unknown, userId: string, now: Date): Promise<Showing> {
  const parsed = bookingInput.safeParse(input);
  if (!parsed.success) {
    throw new AppError('VALIDATION', 400, parsed.error.issues.map((i) => i.path.join('.')).join(', '));
  }
  const v = parsed.data;
  await getProperty(v.propertyId);
  const startsAt = new Date(v.startsAt);
  assertSlot(startsAt, now);
  try {
    const [row] = await db
      .insert(showings)
      .values({
        propertyId: v.propertyId,
        startsAt,
        prospectName: v.prospectName,
        prospectEmail: v.prospectEmail,
        prospectPhone: v.prospectPhone,
        createdBy: userId,
      })
      .returning();
    return row!;
  } catch (error) {
    // The partial unique index on booked showings rejects a second booking for the same slot.
    if (isUniqueViolation(error)) throw new AppError('SLOT_TAKEN', 409, 'That slot has just been taken');
    throw error;
  }
}
