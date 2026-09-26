import { createClerkClient, type ClerkClient } from '@clerk/backend';

/** A token is reused for this long. Clerk session tokens expire after about 60 seconds. */
const TOKEN_REUSE_MS = 30_000;
const MAX_ATTEMPTS = 5;

export type ClerkSession = {
  client: ClerkClient;
  sessionId: string;
  /** The last token minted for this session and the time it was minted. */
  cached: { jwt: string; mintedAt: number } | null;
};

/**
 * Runs a Clerk Backend API call and retries it when Clerk answers 429 Too Many Requests. It waits
 * for the Retry-After interval when Clerk sends one. Otherwise the wait doubles from one second,
 * with up to half a second added at random so that parallel workers do not retry together.
 */
async function withRetry<T>(call: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await call();
    } catch (error) {
      const { status, retryAfter } = error as { status?: number; retryAfter?: number };
      if (status !== 429 || attempt >= MAX_ATTEMPTS) throw error;
      const delayMs = retryAfter ? retryAfter * 1000 : 2 ** (attempt - 1) * 1000 + Math.random() * 500;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

// Playwright starts new workers for each --repeat-each index, and each worker creates a session.
// The session is created once per worker. Its token is reused for 30 seconds and then a new one
// is minted, which keeps the number of Clerk API calls below the development instance's rate limit.
export async function withClerkSession(use: (s: ClerkSession) => Promise<void>) {
  const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const email = process.env.E2E_CLERK_USER_EMAIL!;
  const { data } = await withRetry(() => client.users.getUserList({ emailAddress: [email] }));
  const user = data[0];
  if (!user) throw new Error(`Clerk test user ${email} not found`);
  const session = await withRetry(() => client.sessions.createSession({ userId: user.id }));
  await use({ client, sessionId: session.id, cached: null });
  await withRetry(() => client.sessions.revokeSession(session.id));
}

/** A token for the worker's session. A token younger than 30 seconds is reused. */
export async function sessionToken(session: ClerkSession): Promise<string> {
  const { cached } = session;
  if (cached && Date.now() - cached.mintedAt < TOKEN_REUSE_MS) return cached.jwt;
  const mintedAt = Date.now();
  const { jwt } = await withRetry(() => session.client.sessions.getToken(session.sessionId));
  session.cached = { jwt, mintedAt };
  return jwt;
}
