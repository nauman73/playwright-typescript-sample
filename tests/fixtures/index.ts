import { test as base, expect, type APIRequestContext } from '@playwright/test';
import type { Db } from '../../src/db/client';
import type { Property } from '../../src/db/schema';
import { FROZEN_NOW } from '../support/constants';
import { sessionToken, withClerkSession, type ClerkSession } from './clerk';
import { createProperty, deleteProperty, newProspect, prospectEmails, type Prospect } from './data';
import { withDb } from './db';
import { Mailbox } from './mailpit';
import { SmsOutbox } from './sms';
import { freezeTime } from './time';

type WorkerFixtures = { db: Db; clerkSession: ClerkSession };
type TestFixtures = {
  api: APIRequestContext;
  property: Property;
  prospect: Prospect;
  frozenTime: Date;
  mailbox: Mailbox;
  smsOutbox: SmsOutbox;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  db: [async ({}, use) => withDb(use), { scope: 'worker' }],
  clerkSession: [async ({}, use) => withClerkSession(use), { scope: 'worker' }],
  api: async ({ playwright, baseURL, clerkSession }, use) => {
    const token = await sessionToken(clerkSession);
    const ctx = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { Authorization: `Bearer ${token}`, 'x-test-now': FROZEN_NOW.toISOString() },
    });
    await use(ctx);
    await ctx.dispose();
  },
  // Each test gets its own property, so parallel tests never book the same slots.
  // Before the property is deleted, the emails sent to its showings' prospects are deleted from
  // Mailpit. This covers showings whose prospect did not come from the `prospect` fixture.
  property: async ({ db, mailbox }, use) => {
    const property = await createProperty(db);
    await use(property);
    for (const email of await prospectEmails(db, property.id)) await mailbox.deleteFor(email);
    await deleteProperty(db, property.id);
  },
  mailbox: async ({}, use) => use(new Mailbox()),
  smsOutbox: async ({ db }, use) => use(new SmsOutbox(db)),
  // The prospect's emails are deleted from Mailpit after the test, so no messages are left behind.
  prospect: async ({ mailbox }, use) => {
    const prospect = newProspect();
    await use(prospect);
    await mailbox.deleteFor(prospect.email);
  },
  frozenTime: async ({}, use) => use(FROZEN_NOW),
  // Every test that uses `page` sends the fixed test time to the app with each request.
  // The freeze is applied by overriding `page` rather than by an auto fixture, because an auto
  // fixture that depends on `page` would open a browser page for every API test as well.
  page: async ({ page, baseURL, frozenTime }, use) => {
    await freezeTime(page, baseURL!, frozenTime);
    await use(page);
  },
});

export { expect };
