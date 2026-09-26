import { db } from '@/db/client';
import { smsOutbox } from '@/db/schema';
import type { SmsMessage, SmsSender } from './types';

/** Sends nothing. Stores each message in sms_outbox so tests and people can read it. */
export class RecordingSmsSender implements SmsSender {
  async send({ to, body, showingId }: SmsMessage) {
    const [row] = await db.insert(smsOutbox).values({ showingId, toNumber: to, body }).returning({ id: smsOutbox.id });
    return { id: row!.id };
  }
}
