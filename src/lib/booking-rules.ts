import { fromZonedTime } from 'date-fns-tz';
import { formatDay } from './format';

export type RuleCode = 'INVALID_SLOT' | 'OUTSIDE_BUSINESS_HOURS' | 'INSUFFICIENT_NOTICE';
export type Slot = { startsAt: string; available: boolean; reason: RuleCode | 'SLOT_TAKEN' | null };
export type Day = { date: string; label: string; closed: boolean; slots: Slot[] };

export const SLOT_MINUTES = 30;
const OPEN_MINUTE = 9 * 60; // 09:00
const LAST_START_MINUTE = 16 * 60 + 30; // 16:30
const NOTICE_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function localParts(d: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    weekday: WEEKDAYS.indexOf(get('weekday')),
    minuteOfDay: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

export function checkSlot(startsAt: Date, now: Date, tz: string): RuleCode | null {
  const local = localParts(startsAt, tz);
  if (startsAt.getUTCSeconds() !== 0 || startsAt.getUTCMilliseconds() !== 0 || local.minuteOfDay % SLOT_MINUTES !== 0) {
    return 'INVALID_SLOT';
  }
  const weekday = local.weekday >= 1 && local.weekday <= 5;
  if (!weekday || local.minuteOfDay < OPEN_MINUTE || local.minuteOfDay > LAST_START_MINUTE) {
    return 'OUTSIDE_BUSINESS_HOURS';
  }
  if (startsAt.getTime() - now.getTime() < NOTICE_MS) return 'INSUFFICIENT_NOTICE';
  return null;
}

export const todayIn = (now: Date, tz: string) => localParts(now, tz).date;

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + n, 12)).toISOString().slice(0, 10);
}

export function listDays(opts: { from: string; days: number; now: Date; tz: string; taken: Set<number> }): Day[] {
  const { from, days, now, tz, taken } = opts;
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    const noon = fromZonedTime(`${date}T12:00:00`, tz);
    const label = formatDay(noon, tz);
    const weekday = localParts(noon, tz).weekday;
    if (weekday === 0 || weekday === 6) return { date, label, closed: true, slots: [] };
    const slots: Slot[] = [];
    for (let m = OPEN_MINUTE; m <= LAST_START_MINUTE; m += SLOT_MINUTES) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      const startsAt = fromZonedTime(`${date}T${hh}:${mm}:00`, tz);
      const rule = checkSlot(startsAt, now, tz);
      const reason = rule ?? (taken.has(startsAt.getTime()) ? 'SLOT_TAKEN' : null);
      slots.push({ startsAt: startsAt.toISOString(), available: reason === null, reason });
    }
    return { date, label, closed: false, slots };
  });
}
