// Bring in the tools for salon settings so this file can work with the rest of the application.
import { Temporal } from "@js-temporal/polyfill";
// Turn a closure request into a start and end time so closed dates use the salon time zone.
export function closurePeriod(input, timeZone) {
    if (!("date" in input))
        return input;
    const start = Temporal.PlainDate.from(input.date).toZonedDateTime(timeZone);
    return {
        startsAt: new Date(start.epochMilliseconds),
        endsAt: new Date(start.add({ days: 1 }).epochMilliseconds),
        reason: input.reason,
    };
}
//# sourceMappingURL=closure-period.js.map