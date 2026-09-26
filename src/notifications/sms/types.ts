export type SmsMessage = { to: string; body: string; showingId: string };

export interface SmsSender {
  send(message: SmsMessage): Promise<{ id: string }>;
}

/** Thrown by an SMS adapter when the provider rejects a message. `code` is the provider's error code. */
export class SmsSendError extends Error {
  constructor(message: string, public code?: number) {
    super(message);
    this.name = 'SmsSendError';
  }
}
