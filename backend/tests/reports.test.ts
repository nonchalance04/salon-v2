import assert from "node:assert/strict";
import { test } from "node:test";
import { appointmentReportQuery, commissionSummaryQuery, confirmedServicesQuery, reportQuery, reportPeriod, reportKinds, salesSummaryQuery } from "../src/modules/reports/reports.schema.js";

test("report dates use inclusive salon days, including DST boundaries", () => {
  const q = reportQuery.parse({ from: "2026-10-04", to: "2026-10-04" });
  assert.deepEqual(reportPeriod(q, "Asia/Manila"), { gte: new Date("2026-10-03T16:00:00Z"), lt: new Date("2026-10-04T16:00:00Z") });
  const dst = reportPeriod({ ...q, from: "2026-03-08", to: "2026-03-08" }, "America/New_York");
  assert.equal(+dst.lt - +dst.gte, 23 * 3600000);
});
test("report queries reject invalid dates, unbounded ranges and invalid pagination", () => {
  for (const q of [{ from: "2026-02-30", to: "2026-03-01" }, { from: "2026-10-04", to: "2026-10-03" }, { from: "2025-01-01", to: "2026-01-02" }, { from: "2026-01-01", to: "2026-01-02", page: 0 }, { from: "2026-01-01", to: "2026-01-02", pageSize: 101 }, { from: "2026-01-01", to: "2026-01-02", role: "ADMIN" }]) assert.equal(reportQuery.safeParse(q).success, false);
});
test("MVP report kinds exclude audit history", () => {
  assert.deepEqual(reportKinds, ["appointments", "payments", "receipts", "commissions"]);
});
test("commission report validates historical staff identity and bounded periods", () => {
  const dates = { from: "2026-10-04", to: "2026-10-04" };
  const staffId = "53b680a5-49d7-4f7a-a642-8450263d8398";
  assert.equal(commissionSummaryQuery.parse({ ...dates, staffId }).staffId, staffId);
  assert.equal(commissionSummaryQuery.parse(dates).staffId, undefined);
  for (const extra of [{ staffId: "invalid" }, { staffId: "" }, { page: 0 }, { to: "2026-10-03" }, { paid: true }]) {
    assert.equal(commissionSummaryQuery.safeParse({ ...dates, ...extra }).success, false);
  }
});
test("sales summary validates method, type, date bounds and pagination", () => {
  const dates = { from: "2026-10-04", to: "2026-10-04" };
  assert.equal(salesSummaryQuery.parse({ ...dates, method: "QRPH", type: "SERVICE_PAYMENT" }).method, "QRPH");
  assert.equal(salesSummaryQuery.parse(dates).method, undefined);
  for (const extra of [{ method: "UNKNOWN" }, { type: "UNKNOWN" }, { status: "FAILED" }, { page: 0 }, { to: "2026-10-03" }]) {
    assert.equal(salesSummaryQuery.safeParse({ ...dates, ...extra }).success, false);
  }
});
test("appointment report accepts only valid status filters and retains date bounds", () => {
  const dates = { from: "2026-10-04", to: "2026-10-04" };
  assert.equal(appointmentReportQuery.parse({ ...dates, status: "NO_SHOW" }).status, "NO_SHOW");
  assert.equal(appointmentReportQuery.parse(dates).status, undefined);
  assert.equal(appointmentReportQuery.safeParse({ ...dates, status: "UNKNOWN" }).success, false);
  assert.equal(appointmentReportQuery.safeParse({ ...dates, to: "2026-10-03" }).success, false);
  assert.equal(reportQuery.safeParse({ ...dates, status: "CONFIRMED" }).success, false);
});

test("confirmed services default to bounded pages without requiring a booking code or date", () => {
  assert.deepEqual(confirmedServicesQuery.parse({}), { page: 1, pageSize: 25, search: "" });
  assert.equal(confirmedServicesQuery.parse({ search: " Jamie Santos " }).search, "Jamie Santos");
  for (const value of [{ page: 0 }, { pageSize: 101 }, { search: "x".repeat(101) }, { status: "COMPLETED" }]) assert.equal(confirmedServicesQuery.safeParse(value).success, false);
});
