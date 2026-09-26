// ICU puts a narrow no-break space (U+202F) before AM/PM. Normalise it so text matches everywhere.
const clean = (s: string) => s.replace(/\u202f/g, ' ');

export const formatSlot = (d: Date, tz: string) =>
  clean(new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short', timeZone: tz }).format(d));

export const formatTime = (d: Date, tz: string) =>
  clean(new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz }).format(d));

export const formatDay = (d: Date, tz: string) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: tz }).format(d);
