import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { properties, showings, type Property } from '@/db/schema';
import { listDays, todayIn, type Day } from '@/lib/booking-rules';
import { config } from '@/lib/config';
import { AppError } from './errors';

export const listProperties = (): Promise<Property[]> =>
  db.select().from(properties).orderBy(asc(properties.address));

/** One property. An unknown id and an id that is not a UUID both give 404, never a database error. */
export async function getProperty(id: string): Promise<Property> {
  if (!z.uuid().safeParse(id).success) throw new AppError('NOT_FOUND', 404, 'Property not found');
  const [row] = await db.select().from(properties).where(eq(properties.id, id));
  if (!row) throw new AppError('NOT_FOUND', 404, 'Property not found');
  return row;
}

// `from` must be a real calendar date, and `days` a whole number from 1 to 31.
const daysQuery = z.object({
  from: z.iso.date().optional(),
  days: z.coerce.number().int().min(1).max(31).default(14),
});

/**
 * The bookable days for a property, starting at `from` (YYYY-MM-DD in the business time zone,
 * default today) and covering `days` days (default 14). Both accept raw query string values. An
 * invalid value gives 400 VALIDATION.
 */
export async function getDays(propertyId: string, now: Date, from?: string, days?: string | number): Promise<Day[]> {
  const query = daysQuery.safeParse({ from, days });
  if (!query.success) {
    throw new AppError('VALIDATION', 400, query.error.issues.map((i) => i.path.join('.')).join(', '));
  }
  await getProperty(propertyId);
  const booked = await db
    .select({ startsAt: showings.startsAt })
    .from(showings)
    .where(and(eq(showings.propertyId, propertyId), eq(showings.status, 'booked')));
  return listDays({
    from: query.data.from ?? todayIn(now, config.timeZone),
    days: query.data.days,
    now,
    tz: config.timeZone,
    taken: new Set(booked.map((b) => b.startsAt.getTime())),
  });
}
