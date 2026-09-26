import { AppError } from '@/server/errors';
import { config } from './config';

/** The current time. With ALLOW_TEST_CLOCK=true, the x-test-now header overrides it. */
export function now(headers: Headers): Date {
  const override = config.allowTestClock ? headers.get('x-test-now') : null;
  if (!override) return new Date();
  const parsed = new Date(override);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError('INVALID_TEST_CLOCK', 400, 'x-test-now is not a valid date');
  }
  return parsed;
}
