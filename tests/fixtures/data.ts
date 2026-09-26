import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Db } from '../../src/db/client';
import { properties, showings, type Property, type Showing } from '../../src/db/schema';

export type Prospect = { name: string; email: string; phone: string };

/** The prospect fields in the shape the booking API expects. */
export const asBody = (p: Prospect) => ({ prospectName: p.name, prospectEmail: p.email, prospectPhone: p.phone });

/** A prospect with a unique name and email, so parallel tests do not share contact details. */
export function newProspect(): Prospect {
  const id = randomUUID().slice(0, 8);
  return {
    name: `Prospect ${id}`,
    email: `prospect-${id}@example.test`,
    phone: `+1202555${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
  };
}

/** Inserts a property with a unique address. Each test gets its own, so tests never share rows. */
export async function createProperty(db: Db): Promise<Property> {
  const [row] = await db
    .insert(properties)
    .values({ address: `${randomUUID().slice(0, 8)} Test Street`, bedrooms: 2, monthlyRent: 1800 })
    .returning();
  return row!;
}

/** The distinct prospect email addresses of a property's showings. */
export async function prospectEmails(db: Db, propertyId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ email: showings.prospectEmail })
    .from(showings)
    .where(eq(showings.propertyId, propertyId));
  return rows.map((r) => r.email);
}

/** Deletes a property. The foreign keys cascade to its showings and their SMS outbox rows. */
export async function deleteProperty(db: Db, id: string) {
  await db.delete(properties).where(eq(properties.id, id));
}

/** Inserts a booked showing directly, without the booking rules, to set up a test's state. */
export async function insertShowing(
  db: Db,
  v: { propertyId: string; startsAt: Date; prospect?: Prospect },
): Promise<Showing> {
  const p = v.prospect ?? newProspect();
  const [row] = await db
    .insert(showings)
    .values({
      propertyId: v.propertyId,
      startsAt: v.startsAt,
      prospectName: p.name,
      prospectEmail: p.email,
      prospectPhone: p.phone,
      createdBy: 'test-fixture',
    })
    .returning();
  return row!;
}
