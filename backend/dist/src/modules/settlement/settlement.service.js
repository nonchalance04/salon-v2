// Bring in the tools for visit settlement so this file can work with the rest of the application.
import { notificationRecipients } from "../notifications/notification-recipients.js";
import { createHash } from "node:crypto";
import { Prisma } from "../../../generated/prisma/client.js";
import { ApiError } from "../../shared/http.js";
import { freshTime, lockStaff } from "../scheduling/coordination.js";
import { reservationTransaction, RestartReservation } from "../appointments/appointments.service.js";
import { allocateCommissions } from "./commissions.js";
import { booking, outcomesSchema, performerSchema, revision as revisionSchema, settlementSchema } from "./settlement.schema.js";
// Choose the related records to read together so later checks have the full visit details.
const include = { customer: true, appointmentServices: { where: { membershipStatus: "ACTIVE" }, orderBy: { sequenceNo: "asc" }, include: { staff: true, performerAssignments: { orderBy: { sequence: "desc" }, take: 1, include: { recordedBy: { select: { firstName: true, lastName: true, role: true } } } } } },
    payments: { include: { receipt: true } }, commissionRecords: true };
// Prepare a clear error so the caller can explain why the action could not finish.
const fail = (code, message) => new ApiError(409, code, message);
// Build a fingerprint of the saved visit so a later update can detect changes made by someone else.
function revision(row) { return createHash("sha256").update(JSON.stringify([row.status, row.updatedAt, row.appointmentServices.map(s => [s.id, s.updatedAt, s.outcome, s.actualChargedAmount, s.staffId, s.performerAssignments?.[0]?.id ?? null])])).digest("hex"); }
// Check the acting staff account and any required role so only permitted staff can proceed.
async function authorize(tx, id, requiredRole) {
    await tx.$queryRaw `SELECT id FROM "User" WHERE id = ${id}::uuid FOR SHARE`;
    const actor = await tx.user.findUnique({ where: { id } });
    if (!actor?.isActive)
        throw new ApiError(401, "UNAUTHORIZED", "Please sign in again.");
    if (requiredRole && actor.role !== requiredRole)
        throw new ApiError(403, "FORBIDDEN", `${requiredRole === "ADMIN" ? "Administrator" : "Cashier"} access is required.`);
    return actor;
}
// Read the visit while coordinating its staff and appointment records so settlement uses protected current details.
async function locked(tx, code) {
    const ids = (await tx.staff.findMany({ select: { id: true } })).map(s => s.id);
    // Coordinate access to the affected staff so another booking cannot change their reserved time during this step.
    await lockStaff(tx, ids);
    await tx.$queryRaw `SELECT id FROM "Appointment" WHERE "bookingCode" = ${code} FOR UPDATE`;
    const row = await tx.appointment.findUnique({ where: { bookingCode: code }, include });
    if (!row)
        throw new ApiError(404, "NOT_FOUND", "Appointment not found.");
    if (row.appointmentServices.some(s => !ids.includes(s.staffId)))
        throw new RestartReservation();
    return row;
}
// Check that the visit is still open and unchanged so recorded settlement details are not overwritten.
function editable(row, expected) {
    if (row.status !== "CONFIRMED" || row.completedAt || row.completionType || row.payments.some(p => p.type === "SERVICE_PAYMENT" && p.status === "SUCCEEDED"))
        throw fail("SETTLEMENT_NOT_ALLOWED", "Only an unfinalized confirmed appointment can be changed or settled.");
    if (revision(row) !== expected)
        throw fail("STALE_SETTLEMENT", "This appointment changed. Refresh and review its outcomes before continuing.");
    if (!row.appointmentServices.length)
        throw fail("OUTCOMES_REQUIRED", "No active services are available for settlement.");
}
// Find the appointment fee that may be used for this visit so it is counted only when eligible.
async function eligibleFee(tx, row) {
    const candidates = await tx.payment.findMany({ where: { type: "APPOINTMENT_FEE", status: "SUCCEEDED", refundedAt: null, satisfiesObligation: true, currency: "PHP",
            ...(row.carriedAppointmentFeePaymentId ? { id: row.carriedAppointmentFeePaymentId, appointmentId: row.recoveryOfAppointmentId ?? "00000000-0000-0000-0000-000000000000" } : { appointmentId: row.id, carriedByAppointment: null }) }, orderBy: { id: "asc" } });
    if (candidates.length > 1)
        throw fail("INVALID_FEE", "Multiple eligible appointment fees require review.");
    return candidates[0]?.amount ?? new Prisma.Decimal(0);
}
// Prepare the allowed record details so the caller receives a usable response.
async function view(tx, row, admin) {
    const editablePerformers = row.status === "CONFIRMED" && !row.completedAt && !row.completionType &&
        !row.payments.some(p => p.type === "SERVICE_PAYMENT" && p.status === "SUCCEEDED");
    const qualifications = editablePerformers ? await tx.staffService.findMany({
        where: { serviceId: { in: row.appointmentServices.filter(s => s.outcome === "PERFORMED").map(s => s.serviceId) }, isActive: true, staff: { isActive: true } },
        select: { serviceId: true, staff: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { staffId: "asc" },
    }) : [];
    return { bookingCode: row.bookingCode, status: row.status, revision: revision(row), startAt: row.startAt, completionType: row.completionType, completedAt: row.completedAt,
        customer: { firstName: row.customer.firstName, lastName: row.customer.lastName },
        eligibleAppointmentFee: (await eligibleFee(tx, row)).toFixed(2), carriedFee: Boolean(row.carriedAppointmentFeePaymentId),
        amountDue: row.appointmentServices.filter(s => s.outcome === "PERFORMED").reduce((n, s) => n.plus(s.actualChargedAmount ?? 0), new Prisma.Decimal(0)).toFixed(2),
        services: row.appointmentServices.map(s => {
            const assignment = s.performerAssignments?.[0];
            const bookedStaff = `${s.staffFirstNameSnapshot} ${s.staffLastNameSnapshot}`.trim() || "Former staff";
            return { id: s.id, name: s.serviceNameSnapshot, staff: `${s.staff?.firstName ?? s.staffFirstNameSnapshot} ${s.staff?.lastName ?? s.staffLastNameSnapshot}`.trim() || "Former staff", outcome: s.outcome,
                bookedStaff, bookedStaffId: s.staffId,
                performedBy: assignment ? `${assignment.staffFirstNameSnapshot} ${assignment.staffLastNameSnapshot}`.trim() : bookedStaff,
                performedByStaffId: assignment?.staffId ?? s.staffId,
                performerAssignment: assignment ? { reason: assignment.reason, customerAgreed: assignment.customerAgreed, recordedAt: assignment.recordedAt, recordedByUserId: assignment.recordedByUserId,
                    recordedByName: `${assignment.recordedBy.firstName} ${assignment.recordedBy.lastName}`.trim(), recordedByRole: assignment.recordedBy.role } : null,
                performerOptions: qualifications.filter(q => q.serviceId === s.serviceId).map(q => ({ id: q.staff.id, name: `${q.staff.firstName} ${q.staff.lastName}`.trim() })),
                price: s.priceSnapshot.toFixed(2), actualChargedAmount: s.actualChargedAmount?.toFixed(2) ?? null };
        }),
        payments: row.payments.map(p => ({ id: p.id, paymentReference: p.paymentReference, type: p.type, status: p.status, amount: p.amount.toFixed(2), receipt: p.receipt ? { receiptNumber: p.receipt.receiptNumber, receiptSnapshot: p.receipt.receiptSnapshot } : null })),
        ...(admin ? { commissions: row.commissionRecords.map(c => ({ appointmentServiceId: c.appointmentServiceId, staffId: c.staffId,
                serviceAmount: c.serviceAmount.toFixed(2), allocatedAppointmentFee: c.allocatedAppointmentFee.toFixed(2), commissionBase: c.commissionBase.toFixed(2), commissionRate: c.commissionRate.toFixed(4), commissionAmount: c.commissionAmount.toFixed(2) })) } : {}) };
}
// Manage service outcomes and final payment together so completing a visit preserves its financial records.
export function createSettlementService(prisma) {
    // Keep settlement updates together and explain duplicate payment references so repeated submissions can be handled.
    const transact = (work) => reservationTransaction(prisma, work).catch(error => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
            throw fail("PAYMENT_IDENTITY_CONFLICT", "This payment reference is already used. Refresh and check the original transaction.");
        throw error;
    });
    return {
        // Find the requested appointment and its payment details so staff can review the matching visit.
        async lookup(actorId, code) {
            booking.parse({ bookingCode: code });
            // Keep the related database changes together so a failure leaves the earlier records intact.
            return transact(async (tx) => { const row = await locked(tx, code); const actor = await authorize(tx, actorId); return view(tx, row, actor.role === "ADMIN"); });
        },
        // Record each service result once so settlement reflects which services were actually performed.
        async outcomes(actorId, raw) {
            // Check the submitted details before continuing so invalid input cannot reach the saved records.
            const input = outcomesSchema.parse(raw);
            // Keep the related database changes together so a failure leaves the earlier records intact.
            return transact(async (tx) => {
                const row = await locked(tx, input.bookingCode);
                const actor = await authorize(tx, actorId);
                editable(row, input.revision);
                if (new Set(input.services.map(s => s.id)).size !== row.appointmentServices.length || input.services.length !== row.appointmentServices.length || input.services.some(s => !row.appointmentServices.some(r => r.id === s.id)))
                    throw fail("INVALID_SERVICES", "Submit each active service exactly once.");
                // Reject changes to outcomes already recorded so staff cannot rewrite completed service results.
                if (row.appointmentServices.some(s => s.outcome !== "SCHEDULED" && input.services.find(i => i.id === s.id).outcome !== s.outcome)) {
                    throw fail("SERVICE_OUTCOME_LOCKED", "Recorded service outcomes cannot be changed by an Admin or Cashier. Refresh to see the saved outcomes.");
                }
                // Record only services still awaiting an outcome so existing results keep their original values.
                for (const s of row.appointmentServices) {
                    if (s.outcome !== "SCHEDULED")
                        continue;
                    const outcome = input.services.find(i => i.id === s.id).outcome;
                    if (outcome === "PERFORMED" && !s.priceSnapshot.gt(0))
                        throw fail("INVALID_SERVICE_CHARGE", "Performed services must have a positive historical price.");
                    // Update the saved service outcome record so the visit reflects the recorded service result.
                    await tx.appointmentService.update({ where: { id: s.id }, data: { outcome, actualChargedAmount: outcome === "PERFORMED" ? s.priceSnapshot : "0.00" } });
                }
                return view(tx, await tx.appointment.findUniqueOrThrow({ where: { id: row.id }, include }), actor.role === "ADMIN");
            });
        },
        // Record the actual performer without changing the original reservation or saved outcome.
        async assignPerformer(actorId, raw) {
            const input = performerSchema.parse(raw);
            return transact(async (tx) => {
                const row = await locked(tx, input.bookingCode);
                const actor = await authorize(tx, actorId);
                editable(row, input.revision);
                const service = row.appointmentServices.find(s => s.id === input.appointmentServiceId);
                if (!service || service.outcome !== "PERFORMED")
                    throw fail("PERFORMER_NOT_ALLOWED", "Only a performed active service can have a replacement performer.");
                const currentStaffId = service.performerAssignments?.[0]?.staffId ?? service.staffId;
                if (currentStaffId === input.staffId)
                    throw fail("PERFORMER_UNCHANGED", "Choose a different performing staff member.");
                const qualification = await tx.staffService.findUnique({ where: { staffId_serviceId: { staffId: input.staffId, serviceId: service.serviceId } }, include: { staff: true } });
                if (!qualification?.isActive || !qualification.staff.isActive)
                    throw fail("PERFORMER_NOT_QUALIFIED", "Choose an active staff member qualified for this service.");
                await tx.servicePerformerAssignment.create({ data: {
                        appointmentServiceId: service.id, staffId: qualification.staffId, staffRecordId: qualification.staffId,
                        staffFirstNameSnapshot: qualification.staff.firstName, staffLastNameSnapshot: qualification.staff.lastName,
                        commissionRateSnapshot: qualification.commissionRate, reason: input.reason, customerAgreed: input.customerAgreed,
                        recordedByUserId: actor.id, recordedAt: await freshTime(tx),
                    } });
                return view(tx, await tx.appointment.findUniqueOrThrow({ where: { id: row.id }, include }), actor.role === "ADMIN");
            });
        },
        // Check the payment against the visit and save the related updates together so settlement stays consistent.
        async settle(actorId, raw) {
            // Check the submitted details before continuing so invalid input cannot reach the saved records.
            const input = settlementSchema.parse(raw);
            // Reuse the same salon reference when a payment request is retried.
            const reference = input.externalReference ?? `SALON-SERVICE-${input.idempotencyKey}`;
            // Keep the related database changes together so a failure leaves the earlier records intact.
            return transact(async (tx) => {
                const row = await locked(tx, input.bookingCode);
                const actor = await authorize(tx, actorId);
                const key = `settlement:${input.idempotencyKey}`;
                // Look for an earlier use of this payment reference so retries do not collect or record the same payment twice.
                const matches = await tx.payment.findMany({ where: { OR: [{ idempotencyKey: key }, { provider: "manual", externalReference: reference }] } });
                if (matches.length) {
                    const p = matches[0];
                    if (matches.length !== 1 || p.appointmentId !== row.id || p.type !== "SERVICE_PAYMENT" || p.status !== "SUCCEEDED" || p.method !== input.method || p.currency !== input.currency || !p.amount.equals(input.amount) || p.externalReference !== reference || row.completionType !== "SERVICE_SETTLEMENT")
                        throw fail("PAYMENT_IDENTITY_CONFLICT", "This payment identity is associated with different details.");
                    return view(tx, row, actor.role === "ADMIN");
                }
                editable(row, input.revision);
                if (row.appointmentServices.some(s => s.outcome === "SCHEDULED"))
                    throw fail("OUTCOMES_REQUIRED", "Record all service outcomes before settlement.");
                // Collect performed services and allocate the eligible appointment fee so final charges and commissions use the recorded work.
                const performed = row.appointmentServices.filter(s => s.outcome === "PERFORMED");
                const fee = await eligibleFee(tx, row);
                const commissions = allocateCommissions(performed.map(s => ({ ...s,
                    staffId: s.performerAssignments[0]?.staffId ?? s.staffId,
                    commissionRateSnapshot: s.performerAssignments[0]?.commissionRateSnapshot ?? s.commissionRateSnapshot,
                })), fee);
                const amount = commissions.reduce((n, c) => n.plus(c.serviceAmount), new Prisma.Decimal(0));
                // Require the payment to match the calculated service total so settlement cannot save an incorrect charge.
                if (!amount.equals(input.amount))
                    throw fail("AMOUNT_MISMATCH", "The payment must equal the full performed-service charge.");
                const now = await freshTime(tx);
                // Save the new payment record so the payment history reflects this operation.
                const payment = await tx.payment.create({ data: { appointmentId: row.id, type: "SERVICE_PAYMENT", method: input.method, provider: "manual", status: "SUCCEEDED", amount,
                        currency: "PHP", idempotencyKey: key, externalReference: reference, satisfiesObligation: true, recordedByUserId: actor.id, paidAt: now } });
                const salon = await tx.salonProfile.findFirst();
                // Save the new receipt record so the proof of payment remains available later.
                await tx.receipt.create({ data: { paymentId: payment.id, issuedByUserId: actor.id,
                        receiptSnapshot: { schemaVersion: 1, bookingCode: row.bookingCode, paymentId: payment.id, type: "SERVICE_PAYMENT", amount: amount.toFixed(2), currency: "PHP", method: input.method,
                            paymentReference: payment.paymentReference, externalReference: reference, paidAt: now.toISOString(), customerName: `${row.customer.firstName} ${row.customer.lastName}`,
                            salon: salon ? { name: salon.name, address: salon.address, phone: salon.phone } : null,
                            services: performed.map(s => ({ name: s.serviceNameSnapshot, amount: s.actualChargedAmount.toFixed(2),
                                bookedStaff: `${s.staffFirstNameSnapshot} ${s.staffLastNameSnapshot}`.trim(),
                                performedBy: s.performerAssignments[0] ? `${s.performerAssignments[0].staffFirstNameSnapshot} ${s.performerAssignments[0].staffLastNameSnapshot}`.trim() : `${s.staffFirstNameSnapshot} ${s.staffLastNameSnapshot}`.trim(), })) } } });
                // Save the new commission records so staff earnings are preserved with the completed visit.
                await tx.commissionRecord.createMany({ data: commissions.map(c => ({ ...c, appointmentId: row.id, sourcePaymentId: payment.id, finalizedByUserId: actor.id, finalizedAt: now })) });
                await complete(tx, row, actor, "SERVICE_SETTLEMENT", now, payment.id);
                return view(tx, await tx.appointment.findUniqueOrThrow({ where: { id: row.id }, include }), actor.role === "ADMIN");
            });
        },
        // Close an eligible visit with no performed services so it can be completed without collecting a service payment.
        async close(actorId, raw) {
            // Check the submitted details before continuing so invalid input cannot reach the saved records.
            const input = revisionSchema.strict().parse(raw);
            // Keep the related database changes together so a failure leaves the earlier records intact.
            return transact(async (tx) => {
                const row = await locked(tx, input.bookingCode);
                const actor = await authorize(tx, actorId, "ADMIN");
                if (row.status === "COMPLETED" && row.completionType === "NO_SERVICE_CLOSURE")
                    return view(tx, row, true);
                editable(row, input.revision);
                if (row.appointmentServices.some(s => s.outcome !== "NOT_PERFORMED"))
                    throw fail("NO_SERVICE_CLOSURE_NOT_ALLOWED", "Every active service must be recorded as not performed.");
                await complete(tx, row, actor, "NO_SERVICE_CLOSURE", await freshTime(tx));
                return view(tx, await tx.appointment.findUniqueOrThrow({ where: { id: row.id }, include }), true);
            });
        },
    };
}
// Finalize the appointment and queue its notices so service history and customer updates reflect completion.
async function complete(tx, row, actor, completionType, now, paymentId) {
    // Update the saved service outcome records so the visit reflects the recorded service result.
    await tx.appointmentService.updateMany({ where: { appointmentId: row.id, membershipStatus: "ACTIVE" }, data: { outcomeFinalizedAt: now, outcomeFinalizedByUserId: actor.id } });
    // Update the saved appointment record so the visit status and reserved details stay current.
    await tx.appointment.update({ where: { id: row.id }, data: { status: "COMPLETED", completionType, completedAt: now, completedByUserId: actor.id } });
    // Queue completion and payment notices for the available customer contacts so the saved visit result can be communicated.
    for (const eventType of paymentId ? ["PAYMENT_RECEIVED", "APPOINTMENT_COMPLETED"] : ["APPOINTMENT_COMPLETED"]) {
        for (const contact of notificationRecipients(row.customer)) {
            // Save the new customer notification record so the customer can receive the saved appointment update.
            await tx.notificationQueue.create({ data: { appointmentId: row.id, customerId: row.customerId, eventType, ...contact,
                    status: "PENDING", scheduledAt: now, payload: { schemaVersion: 1, bookingCode: row.bookingCode, appointmentStatus: "COMPLETED", completionType, ...(paymentId ? { paymentId } : {}) } } });
        }
    }
}
//# sourceMappingURL=settlement.service.js.map