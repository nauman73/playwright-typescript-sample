import { test as base, expect, type APIRequestContext } from '@playwright/test';
import type { Db } from '../../src/db/client';
import type { Property } from '../../src/db/schema';
import { FROZEN_NOW } from '../support/constants';
import { sessionToken, withClerkSession, type ClerkSession } from './clerk';
import { createProperty, deleteProperty, newProspect, type Prospect } from './data';
import { withDb } from './db';
import { freezeTime } from './time';

type WorkerFixtures = { db: Db; clerkSession: ClerkSession };
type TestFixtures = { api: APIRequestContext; property: Property; prospect: Prospect; frozenTime: Date };

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
  property: async ({ db }, use) => {
    const property = await createProperty(db);
    await use(property);
    await deleteProperty(db, property.id);
  },
  prospect: async ({}, use) => use(newProspect()),
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
