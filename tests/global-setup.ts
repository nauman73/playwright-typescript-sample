import { readFile, stat } from 'node:fs/promises';
import { clerkSetup } from '@clerk/testing/playwright';
import { SESSION_ID_ENV, assertClockInSync, clerkClient, createTestSession, revokeTestSession } from './fixtures/clerk';
import { STAFF_STATE } from './support/constants';

/**
 * Returns the Clerk session id in the saved staff state, or null when this run did not write the
 * file or the file holds no session cookie. The id is the `sid` claim of the `__session` cookie's
 * JWT. The token is only decoded, not verified, because the id is used only to revoke the session.
 */
async function savedStateSessionId(runStartedAt: number): Promise<string | null> {
  try {
    // A file older than this run was written by an earlier run, for example before a run of
    // sms-contract alone, whose setup project does not run.
    if ((await stat(STAFF_STATE)).mtimeMs < runStartedAt) return null;
    const state = JSON.parse(await readFile(STAFF_STATE, 'utf8')) as { cookies?: { name: string; value: string }[] };
    const cookie = state.cookies?.find((c) => c.name === '__session' || c.name.startsWith('__session_'));
    const payload = cookie?.value.split('.')[1];
    if (!payload) return null;
    const { sid } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sid?: unknown };
    return typeof sid === 'string' ? sid : null;
  } catch {
    return null;
  }
}

export default async function globalSetup() {
  const runStartedAt = Date.now();
  // Clerk rejects session tokens when the clock is wrong, so the clock is checked before any
  // Clerk call.
  await assertClockInSync();
  // playwright.config.ts has already loaded the environment files.
  await clerkSetup({ publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, dotenv: false });

  // One Clerk session serves every worker in the run. Playwright starts workers after global
  // setup and passes them this process's environment, so each worker reads the id from it.
  const client = clerkClient();
  const sessionId = await createTestSession(client);
  process.env[SESSION_ID_ENV] = sessionId;

  // Playwright runs the returned function as global teardown, after the last worker stops.
  return async () => {
    await revokeTestSession(client, sessionId);
    // The setup project signed in through the browser and saved that session in the staff state.
    // Only that session is revoked, because another run can use the same test user at the same time.
    const savedSessionId = await savedStateSessionId(runStartedAt);
    if (savedSessionId) await revokeTestSession(client, savedSessionId);
  };
}
