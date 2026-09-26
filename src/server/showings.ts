import { and, asc, eq, gte } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { properties, showings, type Showing } from '@/db/schema';
import { checkSlot } from '@/lib/booking-rules';
import { isoDateTime } from '@/lib/clock';
import { config } from '@/lib/config';
import { notifyProspect } from '@/notifications/notify';
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
  let row: Showing | undefined;
  try {
    [row] = await db
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
  } catch (error) {
    // The partial unique index on booked showings rejects a second booking for the same slot.
    if (isUniqueViolation(error)) throw new AppError('SLOT_TAKEN', 409, 'That slot has just been taken');
    throw error;
  }
  await notifyProspect('booked', row!);
  return row!;
}

/** One showing. An unknown id and an id that is not a UUID both give 404, never a database error. */
export async function getShowing(id: string): Promise<Showing> {
  if (!z.uuid().safeParse(id).success) throw new AppError('NOT_FOUND', 404, 'Showing not found');
  const [row] = await db.select().from(showings).where(eq(showings.id, id));
  if (!row) throw new AppError('NOT_FOUND', 404, 'Showing not found');
  return row;
}

/** Throws unless the showing is still booked and has not started. */
function assertChangeable(s: Showing, now: Date) {
  if (s.status === 'cancelled') throw new AppError('ALREADY_CANCELLED', 409, 'This showing is cancelled');
  if (s.startsAt.getTime() <= now.getTime()) throw new AppError('SHOWING_STARTED', 422, 'This showing has started');
}

const rescheduleInput = z.object({ startsAt: isoDateTime });

export async function rescheduleShowing(id: string, input: unknown, now: Date): Promise<Showing> {
  const parsed = rescheduleInput.safeParse(input);
  if (!parsed.success) {
    throw new AppError('VALIDATION', 400, parsed.error.issues.map((i) => i.path.join('.')).join(', '));
  }
  const current = await getShowing(id);
  assertChangeable(current, now);
  const startsAt = new Date(parsed.data.startsAt);
  assertSlot(startsAt, now);
  let row: Showing | undefined;
  try {
    // The status condition makes the update fail if the showing was cancelled after the check above.
    [row] = await db
      .update(showings)
      .set({ startsAt, updatedAt: new Date() })
      .where(and(eq(showings.id, id), eq(showings.status, 'booked')))
      .returning();
  } catch (error) {
    if (isUniqueViolation(error)) throw new AppError('SLOT_TAKEN', 409, 'That slot has just been taken');
    throw error;
  }
  if (!row) throw new AppError('ALREADY_CANCELLED', 409, 'This showing is cancelled');
  await notifyProspect('rescheduled', row);
  return row;
}

export async function cancelShowing(id: string, now: Date): Promise<Showing> {
  const current = await getShowing(id);
  assertChangeable(current, now);
  // The status condition makes the update fail if another request cancelled the showing first.
  const [row] = await db
    .update(showings)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(and(eq(showings.id, id), eq(showings.status, 'booked')))
    .returning();
  if (!row) throw new AppError('ALREADY_CANCELLED', 409, 'This showing is cancelled');
  await notifyProspect('cancelled', row);
  return row;
}

/** Booked showings that start at or after `now`, earliest first, each with its property's address. */
export async function listUpcoming(now: Date): Promise<Array<Showing & { address: string }>> {
  const rows = await db
    .select({ showing: showings, address: properties.address })
    .from(showings)
    .innerJoin(properties, eq(properties.id, showings.propertyId))
    .where(and(eq(showings.status, 'booked'), gte(showings.startsAt, now)))
    .orderBy(asc(showings.startsAt));
  return rows.map((r) => ({ ...r.showing, address: r.address }));
}
