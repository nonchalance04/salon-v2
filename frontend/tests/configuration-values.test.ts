import assert from "node:assert/strict";
import { test } from "node:test";
import { configurationBody, fieldEditValue } from "../src/components/Configuration/configuration-values.ts";

const zone = "Asia/Manila";

test("configuration editing preserves defaults, zero buffers, Decimal money, and clock seconds", () => {
  assert.equal(fieldEditValue({ key: "isActive", label: "Active", type: "active" }, undefined, zone), true);
  assert.equal(fieldEditValue({ key: "isActive", label: "Active", type: "active" }, false, zone), false);
  assert.equal(fieldEditValue({ key: "bufferMinutes", label: "Buffer", initial: "15" }, null, zone), "15");
  assert.equal(fieldEditValue({ key: "bufferMinutes", label: "Buffer", type: "number" }, 0, zone), "0");
  assert.equal(fieldEditValue({ key: "price", label: "Price", type: "money" }, "100.10", zone), "100.10");
  assert.equal(fieldEditValue({ key: "openTime", label: "Opens", type: "time" }, "1970-01-01T08:00:15.000Z", zone), "08:00:15");
  assert.equal(fieldEditValue({ key: "commissionRate", label: "Commission", type: "percent" }, "0.4", zone), "40");
});

test("configuration requests preserve nulls, booleans, numeric types, exact money strings, and commission precision", () => {
  assert.deepEqual(configurationBody([
    { key: "isActive", label: "Active", type: "active" },
    { key: "bufferMinutes", label: "Buffer", type: "number", optional: true },
    { key: "durationMinutes", label: "Duration", type: "number" },
    { key: "price", label: "Price", type: "money" },
    { key: "commissionRate", label: "Commission", type: "percent" },
  ], { isActive: false, bufferMinutes: "", durationMinutes: "30", price: "100.10", commissionRate: "40.25" }, zone), {
    isActive: false, bufferMinutes: null, durationMinutes: 30, price: "100.10", commissionRate: "0.4025",
  });
});

test("custom closure timestamps round-trip milliseconds in salon time and reject ambiguous local times", () => {
  const field = { key: "startsAt", label: "Starts", type: "datetime" as const };
  const instant = "2026-10-18T01:02:03.123Z";
  const local = fieldEditValue(field, instant, zone, true);
  assert.equal(local, "2026-10-18T09:02:03.123");
  assert.deepEqual(configurationBody([field], { startsAt: local }, zone), { startsAt: instant });
  for (const startsAt of ["2026-03-08T02:30", "2026-11-01T01:30"]) {
    assert.throws(() => configurationBody([field], { startsAt }, "America/New_York"), RangeError);
  }
});
