import { createClerkClient, type ClerkClient } from '@clerk/backend';

/** A token is reused for this long. Clerk session tokens expire after about 60 seconds. */
const TOKEN_REUSE_MS = 30_000;
/** A call is made at most this many times in all. */
const MAX_ATTEMPTS = 4;
/** The longest wait before a retry. Three waits stay well under the 30-second fixture timeout. */
const MAX_DELAY_MS = 2_000;

/**
 * The largest difference allowed between the local clock and Clerk's servers. It matches Clerk's
 * default tolerance: Clerk rejects a session token issued more than 5 seconds in the future.
 */
const MAX_CLOCK_OFFSET_MS = 5_000;
/** The clock check waits this long for Clerk to answer. */
const CLOCK_CHECK_TIMEOUT_MS = 10_000;

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
 * Throws when the local clock differs from Clerk's servers by more than 5 seconds. With a wrong
 * clock, Clerk rejects the session tokens and sign-in fails with an error about the instance keys,
 * so global setup checks the clock first. The reference time is the Date header of one request to
 * the Backend API. The request needs no key, and Clerk sends the header with its 401 response. The
 * header has one-second resolution, which is enough for a 5-second limit.
 */
export async function assertClockInSync(): Promise<void> {
  let serverTime: number;
  const sentAt = Date.now();
  try {
    const res = await fetch('https://api.clerk.com/v1/', {
      method: 'HEAD',
      signal: AbortSignal.timeout(CLOCK_CHECK_TIMEOUT_MS),
    });
    serverTime = Date.parse(res.headers.get('date') ?? '');
    if (Number.isNaN(serverTime)) throw new Error('the response has no valid Date header');
  } catch (error) {
    throw new Error(`Could not reach Clerk to check the system clock: ${(error as Error).message}`);
  }
  const receivedAt = Date.now();
  // A negative offset means that the local clock is behind.
  const offsetMs = (sentAt + receivedAt) / 2 - serverTime;
  if (Math.abs(offsetMs) <= MAX_CLOCK_OFFSET_MS) return;
  const seconds = (Math.abs(offsetMs) / 1000).toFixed(1);
  const direction = offsetMs < 0 ? 'behind' : 'ahead of';
  throw new Error(
    `The system clock is ${seconds} s ${direction} Clerk's servers. Clerk rejects session tokens ` +
      `when the clock is off by more than ${MAX_CLOCK_OFFSET_MS / 1000} s. Sync the system clock ` +
      '(on Windows: w32tm /resync) and run the tests again.',
  );
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
