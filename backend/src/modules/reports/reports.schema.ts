// Bring in the tools for salon reports so this file can work with the rest of the application.
import { z } from "zod";
import { Temporal } from "@js-temporal/polyfill";
// Define the accepted salon reports details so unexpected or incomplete input can be rejected.
export const reportKinds = ["appointments", "payments", "receipts", "commissions"] as const;
export const reportQuery = z.object({
  from: z.iso.date(), to: z.iso.date(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
}).strict().refine(q => {
  try { return q.from <= q.to && Temporal.PlainDate.from(q.from).until(Temporal.PlainDate.from(q.to)).days < 366; }
  catch { return false; }
},
  "Choose an ordered date range of at most 366 days.");
// Describe the information used by salon reports so different parts of the application agree on its contents.
export type ReportQuery = z.infer<typeof reportQuery>;
// Define the accepted salon reports details so unexpected or incomplete input can be rejected.
export const appointmentReportQuery = reportQuery.safeExtend({
  status: z.enum(["PENDING_PAYMENT", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW", "EXPIRED"]).optional(),
});
// Describe the information used by salon reports so different parts of the application agree on its contents.
export type AppointmentReportQuery = z.infer<typeof appointmentReportQuery>;
// Define the accepted salon reports details so unexpected or incomplete input can be rejected.
export const salesSummaryQuery = reportQuery.safeExtend({
  method: z.enum(["CASH", "GCASH", "QRPH", "OTHER"]).optional(),
  type: z.enum(["APPOINTMENT_FEE", "SERVICE_PAYMENT"]).optional(),
});
// Describe the information used by salon reports so different parts of the application agree on its contents.
export type SalesSummaryQuery = z.infer<typeof salesSummaryQuery>;
// Define the accepted salon reports details so unexpected or incomplete input can be rejected.
export const commissionSummaryQuery = reportQuery.safeExtend({ staffId: z.uuid().optional() });
// Describe the information used by salon reports so different parts of the application agree on its contents.
export type CommissionSummaryQuery = z.infer<typeof commissionSummaryQuery>;
// Define the accepted salon reports details so unexpected or incomplete input can be rejected.
export const confirmedServicesQuery = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(100).default(""),
  paymentReady: z.enum(["true", "false"]).optional(),
  arrivalToday: z.enum(["true", "false"]).optional(),
}).strict();
// Describe the information used by salon reports so different parts of the application agree on its contents.
export type ConfirmedServicesQuery = z.infer<typeof confirmedServicesQuery>;
// Convert the selected report dates to the salon reporting period so records fall on the correct local days.
export function reportPeriod(q: ReportQuery, timeZone: string) {
  const start = Temporal.PlainDate.from(q.from).toZonedDateTime(timeZone);
  const end = Temporal.PlainDate.from(q.to).add({ days: 1 }).toZonedDateTime(timeZone);
  return { gte: new Date(start.epochMilliseconds), lt: new Date(end.epochMilliseconds) };
}
