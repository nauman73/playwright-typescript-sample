import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { properties, type Showing } from '@/db/schema';
import { config } from '@/lib/config';
import { formatSlot } from '@/lib/format';
import { sendEmail } from './email';
import { getSmsSender } from './sms';

export type NotificationKind = 'booked' | 'rescheduled' | 'cancelled';

const TEXT: Record<NotificationKind, { subject: string; line: (address: string, slot: string) => string }> = {
  booked: { subject: 'Showing confirmed', line: (a, s) => `your showing at ${a} is confirmed for ${s}.` },
  rescheduled: { subject: 'Showing rescheduled', line: (a, s) => `your showing at ${a} has moved to ${s}.` },
  cancelled: { subject: 'Showing cancelled', line: (a, s) => `your showing at ${a} on ${s} is cancelled.` },
};

/** Sends the email and the SMS. Logs failures and never throws, so a booking is not undone. */
export async function notifyProspect(kind: NotificationKind, showing: Showing): Promise<void> {
  try {
    const [property] = await db.select().from(properties).where(eq(properties.id, showing.propertyId));
    const address = property?.address ?? 'the property';
    const line = TEXT[kind].line(address, formatSlot(showing.startsAt, config.timeZone));
    const results = await Promise.allSettled([
      sendEmail({
        to: showing.prospectEmail,
        subject: `${TEXT[kind].subject}: ${address}`,
        text: `Hello ${showing.prospectName},\n\n${line.charAt(0).toUpperCase()}${line.slice(1)}\n\nViewings`,
      }),
      getSmsSender().send({ to: showing.prospectPhone, body: `Viewings: ${line}`, showingId: showing.id }),
    ]);
    for (const r of results) if (r.status === 'rejected') console.error(`Notification (${kind}) failed`, r.reason);
  } catch (error) {
    // The property lookup can fail too. It is logged like a failed send.
    console.error(`Notification (${kind}) failed`, error);
  }
}
