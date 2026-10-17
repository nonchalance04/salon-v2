import { Temporal } from "@js-temporal/polyfill";
import { days } from "../configuration/configuration.schema.js";
export function reservationWindows(start, end, windows, timeZone) {
    const first = Temporal.Instant.fromEpochMilliseconds(start.getTime()).toZonedDateTimeISO(timeZone).toPlainDate();
    const last = Temporal.Instant.fromEpochMilliseconds(end.getTime() - 1).toZonedDateTimeISO(timeZone).toPlainDate();
    const intervals = [];
    for (let day = first; Temporal.PlainDate.compare(day, last) <= 0; day = day.add({ days: 1 })) {
        const localDate = day.toString();
        for (const window of windows) {
            if (window.dayOfWeek !== days[day.dayOfWeek - 1])
                continue;
            if (window.effectiveFrom && localDate < window.effectiveFrom.toISOString().slice(0, 10))
                continue;
            if (window.effectiveTo && localDate > window.effectiveTo.toISOString().slice(0, 10))
                continue;
            const at = (time) => day.toPlainDateTime(time.toISOString().slice(11, 19)).toZonedDateTime(timeZone).epochMilliseconds;
            intervals.push([at(window.startTime), at(window.endTime)]);
        }
    }
    return intervals.sort((a, b) => a[0] - b[0]);
}
export function coversIntervals(start, end, intervals) {
    let coveredUntil = start.getTime();
    for (const [from, to] of intervals) {
        if (from > coveredUntil)
            break;
        if (to > coveredUntil)
            coveredUntil = to;
        if (coveredUntil >= end.getTime())
            return true;
    }
    return false;
}
export function overlaps(start, end, otherStart, otherEnd) {
    return start < otherEnd && end > otherStart;
}
export function coversReservation(start, end, windows, timeZone) {
    return coversIntervals(start, end, reservationWindows(start, end, windows, timeZone));
}
//# sourceMappingURL=coverage.js.map