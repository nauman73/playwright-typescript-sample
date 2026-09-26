import { notFound } from 'next/navigation';
import { AppError } from '@/server/errors';

/** Resolves to the promise's value. A 404 AppError shows the not-found page instead; other errors are rethrown. */
export function orNotFound<T>(promise: Promise<T>): Promise<T> {
  return promise.catch((error: unknown) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });
}
