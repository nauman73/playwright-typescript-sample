import { createClerkClient, type ClerkClient } from '@clerk/backend';

/** A token is reused for this long. Clerk session tokens expire after about 60 seconds. */
const TOKEN_REUSE_MS = 30_000;
/** A call is made at most this many times in all. */
const MAX_ATTEMPTS = 4;
/** The longest wait before a retry. Three waits stay well under the 30-second fixture timeout. */
const MAX_DELAY_MS = 2_000;

/** Global setup stores the id of the run's Clerk session in this environment variable. */
export const SESSION_ID_ENV = 'E2E_CLERK_SESSION_ID';

export type ClerkSession = {
  client: ClerkClient;
  sessionId: string;
  /** The last token minted for this session and the time it was minted. */
  cached: { jwt: string; mintedAt: number } | null;
};

export function clerkClient(): ClerkClient {
  return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
}

/**
 * Runs a Clerk Backend API call and retries it when Clerk answers 429 Too Many Requests. The wait
 * is the Retry-After interval when Clerk sends one, and otherwise doubles from one second with up
 * to half a second added at random so that parallel workers do not retry together. No wait is
 * longer than two seconds. After the last attempt the 429 error is thrown.
 */
export async function withRetry<T>(call: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await call();
    } catch (error) {
      const { status, retryAfter } = error as { status?: number; retryAfter?: number };
      if (status !== 429 || attempt >= MAX_ATTEMPTS) throw error;
      const delayMs = retryAfter ? retryAfter * 1000 : 2 ** (attempt - 1) * 1000 + Math.random() * 500;
      await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, MAX_DELAY_MS)));
    }
  }
}

/**
 * Creates one Clerk session for the test user. Global setup calls this once per run, so the
 * number of sessions does not grow with the number of workers, retries or repeats.
 */
export async function createTestSession(client: ClerkClient): Promise<string> {
  const email = process.env.E2E_CLERK_USER_EMAIL!;
  const { data } = await withRetry(() => client.users.getUserList({ emailAddress: [email] }));
  const user = data[0];
  if (!user) throw new Error(`Clerk test user ${email} not found`);
  const session = await withRetry(() => client.sessions.createSession({ userId: user.id }));
  return session.id;
}

export async function revokeTestSession(client: ClerkClient, sessionId: string): Promise<void> {
  await withRetry(() => client.sessions.revokeSession(sessionId));
}

/**
 * Gives each worker the run's Clerk session. The worker keeps its own token cache, so each worker
 * mints at most one token every 30 seconds.
 */
export async function withClerkSession(use: (s: ClerkSession) => Promise<void>) {
  const sessionId = process.env[SESSION_ID_ENV];
  if (!sessionId) throw new Error(`${SESSION_ID_ENV} is not set. tests/global-setup.ts sets it.`);
  await use({ client: clerkClient(), sessionId, cached: null });
}

/** A token for the run's session. A token younger than 30 seconds is reused. */
export async function sessionToken(session: ClerkSession): Promise<string> {
  const { cached } = session;
  if (cached && Date.now() - cached.mintedAt < TOKEN_REUSE_MS) return cached.jwt;
  const mintedAt = Date.now();
  const { jwt } = await withRetry(() => session.client.sessions.getToken(session.sessionId));
  session.cached = { jwt, mintedAt };
  return jwt;
}
