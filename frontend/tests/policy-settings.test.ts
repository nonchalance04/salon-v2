import assert from "node:assert/strict";
import test from "node:test";
import { policyTimeline, policyValuesEqual, type PolicyRecord } from "../src/components/AppointmentSettings/policy-settings.ts";

const policy: PolicyRecord = {
  id: "current", version: 2, effectiveFrom: "2026-10-18T00:00:00Z",
  appointmentFeeAmount: "100.00", bookingHoldMinutes: 10, defaultBufferMinutes: 15,
  maxReschedules: 2, rescheduleCutoffHours: 4, cancellationCutoffHours: 4,
  noShowGraceHours: 72, advanceBookingDays: 30, minimumBookingLeadMinutes: 60,
};

test("current, scheduled, and historical settings follow effective time including the activation boundary", () => {
  const old = { ...policy, id: "old", version: 1, effectiveFrom: "2026-10-01T00:00:00Z" };
  const next = { ...policy, id: "next", version: 4, effectiveFrom: "2026-10-19T00:00:00Z" };
  const later = { ...policy, id: "later", version: 3, effectiveFrom: "2026-10-20T00:00:00Z" };
  const records = [later, old, next, policy];
  const result = policyTimeline(records, Date.parse(policy.effectiveFrom));
  assert.equal(result.current, policy);
  assert.deepEqual(result.scheduled, [next, later]);
  assert.deepEqual(result.history, [old]);
  assert.equal(policyTimeline(records, Date.parse(next.effectiveFrom)).current, next);
  assert.deepEqual(records, [later, old, next, policy]);
});

test("empty and future-only configuration do not present future settings as active", () => {
  assert.equal(policyTimeline([], Date.now()).current, undefined);
  const result = policyTimeline([policy], Date.parse(policy.effectiveFrom) - 1);
  assert.equal(result.current, undefined);
  assert.deepEqual(result.scheduled, [policy]);
  assert.deepEqual(result.history, []);
});

test("unchanged settings compare numeric values, including Decimal money formatting and zero buffers", () => {
  assert.equal(policyValuesEqual(policy, { ...policy, appointmentFeeAmount: "100", bookingHoldMinutes: "10" }), true);
  assert.equal(policyValuesEqual({ ...policy, defaultBufferMinutes: 0 }, { ...policy, defaultBufferMinutes: "0" }), true);
  for (const key of ["appointmentFeeAmount", "bookingHoldMinutes", "defaultBufferMinutes", "maxReschedules", "rescheduleCutoffHours", "cancellationCutoffHours", "noShowGraceHours", "advanceBookingDays", "minimumBookingLeadMinutes"] as const) {
    assert.equal(policyValuesEqual(policy, { ...policy, [key]: Number(policy[key]) + 1 }), false);
    assert.equal(policyValuesEqual(policy, { ...policy, [key]: "" }), false);
  }
});

test("scheduling a return to today's settings is a real change after an intervening scheduled update", () => {
  const next = { ...policy, id: "next", version: 3, effectiveFrom: "2026-10-19T00:00:00Z", appointmentFeeAmount: "150.00" };
  const applicable = policyTimeline([policy, next], Date.parse("2026-10-20T00:00:00Z")).current!;
  assert.equal(policyValuesEqual(policy, applicable), false);
  assert.equal(policyValuesEqual(next, applicable), true);
});
