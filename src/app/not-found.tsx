import Link from 'next/link';

/** Shown for an unknown address and for a property or showing id that does not exist. */
export default function NotFound() {
  return (
    <>
      <h1>Page not found</h1>
      <p>The property or showing does not exist, or the address is wrong.</p>
      <p>
        <Link href="/properties">Back to properties</Link>
      </p>
    </>
  );
}
