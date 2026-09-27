# Test plan

This is the test plan for Viewings, the demonstration app in this repository. It states what is
tested, which risks the tests address first, what stays manual, and how bugs are reported. The
[README](README.md) explains how to run the suite.

## Contents

1. [Scope](#1-scope)
2. [Risk ranking](#2-risk-ranking)
3. [Automated or manual](#3-automated-or-manual)
4. [Exploratory testing charters](#4-exploratory-testing-charters)
5. [Environments](#5-environments)
6. [Reporting bugs](#6-reporting-bugs)

## 1. Scope

### Flows under test

| Flow | What it does |
|---|---|
| Sign-in | Staff sign in with Clerk. Every page and every API route except `/sign-in` and `/api/health` requires a signed-in user. |
| Properties | Staff see the list of properties and open a property's page. |
| Slot picker | A property's page lists 30-minute slots by day. Slots less than 24 hours away, taken slots and slots outside business hours (Monday to Friday, 09:00 to 17:00 in the app's time zone) are shown as unavailable. |
| Booking | Staff pick a slot and enter the prospect's name, email and phone number. The server checks the booking rules again and stores the showing. |
| Reschedule and cancel | Staff move a showing to another free slot or cancel it. A showing that has started, or one that is already cancelled, cannot be changed. |
| Notifications | Each booking, reschedule and cancellation sends the prospect one email and one SMS. |

The business rules use the app's time zone, `APP_TIMEZONE`, which defaults to `America/New_York`.

### Out of scope for the app

- Creating, editing or deleting properties in the UI. Properties come from the seed script or from
  test fixtures.
- More than one role, and permissions between staff members.
- Self-service booking by prospects.
- A SendGrid integration.
- Sending real SMS. The Twilio adapter is only run with test credentials.
- Deployment. The app runs locally and in CI only.
- Time zones per property, holidays, and agent availability.

### Out of scope for the tests

- Firefox and WebKit projects.
- Visual regression, accessibility audits, performance and load testing.
- Tests against a deployed environment in CI.
- Component or unit test frameworks. The booking rules are covered through the API tests.

## 2. Risk ranking

Likelihood and Impact are rated High (H), Medium (M) or Low (L). Risk combines the two: High when
one rating is H and the other is H or M, Medium when both are M or when L is paired with H, and Low
in every other case. The rows are ordered from the highest risk to the lowest.

| Flow | Likelihood | Impact | Risk | Coverage |
|---|---|---|---|---|
| Double booking under concurrent requests | M | H | High | API (simultaneous requests), DB index |
| 24-hour notice and business-hours rules, including DST | M | H | High | API, UI slot picker |
| Notification sent to the wrong person or not at all | M | H | High | API and UI (Mailpit, SMS outbox) |
| Sign-in and access to protected pages and API | L | H | Medium | UI and API |
| Reschedule and cancel state changes | M | M | Medium | API and UI |
| Test clock enabled in production | L | H | Medium | Startup guard, suite health check |
| Layout and touch use on phones | M | M | Medium | UI on Pixel 7 emulation; manual on real devices |
| Twilio request format and error handling | L | M | Low | Contract tests |

### Where each risk is covered

**Double booking under concurrent requests.**
[tests/api/booking.spec.ts](tests/api/booking.spec.ts) sends two booking requests for the same
slot at the same time and expects exactly one `201` and one `409` ("two simultaneous requests for
one slot produce one 201 and one 409"). A second test books a slot that is already taken and
expects `409 SLOT_TAKEN`. The check does not rely on application code alone: the partial unique
index `showings_property_slot_booked` in [src/db/schema.ts](src/db/schema.ts) allows one booked
showing per property and start time, and [src/server/showings.ts](src/server/showings.ts) turns a
unique violation into `409 SLOT_TAKEN`. Cancelled showings are outside the index, and
[tests/api/reschedule-cancel.spec.ts](tests/api/reschedule-cancel.spec.ts) confirms that a
cancelled showing's slot can be booked again.

**24-hour notice and business-hours rules, including DST.**
[tests/api/booking.spec.ts](tests/api/booking.spec.ts) checks the boundaries: a slot exactly 24
hours away returns `201`, a slot 23 hours 30 minutes away returns `422 INSUFFICIENT_NOTICE`, slots
at 08:30, at 17:00 and on a Saturday return `422 OUTSIDE_BUSINESS_HOURS`, and a slot at 10:15
returns `422 INVALID_SLOT`. A further test books 09:00 on Monday 2031-03-10, the first Monday after
daylight saving time starts, which shows that the rules use local time and not a fixed UTC offset.
In the UI, [tests/ui/slot-picker.spec.ts](tests/ui/slot-picker.spec.ts) checks that slots less than
24 hours away are disabled, that the first slot after 24 hours is available, and that Saturday is
shown as closed. All of these tests use the fixed test time, Monday 2031-02-03 10:00 in
America/New_York, which the server reads from the `x-test-now` header
([src/lib/clock.ts](src/lib/clock.ts), [tests/api/clock.spec.ts](tests/api/clock.spec.ts)).

**Notification sent to the wrong person or not at all.**
[tests/api/notifications.spec.ts](tests/api/notifications.spec.ts) books, reschedules and cancels
one showing. It waits for each of the three emails in Mailpit, searched by the prospect's address,
checks that the address holds exactly three messages, and checks that the `sms_outbox` table holds
three messages addressed to the prospect's phone number, with the expected text. The UI tests in
[tests/ui/booking.spec.ts](tests/ui/booking.spec.ts) and
[tests/ui/reschedule-cancel.spec.ts](tests/ui/reschedule-cancel.spec.ts) check the email and the SMS
for the same actions made through the pages. Each test uses its own prospect, so a message sent to
another address does not satisfy the check.

**Sign-in and access to protected pages and API.**
[tests/ui/auth.spec.ts](tests/ui/auth.spec.ts) checks that a signed-out visitor to `/properties` is
redirected to sign-in, that staff can sign in through the form, and that the saved browser state
opens the properties page. [tests/api/auth.spec.ts](tests/api/auth.spec.ts) checks that an API
request without a token returns `401` and that a request with a Clerk session token is accepted.

**Reschedule and cancel state changes.**
[tests/api/reschedule-cancel.spec.ts](tests/api/reschedule-cancel.spec.ts) covers a successful
reschedule, rescheduling to a taken slot (`409 SLOT_TAKEN`), rescheduling or cancelling a showing
that has started (`422 SHOWING_STARTED`), changing a cancelled showing (`409 ALREADY_CANCELLED`),
invalid input (`400 VALIDATION`) and unknown showing ids (`404`).
[tests/ui/reschedule-cancel.spec.ts](tests/ui/reschedule-cancel.spec.ts) reschedules and cancels a
showing through the pages. [tests/ui/not-found.spec.ts](tests/ui/not-found.spec.ts) checks that the
property, booking and showing pages answer `404` with the not-found page for an unknown or
non-UUID id.

**Test clock enabled in production.**
[src/instrumentation.ts](src/instrumentation.ts) stops the server at startup when
`APP_ENV=production` and `ALLOW_TEST_CLOCK=true` are both set. Before any test runs, the setup
project in [tests/setup/auth.setup.ts](tests/setup/auth.setup.ts) calls `GET /api/health` and fails
if the target reports `appEnv: production` or does not accept the test clock. Playwright then does
not run the projects that depend on it (`api`, `desktop-chrome` and `mobile-chrome`).
`sms-contract` does not call the app and still runs.

**Layout and touch use on phones.**
Every UI test runs twice, in the `desktop-chrome` project and in the `mobile-chrome` project, which
emulates a Pixel 7 ([playwright.config.ts](playwright.config.ts)). Emulation sets the viewport
size, touch input and the mobile user agent. It does not replace a check on real phones, which
stays manual (section 3).

**Twilio request format and error handling.**
[tests/contract/twilio.spec.ts](tests/contract/twilio.spec.ts) calls the Twilio adapter in
[src/notifications/sms/twilio.ts](src/notifications/sms/twilio.ts) against Twilio's test API with
test credentials. It sends from Twilio's magic number `+15005550006` and expects a message SID, and
sends to the magic invalid number `+15005550001` and expects an `SmsSendError` with Twilio error
code 21211. The tests are skipped when the test credentials are not set.

## 3. Automated or manual

### Automated

The suite automates checks that give the same answer on every run and would be slow or
error-prone to repeat by hand:

- **Repeatable rules.** The booking rules have exact boundaries (24 hours of notice, business
  hours, 30-minute slots, the change to daylight saving time). The API tests check each boundary
  with a fixed clock, so a result never depends on the day the suite runs.
- **Main flows.** Signing in, booking, rescheduling and cancelling are the flows staff use every
  day. The UI tests run them end to end on desktop and mobile viewports, including the email and
  SMS that each action sends.
- **Regressions.** A change to the rules, the pages or the notifications can break a flow that
  worked before. CI runs the whole suite on every pull request, so such a change fails before it
  is merged.

### Manual

Some checks need human judgement or hardware that the suite does not have:

- **Real-device checks.** Emulation does not reproduce a real phone's keyboard, scrolling, screen
  density or performance.
- **iOS Safari.** The suite runs Chromium only. Safari on iOS uses a different engine and is checked
  by hand on an iPhone.
- **Visual judgement.** The suite checks that elements exist and hold the right text. It does not
  judge whether a page looks correct, is readable or is laid out well.
- **Email rendering in real mail apps.** Mailpit shows the message that was sent. How that message
  looks in Gmail, Outlook or a phone's mail app is checked by hand.
- **First-time exploratory testing of new features.** A new feature is explored by hand before its
  automated tests are written, so that the tests cover the behaviour that matters. Section 4 lists
  the charters.

## 4. Exploratory testing charters

Each charter is one time-boxed session. The tester records what was tried, what was found and any
questions, and files a bug for each problem (section 6).

### Charter 1: Booking on a real phone

- **Goal.** Book, reschedule and cancel a showing on a real Android phone and a real iPhone, and
  find problems that emulation does not show.
- **Time box.** 45 minutes.
- **Notes to capture.** Phone model, OS and browser version; whether the slot buttons are easy to
  tap; how the on-screen keyboard affects the booking form; whether any content is cut off or needs
  horizontal scrolling; how the email and SMS look on the same phone.

### Charter 2: Time-zone and DST boundaries

- **Goal.** Explore the booking rules around the start and end of daylight saving time, around the
  24-hour notice limit, and at the edges of business hours.
- **Time box.** 45 minutes.
- **Notes to capture.** Each test time sent in `x-test-now` and each slot tried; the result the
  slot picker shows and the result the API returns; any difference between the time shown on the
  page, in the email and in the SMS; any slot that is offered but then rejected.

### Charter 3: Slow network and double-submit

- **Goal.** Find problems caused by slow responses and repeated clicks when booking, rescheduling
  and cancelling.
- **Time box.** 30 minutes.
- **Notes to capture.** The network throttling profile used in the browser's developer tools;
  whether buttons are disabled while a request is in progress; what happens after a double click or
  a page refresh during a request; whether any action creates two showings or sends two messages;
  the error messages shown.

### Charter 4: Keyboard-only and screen-reader use

- **Goal.** Complete sign-in, booking, rescheduling and cancelling with the keyboard only, and then
  with a screen reader.
- **Time box.** 45 minutes.
- **Notes to capture.** The screen reader and browser used; any control that cannot be reached or
  used with the keyboard; the focus order and whether focus is visible; whether slot buttons,
  status messages and errors are announced with meaningful names.

## 5. Environments

| Environment | How the suite reaches it | Notes |
|---|---|---|
| Local | Playwright starts the app with `pnpm dev`, or reuses a server on port 3000. PostgreSQL and Mailpit run through [docker-compose.yml](docker-compose.yml) or native installs. | The default for development. |
| CI | [.github/workflows/e2e.yml](.github/workflows/e2e.yml) starts PostgreSQL and Mailpit as service containers, builds the app and runs it with `pnpm start`. | Runs on every pull request and on every push to `main`. |
| Staging | Set `BASE_URL` to the staging URL. Playwright then does not start the app. `DATABASE_URL`, `MAILPIT_URL` and the Clerk variables must describe the same environment. | The target must run with `ALLOW_TEST_CLOCK=true`. |
| Production | Never. | The suite writes test data, reads the database directly and needs the test clock. |

Two guards keep the suite away from production. The server refuses to start when `APP_ENV` is
`production` and `ALLOW_TEST_CLOCK` is `true`, and the setup project fails when
`GET /api/health` reports `appEnv: production` (section 2). A failed setup project stops the
projects that depend on it (`api`, `desktop-chrome` and `mobile-chrome`); `sms-contract` does not
call the app and still runs. Section 10 of the [README](README.md) lists the variables for a run
against staging.

## 6. Reporting bugs

Report bugs as GitHub issues with the template in
[.github/ISSUE_TEMPLATE/bug_report.md](.github/ISSUE_TEMPLATE/bug_report.md). A good report
contains:

- **A one-sentence summary** that names the page or endpoint and the wrong behaviour.
- **Numbered steps to reproduce** that start from a known state, such as a signed-in user on a
  named page, and include the data entered and, for time-dependent bugs, the test time used.
- **The expected result and the actual result**, stated separately. The expected result cites the
  rule it relies on, for example the 24-hour notice rule.
- **A severity** of Critical, High, Medium or Low, with the reason. Critical means a main flow is
  blocked or data is lost or sent to the wrong person. High means a main flow gives a wrong result
  and has no workaround. Medium means a problem with a workaround. Low means a cosmetic problem.
- **The environment**: local, CI or staging; the browser and device; and the commit or build.
- **Evidence**: a screenshot, a Playwright trace (`trace.zip`) or the link to the CI run. Section 7
  of the [README](README.md) explains where the report and the traces are found.

A report covers one problem. A bug found by an automated test names the failing test.
