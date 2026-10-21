// Bring in the tools for available booking times so this file can work with the rest of the application.
import { Temporal } from "@js-temporal/polyfill";
import { coversIntervals, reservationWindows, overlaps } from "../scheduling/coverage.js";
// Decide whether a reservation still occupies time so unavailable slots are excluded.
export function isBlocking(row, now) {
    if (row.membershipStatus !== "ACTIVE")
        return false;
    switch (row.appointment.status) {
        case "CONFIRMED":
            return true;
        case "COMPLETED":
            return row.reservedUntilAt > now;
        case "PENDING_PAYMENT":
            return row.appointment.holdExpiresAt !== null && row.appointment.holdExpiresAt >= now;
        default:
            return false;
    }
}
// Count only the part of each live reservation that falls on the selected day.
// Completed visits still block their buffer, but do not add assignment workload.
function staffWorkload(staffId, reservations, day) {
    let total = 0;
    for (const reservation of reservations) {
        if (reservation.staffId !== staffId)
            continue;
        if (!["CONFIRMED", "PENDING_PAYMENT"].includes(reservation.appointment.status))
            continue;
        const start = Math.max(reservation.scheduledStartAt.getTime(), day.start.getTime());
        const end = Math.min(reservation.reservedUntilAt.getTime(), day.end.getTime());
        total += Math.max(0, end - start);
    }
    return total;
}
// Find the start and end of the salon-local day so date checks use the salon clock.
export function localDay(date, timeZone) {
    const day = Temporal.PlainDate.from(date).toZonedDateTime(timeZone);
    return { start: new Date(day.epochMilliseconds), end: new Date(day.add({ days: 1 }).epochMilliseconds) };
}
// Calculate the earliest and latest permitted booking times so searches respect booking notice rules.
export function policyBounds(data) {
    const now = Temporal.Instant.fromEpochMilliseconds(data.now.getTime()).toZonedDateTimeISO(data.timeZone);
    // Policy days are salon-local calendar days; lead minutes are elapsed time.
    return { earliest: new Date(data.now.getTime() + data.policy.minimumBookingLeadMinutes * 60_000),
        latest: new Date(now.add({ days: data.policy.advanceBookingDays }).epochMilliseconds) };
}
// Combine salon hours, staff schedules and existing visits so a proposed booking can be checked.
function createPlanner(input, data) {
    const bounds = policyBounds(data);
    const day = localDay(input.date, data.timeZone);
    const hours = reservationWindows(day.start, day.end, data.hours, data.timeZone);
    const schedules = new Map();
    const workloads = new Map();
    const blocking = data.reservations.filter(reservation => isBlocking(reservation, data.now));
    // Prepare each professional's working hours and reserved workload so assignment choices use the same daily information.
    for (const staff of data.staff) {
        const weeklySchedule = data.schedules.filter(window => window.staffId === staff.id);
        schedules.set(staff.id, reservationWindows(day.start, day.end, weeklySchedule, data.timeZone));
        workloads.set(staff.id, staffWorkload(staff.id, blocking, day));
    }
    // Find qualified staff who are free for the whole service so the visit can be assigned safely.
    function availableStaff(selection, start, end) {
        // Filter professionals by skills, working hours and conflicting visits so only suitable staff remain.
        const candidates = data.staff.filter(staff => {
            if (selection.assignmentMode !== "ANY_AVAILABLE" && staff.id !== selection.staffId)
                return false;
            const qualified = data.qualifications.some(row => row.staffId === staff.id && row.serviceId === selection.serviceId);
            if (!qualified)
                return false;
            if (!coversIntervals(start, end, schedules.get(staff.id)))
                return false;
            const hasTimeOff = data.unavailability.some(row => row.staffId === staff.id && overlaps(start, end, row.startsAt, row.endsAt));
            if (hasTimeOff)
                return false;
            const hasReservation = blocking.some(row => row.staffId === staff.id && overlaps(start, end, row.scheduledStartAt, row.reservedUntilAt));
            return !hasReservation;
        });
        // Prefer the professional with less reserved time and use a stable tie-break so automatic assignment stays predictable.
        return candidates.sort((a, b) => {
            const workloadDifference = workloads.get(a.id) - workloads.get(b.id);
            if (workloadDifference !== 0)
                return workloadDifference;
            if (a.id < b.id)
                return -1;
            if (a.id > b.id)
                return 1;
            return 0;
        });
    }
    return (start) => {
        if (start < data.now || start < bounds.earliest || start > bounds.latest)
            return null;
        if (start < day.start || start >= day.end)
            return null;
        let cursor = start;
        const plan = [];
        // Place each service after the previous service and its buffer so the full visit fits in order.
        for (const [index, selection] of input.services.entries()) {
            const current = data.services.find(s => s.id === selection.serviceId);
            const service = current && { ...current, ...data.serviceOverrides?.[index] };
            if (!service)
                return null;
            const buffer = service.bufferMinutes ?? data.policy.defaultBufferMinutes;
            const end = new Date(cursor.getTime() + service.durationMinutes * 60_000);
            const reservedUntil = new Date(end.getTime() + buffer * 60_000);
            // Current weekly windows cannot span midnight (open < close, no 24:00).
            // Bound coverage work even when configuration contains enormous durations.
            if (!Number.isFinite(reservedUntil.getTime()) || reservedUntil > day.end)
                return null;
            if (!coversIntervals(cursor, reservedUntil, hours))
                return null;
            const salonClosed = data.closures.some(closure => overlaps(cursor, reservedUntil, closure.startsAt, closure.endsAt));
            if (salonClosed)
                return null;
            const candidates = availableStaff(selection, cursor, reservedUntil);
            if (!candidates.length)
                return null;
            plan.push({
                sequenceNo: index + 1,
                serviceId: service.id,
                serviceName: service.name,
                assignmentMode: selection.assignmentMode,
                candidates,
                startAt: cursor.toISOString(),
                endAt: end.toISOString(),
                reservedUntilAt: reservedUntil.toISOString(),
                durationMinutes: service.durationMinutes,
                bufferMinutes: buffer,
            });
            cursor = reservedUntil;
        }
        // Under the MVP rules every interval is fixed before assignment and sequential
        // including its buffer. Choices cannot overlap or constrain later choices, so
        // the Cartesian product of these nonempty candidate lists is a feasible plan.
        // Resolve only after checking ALL intervals; no exponential search is needed.
        return {
            startAt: start.toISOString(),
            endAt: plan.at(-1).endAt,
            services: plan.map(({ candidates, ...row }) => {
                const staff = candidates[0];
                return { ...row, staffId: staff.id, staffName: `${staff.firstName} ${staff.lastName}` };
            }),
        };
    };
}
// Check one proposed start time so the caller can confirm whether that exact visit fits.
export function planAt(input, start, data) {
    return createPlanner(input, data)(start);
}
// Try permitted start times so customers see visits that fit the current schedule.
export function calculateAvailability(input, data, limit = Infinity) {
    const resolve = createPlanner(input, data);
    if (input.startAt) {
        const plan = resolve(new Date(input.startAt));
        return plan ? [plan] : [];
    }
    const day = localDay(input.date, data.timeZone);
    const { earliest, latest } = policyBounds(data);
    const result = [];
    // Offer quarter-hour starts anchored to the salon-local day. Round up so a
    // lead-time boundary never offers a start earlier than the policy permits.
    // Exact startAt checks remain available for existing appointment schedules.
    const intervalMs = 15 * 60_000;
    const firstStart = day.start.getTime() + Math.ceil(Math.max(0, earliest.getTime() - day.start.getTime()) / intervalMs) * intervalMs;
    for (let ms = firstStart; ms < day.end.getTime() && ms <= latest.getTime(); ms += intervalMs) {
        const plan = resolve(new Date(ms));
        if (plan) {
            result.push(plan);
            if (result.length >= limit)
                break;
        }
    }
    return result;
}
// Summarize available dates so the booking calendar can show which days offer appointments.
export function calculateCalendarAvailability(input, data) {
    const first = Temporal.PlainDate.from(`${input.month}-01`);
    return Array.from({ length: first.daysInMonth }, (_, index) => {
        const date = first.add({ days: index }).toString();
        return { date, available: calculateAvailability({ date, services: input.services }, data, 1).length > 0 };
    });
}
//# sourceMappingURL=availability.engine.js.map