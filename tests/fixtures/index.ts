import { test as base, expect, type APIRequestContext } from '@playwright/test';
import type { Db } from '../../src/db/client';
import { FROZEN_NOW } from '../support/constants';
import { sessionToken, withClerkSession, type ClerkSession } from './clerk';
import { withDb } from './db';

type WorkerFixtures = { db: Db; clerkSession: ClerkSession };
type TestFixtures = { api: APIRequestContext };

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
});

export { expect };
