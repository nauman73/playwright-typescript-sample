import { sql } from 'drizzle-orm';
import { integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const showingStatus = pgEnum('showing_status', ['booked', 'cancelled']);

export const properties = pgTable('properties', {
  id: uuid('id').primaryKey().defaultRandom(),
  address: text('address').notNull(),
  bedrooms: integer('bedrooms').notNull(),
  monthlyRent: integer('monthly_rent').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const showings = pgTable(
  'showings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    prospectName: text('prospect_name').notNull(),
    prospectEmail: text('prospect_email').notNull(),
    prospectPhone: text('prospect_phone').notNull(),
    status: showingStatus('status').notNull().default('booked'),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // A property can have only one booked showing per start time. Cancelled showings do not
    // hold the slot, so the index covers booked rows only.
    uniqueIndex('showings_property_slot_booked')
      .on(t.propertyId, t.startsAt)
      .where(sql`${t.status} = 'booked'`),
  ],
);

export const smsOutbox = pgTable('sms_outbox', {
  id: uuid('id').primaryKey().defaultRandom(),
  showingId: uuid('showing_id')
    .notNull()
    .references(() => showings.id, { onDelete: 'cascade' }),
  toNumber: text('to_number').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Property = typeof properties.$inferSelect;
export type Showing = typeof showings.$inferSelect;
