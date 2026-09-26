import { config } from '@/lib/config';
import { formatSlot } from '@/lib/format';
import { orNotFound } from '@/lib/or-not-found';
import { getProperty } from '@/server/properties';
import { BookingForm } from './BookingForm';

export const dynamic = 'force-dynamic';

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ slot?: string }>;
}) {
  const { id } = await params;
  const { slot } = await searchParams;
  const property = await orNotFound(getProperty(id));
  // The API checks the booking rules. The page only needs a date it can display.
  const startsAt = typeof slot === 'string' && !Number.isNaN(new Date(slot).getTime()) ? slot : null;
  return (
    <>
      <h1>Book a showing</h1>
      <p>{property.address}</p>
      {startsAt ? (
        <>
          <p>{formatSlot(new Date(startsAt), config.timeZone)}</p>
          <BookingForm propertyId={id} startsAt={startsAt} />
        </>
      ) : (
        <p role="alert">Choose a time first.</p>
      )}
    </>
  );
}
