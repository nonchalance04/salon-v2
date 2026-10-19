import { Prisma } from "../../../generated/prisma/client.js";
import { reportPeriod } from "./reports.schema.js";
const moneyFields = ["appointmentFees", "servicePayments", "collected", "returned", "netCollections"];
function serialize(row) {
    return { ...row, appointmentFees: row.appointmentFees.toFixed(2), servicePayments: row.servicePayments.toFixed(2),
        collected: row.collected.toFixed(2), returned: row.returned.toFixed(2), netCollections: row.netCollections.toFixed(2) };
}
// Called inside the report service's authorized, repeatable-read transaction.
export async function readSalesSummary(tx, q, timeZone) {
    const period = reportPeriod(q, timeZone);
    const filters = Prisma.sql `${q.method ? Prisma.sql `AND p.method::text = ${q.method}` : Prisma.empty}
    ${q.type ? Prisma.sql `AND p.type::text = ${q.type}` : Prisma.empty}`;
    // Each capture/return contributes exactly once. A carried booking fee is a reference,
    // not another Payment. Returns belong to their recorded return date, even when
    // the original capture is outside this report's period.
    const events = Prisma.sql `WITH events AS (
    SELECT p.id, p."appointmentId", p.currency, p.type, p.method, p.amount, p."reconciliationStatus",
      p."paidAt" AS "eventAt", 'COLLECTED'::text AS "eventType"
    FROM "Payment" p
    WHERE p.status IN ('SUCCEEDED', 'REFUNDED') AND p."paidAt" >= ${period.gte} AND p."paidAt" < ${period.lt} ${filters}
    UNION ALL
    SELECT p.id, p."appointmentId", p.currency, p.type, p.method, p.amount, p."reconciliationStatus",
      p."refundedAt" AS "eventAt", 'RETURNED'::text AS "eventType"
    FROM "Payment" p
    WHERE p.status = 'REFUNDED' AND p."refundedAt" >= ${period.gte} AND p."refundedAt" < ${period.lt} ${filters}
  )`;
    const daily = await tx.$queryRaw(Prisma.sql `${events}
    SELECT to_char("eventAt" AT TIME ZONE ${timeZone}, 'YYYY-MM-DD') AS date, currency,
      (count(*) FILTER (WHERE "eventType" = 'COLLECTED'))::int AS "successfulPayments",
      (count(*) FILTER (WHERE "eventType" = 'RETURNED'))::int AS "returnedPayments",
      coalesce(sum(amount) FILTER (WHERE "eventType" = 'COLLECTED' AND type = 'APPOINTMENT_FEE'), 0) AS "appointmentFees",
      coalesce(sum(amount) FILTER (WHERE "eventType" = 'COLLECTED' AND type = 'SERVICE_PAYMENT'), 0) AS "servicePayments",
      coalesce(sum(amount) FILTER (WHERE "eventType" = 'COLLECTED'), 0) AS collected,
      coalesce(sum(amount) FILTER (WHERE "eventType" = 'RETURNED'), 0) AS returned,
      sum(CASE WHEN "eventType" = 'COLLECTED' THEN amount ELSE -amount END) AS "netCollections"
    FROM events GROUP BY date, currency ORDER BY date DESC, currency ASC`);
    const totals = new Map();
    for (const row of daily) {
        let total = totals.get(row.currency);
        if (!total) {
            total = { date: "", currency: row.currency, successfulPayments: 0, returnedPayments: 0,
                appointmentFees: new Prisma.Decimal(0), servicePayments: new Prisma.Decimal(0),
                collected: new Prisma.Decimal(0), returned: new Prisma.Decimal(0), netCollections: new Prisma.Decimal(0) };
            totals.set(row.currency, total);
        }
        total.successfulPayments += row.successfulPayments;
        total.returnedPayments += row.returnedPayments;
        for (const field of moneyFields)
            total[field] = total[field].plus(row[field]);
    }
    const totalMovements = daily.reduce((count, row) => count + row.successfulPayments + row.returnedPayments, 0);
    const transactions = await tx.$queryRaw(Prisma.sql `${events}
    SELECT e.id, a."bookingCode", e."eventAt", e."eventType", e.type::text, e.method::text,
      e.currency, e.amount, e."reconciliationStatus"::text
    FROM events e JOIN "Appointment" a ON a.id = e."appointmentId"
    ORDER BY e."eventAt" DESC, e.id DESC, e."eventType" ASC
    LIMIT ${q.pageSize} OFFSET ${(q.page - 1) * q.pageSize}`);
    return {
        from: q.from, to: q.to, timeZone,
        rows: daily.map(serialize), totals: [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency)).map(serialize),
        transactions: transactions.map(row => ({ ...row, amount: row.amount.toFixed(2) })),
        totalMovements, page: q.page, pageSize: q.pageSize,
    };
}
//# sourceMappingURL=sales-summary.service.js.map