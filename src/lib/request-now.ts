import { headers } from 'next/headers';
import { now } from './clock';

/** The current time for a server component, read from the request headers the same way the API routes read it. */
export async function requestNow(): Promise<Date> {
  return now(await headers());
}
