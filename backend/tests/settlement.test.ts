import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma, type PrismaClient } from "../generated/prisma/client.js";
import { createSettlementService } from "../src/modules/settlement/settlement.service.js";
import { allocateCommissions } from "../src/modules/settlement/commissions.js";
import { outcomesSchema, settlementSchema } from "../src/modules/settlement/settlement.schema.js";
const D = Prisma.Decimal;
const serviceId = "10000000-0000-4000-8000-000000000001";
function outcomeFixture(role: "ADMIN" | "CASHIER", outcome: "SCHEDULED" | "PERFORMED" | "NOT_PERFORMED") {
  const row = {
    id: "booking", bookingCode: "SL-test", status: "CONFIRMED", updatedAt: new Date("2026-10-21T00:00Z"),
    completedAt: null, completionType: null, startAt: new Date("2026-10-21T01:00Z"),
    customer: { firstName: "Test", lastName: "Guest" }, payments: [], commissionRecords: [],
    carriedAppointmentFeePaymentId: null,
    appointmentServices: [{ id: serviceId, staffId: "staff", updatedAt: new Date("2026-10-21T00:00Z"),
      outcome, actualChargedAmount: outcome === "SCHEDULED" ? null : new D(outcome === "PERFORMED" ? 120 : 0),
      priceSnapshot: new D(120), serviceNameSnapshot: "Haircut", staffFirstNameSnapshot: "Stylist", staffLastNameSnapshot: "Test", staff: null }],
  };
  let writes = 0;
  const tx = {
    $executeRaw: async () => 0, $queryRaw: async () => [],
    staff: { findMany: async () => [{ id: "staff" }] },
    user: { findUnique: async () => ({ id: role, role, isActive: true }) },
    appointment: { findUnique: async () => row, findUniqueOrThrow: async () => row },
    payment: { findMany: async () => [] },
    appointmentService: { update: async ({ data }: { data: { outcome: "PERFORMED" | "NOT_PERFORMED"; actualChargedAmount: Prisma.Decimal | string } }) => {
      writes++;
      Object.assign(row.appointmentServices[0]!, { ...data, actualChargedAmount: new D(data.actualChargedAmount), updatedAt: new Date("2026-10-21T00:01Z") });
    } },
  };
  return { service: createSettlementService({ $transaction: async (run: (client: typeof tx) => unknown) => run(tx) } as unknown as PrismaClient), row, writes: () => writes };
}

test("Admin and Cashier can record each outcome once and cannot overwrite either recorded outcome", async () => {
  for (const role of ["ADMIN", "CASHIER"] as const) {
    for (const outcome of ["PERFORMED", "NOT_PERFORMED"] as const) {
      const f = outcomeFixture(role, "SCHEDULED");
      const initial = await f.service.lookup(role, f.row.bookingCode);
      const input = { bookingCode: initial.bookingCode, revision: initial.revision, services: [{ id: serviceId, outcome }] };
      const saved = await f.service.outcomes(role, input);
      assert.equal(saved.services[0]!.outcome, outcome);
      assert.equal(saved.amountDue, outcome === "PERFORMED" ? "120.00" : "0.00");
      for (const actor of ["ADMIN", "CASHIER"]) {
        await assert.rejects(f.service.outcomes(actor, { ...input, revision: saved.revision, services: [{ id: serviceId, outcome: outcome === "PERFORMED" ? "NOT_PERFORMED" : "PERFORMED" }] }), { code: "SERVICE_OUTCOME_LOCKED" });
        const unchanged = await f.service.outcomes(actor, { ...input, revision: saved.revision });
        assert.equal(unchanged.revision, saved.revision);
      }
      assert.equal(f.writes(), 1);
      await assert.rejects(f.service.outcomes(role, input), { code: "STALE_SETTLEMENT" });
      assert.equal(f.row.status, "CONFIRMED");
    }
  }
});
function item(id: string, amount: string, sequenceNo = 1, rate = "0.4000") { return { id, staffId: id, sequenceNo, priceSnapshot: new D(amount), actualChargedAmount: new D(amount), commissionRateSnapshot: new D(rate) }; }
test("proportional Decimal allocation and commissions reconcile to the cent", () => {
  const result = allocateCommissions([item("a", "500.00"), item("b", "1000.00", 2)], new D(100));
  assert.deepEqual(result.map(r => [r.allocatedAppointmentFee.toFixed(2), r.commissionAmount.toFixed(2)]), [["33.33", "213.33"], ["66.67", "426.67"]]);
});
test("positive and negative rounding remainder uses amount, sequence and ID deterministically", () => {
  for (const [fee, expected] of [["0.01", ["0.00", "0.01", "0.00"]], ["0.02", ["0.01", "0.00", "0.01"]]] as const) {
    const result = allocateCommissions([item("z", "1.00", 2), item("a", "1.00", 1), item("b", "1.00", 1)], new D(fee));
    assert.deepEqual(result.map(r => r.allocatedAppointmentFee.toFixed(2)), expected);
  }
  const result = allocateCommissions([item("z", "2.00", 3), item("a", "1.00", 1), item("b", "1.00", 2)], new D("0.01"));
  assert.equal(result[0]!.allocatedAppointmentFee.toFixed(2), "0.01");
});
test("zero fee, half-up rounding, invalid charges and rates", () => {
  assert.equal(allocateCommissions([item("a", "0.05", 1, "0.1000")], new D(0))[0]!.commissionAmount.toFixed(2), "0.01");
  assert.throws(() => allocateCommissions([item("a", "0.00")], new D(100)));
  assert.throws(() => allocateCommissions([item("a", "1.00", 1, "1.1")], new D(100)));
  assert.throws(() => allocateCommissions([], new D(100)));
});
test("external settlement inputs reject numeric money, extra fields and invalid outcomes", () => {
  assert.equal(settlementSchema.safeParse({ amount: 1 }).success, false);
  assert.equal(outcomesSchema.safeParse({ services: [{ outcome: "REMOVED" }] }).success, false);
});

test("service payments accept automatic references while validating supplied legacy references", () => {
  const input = { bookingCode: "SL-test", revision: "a".repeat(64), idempotencyKey: "10000000-0000-4000-8000-000000000001", amount: "100.00", currency: "PHP" };
  for (const method of ["CASH", "GCASH", "OTHER"]) {
    assert.ok(settlementSchema.safeParse({ ...input, method }).success);
    assert.equal(settlementSchema.safeParse({ ...input, method, externalReference: " " }).success, false);
  }
});
