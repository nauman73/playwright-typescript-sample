import { clerkSetup } from '@clerk/testing/playwright';
import { SESSION_ID_ENV, clerkClient, createTestSession, revokeTestSession } from './fixtures/clerk';

export default async function globalSetup() {
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
  };
}
