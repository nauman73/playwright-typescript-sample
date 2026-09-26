import Link from 'next/link';
import { listProperties } from '@/server/properties';

export const dynamic = 'force-dynamic';

export default async function PropertiesPage() {
  const rows = await listProperties();
  return (
    <>
      <h1>Properties</h1>
      <ul className="cards">
        {rows.map((p) => (
          <li key={p.id}>
            <Link href={`/properties/${p.id}`}>{p.address}</Link>
            <p>
              {p.bedrooms} bedrooms · ${p.monthlyRent.toLocaleString('en-US')} per month
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
