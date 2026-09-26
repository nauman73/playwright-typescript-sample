import twilio from 'twilio';
import { SmsSendError, type SmsMessage, type SmsSender } from './types';

export type TwilioOptions = { accountSid: string; authToken: string; from: string };

/**
 * Sends SMS through Twilio's Messages API. The constructor does no work that can fail. Missing
 * credentials and Twilio client errors are reported by `send` as an SmsSendError, so a caller
 * that builds the sender and sends in one step only has to handle a rejected promise.
 */
export class TwilioSmsSender implements SmsSender {
  private client?: ReturnType<typeof twilio>;

  constructor(private options: TwilioOptions) {}

  async send({ to, body }: SmsMessage): Promise<{ id: string }> {
    const { accountSid, authToken, from } = this.options;
    if (!accountSid || !authToken || !from) {
      throw new SmsSendError('Twilio account SID, auth token and sender number must all be set');
    }
    try {
      // The Twilio client throws synchronously for a malformed account SID, so it is created here.
      this.client ??= twilio(accountSid, authToken);
      const message = await this.client.messages.create({ from, to, body });
      return { id: message.sid };
    } catch (error) {
      const code = (error as { code?: unknown }).code;
      throw new SmsSendError(
        error instanceof Error ? error.message : 'SMS send failed',
        typeof code === 'number' ? code : undefined,
      );
    }
  }
}
