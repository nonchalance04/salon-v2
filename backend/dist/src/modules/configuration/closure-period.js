import { Temporal } from "@js-temporal/polyfill";
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