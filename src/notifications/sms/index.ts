import { config } from '@/lib/config';
import { RecordingSmsSender } from './recording';
import { TwilioSmsSender } from './twilio';
import type { SmsSender } from './types';

/** Returns the SMS adapter that SMS_PROVIDER selects. The default records messages in sms_outbox. */
export function getSmsSender(): SmsSender {
  if (config.smsProvider === 'twilio') {
    return new TwilioSmsSender({
      accountSid: process.env.TWILIO_ACCOUNT_SID!,
      authToken: process.env.TWILIO_AUTH_TOKEN!,
      from: process.env.TWILIO_FROM_NUMBER!,
    });
  }
  return new RecordingSmsSender();
}
