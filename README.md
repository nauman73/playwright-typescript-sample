# Viewings: a Playwright + TypeScript sample

## Contents

1. [About](#1-about)
2. [What the suite demonstrates](#2-what-the-suite-demonstrates)
3. [Project layout](#3-project-layout)
4. [Prerequisites](#4-prerequisites)
5. [Run the app](#5-run-the-app)
6. [Run the tests](#6-run-the-tests)
7. [Read a failure](#7-read-a-failure)
8. [How the suite is built](#8-how-the-suite-is-built)
9. [Add a test](#9-add-a-test)
10. [Run against another environment](#10-run-against-another-environment)
11. [Email and SMS providers](#11-email-and-sms-providers)
12. [CI](#12-ci)

## 1. About

This is a demonstration repository. It shows how a Playwright + TypeScript end-to-end suite is set
up for a Next.js application.

The application, Viewings, lets signed-in staff book showings of rental properties for
prospective tenants. Staff pick a 30-minute slot on a property's page, enter the prospect's name,
email and phone number, and can later reschedule or cancel the showing. Each booking, reschedule
and cancellation sends the prospect one email and one SMS.

The test plan, with the risk ranking of the app's flows and what stays manual, is in
[TEST-PLAN.md](TEST-PLAN.md).

## 2. What the suite demonstrates

| Demonstrates | Where |
|---|---|
| Hand-written Playwright + TypeScript, not recorded | Page objects in [tests/pages/](tests/pages/) and `test.extend` fixtures in [tests/fixtures/index.ts](tests/fixtures/index.ts) |
| Clerk test logins | Global setup [tests/global-setup.ts](tests/global-setup.ts), the setup project [tests/setup/auth.setup.ts](tests/setup/auth.setup.ts) with its saved `storageState`, and Backend API session tokens in [tests/fixtures/clerk.ts](tests/fixtures/clerk.ts) |
| Test data created and removed automatically | The per-test `property` fixture and cascade cleanup in [tests/fixtures/index.ts](tests/fixtures/index.ts) and [tests/fixtures/data.ts](tests/fixtures/data.ts) |
| SMS and email tested without reaching real people | The Mailpit client [tests/fixtures/mailpit.ts](tests/fixtures/mailpit.ts), the SMS outbox reader [tests/fixtures/sms.ts](tests/fixtures/sms.ts), and the Twilio contract tests [tests/contract/twilio.spec.ts](tests/contract/twilio.spec.ts) with test credentials and magic numbers |
| Business rules tested at the API level | [tests/api/booking.spec.ts](tests/api/booking.spec.ts) and [tests/api/reschedule-cancel.spec.ts](tests/api/reschedule-cancel.spec.ts) |
| Time-dependent logic tested deterministically | The `frozenTime` fixture and [tests/fixtures/time.ts](tests/fixtures/time.ts), and the server test clock [src/lib/clock.ts](src/lib/clock.ts) |
| Concurrency handled | The simultaneous booking test in [tests/api/booking.spec.ts](tests/api/booking.spec.ts) and the partial unique index in [src/db/schema.ts](src/db/schema.ts) |
| Flake control | [playwright.config.ts](playwright.config.ts) and [eslint.config.mjs](eslint.config.mjs) (see [section 8](#flake-control)) |
| Desktop and mobile | The `desktop-chrome` and `mobile-chrome` projects in [playwright.config.ts](playwright.config.ts) |
| Staging only, never production | The `BASE_URL` option in [playwright.config.ts](playwright.config.ts), the health check in [tests/setup/auth.setup.ts](tests/setup/auth.setup.ts) and the startup guard in [src/instrumentation.ts](src/instrumentation.ts) |
| CI on every pull request, with report and traces | [.github/workflows/e2e.yml](.github/workflows/e2e.yml) |
| Risk-ranked test plan and bug-report hygiene | [TEST-PLAN.md](TEST-PLAN.md) and [.github/ISSUE_TEMPLATE/bug_report.md](.github/ISSUE_TEMPLATE/bug_report.md) |

## 3. Project layout

```text
README.md                          this file
TEST-PLAN.md                       risk-ranked test plan, manual checks, exploratory charters
.env.example                       every environment variable with a placeholder value
.gitattributes                     LF line endings on every platform
.gitignore
.node-version                      Node major version for local runs and CI
.github/workflows/e2e.yml          CI workflow
docker-compose.yml                 PostgreSQL and Mailpit
drizzle.config.ts                  Drizzle Kit configuration
drizzle/                           SQL migrations
eslint.config.mjs                  ESLint, with eslint-plugin-playwright for tests/
next.config.ts
package.json, pnpm-lock.yaml
playwright.config.ts               projects, web server, retries, traces
tsconfig.json
src/
  proxy.ts                         Clerk middleware: sign-in required everywhere except /sign-in and /api/health
  instrumentation.ts               refuses to start with the test clock in production
  app/                             pages and API routes
  db/schema.ts, client.ts, seed.ts tables, connection pool, demo data
  lib/config.ts                    typed environment
  lib/clock.ts                     server clock and the x-test-now header
  lib/request-now.ts               the current time for a page request
  lib/booking-rules.ts             pure booking rules and slot listing
  lib/format.ts                    date and time display
  lib/or-not-found.ts              turns a 404 AppError into the not-found page
  server/errors.ts, http.ts, auth.ts, properties.ts, showings.ts   service layer
  notifications/email.ts           SMTP email through Nodemailer
  notifications/notify.ts          sends the email and SMS for a booking change
  notifications/sms/               SmsSender interface, recording and Twilio adapters
tests/
  global-setup.ts                  clerkSetup and one Clerk session for the run
  setup/auth.setup.ts              production guard, sign-in, saved storageState
  fixtures/                        test.extend fixtures and their helpers
  pages/                           page objects
  support/constants.ts             saved-state path and the fixed test time
  api/*.spec.ts                    API tests
  ui/*.spec.ts                     UI tests
  contract/twilio.spec.ts          Twilio adapter contract tests
```

## 4. Prerequisites

### Machine

| Item | Requirement | Check |
|---|---|---|
| OS | Windows 10/11, macOS 13+, or Linux (Ubuntu 22.04+) | |
| CPU and RAM | 4 cores and 8 GB RAM minimum; 16 GB recommended (Next.js dev server, Chromium, PostgreSQL) | |
| Disk | 5 GB free (dependencies about 1 GB, Playwright Chromium about 300 MB, container images about 500 MB) | |
| Node.js | 24 LTS (minimum 20.9) | `node --version` |
| pnpm | 10.x | `pnpm --version` |
| Git | 2.40+ | `git --version` |
| PostgreSQL 16 and Mailpit | Through Docker (route 1) or native installs (route 2), see [Services](#services) | see [Services](#services) |

1. Install Node 24 LTS from nodejs.org if it is missing.
2. Install pnpm with `npm install -g pnpm@10`.
3. On Linux, install Chromium's system libraries after `pnpm install` (section 5) with
   `pnpm exec playwright install-deps chromium`. The command installs system packages, so it asks
   for your password. CI installs the same libraries with
   `pnpm exec playwright install --with-deps chromium`. Windows and macOS need no extra step.

### Accounts

| Account | Plan | Used for |
|---|---|---|
| Clerk | Free (Hobby), development instance | Sign-in for the app and the tests |
| Twilio | Free trial account; only the **test** credentials are used | Twilio adapter contract tests |
| GitHub | Free. Actions is free for public repositories on standard runners | Hosting and CI |

**Clerk**

1. Sign up at clerk.com and create an application with **Email** and **Password** enabled. The
   first instance is a development instance.
2. In **Users**, create `staff+clerk_test@example.com` with a strong password. The `+clerk_test`
   subaddress makes it a test user, and any verification code for it is `424242`.
3. In **API keys**, copy the publishable key (`pk_test_…`) and the secret key (`sk_test_…`) into
   `.env` (section 5).

**Twilio**

1. Sign up at twilio.com. The free trial asks for phone verification.
2. In the Console, open **Account → API keys & tokens → Test credentials**. Copy the **test**
   Account SID and the **test** auth token into `.env`. Do not use the live credentials.

The Twilio account is optional. Without the test credentials, the `sms-contract` tests are
skipped and every other test runs.

**GitHub**

A fork or copy of this repository needs six repository secrets for CI. They are listed in
[section 12](#12-ci).

### Services

The app needs PostgreSQL on port 5432, with user, password and database all named `viewings`, and
Mailpit on ports 1025 (SMTP) and 8025 (web interface and API). Choose one route.

**Route 1: Docker (matches CI)**

1. Install Docker Desktop. On Windows it needs WSL 2 and administrator rights.
2. Run `docker compose up -d` in the repository folder. [docker-compose.yml](docker-compose.yml)
   uses the same image tags as the CI workflow (`postgres:16` and `axllent/mailpit:v1.31`).

**Route 2: native installs (no Docker)**

1. Install PostgreSQL 16 (Windows: the EDB installer; macOS: `brew install postgresql@16`; Linux:
   the distribution package). Then create the role and the database:

   ```bash
   psql -U postgres -c "CREATE ROLE viewings LOGIN PASSWORD 'viewings';"
   psql -U postgres -c "CREATE DATABASE viewings OWNER viewings;"
   ```

2. Download the Mailpit binary for your OS from its GitHub releases page, unpack it, and run
   `mailpit` (Windows: `mailpit.exe`). It listens on ports 1025 and 8025 by default.

To check the services, `curl -s http://localhost:8025/api/v1/info` prints JSON with a `Version`
field, and with route 1,
`docker compose exec postgres psql -U viewings -c "select 1"` prints one row.

## 5. Run the app

1. Start the services (see [Services](#services)).

2. Create `.env` from the example and fill in the Clerk keys and the test user's email and
   password. Add the Twilio test credentials if you have them. `.env` is gitignored.

   ```bash
   cp .env.example .env
   ```

3. Install the dependencies, create the tables and add the demo data:

   ```bash
   pnpm install
   pnpm db:migrate
   pnpm db:seed
   ```

   Run `pnpm db:seed` once. Each run adds the three demo properties again. The tests do not need
   the demo data, because each test creates its own property.

4. Start the development server:

   ```bash
   pnpm dev
   ```

5. Open `http://localhost:3000` and sign in with the Clerk test user. If Clerk asks for a
   verification code, enter `424242`.

Every email the app sends arrives in Mailpit's inbox at `http://localhost:8025`. No email leaves
the machine.

By default the app records SMS messages instead of sending them. To see them, run
`pnpm db:studio` and open the `sms_outbox` table.

## 6. Run the tests

Install Playwright's Chromium once, then run the whole suite:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

Playwright starts the app with `pnpm dev` and `ALLOW_TEST_CLOCK=true`, or reuses a server that is
already running on port 3000. A server that is already running must also have been started with
`ALLOW_TEST_CLOCK=true` (it is set in `.env.example`), or the setup project stops the run.

The suite has five projects:

| Project | Device | Runs |
|---|---|---|
| `setup` | none | Checks that the target is not production and accepts the test clock, signs the test user in and saves the browser state |
| `api` | none (Playwright `request` only) | API tests. Depends on `setup` |
| `desktop-chrome` | Desktop Chrome | UI tests. Depends on `setup` |
| `mobile-chrome` | Pixel 7 | UI tests. Depends on `setup` |
| `sms-contract` | none | Calls the Twilio adapter against Twilio's test API. Does not call the app |

Useful variations:

```bash
pnpm test:e2e --project=api          # one project (setup runs first because api depends on it)
pnpm test:e2e --project=sms-contract # the Twilio contract tests only
pnpm test:e2e --ui                   # UI mode: pick tests, watch them run, step through them
pnpm exec playwright test --list     # list every test without running it
pnpm exec playwright show-report     # open the HTML report of the last run
```

Every run, including a run of `sms-contract` alone, needs the Clerk keys and the Clerk test user
in `.env`, because global setup creates a Clerk session before any project starts.

## 7. Read a failure

**The HTML report.** Each run writes `playwright-report/`. Open it with
`pnpm exec playwright show-report`. The report lists each test with its steps, the failed
assertion and its error message, and a screenshot for each failed UI test.

**The trace viewer.** A trace records every action, network request, console message and DOM
snapshot of a test. In CI, Playwright records a trace when it retries a failed test
(`trace: 'on-first-retry'`). Locally, retries are off, so record traces for a run with
`--trace on`:

```bash
pnpm test:e2e --project=desktop-chrome --trace on
pnpm exec playwright show-trace test-results/<test-folder>/trace.zip
```

The report also opens a test's trace from its page.

**CI artifacts.** The workflow uploads two artifacts from each run's summary page:

- `playwright-report`: the HTML report. It is uploaded on every run that is not cancelled.
  Download it, unzip it and run `pnpm exec playwright show-report <folder>`.
- `test-results`: traces and screenshots. It is uploaded when the run fails. Open a trace with
  `pnpm exec playwright show-trace <path to trace.zip>`.

To report a bug in the app, use the template in
[.github/ISSUE_TEMPLATE/bug_report.md](.github/ISSUE_TEMPLATE/bug_report.md) and attach the
screenshot or trace.

## 8. How the suite is built

### Authentication

- **Global setup** ([tests/global-setup.ts](tests/global-setup.ts)) calls `clerkSetup()` from
  `@clerk/testing/playwright`. It obtains a Clerk testing token, which lets automated browsers
  pass Clerk's bot detection. It then creates one Clerk session for the test user through Clerk's
  Backend API and revokes it after the run.
- **The setup project** ([tests/setup/auth.setup.ts](tests/setup/auth.setup.ts)) first calls
  `GET /api/health` and stops the run if the target reports `appEnv: production` or does not
  accept the test clock. It then signs the test user in with `clerk.signIn()` and saves the
  browser state to `playwright/.auth/staff.json`.
- **Saved state.** The `desktop-chrome` and `mobile-chrome` projects load that file, so UI tests
  start signed in. One UI test in [tests/ui/auth.spec.ts](tests/ui/auth.spec.ts) signs in through
  the real form without saved state, so the sign-in page itself is covered.
- **Bearer tokens.** API tests use the `api` fixture, a request context that sends a Clerk session
  token as `Authorization: Bearer …`. Clerk session tokens expire after about 60 seconds, so
  [tests/fixtures/clerk.ts](tests/fixtures/clerk.ts) mints a new token from the run's session when
  the cached one is 30 seconds old. Clerk calls are retried when Clerk answers
  `429 Too Many Requests`.

### Test data

- Fixtures read and write the database directly with the app's Drizzle schema
  ([src/db/schema.ts](src/db/schema.ts)). The app has no test-only data endpoint.
- The `property` fixture inserts a property with a unique address for each test and deletes it
  afterwards. The foreign keys cascade to its showings and SMS records. Before the delete, the
  fixture removes the emails that the property's prospects received from Mailpit.
- The `prospect` fixture gives each test a unique name, email address
  (`prospect-<id>@example.test`) and phone number, and deletes that address's emails after the
  test.
- Tests never share a property or a prospect, so they run in parallel safely. Tests never clear
  the whole mailbox, because other tests run at the same time.
- Bookings under test are made through the API or the UI. `insertShowing()` in
  [tests/fixtures/data.ts](tests/fixtures/data.ts) inserts a booked showing directly only when a
  test needs one as a precondition, such as a double-booking test.

### The test clock

- The booking rules depend on the current time: a slot must start at least 24 hours from now. The
  rules are checked on the server, so the server's clock has to be fixed for the tests.
- When the server runs with `ALLOW_TEST_CLOCK=true`, [src/lib/clock.ts](src/lib/clock.ts) reads
  "now" from the `x-test-now` request header. A header that is empty or is not an ISO 8601
  date-time with an offset returns `400 INVALID_TEST_CLOCK`.
- The fixed test time is Monday 2031-02-03 10:00 in America/New_York (`FROZEN_NOW` in
  [tests/support/constants.ts](tests/support/constants.ts)). The `frozenTime` fixture provides it.
- The `api` fixture sends the header with every request. For UI tests, the `page` fixture adds the
  header to every request to the app's own origin with `page.route`
  ([tests/fixtures/time.ts](tests/fixtures/time.ts)). The browser clock is not frozen, because
  Clerk's browser SDK then writes session cookies that the server rejects.
- **Production guard.** [src/instrumentation.ts](src/instrumentation.ts) stops the server at
  startup when `APP_ENV=production` and `ALLOW_TEST_CLOCK=true` are both set.
  `GET /api/health` reports `appEnv` and `testClock`, and the setup project checks both before any
  test runs.

### Email and SMS

- **Email.** The app sends email over SMTP with Nodemailer. Locally and in CI the SMTP server is
  Mailpit. The `mailbox` fixture ([tests/fixtures/mailpit.ts](tests/fixtures/mailpit.ts)) searches
  Mailpit's API for the prospect's address and polls until the expected subject arrives. Tests
  assert on the message Mailpit received.
- **SMS.** The app depends on the `SmsSender` interface in
  [src/notifications/sms/types.ts](src/notifications/sms/types.ts). With `SMS_PROVIDER=recording`,
  the default, the recording adapter writes each message to the `sms_outbox` table and sends
  nothing. The `smsOutbox` fixture ([tests/fixtures/sms.ts](tests/fixtures/sms.ts)) reads the
  messages for a property.
- **Twilio contract tests.** [tests/contract/twilio.spec.ts](tests/contract/twilio.spec.ts) calls
  the Twilio adapter directly with Twilio test credentials. It sends from Twilio's magic number
  `+15005550006` and expects a message SID, and it sends to the magic invalid number
  `+15005550001` and expects an `SmsSendError` with Twilio error code 21211. The tests are skipped,
  with a stated reason, when the test credentials are not set.

### Flake control

- Assertions are web-first (`expect(locator).toBeVisible()` and similar) or use `expect.poll`.
  No test waits for a fixed time. [eslint.config.mjs](eslint.config.mjs) applies
  `eslint-plugin-playwright` to `tests/` and treats `waitForTimeout`, `networkidle` and
  `force: true` as errors. CI runs the linter.
- Locators use roles and labels. `data-testid` is used only where no accessible name exists (the
  showing details block in [tests/pages/ShowingPage.ts](tests/pages/ShowingPage.ts)).
- `fullyParallel: true`, with no data shared between tests.
- `retries: 2` in CI and `0` locally. `trace: 'on-first-retry'` and
  `screenshot: 'only-on-failure'`.
- `forbidOnly` is on in CI, so a stray `test.only` fails the run.
- Time-dependent tests use the fixed test time and never depend on the real date.
- Tests run in UTC locally and in CI: [playwright.config.ts](playwright.config.ts) sets `TZ` and
  `timezoneId` to UTC, the time zone of GitHub's runners.

## 9. Add a test

This example adds an API test that books the last slot of the week, Friday 16:30 in the app's time
zone. It uses three fixtures: `api` for signed-in requests with the fixed test time, `property`
for a fresh property, and `prospect` for unique contact details.

Create `tests/api/last-slot.spec.ts`:

```ts
import { expect, test } from '../fixtures';
import { asBody } from '../fixtures/data';

// "Now" is Monday 2031-02-03 10:00 America/New_York. Friday 16:30 EST is 21:30 UTC.
const FRI_16_30 = '2031-02-07T21:30:00.000Z';

test('the last slot of the week can be booked', async ({ api, property, prospect }) => {
  const res = await api.post('/api/showings', {
    data: { propertyId: property.id, startsAt: FRI_16_30, ...asBody(prospect) },
  });
  expect(res.status()).toBe(201);

  const slots = await api.get(`/api/properties/${property.id}/slots?from=2031-02-07&days=1`);
  const [day] = await slots.json();
  expect(day.slots.find((s: { startsAt: string }) => s.startsAt === FRI_16_30)).toMatchObject({
    available: false,
    reason: 'SLOT_TAKEN',
  });
});
```

Run it:

```bash
pnpm test:e2e --project=api last-slot
```

The file name matches the `api` project's pattern (`tests/api/*.spec.ts`), so the project picks it
up. The fixtures delete the property, its showing, its SMS record and the prospect's email when
the test ends, so the test leaves no data behind.

A UI test follows the same pattern in `tests/ui/`, with the `page` fixture and the page objects in
[tests/pages/](tests/pages/). It runs in both `desktop-chrome` and `mobile-chrome`. A new fixture
goes in [tests/fixtures/index.ts](tests/fixtures/index.ts).

## 10. Run against another environment

By default, Playwright starts the app and tests `http://localhost:3000`. To test an environment
that is already running, such as staging, set `BASE_URL`. Playwright then does not start the app.

The fixtures talk to the environment's database and mail server directly, so these variables must
all describe the same environment:

| Variable | Value |
|---|---|
| `BASE_URL` | The environment's URL, for example `https://staging.example.com` |
| `DATABASE_URL` | That environment's database |
| `MAILPIT_URL` | That environment's Mailpit web and API URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | The keys of that environment's Clerk instance |
| `E2E_CLERK_USER_EMAIL`, `E2E_CLERK_USER_PASSWORD` | A test user in that Clerk instance |

Playwright loads `.env.local` before `.env`, so these values can go in a `.env.local` file
(gitignored) while `.env` keeps the local ones.

The target must run with `ALLOW_TEST_CLOCK=true` and must not run with `APP_ENV=production`. The
setup project calls `GET /api/health` before any test runs and stops the run when the target
reports `appEnv: production` or `testClock` is not `true`. The suite is meant for local, CI and
staging environments only. CI does not run against a deployed environment, because this sample
has none.

## 11. Email and SMS providers

### Email

The app sends email through the SMTP server in `SMTP_HOST` and `SMTP_PORT`, from `MAIL_FROM`. A
real environment would use a relay such as SendGrid's SMTP relay: `SMTP_HOST=smtp.sendgrid.net`,
`SMTP_PORT=587`, the user name `apikey` and a SendGrid API key as the password. The transport in
[src/notifications/email.ts](src/notifications/email.ts) does not read credentials, because
Mailpit needs none. A relay needs an `auth: { user, pass }` option added to
`nodemailer.createTransport`, read from two new variables such as `SMTP_USER` and `SMTP_PASS`.

SendGrid's sandbox mode accepts and validates a message without delivering it. It is a setting of
SendGrid's v3 Mail Send API (`mail_settings.sandbox_mode.enable`), not of the SMTP relay. A
staging environment that must never deliver mail can either send through that API with sandbox
mode on, or point `SMTP_HOST` at its own Mailpit instance, which also lets the suite read the
messages.

### SMS

To send real SMS through Twilio, set:

| Variable | Value |
|---|---|
| `SMS_PROVIDER` | `twilio` |
| `TWILIO_ACCOUNT_SID` | The live Account SID |
| `TWILIO_AUTH_TOKEN` | The live auth token |
| `TWILIO_FROM_NUMBER` | A Twilio phone number on that account, in E.164 format |

[src/notifications/sms/index.ts](src/notifications/sms/index.ts) then returns the Twilio adapter
instead of the recording adapter. A failed send is logged and does not undo the booking.

The tests use Twilio's test credentials (`TWILIO_TEST_ACCOUNT_SID` and `TWILIO_TEST_AUTH_TOKEN`)
instead. Twilio does not charge for requests made with test credentials and never delivers them to
a phone. Its magic numbers give fixed results, so the contract tests can check both a successful
send and a Twilio error without a real phone number. The UI and API tests keep
`SMS_PROVIDER=recording`, so they can read each message from `sms_outbox`.

## 12. CI

[.github/workflows/e2e.yml](.github/workflows/e2e.yml) runs one job on every pull request and on
every push to `main`. A newer run on the same branch cancels the older one. The job:

1. Starts PostgreSQL (`postgres:16`) and Mailpit (`axllent/mailpit:v1.31`) as job services.
2. Installs pnpm (the version in `packageManager` in [package.json](package.json)) and Node (the
   version in [.node-version](.node-version)), with a pnpm cache.
3. Runs `pnpm install --frozen-lockfile`, `pnpm typecheck` and `pnpm lint`.
4. Runs `pnpm exec playwright install --with-deps chromium`, which installs Chromium and its system
   libraries.
5. Runs `pnpm db:migrate`, `pnpm build` and `pnpm test:e2e`. In CI, Playwright starts the built
   app with `pnpm start`, uses two workers and retries a failed test twice.
6. Uploads the `playwright-report` artifact on every run that is not cancelled, and the
   `test-results` artifact when the run fails. Both are kept for 14 days.

The workflow reads six repository secrets:

| Secret | Value |
|---|---|
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key (`pk_test_…`). The workflow passes it to the app as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| `CLERK_SECRET_KEY` | Clerk secret key (`sk_test_…`) |
| `E2E_CLERK_USER_EMAIL` | The Clerk test user's email, for example `staff+clerk_test@example.com` |
| `E2E_CLERK_USER_PASSWORD` | The Clerk test user's password |
| `TWILIO_TEST_ACCOUNT_SID` | Twilio test Account SID |
| `TWILIO_TEST_AUTH_TOKEN` | Twilio test auth token |

Add them under **Settings → Secrets and variables → Actions**. Without the two Twilio secrets, the
`sms-contract` tests are skipped and the run can still pass. The four Clerk secrets are required.

Pull requests from forks do not receive secrets, so their CI runs fail, because the build and
global setup both need the Clerk keys.
