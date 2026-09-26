import Link from 'next/link';
import { config } from '@/lib/config';
import { formatSlot } from '@/lib/format';
import { requestNow } from '@/lib/request-now';
import { listUpcoming } from '@/server/showings';

export const dynamic = 'force-dynamic';

export default async function ShowingsPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const { done } = await searchParams;
  const rows = await listUpcoming(await requestNow());
  return (
    <>
      <h1>Upcoming showings</h1>
      {done === 'cancelled' && <p role="status">Showing cancelled</p>}
      <ul className="cards">
        {rows.map((s) => (
          <li key={s.id}>
            <Link href={`/showings/${s.id}`}>{s.address}</Link>
            <p>
              {formatSlot(s.startsAt, config.timeZone)} · {s.prospectName}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
