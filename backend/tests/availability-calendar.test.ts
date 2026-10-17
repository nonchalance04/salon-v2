import assert from "node:assert/strict";
import { test } from "node:test";
import type { PrismaClient } from "../generated/prisma/client.js";
import { createAvailabilityService } from "../src/modules/availability/availability.service.js";

const clock = (time: string) => new Date(`1970-01-01T${time}:00Z`);

test("monthly calendar loads a full salon-local month in one freshly coordinated transaction", async () => {
  const reads: { kind: string; where: any }[] = [];
  const events: string[] = [];
  let transactions = 0;
  const now = new Date("2026-10-05T07:00:00+08:00");
  const tx = {
    $executeRaw: async () => 0,
    $queryRaw: async (strings: TemplateStringsArray) => {
      events.push(strings.join("").includes("clock_timestamp") ? "clock" : "lock");
      return [{ epochMs: now.getTime() }];
    },
    staff: { findMany: async () => [{ id: "a", firstName: "Test", lastName: "Stylist" }] },
    bookingPolicyVersion: { findFirst: async () => {
      events.push("policy");
      return { version: 1, defaultBufferMinutes: 0, minimumBookingLeadMinutes: 0, advanceBookingDays: 30 };
    } },
    service: { findMany: async () => [{ id: "s1", name: "Cut", category: "Hair", durationMinutes: 30, bufferMinutes: 0 }] },
    staffService: { findMany: async () => [{ staffId: "a", serviceId: "s1" }] },
    salonOperatingHour: { findMany: async () => [{ dayOfWeek: "MONDAY", openTime: clock("08:00"), closeTime: clock("18:00") }] },
    staffSchedule: { findMany: async () => [{ staffId: "a", dayOfWeek: "MONDAY", startTime: clock("08:00"), endTime: clock("18:00") }] },
    salonClosure: { findMany: async ({ where }: any) => {
      reads.push({ kind: "closure", where });
      return [{ startsAt: new Date("2026-10-12T00:00:00+08:00"), endsAt: new Date("2026-10-13T00:00:00+08:00") }];
    } },
    staffUnavailability: { findMany: async ({ where }: any) => { reads.push({ kind: "time-off", where }); return []; } },
    appointmentService: { findMany: async ({ where }: any) => {
      reads.push({ kind: "reservation", where });
      return [{ staffId: "a", membershipStatus: "ACTIVE", scheduledStartAt: new Date("2026-10-19T08:00:00+08:00"), reservedUntilAt: new Date("2026-10-19T18:00:00+08:00"), appointment: { status: "CONFIRMED", holdExpiresAt: null } }];
    } },
  };
  const prisma = { $transaction: async (run: (client: typeof tx) => unknown) => { transactions++; return run(tx); } };
  const service = createAvailabilityService(prisma as unknown as PrismaClient, "Asia/Manila");
  const services = [{ serviceId: "s1", assignmentMode: "ANY_AVAILABLE" as const }];
  const result = await service.calendar({ month: "2026-10", services });
  assert.equal(transactions, 1);
  assert.equal(result.advisory, true);
  assert.equal(result.timeZone, "Asia/Manila");
  assert.equal(result.dates.length, 31);
  assert.deepEqual(result.dates.filter(day => day.available).map(day => day.date), ["2026-10-05", "2026-10-26"]);
  assert.deepEqual(events, ["lock", "lock", "clock", "policy"]);
  for (const read of reads) {
    const until = read.kind === "reservation" ? read.where.scheduledStartAt.lt : read.where.startsAt.lt;
    const from = read.kind === "reservation" ? read.where.reservedUntilAt.gt : read.where.endsAt.gt;
    assert.equal(until.toISOString(), "2026-10-31T16:00:00.000Z");
    assert.equal(from.toISOString(), "2026-09-30T16:00:00.000Z");
  }
  reads.length = 0;
  await service.search({ date: "2026-10-05", services });
  assert.equal(reads[0]!.where.startsAt.lt.toISOString(), "2026-10-05T16:00:00.000Z");
});
