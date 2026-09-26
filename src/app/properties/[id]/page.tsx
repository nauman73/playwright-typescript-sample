import Link from 'next/link';
import { config } from '@/lib/config';
import { formatTime } from '@/lib/format';
import { orNotFound } from '@/lib/or-not-found';
import { requestNow } from '@/lib/request-now';
import { getDays, getProperty } from '@/server/properties';

export const dynamic = 'force-dynamic';

// The tooltip on a slot that cannot be booked.
const REASONS = {
  INSUFFICIENT_NOTICE: 'Less than 24 hours away',
  OUTSIDE_BUSINESS_HOURS: 'Outside business hours',
  INVALID_SLOT: 'Not a valid slot',
  SLOT_TAKEN: 'Already booked',
} as const;

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const now = await requestNow();
  const property = await orNotFound(getProperty(id));
  const days = await getDays(id, now);
  return (
    <>
      <h1>{property.address}</h1>
      <p>
        {property.bedrooms} bedrooms · ${property.monthlyRent.toLocaleString('en-US')} per month
      </p>
      <h2>Choose a time</h2>
      {days.map((day) => (
        <section key={day.date} aria-labelledby={`day-${day.date}`} className="day">
          <h3 id={`day-${day.date}`}>{day.label}</h3>
          {day.closed ? (
            <p>Closed</p>
          ) : (
            <div className="slots">
              {day.slots.map((slot) => {
                const label = formatTime(new Date(slot.startsAt), config.timeZone);
                return slot.available ? (
                  <Link
                    key={slot.startsAt}
                    className="slot"
                    href={`/properties/${id}/book?slot=${encodeURIComponent(slot.startsAt)}`}
                  >
                    {label}
                  </Link>
                ) : (
                  <button
                    key={slot.startsAt}
                    type="button"
                    className="slot"
                    disabled
                    title={slot.reason ? REASONS[slot.reason] : undefined}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      ))}
    </>
  );
}
