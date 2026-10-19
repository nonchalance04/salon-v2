import { z } from "zod";
import { Temporal } from "@js-temporal/polyfill";
export const reportKinds = ["appointments", "payments", "receipts", "commissions"];
export const reportQuery = z.object({
    from: z.iso.date(), to: z.iso.date(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
}).strict().refine(q => {
    try {
        return q.from <= q.to && Temporal.PlainDate.from(q.from).until(Temporal.PlainDate.from(q.to)).days < 366;
    }
    catch {
        return false;
    }
}, "Choose an ordered date range of at most 366 days.");
export const appointmentReportQuery = reportQuery.safeExtend({
    status: z.enum(["PENDING_PAYMENT", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW", "EXPIRED"]).optional(),
});
export const salesSummaryQuery = reportQuery.safeExtend({
    method: z.enum(["CASH", "GCASH", "QRPH", "OTHER"]).optional(),
    type: z.enum(["APPOINTMENT_FEE", "SERVICE_PAYMENT"]).optional(),
});
export const commissionSummaryQuery = reportQuery.safeExtend({ staffId: z.uuid().optional() });
export const confirmedServicesQuery = z.object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    search: z.string().trim().max(100).default(""),
    paymentReady: z.enum(["true", "false"]).optional(),
    arrivalToday: z.enum(["true", "false"]).optional(),
}).strict();
export function reportPeriod(q, timeZone) {
    const start = Temporal.PlainDate.from(q.from).toZonedDateTime(timeZone);
    const end = Temporal.PlainDate.from(q.to).add({ days: 1 }).toZonedDateTime(timeZone);
    return { gte: new Date(start.epochMilliseconds), lt: new Date(end.epochMilliseconds) };
}
//# sourceMappingURL=reports.schema.js.map