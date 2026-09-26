import { asc, eq } from 'drizzle-orm';
import type { Db } from '../../src/db/client';
import { showings, smsOutbox } from '../../src/db/schema';

export class SmsOutbox {
  constructor(private db: Db) {}
  forProperty(propertyId: string) {
    return this.db
      .select({ toNumber: smsOutbox.toNumber, body: smsOutbox.body })
      .from(smsOutbox)
      .innerJoin(showings, eq(showings.id, smsOutbox.showingId))
      .where(eq(showings.propertyId, propertyId))
      .orderBy(asc(smsOutbox.createdAt));
  }
}
