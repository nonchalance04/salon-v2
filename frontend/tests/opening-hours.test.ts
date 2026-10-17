import assert from "node:assert/strict";
import test from "node:test";
import { dayHours, dayHoursRequest } from "../src/components/OpeningHours/opening-hours.ts";

const morning = { id: "am", dayOfWeek: "MONDAY", openTime: "1970-01-01T08:30:15.000Z", closeTime: "1970-01-01T12:00:00.000Z", isActive: true };
const afternoon = { ...morning, id: "pm", openTime: "1970-01-01T13:00:00.000Z", closeTime: "1970-01-01T18:00:00.000Z" };

test("weekly editor preserves active split hours and salon-local wall times including seconds", () => {
  assert.deepEqual(dayHours([afternoon, { ...morning, id: "inactive", isActive: false }, morning]), {
    isOpen: true, periods: [{ id: "am", openTime: "08:30:15", closeTime: "12:00:00" }, { id: "pm", openTime: "13:00:00", closeTime: "18:00:00" }],
  });
});

test("closed and unconfigured days use the closed state without reactivating old inactive hours", () => {
  for (const rows of [[], [{ ...morning, isActive: false }]]) {
    assert.deepEqual(dayHours(rows), { isOpen: false, periods: [{ openTime: "08:00:00", closeTime: "22:00:00" }] });
  }
});

test("closed-day saves omit hidden times while keeping the editable draft intact", () => {
  const draft = { ...dayHours([morning, afternoon]), isOpen: false };
  assert.deepEqual(dayHoursRequest(draft), { isOpen: false, periods: [] });
  assert.equal(draft.periods.length, 2);
  assert.deepEqual(dayHoursRequest({ ...draft, isOpen: true }).periods, draft.periods);
});
