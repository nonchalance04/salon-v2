import { Temporal } from "@js-temporal/polyfill";
import type { ClosureInput, ClosureRequestInput } from "./configuration.schema.js";

export function closurePeriod(input: ClosureRequestInput, timeZone: string): ClosureInput {
  if (!("date" in input)) return input;
  const start = Temporal.PlainDate.from(input.date).toZonedDateTime(timeZone);
  return {
    startsAt: new Date(start.epochMilliseconds),
    endsAt: new Date(start.add({ days: 1 }).epochMilliseconds),
    reason: input.reason,
  };
}
