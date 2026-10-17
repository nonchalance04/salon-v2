import assert from "node:assert/strict";
import { test } from "node:test";
import type { PrismaClient } from "../generated/prisma/client.js";
import { calculateAvailability, calculateCalendarAvailability, type AvailabilityData } from "../src/modules/availability/availability.engine.js";
import { days } from "../src/modules/configuration/configuration.schema.js";
import { closureRequestSchema } from "../src/modules/configuration/configuration.schema.js";
import { closurePeriod } from "../src/modules/configuration/closure-period.js";
import { createConfigurationService } from "../src/modules/configuration/configuration.service.js";
import { ApiError } from "../src/shared/http.js";

const input = (date: string, reason?: string) => closureRequestSchema.parse({ date, ...(reason === undefined ? {} : { reason }) });

test("date-only closures cover precisely the selected salon-local day with an optional reason", () => {
  const result = closurePeriod(input("2026-10-18"), "Asia/Manila");
  assert.equal(result.startsAt.toISOString(), "2026-10-17T16:00:00.000Z");
  assert.equal(result.endsAt.toISOString(), "2026-10-18T16:00:00.000Z");
  assert.equal(result.reason, null);
  assert.equal(closurePeriod(input("2026-12-31", "  Holiday  "), "Asia/Manila").endsAt.toISOString(), "2026-12-31T16:00:00.000Z");
  assert.equal(closurePeriod(input("2026-12-31", "  Holiday  "), "Asia/Manila").reason, "Holiday");
  assert.equal(closurePeriod(input("2028-02-29"), "Asia/Manila").endsAt.toISOString(), "2028-02-29T16:00:00.000Z");
});

test("whole-day closure boundaries follow calendar days rather than fixed 24-hour durations", () => {
  for (const [date, hours] of [["2026-03-08", 23], ["2026-11-01", 25]] as const) {
    const result = closurePeriod(input(date), "America/New_York");
    assert.equal((result.endsAt.getTime() - result.startsAt.getTime()) / 3_600_000, hours);
  }
});

test("closure requests reject invalid dates, mixed authority fields, and preserve custom intervals", () => {
  for (const value of [{ date: "2026-02-30" }, { date: "2026-13-18" }, { date: "" },
    { date: "2026-10-18", timeZone: "UTC" }, { date: "2026-10-18", startsAt: "2026-10-18T09:00:00Z" },
    { date: "2026-10-18", reason: 42 }]) assert.equal(closureRequestSchema.safeParse(value).success, false);
  const custom = closureRequestSchema.parse({ startsAt: "2026-10-18T01:00:00Z", endsAt: "2026-10-18T04:00:00Z", reason: "Custom hours" });
  assert.equal(closurePeriod(custom, "Asia/Manila"), custom);
});

function fixture(conflict: boolean) {
  const state = { row: null as null | Record<string, unknown>, audits: [] as unknown[], where: null as any, mode: "" };
  const tx = {
    $executeRaw: async () => 0,
    $queryRaw: async (sql: TemplateStringsArray) => {
      if (sql.join("").includes("advisory_xact_lock(")) state.mode = "exclusive";
      return [{ epochMs: new Date("2026-10-17T00:00:00Z").getTime() }];
    },
    user: { findUnique: async () => ({ isActive: true, role: "ADMIN" }) },
    salonClosure: {
      create: async ({ data }: any) => state.row = { id: "closure-id", ...data },
      update: async ({ data }: any) => state.row = { id: "closure-id", ...data },
      findUnique: async () => state.row,
    },
    appointmentService: { findMany: async ({ where }: any) => {
      state.where = where;
      return conflict ? [{ id: "reservation-id", appointmentId: "appointment-id", scheduledStartAt: new Date("2026-10-18T03:00:00Z"), reservedUntilAt: new Date("2026-10-18T04:00:00Z"), appointment: { bookingCode: "CONFLICT-123", status: "CONFIRMED" } }] : [];
    } },
    auditLog: { create: async ({ data }: any) => { state.audits.push(data); } },
  };
  const prisma = { $transaction: async (run: (client: typeof tx) => unknown) => {
    const previous = state.row;
    try { return await run(tx); } catch (error) { state.row = previous; throw error; }
  } };
  return { state, service: createConfigurationService(prisma as unknown as PrismaClient, "Asia/Manila") };
}

test("all-day closure writes retain exclusive coordination, full-day conflict filtering, and audit snapshots", async () => {
  const { state, service } = fixture(false);
  await service.saveClosure("admin", input("2026-10-18", "Holiday"));
  assert.equal(state.mode, "exclusive");
  assert.equal((state.row!.startsAt as Date).toISOString(), "2026-10-17T16:00:00.000Z");
  assert.equal(state.where.AND[0].scheduledStartAt.lt.toISOString(), "2026-10-18T16:00:00.000Z");
  assert.equal(state.where.AND[0].reservedUntilAt.gt.toISOString(), "2026-10-17T16:00:00.000Z");
  assert.equal(state.audits.length, 1);
  await service.saveClosure("admin", input("2026-10-19"), "closure-id");
  assert.equal((state.row!.startsAt as Date).toISOString(), "2026-10-18T16:00:00.000Z");
  assert.equal(state.audits.length, 2);
});

test("conflicting all-day closures are rejected and their transaction is rolled back", async () => {
  const { state, service } = fixture(true);
  await assert.rejects(service.saveClosure("admin", input("2026-10-18")), error => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, "RESERVATION_CONFLICT");
    assert.ok(JSON.stringify(error.details).includes("CONFLICT-123"));
    return true;
  });
  assert.equal(state.row, null);
  assert.equal(state.audits.length, 0);
});


test("a date-only closure disables every time on that date and leaves the next date bookable", () => {
  const weekly = days.map(dayOfWeek => ({ dayOfWeek, startTime: new Date("1970-01-01T08:00:00Z"), endTime: new Date("1970-01-01T18:00:00Z") }));
  const data: AvailabilityData = {
    now: new Date("2026-10-17T00:00:00Z"), timeZone: "Asia/Manila",
    policy: { defaultBufferMinutes: 0, minimumBookingLeadMinutes: 0, advanceBookingDays: 30 },
    services: [{ id: "service", name: "Haircut", durationMinutes: 30, bufferMinutes: 0 }],
    staff: [{ id: "staff", firstName: "Test", lastName: "Stylist" }],
    qualifications: [{ staffId: "staff", serviceId: "service" }],
    hours: weekly, schedules: weekly.map(row => ({ ...row, staffId: "staff" })),
    closures: [], unavailability: [], reservations: [],
  };
  const services = [{ serviceId: "service", assignmentMode: "ANY_AVAILABLE" as const }];
  assert.ok(calculateAvailability({ date: "2026-10-18", services }, data).length > 0);
  data.closures = [closurePeriod(input("2026-10-18"), data.timeZone)];
  assert.deepEqual(calculateAvailability({ date: "2026-10-18", services }, data), []);
  const calendar = calculateCalendarAvailability({ month: "2026-10", services }, data);
  assert.equal(calendar.find(day => day.date === "2026-10-18")!.available, false);
  assert.equal(calendar.find(day => day.date === "2026-10-19")!.available, true);
});
