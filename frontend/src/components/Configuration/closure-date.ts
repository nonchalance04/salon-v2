import { Temporal } from "@js-temporal/polyfill";

// Only an exact salon-local midnight-to-next-midnight period is a single
// all-day closure. Custom hours and multi-day historical periods stay intact.
export function allDayClosureDate(startsAt: string, endsAt: string, timeZone: string): string | null {
  const start = Temporal.Instant.from(startsAt).toZonedDateTimeISO(timeZone);
  const midnight = start.toPlainDate().toZonedDateTime(timeZone);
  if (Temporal.Instant.compare(start.toInstant(), midnight.toInstant()) !== 0) return null;
  if (Temporal.Instant.compare(Temporal.Instant.from(endsAt), midnight.add({ days: 1 }).toInstant()) !== 0) return null;
  return start.toPlainDate().toString();
}
