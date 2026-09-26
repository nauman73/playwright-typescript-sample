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

/**
 * The bookable days for a property, starting at `from` (YYYY-MM-DD in the business time zone,
 * default today). The caller validates `from` and `days`; `days` is also kept between 1 and 31.
 */
export async function getDays(propertyId: string, now: Date, from?: string, days = 14): Promise<Day[]> {
  await getProperty(propertyId);
  const booked = await db
    .select({ startsAt: showings.startsAt })
    .from(showings)
    .where(and(eq(showings.propertyId, propertyId), eq(showings.status, 'booked')));
  return listDays({
    from: from ?? todayIn(now, config.timeZone),
    days: Math.min(Math.max(days, 1), 31),
    now,
    tz: config.timeZone,
    taken: new Set(booked.map((b) => b.startsAt.getTime())),
  });
}
