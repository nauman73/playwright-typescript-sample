import { createClerkClient, type ClerkClient } from '@clerk/backend';

export type ClerkSession = { client: ClerkClient; sessionId: string };

// Clerk session tokens last about 60 seconds, so the session is created once per worker and a
// fresh token is minted for each test.
export async function withClerkSession(use: (s: ClerkSession) => Promise<void>) {
  const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const email = process.env.E2E_CLERK_USER_EMAIL!;
  const { data } = await client.users.getUserList({ emailAddress: [email] });
  const user = data[0];
  if (!user) throw new Error(`Clerk test user ${email} not found`);
  const session = await client.sessions.createSession({ userId: user.id });
  await use({ client, sessionId: session.id });
  await client.sessions.revokeSession(session.id);
}

export async function sessionToken({ client, sessionId }: ClerkSession): Promise<string> {
  const { jwt } = await client.sessions.getToken(sessionId);
  return jwt;
}
