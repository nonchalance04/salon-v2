// Bring in the tools for salon reports so this file can work with the rest of the application.
import { Prisma } from "../../../generated/prisma/client.js";
import { reportPeriod, type CommissionSummaryQuery } from "./reports.schema.js";

// Describe the information used by salon reports so different parts of the application agree on its contents.
type StaffOption = { staffId: string; name: string; state: "Active" | "Inactive" | "Former staff" };
type SummaryRow = { staffId: string; name: string; currency: string; serviceCount: number; commissionBase: Prisma.Decimal; commissionAmount: Prisma.Decimal };
// Combine the available name parts so the person can be identified in the report.
const fullName = (first: string, last: string) => `${first} ${last}`.trim();

// Runs within the parent report service's authorized repeatable-read transaction.
export async function readCommissionSummary(tx: Prisma.TransactionClient, q: CommissionSummaryQuery, timeZone: string) {
  const period = reportPeriod(q, timeZone);
  const liveStaff = await tx.staff.findMany({ select: { id: true, firstName: true, lastName: true, isActive: true } });
  // Keep former staff selectable even if this period has no records for them.
  const historicalStaff = await tx.$queryRaw<{ staffId: string; firstName: string; lastName: string }[]>(Prisma.sql`
    SELECT DISTINCT ON ("staffId") "staffId", "staffFirstNameSnapshot" AS "firstName", "staffLastNameSnapshot" AS "lastName"
    FROM "CommissionRecord" ORDER BY "staffId", "finalizedAt" DESC, id DESC`);
  const options = new Map<string, StaffOption>(liveStaff.map(staff => [staff.id, {
    staffId: staff.id, name: fullName(staff.firstName, staff.lastName), state: staff.isActive ? "Active" : "Inactive",
  }]));
  for (const staff of historicalStaff) {
    const existing = options.get(staff.staffId);
    options.set(staff.staffId, { staffId: staff.staffId,
      name: fullName(staff.firstName, staff.lastName) || existing?.name || "Former staff",
      state: existing?.state ?? "Former staff" });
  }
  const staffOptions = [...options.values()].sort((a, b) => a.name.localeCompare(b.name) || a.staffId.localeCompare(b.staffId));
  // Group by preserved staff identity, not display name. Source payment supplies
  // currency only; its current status must not rewrite finalized commissions.
  const rows = await tx.$queryRaw<SummaryRow[]>(Prisma.sql`
    SELECT c."staffId", p.currency, count(*)::int AS "serviceCount",
      (array_agg(btrim(concat_ws(' ', c."staffFirstNameSnapshot", c."staffLastNameSnapshot")) ORDER BY c."finalizedAt" DESC, c.id DESC))[1] AS name,
      sum(c."commissionBase") AS "commissionBase", sum(c."commissionAmount") AS "commissionAmount"
    FROM "CommissionRecord" c JOIN "Payment" p ON p.id = c."sourcePaymentId"
    WHERE c."finalizedAt" >= ${period.gte} AND c."finalizedAt" < ${period.lt}
      ${q.staffId ? Prisma.sql`AND c."staffId" = ${q.staffId}::uuid` : Prisma.empty}
    GROUP BY c."staffId", p.currency ORDER BY name ASC, c."staffId" ASC, p.currency ASC`);
  const totals = new Map<string, { currency: string; serviceCount: number; commissionBase: Prisma.Decimal; commissionAmount: Prisma.Decimal }>();
  for (const row of rows) {
    const total = totals.get(row.currency) ?? { currency: row.currency, serviceCount: 0, commissionBase: new Prisma.Decimal(0), commissionAmount: new Prisma.Decimal(0) };
    total.serviceCount += row.serviceCount;
    total.commissionBase = total.commissionBase.plus(row.commissionBase);
    total.commissionAmount = total.commissionAmount.plus(row.commissionAmount);
    totals.set(row.currency, total);
  }
  const where = { finalizedAt: period, ...(q.staffId ? { staffId: q.staffId } : {}) };
  const details = await tx.commissionRecord.findMany({ where, skip: (q.page - 1) * q.pageSize, take: q.pageSize,
    orderBy: [{ finalizedAt: "desc" }, { id: "desc" }], select: {
      id: true, staffId: true, staffFirstNameSnapshot: true, staffLastNameSnapshot: true, finalizedAt: true,
      commissionBase: true, commissionRate: true, commissionAmount: true,
      appointment: { select: { bookingCode: true } }, appointmentService: { select: {
        staffId: true, serviceNameSnapshot: true, staffFirstNameSnapshot: true, staffLastNameSnapshot: true,
        performerAssignments: { orderBy: { sequence: "desc" }, take: 1, select: {
          reason: true, customerAgreed: true, recordedAt: true, recordedByUserId: true,
          recordedBy: { select: { firstName: true, lastName: true, role: true } },
        } },
      } },
      sourcePayment: { select: { currency: true, recordedBy: { select: { id: true, firstName: true, lastName: true, role: true } } } },
    } });
  return {
    from: q.from, to: q.to, timeZone, staffOptions,
    rows: rows.map(row => ({ ...row, name: row.name || options.get(row.staffId)?.name || "Former staff",
      state: options.get(row.staffId)?.state ?? "Former staff",
      commissionBase: row.commissionBase.toFixed(2), commissionAmount: row.commissionAmount.toFixed(2) })),
    totals: [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency)).map(row => ({ ...row,
      commissionBase: row.commissionBase.toFixed(2), commissionAmount: row.commissionAmount.toFixed(2) })),
    details: details.map(row => {
      const assignment = row.appointmentService.performerAssignments[0];
      const paymentRecorder = row.sourcePayment.recordedBy;
      return { id: row.id, staffId: row.staffId,
      name: fullName(row.staffFirstNameSnapshot, row.staffLastNameSnapshot) || options.get(row.staffId)?.name || "Former staff",
      state: options.get(row.staffId)?.state ?? "Former staff", finalizedAt: row.finalizedAt,
      bookingCode: row.appointment.bookingCode, serviceName: row.appointmentService.serviceNameSnapshot,
      bookedStaffId: row.appointmentService.staffId,
      bookedStaffName: fullName(row.appointmentService.staffFirstNameSnapshot, row.appointmentService.staffLastNameSnapshot) || "Former staff",
      paymentRecordedBy: paymentRecorder ? { id: paymentRecorder.id, name: fullName(paymentRecorder.firstName, paymentRecorder.lastName), role: paymentRecorder.role } : null,
      replacement: assignment ? {
        reason: assignment.reason, customerAgreed: assignment.customerAgreed,
        recordedAt: assignment.recordedAt, recordedByUserId: assignment.recordedByUserId,
        recordedByName: fullName(assignment.recordedBy.firstName, assignment.recordedBy.lastName),
        recordedByRole: assignment.recordedBy.role,
      } : null,
      currency: row.sourcePayment.currency, commissionBase: row.commissionBase.toFixed(2),
      commissionRate: row.commissionRate.mul(100).toFixed(2), commissionAmount: row.commissionAmount.toFixed(2) };
    }),
    total: rows.reduce((count, row) => count + row.serviceCount, 0), page: q.page, pageSize: q.pageSize,
  };
}
