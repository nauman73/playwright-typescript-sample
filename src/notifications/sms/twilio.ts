import { SmsSendError, type SmsMessage, type SmsSender } from './types';

export type TwilioOptions = { accountSid: string; authToken: string; from: string };

/** Placeholder until the Twilio adapter is built. Every send fails with SmsSendError. */
export class TwilioSmsSender implements SmsSender {
  constructor(private options: TwilioOptions) {}

  async send(message: SmsMessage): Promise<{ id: string }> {
    void this.options;
    void message;
    throw new SmsSendError('Twilio adapter not built yet');
  }
}
