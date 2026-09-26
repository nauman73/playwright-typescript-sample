import { config } from '@/lib/config';
import { formatSlot, formatTime } from '@/lib/format';
import { orNotFound } from '@/lib/or-not-found';
import { requestNow } from '@/lib/request-now';
import { getDays, getProperty } from '@/server/properties';
import { getShowing } from '@/server/showings';
import { ShowingActions } from './ShowingActions';

export const dynamic = 'force-dynamic';

// The status message for the `done` query value that the booking and reschedule actions set.
const DONE = new Map([
  ['booked', 'Showing booked'],
  ['rescheduled', 'Showing rescheduled'],
]);

export default async function ShowingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { id } = await params;
  const { done } = await searchParams;
  const now = await requestNow();
  const showing = await orNotFound(getShowing(id));
  const property = await getProperty(showing.propertyId);
  const changeable = showing.status === 'booked' && showing.startsAt > now;
  // The reschedule list offers every available slot in the next 14 days. The current slot is taken, so it is not offered.
  const options = changeable
    ? (await getDays(property.id, now)).flatMap((d) =>
        d.slots
          .filter((s) => s.available)
          .map((s) => ({ value: s.startsAt, label: `${d.label}, ${formatTime(new Date(s.startsAt), config.timeZone)}` })),
      )
    : [];
  const message = typeof done === 'string' ? DONE.get(done) : undefined;
  return (
    <>
      <h1>Showing</h1>
      {message && <p role="status">{message}</p>}
      <dl data-testid="showing-details" className="details">
        <dt>Property</dt>
        <dd>{property.address}</dd>
        <dt>Time</dt>
        <dd>{formatSlot(showing.startsAt, config.timeZone)}</dd>
        <dt>Prospect</dt>
        <dd>{showing.prospectName}</dd>
        <dt>Email</dt>
        <dd>{showing.prospectEmail}</dd>
        <dt>Phone</dt>
        <dd>{showing.prospectPhone}</dd>
        <dt>Status</dt>
        <dd>{showing.status}</dd>
      </dl>
      {changeable && <ShowingActions id={showing.id} options={options} />}
    </>
  );
}
