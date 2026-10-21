// Bring in the tools for salon reports so this file can work with the rest of the application.
import { freshTime } from "../scheduling/coordination.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { Temporal } from "@js-temporal/polyfill";
import { ApiError } from "../../shared/http.js";
import { reportPeriod } from "./reports.schema.js";
import { readSalesSummary } from "./sales-summary.service.js";
import { readCommissionSummary } from "./commission-summary.service.js";
// Convert the stored amount to a display value so reports present money consistently.
const amount = (n) => (n ?? new Prisma.Decimal(0)).toFixed(2);
const booking = { select: { bookingCode: true } };
// Match a booking code or every word in the customer's name, in any order.
function customerSearch(search) {
    if (!search)
        return {};
    const nameWords = search.split(/\s+/).map(word => ({
        OR: [
            { customer: { firstName: { contains: word, mode: "insensitive" } } },
            { customer: { lastName: { contains: word, mode: "insensitive" } } },
        ],
    }));
    return {
        OR: [
            { bookingCode: { contains: search, mode: "insensitive" } },
            { AND: nameWords },
        ],
    };
}
// Gather report queries so staff can review the salon using saved appointment and payment records.
export function createReportsService(prisma, timeZone) {
    // Read the requested saved records so the caller can present their current details.
    async function read(actorId, admin, operation) {
        // Keep the related database changes together so a failure leaves the earlier records intact.
        return prisma.$transaction(async (tx) => {
            const actor = await tx.user.findUnique({ where: { id: actorId }, select: { role: true, isActive: true } });
            if (!actor?.isActive)
                throw new ApiError(401, "UNAUTHORIZED", "Please sign in again.");
            if (admin && actor.role !== "ADMIN")
                throw new ApiError(403, "FORBIDDEN", "Administrator access is required.");
            return operation(tx);
        }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    }
    return {
        // Collect the sales totals for the selected period so staff can review the recorded business activity.
        salesSummary(actorId, q) {
            return read(actorId, true, tx => readSalesSummary(tx, q, timeZone));
        },
        // Collect the commission totals for the selected period so administrators can review staff earnings.
        commissionSummary(actorId, q) {
            return read(actorId, true, tx => readCommissionSummary(tx, q, timeZone));
        },
        // Group received payments into collection totals so staff can review how money was collected.
        collections(actorId, q) {
            return read(actorId, false, async (tx) => {
                const period = reportPeriod(q, timeZone);
                // Query Payment directly: joining carried credits, receipts or commissions would multiply money.
                const captures = await tx.payment.groupBy({ by: ["currency", "type", "method", "status", "satisfiesObligation", "reconciliationStatus"],
                    where: { status: { in: ["SUCCEEDED", "REFUNDED"] }, paidAt: period }, orderBy: [{ currency: "asc" }, { type: "asc" }, { method: "asc" }, { status: "asc" }, { satisfiesObligation: "asc" }, { reconciliationStatus: "asc" }], _sum: { amount: true }, _count: { _all: true } });
                const refunds = await tx.payment.groupBy({ by: ["currency", "method", "type"], where: { status: "REFUNDED", refundedAt: period }, _sum: { amount: true }, _count: { _all: true } });
                const currencies = [...new Set([...captures, ...refunds].map(r => r.currency))].sort();
                return { from: q.from, to: q.to, timeZone, basis: "Collections use capture time. Net movement reflects recorded payment adjustments. Dates are inclusive in salon time. Carried credits are not new collections.",
                    totals: currencies.map(currency => {
                        const rows = captures.filter(r => r.currency === currency);
                        // Add the matching recorded amounts so the report can show their combined total.
                        const sum = (selected) => selected.reduce((n, r) => n.plus(r._sum.amount ?? 0), new Prisma.Decimal(0));
                        const gross = sum(rows);
                        const refunded = refunds.filter(r => r.currency === currency).reduce((n, r) => n.plus(r._sum.amount ?? 0), new Prisma.Decimal(0));
                        return { currency, captured: amount(gross), refunded: amount(refunded), netCashMovement: amount(gross.minus(refunded)),
                            successfulApplied: amount(sum(rows.filter(r => r.status === "SUCCEEDED" && r.satisfiesObligation))),
                            successfulUnapplied: amount(sum(rows.filter(r => r.status === "SUCCEEDED" && !r.satisfiesObligation))),
                            reconciliationRequired: amount(sum(rows.filter(r => r.status === "SUCCEEDED" && r.reconciliationStatus === "REQUIRED"))) };
                    }),
                    methodTotals: currencies.flatMap(currency => ["CASH", "GCASH", "OTHER", "QRPH"].map(method => {
                        const captured = captures.filter(r => r.currency === currency && r.method === method).reduce((n, r) => n.plus(r._sum.amount ?? 0), new Prisma.Decimal(0));
                        const refunded = refunds.filter(r => r.currency === currency && r.method === method).reduce((n, r) => n.plus(r._sum.amount ?? 0), new Prisma.Decimal(0));
                        return { currency, method, captured: amount(captured), refunded: amount(refunded), netCashMovement: amount(captured.minus(refunded)) };
                    })),
                    typeTotals: currencies.flatMap(currency => ["APPOINTMENT_FEE", "SERVICE_PAYMENT"].map(type => {
                        const rows = captures.filter(r => r.currency === currency && r.type === type);
                        return { currency, type, captured: amount(rows.reduce((n, r) => n.plus(r._sum.amount ?? 0), new Prisma.Decimal(0))), count: rows.reduce((n, r) => n + r._count._all, 0) };
                    })),
                    breakdown: captures.map(({ _sum, _count, ...row }) => ({ ...row, amount: amount(_sum.amount), count: _count._all })), };
            });
        },
        // Find the visits waiting for service so staff can see the current customer queue.
        waitingQueue(actorId, q) {
            return read(actorId, false, async (tx) => {
                const now = await freshTime(tx);
                const where = {
                    status: "CONFIRMED", checkedInAt: { not: null }, completedAt: null, completionType: null,
                    appointmentServices: {
                        some: { membershipStatus: "ACTIVE" },
                        none: { membershipStatus: "ACTIVE", OR: [
                                { outcome: { not: "SCHEDULED" } }, { outcomeFinalizedAt: { not: null } },
                            ] },
                    },
                    ...customerSearch(q.search),
                };
                const total = await tx.appointment.count({ where });
                const rows = await tx.appointment.findMany({ where, skip: (q.page - 1) * q.pageSize, take: q.pageSize,
                    orderBy: [{ checkedInAt: "asc" }, { id: "asc" }], select: {
                        bookingCode: true, startAt: true, endAt: true, checkedInAt: true,
                        checkedInByUser: { select: { firstName: true, lastName: true } },
                        customer: { select: { firstName: true, lastName: true } },
                        appointmentServices: { where: { membershipStatus: "ACTIVE" }, orderBy: { sequenceNo: "asc" }, select: {
                                id: true, serviceNameSnapshot: true, staff: { select: { firstName: true, lastName: true } },
                            } },
                    } });
                return { timeZone, serverTime: now.toISOString(), page: q.page, pageSize: q.pageSize, total,
                    rows: rows.map(row => ({ ...row,
                        minutesSinceCheckIn: Math.max(0, Math.floor((+now - +row.checkedInAt) / 60_000)),
                        needsReview: row.endAt <= now, })) };
            });
        },
        // Find the confirmed service records so staff can review scheduled and recorded service outcomes.
        confirmedServices(actorId, q) {
            return read(actorId, false, async (tx) => {
                const today = q.arrivalToday === "true"
                    ? Temporal.Instant.fromEpochMilliseconds(+(await freshTime(tx))).toZonedDateTimeISO(timeZone).toPlainDate().toString()
                    : null;
                const where = {
                    status: "CONFIRMED", completedAt: null, completionType: null,
                    ...(today ? {
                        startAt: reportPeriod({ from: today, to: today, page: q.page, pageSize: q.pageSize }, timeZone),
                        AND: [{ appointmentServices: {
                                    some: { membershipStatus: "ACTIVE" },
                                    none: { membershipStatus: "ACTIVE", OR: [
                                            { outcome: { not: "SCHEDULED" } }, { outcomeFinalizedAt: { not: null } },
                                        ] },
                                } }],
                    } : {}),
                    ...(q.paymentReady === "true" ? { appointmentServices: {
                            some: { membershipStatus: "ACTIVE", outcome: "PERFORMED", actualChargedAmount: { gt: 0 } },
                            none: { membershipStatus: "ACTIVE", outcome: "SCHEDULED" },
                        } } : {}),
                    ...customerSearch(q.search),
                };
                const total = await tx.appointment.count({ where });
                const rows = await tx.appointment.findMany({ where, skip: (q.page - 1) * q.pageSize, take: q.pageSize,
                    orderBy: [{ startAt: "asc" }, { id: "asc" }], select: {
                        bookingCode: true, startAt: true, checkedInAt: true,
                        checkedInByUser: { select: { firstName: true, lastName: true } },
                        customer: { select: { firstName: true, lastName: true } },
                        appointmentServices: { where: { membershipStatus: "ACTIVE" }, orderBy: { sequenceNo: "asc" }, select: {
                                id: true, serviceNameSnapshot: true, priceSnapshot: true, outcome: true,
                                staffFirstNameSnapshot: true, staffLastNameSnapshot: true,
                                staff: { select: { firstName: true, lastName: true } },
                            } },
                    } });
                return { timeZone, page: q.page, pageSize: q.pageSize, total,
                    rows: rows.map(row => ({ ...row, appointmentServices: row.appointmentServices.map(({ staffFirstNameSnapshot, staffLastNameSnapshot, ...service }) => ({ ...service,
                            staff: service.staff ?? { firstName: staffFirstNameSnapshot || "Former staff", lastName: staffLastNameSnapshot },
                            priceSnapshot: service.priceSnapshot.toFixed(2) })) })) };
            });
        },
        // Find the appointments relevant to settlement so the cashier can choose the next visit to handle.
        cashierQueue(actorId, q) {
            return read(actorId, false, async (tx) => {
                const where = { startAt: reportPeriod(q, timeZone), status: { in: ["CONFIRMED", "COMPLETED"] } };
                const counts = await tx.appointment.groupBy({ by: ["status"], where, _count: { _all: true } });
                const total = counts.reduce((n, r) => n + r._count._all, 0);
                const rows = await tx.appointment.findMany({ where, skip: (q.page - 1) * q.pageSize, take: q.pageSize,
                    orderBy: [{ status: "asc" }, { startAt: "asc" }, { id: "asc" }], select: {
                        bookingCode: true, startAt: true, checkedInAt: true,
                        checkedInByUser: { select: { firstName: true, lastName: true } }, status: true, completionType: true,
                        customer: { select: { firstName: true, lastName: true } },
                        appointmentServices: { where: { membershipStatus: "ACTIVE" }, orderBy: { sequenceNo: "asc" }, select: {
                                serviceNameSnapshot: true, outcome: true, staff: { select: { firstName: true, lastName: true } },
                            } },
                    } });
                return { from: q.from, to: q.to, timeZone, page: q.page, pageSize: q.pageSize, total,
                    awaitingSettlement: counts.find(r => r.status === "CONFIRMED")?._count._all ?? 0,
                    completed: counts.find(r => r.status === "COMPLETED")?._count._all ?? 0, rows };
            });
        },
        // Collect the overview figures so staff can see the current salon activity at a glance.
        dashboard(actorId, q) {
            return read(actorId, true, async (tx) => {
                const period = reportPeriod(q, timeZone);
                const appointments = await tx.appointment.groupBy({ by: ["status"], where: { startAt: period }, _count: { _all: true } });
                const commissions = await tx.commissionRecord.aggregate({ where: { finalizedAt: period }, _sum: { commissionAmount: true }, _count: { _all: true } });
                const now = new Date();
                const pendingFees = await tx.appointment.count({ where: { status: "PENDING_PAYMENT", holdExpiresAt: { gte: now } } });
                const unsettled = await tx.appointment.count({ where: { status: "CONFIRMED", startAt: { lte: now } } });
                const reconciliation = await tx.payment.count({ where: { status: "SUCCEEDED", reconciliationStatus: "REQUIRED" } });
                const until = new Date(Temporal.Instant.from(now.toISOString()).toZonedDateTimeISO(timeZone).add({ days: 7 }).epochMilliseconds);
                const windows = { startsAt: { lt: until }, endsAt: { gt: now } };
                const closures = await tx.salonClosure.findMany({ where: windows, orderBy: { startsAt: "asc" }, take: 20,
                    select: { id: true, startsAt: true, endsAt: true, reason: true } });
                const absences = await tx.staffUnavailability.findMany({ where: windows, orderBy: { startsAt: "asc" }, take: 20,
                    select: { id: true, staffId: true, startsAt: true, endsAt: true, reason: true, staff: { select: { firstName: true, lastName: true } } } });
                return { timeZone, appointments: appointments.map(r => ({ status: r.status, count: r._count._all })),
                    finalizedCommissions: amount(commissions._sum.commissionAmount), commissionCount: commissions._count._all,
                    attention: { pendingFees, unsettled, reconciliation }, scheduling: { until, closures, absences } };
            });
        },
        // Find the records matching the request so the caller can display the relevant results.
        list(actorId, kind, q) {
            return read(actorId, true, async (tx) => {
                const period = reportPeriod(q, timeZone);
                const paging = { skip: (q.page - 1) * q.pageSize, take: q.pageSize };
                let rows;
                let total;
                let dateBasis;
                switch (kind) {
                    case "appointments": {
                        const where = { startAt: period, ...(q.status ? { status: q.status } : {}) };
                        dateBasis = "Scheduled start";
                        total = await tx.appointment.count({ where });
                        rows = await tx.appointment.findMany({ where, ...paging, orderBy: [{ startAt: "desc" }, { id: "desc" }], select: {
                                id: true, bookingCode: true, status: true, startAt: true, endAt: true, completionType: true, appointmentFeeAmount: true,
                                customer: { select: { firstName: true, lastName: true } },
                                recoveryOfAppointmentId: true, carriedAppointmentFeePaymentId: true,
                                appointmentServices: { orderBy: [{ sequenceNo: "asc" }, { id: "asc" }], select: { serviceNameSnapshot: true, priceSnapshot: true, staffId: true, staffFirstNameSnapshot: true, staffLastNameSnapshot: true, staff: { select: { firstName: true, lastName: true } }, membershipStatus: true, outcome: true, actualChargedAmount: true } },
                            } });
                        break;
                    }
                    case "payments": {
                        // All attempts remain visible; financial summary uses capture/refund time separately.
                        const where = { createdAt: period };
                        dateBasis = "Payment attempt created";
                        total = await tx.payment.count({ where });
                        rows = await tx.payment.findMany({ where, ...paging, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: {
                                id: true, paymentReference: true, appointment: booking, type: true, method: true, provider: true, status: true, amount: true, currency: true,
                                satisfiesObligation: true, reconciliationStatus: true, createdAt: true, paidAt: true, refundedAt: true,
                            } });
                        break;
                    }
                    case "receipts": {
                        const where = { issuedAt: period };
                        dateBasis = "Receipt issued";
                        total = await tx.receipt.count({ where });
                        rows = await tx.receipt.findMany({ where, ...paging, orderBy: [{ issuedAt: "desc" }, { id: "desc" }], select: {
                                id: true, receiptNumber: true, paymentId: true, issuedAt: true, receiptSnapshot: true,
                            } });
                        break;
                    }
                    case "commissions": {
                        const where = { finalizedAt: period };
                        dateBasis = "Commission finalized";
                        total = await tx.commissionRecord.count({ where });
                        rows = await tx.commissionRecord.findMany({ where, ...paging, orderBy: [{ finalizedAt: "desc" }, { id: "desc" }], select: {
                                id: true, appointment: booking, staffId: true, sourcePaymentId: true, appointmentService: { select: { serviceNameSnapshot: true } },
                                serviceAmount: true, allocatedAppointmentFee: true, commissionBase: true, commissionRate: true, commissionAmount: true, finalizedAt: true,
                            } });
                        break;
                    }
                }
                return { kind, from: q.from, to: q.to, timeZone, dateBasis, page: q.page, pageSize: q.pageSize, total, rows };
            });
        },
    };
}
//# sourceMappingURL=reports.service.js.map