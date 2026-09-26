import { expect, test } from '@playwright/test';
import { TwilioSmsSender } from '../../src/notifications/sms/twilio';
import { SmsSendError } from '../../src/notifications/sms/types';

const accountSid = process.env.TWILIO_TEST_ACCOUNT_SID;
const authToken = process.env.TWILIO_TEST_AUTH_TOKEN;

test.describe('Twilio adapter with test credentials', () => {
  // The skip is conditional: the tests run whenever the test credentials are set.
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(!accountSid || !authToken, 'Set TWILIO_TEST_ACCOUNT_SID and TWILIO_TEST_AUTH_TOKEN to run these tests');

  // Twilio's magic sender number: always passes validation with test credentials.
  const sender = () => new TwilioSmsSender({ accountSid: accountSid!, authToken: authToken!, from: '+15005550006' });

  test('sending to a valid number returns a Twilio message SID', async () => {
    const result = await sender().send({ to: '+14155552671', body: 'Contract test', showingId: 'contract' });
    expect(result.id).toMatch(/^SM[0-9a-f]{32}$/i);
  });

  test('sending to an invalid number raises SmsSendError with code 21211', async () => {
    const error = await sender().send({ to: '+15005550001', body: 'Contract test', showingId: 'contract' }).catch((e) => e);
    expect(error).toBeInstanceOf(SmsSendError);
    expect(error.code).toBe(21211);
  });
});
