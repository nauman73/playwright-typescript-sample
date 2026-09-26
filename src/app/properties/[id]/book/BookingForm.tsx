'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Messages for the API error codes a staff member can act on. Other codes use a general message.
const MESSAGES: Record<string, string> = {
  SLOT_TAKEN: 'That slot has just been taken. Choose another time.',
  INSUFFICIENT_NOTICE: 'Showings need at least 24 hours notice.',
  OUTSIDE_BUSINESS_HOURS: 'That time is outside business hours.',
  VALIDATION: 'Check the name, email and phone number.',
};

export function BookingForm({ propertyId, startsAt }: { propertyId: string; startsAt: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/showings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        propertyId,
        startsAt,
        prospectName: form.get('name'),
        prospectEmail: form.get('email'),
        prospectPhone: form.get('phone'),
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 201) {
      router.push(`/showings/${body.id}?done=booked`);
      return;
    }
    setError(MESSAGES[body.code] ?? 'The booking failed. Try again.');
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="form">
      <label>
        Name <input name="name" required autoComplete="off" />
      </label>
      <label>
        Email <input name="email" type="email" required autoComplete="off" />
      </label>
      <label>
        Phone <input name="phone" type="tel" required autoComplete="off" />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={busy}>
        Book showing
      </button>
    </form>
  );
}
