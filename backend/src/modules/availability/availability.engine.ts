import { Temporal } from "@js-temporal/polyfill";
import { coversIntervals, reservationWindows, overlaps, type WeeklyWindow } from "../scheduling/coverage.js";
import type { AvailabilityInput, CalendarAvailabilityInput } from "./availability.schema.js";

export type Reservation = {
  staffId: string;
  scheduledStartAt: Date;
  reservedUntilAt: Date;
  membershipStatus: string;
  appointment: { status: string; holdExpiresAt: Date | null };
};
export type AvailabilityData = {
  now: Date;
  timeZone: string;
  policy: { defaultBufferMinutes: number; minimumBookingLeadMinutes: number; advanceBookingDays: number };
  services: { id: string; name: string; durationMinutes: number; bufferMinutes: number | null }[];
  serviceOverrides?: ({ name: string; durationMinutes: number; bufferMinutes: number } | undefined)[];
  staff: { id: string; firstName: string; lastName: string }[];
  qualifications: { staffId: string; serviceId: string }[];
  hours: WeeklyWindow[];
  schedules: (WeeklyWindow & { staffId: string })[];
  closures: { startsAt: Date; endsAt: Date }[];
  unavailability: { staffId: string; startsAt: Date; endsAt: Date }[];
  reservations: Reservation[];
};
export function isBlocking(row: Reservation, now: Date) {
  if (row.membershipStatus !== "ACTIVE") return false;

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
function staffWorkload(staffId: string, reservations: Reservation[], day: { start: Date; end: Date }) {
  let total = 0;
  for (const reservation of reservations) {
    if (reservation.staffId !== staffId) continue;
    if (!["CONFIRMED", "PENDING_PAYMENT"].includes(reservation.appointment.status)) continue;

    const start = Math.max(reservation.scheduledStartAt.getTime(), day.start.getTime());
    const end = Math.min(reservation.reservedUntilAt.getTime(), day.end.getTime());
    total += Math.max(0, end - start);
  }
  return total;
}

export function localDay(date: string, timeZone: string) {
  const day = Temporal.PlainDate.from(date).toZonedDateTime(timeZone);
  return { start: new Date(day.epochMilliseconds), end: new Date(day.add({ days: 1 }).epochMilliseconds) };
}
export function policyBounds(data: Pick<AvailabilityData, "now" | "timeZone" | "policy">) {
  const now = Temporal.Instant.fromEpochMilliseconds(data.now.getTime()).toZonedDateTimeISO(data.timeZone);
  // Policy days are salon-local calendar days; lead minutes are elapsed time.
  return { earliest: new Date(data.now.getTime() + data.policy.minimumBookingLeadMinutes * 60_000),
    latest: new Date(now.add({ days: data.policy.advanceBookingDays }).epochMilliseconds) };
}
function createPlanner(input: AvailabilityInput, data: AvailabilityData) {
  const bounds = policyBounds(data);
  const day = localDay(input.date, data.timeZone);
  const hours = reservationWindows(day.start, day.end, data.hours, data.timeZone);
  const schedules = new Map<string, [number, number][]>();
  const workloads = new Map<string, number>();
  const blocking = data.reservations.filter(reservation => isBlocking(reservation, data.now));

  for (const staff of data.staff) {
    const weeklySchedule = data.schedules.filter(window => window.staffId === staff.id);
    schedules.set(staff.id, reservationWindows(day.start, day.end, weeklySchedule, data.timeZone));
    workloads.set(staff.id, staffWorkload(staff.id, blocking, day));
  }

  function availableStaff(selection: AvailabilityInput["services"][number], start: Date, end: Date) {
    const candidates = data.staff.filter(staff => {
      if (selection.assignmentMode !== "ANY_AVAILABLE" && staff.id !== selection.staffId) return false;

      const qualified = data.qualifications.some(row => row.staffId === staff.id && row.serviceId === selection.serviceId);
      if (!qualified) return false;
      if (!coversIntervals(start, end, schedules.get(staff.id)!)) return false;

      const hasTimeOff = data.unavailability.some(row =>
        row.staffId === staff.id && overlaps(start, end, row.startsAt, row.endsAt));
      if (hasTimeOff) return false;

      const hasReservation = blocking.some(row =>
        row.staffId === staff.id && overlaps(start, end, row.scheduledStartAt, row.reservedUntilAt));
      return !hasReservation;
    });

    return candidates.sort((a, b) => {
      const workloadDifference = workloads.get(a.id)! - workloads.get(b.id)!;
      if (workloadDifference !== 0) return workloadDifference;
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });
  }

  return (start: Date) => {
    if (start < data.now || start < bounds.earliest || start > bounds.latest) return null;
    if (start < day.start || start >= day.end) return null;
    let cursor = start;
    const plan = [];
    for (const [index, selection] of input.services.entries()) {
      const current = data.services.find(s => s.id === selection.serviceId);
      const service = current && { ...current, ...data.serviceOverrides?.[index] };
      if (!service) return null;
      const buffer = service.bufferMinutes ?? data.policy.defaultBufferMinutes;
      const end = new Date(cursor.getTime() + service.durationMinutes * 60_000);
      const reservedUntil = new Date(end.getTime() + buffer * 60_000);
      // Current weekly windows cannot span midnight (open < close, no 24:00).
      // Bound coverage work even when configuration contains enormous durations.
      if (!Number.isFinite(reservedUntil.getTime()) || reservedUntil > day.end) return null;
      if (!coversIntervals(cursor, reservedUntil, hours)) return null;
      const salonClosed = data.closures.some(closure =>
        overlaps(cursor, reservedUntil, closure.startsAt, closure.endsAt));
      if (salonClosed) return null;
      const candidates = availableStaff(selection, cursor, reservedUntil);
      if (!candidates.length) return null;
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
      endAt: plan.at(-1)!.endAt,
      services: plan.map(({ candidates, ...row }) => {
        const staff = candidates[0]!;
        return { ...row, staffId: staff.id, staffName: `${staff.firstName} ${staff.lastName}` };
      }),
    };
  };
}
export function planAt(input: AvailabilityInput, start: Date, data: AvailabilityData) {
  return createPlanner(input, data)(start);
}
export function calculateAvailability(input: AvailabilityInput, data: AvailabilityData, limit = Infinity) {
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
  for (let ms = firstStart;
    ms < day.end.getTime() && ms <= latest.getTime(); ms += intervalMs) {
    const plan = resolve(new Date(ms));
    if (plan) {
      result.push(plan);
      if (result.length >= limit) break;
    }
  }
  return result;
}

export function calculateCalendarAvailability(input: CalendarAvailabilityInput, data: AvailabilityData) {
  const first = Temporal.PlainDate.from(`${input.month}-01`);
  return Array.from({ length: first.daysInMonth }, (_, index) => {
    const date = first.add({ days: index }).toString();
    return { date, available: calculateAvailability({ date, services: input.services }, data, 1).length > 0 };
  });
}
