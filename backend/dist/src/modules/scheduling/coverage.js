// Bring in the tools for salon scheduling so this file can work with the rest of the application.
import { Temporal } from "@js-temporal/polyfill";
import { days } from "../configuration/configuration.schema.js";
// Translate weekly hours into actual time ranges so reservations can be checked on the selected dates.
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
            // Place the local opening or closing time on its date so the schedule can be compared with actual visits.
            const at = (time) => day.toPlainDateTime(time.toISOString().slice(11, 19)).toZonedDateTime(timeZone).epochMilliseconds;
            intervals.push([at(window.startTime), at(window.endTime)]);
        }
    }
    return intervals.sort((a, b) => a[0] - b[0]);
}
// Check that the available ranges cover the entire visit so gaps cannot be booked.
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
// Check whether two time ranges intersect so conflicting reservations can be detected.
export function overlaps(start, end, otherStart, otherEnd) {
    return start < otherEnd && end > otherStart;
}
// Check schedule coverage for the reserved visit so its service and buffer both fit.
export function coversReservation(start, end, windows, timeZone) {
    return coversIntervals(start, end, reservationWindows(start, end, windows, timeZone));
}
//# sourceMappingURL=coverage.js.map