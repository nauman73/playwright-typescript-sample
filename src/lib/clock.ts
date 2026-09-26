import { z } from 'zod';
import { AppError } from '@/server/errors';
import { config } from './config';

/** An ISO 8601 date-time with a time zone designator (Z or an offset), such as 2031-02-03T15:00:00Z. */
export const isoDateTime = z.iso.datetime({ offset: true });

/**
 * The current time. With ALLOW_TEST_CLOCK=true, the x-test-now header overrides it. A header that
 * is present but empty, or is not an ISO 8601 date-time with a time zone designator, is rejected.
 */
export function now(headers: Headers): Date {
  const override = config.allowTestClock ? headers.get('x-test-now') : null;
  if (override === null) return new Date();
  if (!isoDateTime.safeParse(override).success) {
    throw new AppError('INVALID_TEST_CLOCK', 400, 'x-test-now must be an ISO 8601 date-time with an offset');
  }
  return new Date(override);
}
