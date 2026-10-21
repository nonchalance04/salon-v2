// Bring in the tools for appointment bookings so this file can work with the rest of the application.
import { Prisma, type PrismaClient } from "../../../generated/prisma/client.js";
import { ApiError } from "../../shared/http.js";
import { lockSalon, lockStaff, freshTime } from "../scheduling/coordination.js";
import { loadAvailabilityData } from "../availability/availability.data.js";
import { localDay, planAt } from "../availability/availability.engine.js";
import { createGuestCredentials, validGuestAccess } from "./appointments.security.js";
import { bookingSchema, type BookingInput } from "./appointments.schema.js";

// Identify a booking attempt that needs a fresh start so scheduling can retry with current information.
export class RestartReservation extends Error {}
// Prepare a retry message so a temporary scheduling conflict is explained clearly.
const busy = () => new ApiError(409, "BOOKING_BUSY", "The salon schedule is changing. Please try again.");
// Keep booking changes together and retry permitted conflicts so competing reservations stay consistent.
export async function reservationTransaction<T>(prisma: PrismaClient, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Keep the related database changes together so a failure leaves the earlier records intact.
      return await prisma.$transaction(async tx => {
        await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;
        await lockSalon(tx, "shared");
        return work(tx);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 20_000 });
    } catch (error) {
      if (error instanceof RestartReservation) continue;
      // Retry short-reference collisions with fresh credentials after rollback.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" &&
        Array.isArray(error.meta?.target) && error.meta.target.includes("bookingCode")) continue;
      if (error instanceof Prisma.PrismaClientKnownRequestError &&
        (["P2028", "P2034"].includes(error.code) || ["55P03", "40P01"].includes(String(error.meta?.code)))) throw busy();
      throw error;
    }
  }
  throw busy();
}
// Load the booking rules currently in effect so the appointment uses the correct fee and deadlines.
async function currentPolicy(tx: Prisma.TransactionClient, now: Date) {
  const policy = await tx.bookingPolicyVersion.findFirst({ where: { effectiveFrom: { lte: now } }, orderBy: { effectiveFrom: "desc" } });
  if (!policy) throw new ApiError(503, "POLICY_UNAVAILABLE", "Booking is not configured yet.");
  if (policy.appointmentFeeType !== "FIXED") throw new ApiError(503, "POLICY_UNSUPPORTED", "The current booking fee policy is not supported.");
  return policy;
}
// Choose the booking details needed by customers so the appointment view has its permitted information.
export const guestSelect = {
  rescheduleCount: true, cancelledAt: true, noShowAt: true, noShowGraceExpiresAt: true,
  recoveryAppointment: { select: { bookingCode: true } }, carriedAppointmentFeePaymentId: true,
  bookingPolicyVersion: { select: { maxReschedules: true, rescheduleCutoffHours: true, cancellationCutoffHours: true, noShowGraceHours: true } },
  checkedInAt: true, confirmedAt: true,
  payments: { where: { type: "APPOINTMENT_FEE" }, orderBy: { createdAt: "asc" }, select: {
    id: true, paymentReference: true, status: true, amount: true, currency: true, method: true, provider: true, satisfiesObligation: true, reconciliationStatus: true,
    receipt: { select: { receiptNumber: true, issuedAt: true, receiptSnapshot: true } },
  } },
  bookingCode: true, status: true, startAt: true, endAt: true, appointmentFeeAmount: true, holdExpiresAt: true,
  customer: { select: { firstName: true, lastName: true, phone: true, email: true } },
  appointmentServices: { where: { membershipStatus: "ACTIVE" }, orderBy: { sequenceNo: "asc" }, select: {
    id: true, serviceId: true, staffId: true, sequenceNo: true, serviceNameSnapshot: true, priceSnapshot: true, durationMinutesSnapshot: true, bufferMinutesSnapshot: true,
    assignmentMode: true, scheduledStartAt: true, scheduledEndAt: true, reservedUntilAt: true,
    staff: { select: { firstName: true, lastName: true } },
  } },
} satisfies Prisma.AppointmentSelect;
// Prepare the customer-facing appointment details so private internal fields stay out of the response.
export function guestView(row: Prisma.AppointmentGetPayload<{ select: typeof guestSelect }>, now: Date, timeZone: string) {
  return { ...row, status: row.status === "PENDING_PAYMENT" && row.holdExpiresAt && row.holdExpiresAt < now ? "EXPIRED" : row.status,
    payments: row.payments.map(payment => ({ ...payment, amount: payment.amount.toFixed(2) })),
    appointmentFeeAmount: row.appointmentFeeAmount.toFixed(2),
    appointmentServices: row.appointmentServices.map(s => ({ ...s, priceSnapshot: s.priceSnapshot.toFixed(2) })),
    serverTime: now.toISOString(), timeZone };
}
// Manage booking creation and retrieval so appointments follow the shared reservation rules.
export function createAppointmentsService(prisma: PrismaClient, timeZone: string) {
  return {
    // Recheck availability and save a temporary booking hold so the customer has time to pay the appointment fee.
    async book(input: BookingInput) {
      // Check the submitted details before continuing so invalid input cannot reach the saved records.
      input = bookingSchema.parse(input);
      // Check that the chosen start falls on the selected salon day so mismatched dates are rejected.
      const day = localDay(input.date, timeZone);
      const start = new Date(input.startAt);
      if (start < day.start || start >= day.end) throw new ApiError(400, "INVALID_DATE", "The starting time must fall on the selected salon-local date.");
      // Keep the related database changes together so a failure leaves the earlier records intact.
      return reservationTransaction(prisma, async tx => {
        const credentials = createGuestCredentials();
        // The small-salon lock set includes all existing staff, so ANY_AVAILABLE
        // workload comparisons and configuration writes use the same protection.
        const lockedIds = (await tx.staff.findMany({ select: { id: true } })).map(s => s.id);
        // Coordinate access to the affected staff so another booking cannot change their reserved time during this step.
        await lockStaff(tx, lockedIds);
        const now = await freshTime(tx);
        // Read the active booking rules so this visit uses the current fee and deadlines.
        const policy = await currentPolicy(tx, now);
        // Load current hours, skills and reservations so the proposed visit is checked against the real schedule.
        const data = await loadAvailabilityData(tx, input, timeZone, now, policy);
        // Staff can be created while SHARED coordination is held. Never acquire
        // a newly discovered staff lock out of order: roll back and rebuild.
        if (data.staff.some(s => !lockedIds.includes(s.id))) throw new RestartReservation();
        const validationTime = await freshTime(tx);
        if ((await currentPolicy(tx, validationTime)).id !== policy.id) throw new RestartReservation();
        // Recheck the proposed service times and staff so an unavailable visit is rejected before saving.
        const plan = planAt(input, start, { ...data, now: validationTime });
        if (!plan) throw new ApiError(409, "SLOT_UNAVAILABLE", "This visit is no longer available. Please search for another time.");
        // Calculate the payment deadline so the new reservation holds the time only for the permitted period.
        const holdExpiresAt = new Date(validationTime.getTime() + policy.bookingHoldMinutes * 60_000);
        // Save the new appointment record so the visit status and reserved details stay current.
        const appointment = await tx.appointment.create({ data: {
          bookingCode: credentials.bookingCode, guestAccessTokenHash: credentials.hash,
          customer: { create: input.customer }, bookingPolicyVersion: { connect: { id: policy.id } },
          status: "PENDING_PAYMENT", startAt: start, endAt: new Date(plan.endAt),
          appointmentFeeAmount: policy.appointmentFeeAmount, holdExpiresAt,
          appointmentServices: { create: plan.services.map(part => {
            const item = data.services.find(s => s.id === part.serviceId)!;
            const qualification = data.qualifications.find(q => q.staffId === part.staffId && q.serviceId === part.serviceId)!;
            return { serviceId: part.serviceId, staffId: part.staffId, assignmentMode: part.assignmentMode, sequenceNo: part.sequenceNo,
              serviceNameSnapshot: item.name, priceSnapshot: item.price, durationMinutesSnapshot: part.durationMinutes,
              bufferMinutesSnapshot: part.bufferMinutes, commissionRateSnapshot: qualification.commissionRate,
              scheduledStartAt: new Date(part.startAt), scheduledEndAt: new Date(part.endAt), reservedUntilAt: new Date(part.reservedUntilAt) };
          }) },
        } });

        // No approved outbox event represents an unpaid hold or its expiration.
        // BOOKING_CONFIRMED and PAYMENT_RECEIVED belong to Phase 6's transaction.
        const row = await tx.appointment.findUniqueOrThrow({ where: { id: appointment.id }, select: guestSelect });
        // Recheck the deadline and current booking rules before finishing so a delayed request cannot save an expired plan.
        const finalTime = await freshTime(tx);
        if ((await currentPolicy(tx, finalTime)).id !== policy.id) throw new RestartReservation();
        const finalPlan = planAt(input, start, { ...data, now: finalTime });
        if (holdExpiresAt < finalTime || !finalPlan) {
          throw new ApiError(409, "SLOT_UNAVAILABLE", "The booking deadline passed. Please search for another time.");
        }
        // Expiration can change eligible candidates/workload even while locks
        // are held. Do not commit an assignment made stale by a later wait.
        if (finalPlan.services.some((part, index) => part.staffId !== plan.services[index]!.staffId)) {
          throw new RestartReservation();
        }
        return { appointment: guestView(row, finalTime, timeZone), guestToken: credentials.token };
      });
    },
    // Check booking access and return the appointment so customers can review their own visit.
    async retrieve(bookingCode: string, token: string) {
      // Keep the related database changes together so a failure leaves the earlier records intact.
      return prisma.$transaction(async tx => {
        const record = await tx.appointment.findUnique({ where: { bookingCode }, select: { ...guestSelect, guestAccessTokenHash: true } });
        // Use the same response for missing appointments and incorrect credentials.
        const valid = await validGuestAccess(tx, token, record);
        if (!record || !valid) throw new ApiError(404, "APPOINTMENT_NOT_FOUND", "Unable to access this appointment. Verify your phone number on Your appointment or contact the salon.");
        const { guestAccessTokenHash: _hash, ...row } = record;
        return { appointment: guestView(row, await freshTime(tx), timeZone) };
      });
    },
    // Release unpaid holds past their deadline so their time can become available again.
    async expireHolds(limit = 100) {
      const candidates = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Appointment"
        WHERE status = 'PENDING_PAYMENT' AND "holdExpiresAt" < clock_timestamp()
        ORDER BY "holdExpiresAt", id LIMIT ${limit}
      `;
      let expired = 0;
      for (const candidate of candidates) {
        expired += await reservationTransaction(prisma, async tx => {
          const reservations = await tx.appointmentService.findMany({ where: { appointmentId: candidate.id, membershipStatus: "ACTIVE" }, select: { staffId: true } });
          const staffIds = reservations.map(s => s.staffId);
          // Coordinate access to the affected staff so another booking cannot change their reserved time during this step.
          await lockStaff(tx, staffIds);
          await tx.$queryRaw`SELECT id FROM "Appointment" WHERE id = ${candidate.id}::uuid FOR UPDATE`;
          const currentReservations = await tx.appointmentService.findMany({ where: { appointmentId: candidate.id, membershipStatus: "ACTIVE" }, select: { staffId: true } });
          if (currentReservations.some(s => !staffIds.includes(s.staffId))) throw new RestartReservation();
          const now = await freshTime(tx);
          const row = await tx.appointment.findUniqueOrThrow({ where: { id: candidate.id } });
          if (row.status !== "PENDING_PAYMENT" || !row.holdExpiresAt || row.holdExpiresAt >= now) return 0;
          // Update the saved appointment record so the visit status and reserved details stay current.
          await tx.appointment.update({ where: { id: row.id }, data: { status: "EXPIRED" } });

          return 1;
        });
      }
      return expired;
    },
  };
}
