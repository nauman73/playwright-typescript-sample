/**
 * Next.js runs this once when the server starts. It refuses to start with the test clock in
 * production. A thrown error only logs in `next start` and the server keeps answering with 500,
 * so the guard logs the message and ends the Node.js process instead.
 */
export function register() {
  if (process.env.APP_ENV === 'production' && process.env.ALLOW_TEST_CLOCK === 'true') {
    console.error('ALLOW_TEST_CLOCK must not be set when APP_ENV=production');
    if (process.env.NEXT_RUNTIME === 'nodejs') process.exit(1);
  }
}
