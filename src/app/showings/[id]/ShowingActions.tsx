'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ShowingActions({ id, options }: { id: string; options: { value: string; label: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reschedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const startsAt = new FormData(e.currentTarget).get('startsAt');
    try {
      const res = await fetch(`/api/showings/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ startsAt }),
      });
      if (res.ok) {
        router.replace(`/showings/${id}?done=rescheduled`);
        return;
      }
      const body = await res.json().catch(() => ({}));
      setError(body.code === 'SLOT_TAKEN' ? 'That slot has just been taken.' : 'Rescheduling failed.');
    } catch {
      // The request did not reach the server, for example because the network is down.
      setError('Rescheduling failed.');
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/showings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/showings?done=cancelled');
        return;
      }
      setError('Cancelling failed.');
    } catch {
      setError('Cancelling failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={reschedule} className="form">
        <label>
          New time
          <select name="startsAt" required>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={busy}>
          Reschedule
        </button>
      </form>
      <button type="button" onClick={cancel} disabled={busy}>
        Cancel showing
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
