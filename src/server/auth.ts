import { auth } from '@clerk/nextjs/server';
import { AppError } from './errors';

/**
 * The signed-in user's id. The proxy already rejects signed-out API requests; this second check
 * keeps each route protected if the proxy does not run for a request.
 */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new AppError('UNAUTHENTICATED', 401, 'Sign in required');
  return userId;
}
