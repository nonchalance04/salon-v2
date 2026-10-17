import assert from "node:assert/strict";
import test from "node:test";
import { allDayClosureDate } from "../src/components/Configuration/closure-date.ts";

test("all-day closures display and edit as a date in salon time, not UTC or browser time", () => {
  assert.equal(allDayClosureDate("2026-10-17T16:00:00Z", "2026-10-18T16:00:00Z", "Asia/Manila"), "2026-10-18");
  assert.equal(allDayClosureDate("2026-12-31T16:00:00Z", "2027-01-01T16:00:00Z", "Asia/Manila"), "2027-01-01");
});

test("partial-day, multi-day, and almost-all-day historical closures keep their original interval", () => {
  for (const [start, end] of [
    ["2026-10-18T01:00:00Z", "2026-10-18T04:00:00Z"],
    ["2026-10-17T16:00:00Z", "2026-10-19T16:00:00Z"],
    ["2026-10-17T16:00:00Z", "2026-10-18T15:59:59.999Z"],
  ]) assert.equal(allDayClosureDate(start, end, "Asia/Manila"), null);
});

test("whole-day closure recognition handles daylight-saving calendar boundaries", () => {
  assert.equal(allDayClosureDate("2026-03-08T05:00:00Z", "2026-03-09T04:00:00Z", "America/New_York"), "2026-03-08");
  assert.equal(allDayClosureDate("2026-11-01T04:00:00Z", "2026-11-02T05:00:00Z", "America/New_York"), "2026-11-01");
});
