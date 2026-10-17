import assert from "node:assert/strict";
import { test } from "node:test";
import type { PrismaClient } from "../generated/prisma/client.js";
import { createConfigurationService } from "../src/modules/configuration/configuration.service.js";
import { dayHoursSchema } from "../src/modules/configuration/configuration.schema.js";
import { ApiError } from "../src/shared/http.js";

const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const at = (time: string) => new Date(`1970-01-01T${time}:00Z`);
const period = (n: number, dayOfWeek: string, openTime: string, closeTime: string, isActive = true) => ({ id: id(n), dayOfWeek, openTime: at(openTime), closeTime: at(closeTime), isActive });

test("daily opening-hours requests validate open/closed state, times, record identities, and unknown fields", () => {
  const valid = { isOpen: true, periods: [{ id: id(1), openTime: "08:30:15", closeTime: "18:00" }] };
  assert.equal(dayHoursSchema.safeParse(valid).success, true);
  assert.equal(dayHoursSchema.safeParse({ isOpen: false, periods: [] }).success, true);
  for (const value of [{ isOpen: true, periods: [] }, { ...valid, isOpen: false }, { ...valid, extra: true },
    { ...valid, periods: [...valid.periods, ...valid.periods] }, { ...valid, periods: [{ openTime: "18:00", closeTime: "08:00" }] },
    { ...valid, periods: [{ openTime: "08:00", closeTime: "24:00" }] }, { ...valid, periods: [{ ...valid.periods[0], dayOfWeek: "TUESDAY" }] }]) {
    assert.equal(dayHoursSchema.safeParse(value).success, false);
  }
});

function fixture(booked = false, failOnUpdate = 0) {
  const state = {
    rows: [period(1, "MONDAY", "08:00", "12:00"), period(2, "MONDAY", "13:00", "18:00"), period(3, "TUESDAY", "09:00", "17:00"), period(4, "MONDAY", "07:00", "08:00", false)],
    audits: [] as any[], updates: 0, created: 0, events: [] as string[],
  };
  const tx = {
    $executeRaw: async () => 0,
    $queryRaw: async (sql: TemplateStringsArray) => {
      const query = sql.join("");
      state.events.push(query.includes("clock_timestamp") ? "clock" : query.includes("advisory_xact_lock(") ? "exclusive" : "actor-lock");
      return [{ epochMs: new Date("2030-01-06T00:00:00Z").getTime() }];
    },
    user: { findUnique: async () => ({ role: "ADMIN", isActive: true }) },
    salonOperatingHour: {
      findMany: async ({ where }: any) => state.rows.filter(row =>
        (where.isActive === undefined || row.isActive === where.isActive) &&
        (typeof where.dayOfWeek === "string" ? row.dayOfWeek === where.dayOfWeek : !where.dayOfWeek?.not || row.dayOfWeek !== where.dayOfWeek.not)),
      update: async ({ where, data }: any) => {
        if (++state.updates === failOnUpdate) throw new Error("Database write failed");
        const row = { ...state.rows.find(row => row.id === where.id)!, ...data };
        state.rows = state.rows.map(previous => previous.id === row.id ? row : previous);
        return row;
      },
      create: async ({ data }: any) => {
        const row = { id: id(10 + ++state.created), ...data };
        state.rows.push(row);
        return row;
      },
    },
    appointmentService: { findMany: async () => booked ? [{ id: "reservation", appointmentId: "booking", scheduledStartAt: new Date("2030-01-07T01:00:00Z"), reservedUntilAt: new Date("2030-01-07T01:45:00Z"), appointment: { bookingCode: "BUFFER-BOOKING", status: "CONFIRMED" } }] : [] },
    auditLog: { create: async ({ data }: any) => { state.audits.push(data); } },
  };
  const prisma = { $transaction: async (run: (client: typeof tx) => unknown) => {
    const rows = state.rows.map(row => ({ ...row }));
    const audits = [...state.audits];
    try { return await run(tx); } catch (error) { state.rows = rows; state.audits = audits; throw error; }
  } };
  return { state, service: createConfigurationService(prisma as unknown as PrismaClient, "Asia/Manila") };
}

test("closing a weekday deactivates every active period atomically without deleting history or touching other days", async () => {
  const { service, state } = fixture();
  await service.saveDayHours("admin", "MONDAY", { isOpen: false, periods: [] });
  assert.equal(state.rows.length, 4);
  assert.ok(state.rows.filter(row => row.dayOfWeek === "MONDAY").every(row => !row.isActive));
  assert.equal(state.rows.find(row => row.id === id(3))!.isActive, true);
  assert.equal(state.audits.length, 2);
  assert.deepEqual(state.events, ["exclusive", "actor-lock", "clock"]);
});

test("saving split hours preserves unchanged records and audits added/removed time ranges", async () => {
  const { service, state } = fixture();
  await service.saveDayHours("admin", "MONDAY", { isOpen: true, periods: [{ id: id(1), openTime: "08:00", closeTime: "12:00" }, { openTime: "14:00", closeTime: "17:00" }] });
  const active = state.rows.filter(row => row.dayOfWeek === "MONDAY" && row.isActive);
  assert.equal(active.length, 2);
  assert.equal(active[0]!.id, id(1));
  assert.equal(state.rows.find(row => row.id === id(2))!.isActive, false);
  assert.equal(state.audits.length, 2);
  assert.equal(state.created, 1);
});

test("reopening a matching inactive period reuses the existing record", async () => {
  const { service, state } = fixture();
  await service.saveDayHours("admin", "SUNDAY", { isOpen: false, periods: [] });
  await service.saveDayHours("admin", "MONDAY", { isOpen: true, periods: [{ openTime: "07:00", closeTime: "08:00" }] });
  assert.equal(state.created, 0);
  assert.equal(state.rows.find(row => row.id === id(4))!.isActive, true);
});

test("closing or shortening a day across a reservation buffer is rejected with no changes", async () => {
  for (const request of [{ isOpen: false, periods: [] }, { isOpen: true, periods: [{ id: id(1), openTime: "08:00", closeTime: "09:30" }] }]) {
    const { service, state } = fixture(true);
    const before = structuredClone(state.rows);
    await assert.rejects(service.saveDayHours("admin", "MONDAY", request), error => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, "RESERVATION_CONFLICT");
      assert.ok(JSON.stringify(error.details).includes("BUFFER-BOOKING"));
      return true;
    });
    assert.deepEqual(state.rows, before);
    assert.equal(state.audits.length, 0);
    assert.equal(state.updates, 0);
  }
});

test("foreign weekday identities and partial database failures cannot leave partially saved hours", async () => {
  const foreign = fixture();
  await assert.rejects(foreign.service.saveDayHours("admin", "MONDAY", { isOpen: true, periods: [{ id: id(3), openTime: "08:00", closeTime: "18:00" }] }), (error: any) => error.code === "INVALID_REFERENCE");
  assert.equal(foreign.state.updates, 0);
  const { service, state } = fixture(false, 2);
  const before = structuredClone(state.rows);
  await assert.rejects(service.saveDayHours("admin", "MONDAY", { isOpen: false, periods: [] }), /Database write failed/);
  assert.deepEqual(state.rows, before);
  assert.deepEqual(state.audits, []);
});
