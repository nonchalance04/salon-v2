// Bring in the tools for booking details so this file can work with the rest of the application.
import type { FeePayment } from "./payments";
// Describe the information used by booking details so different parts of the application agree on its contents.
export type BookingPlan = { date: string; startAt: string; services: ({ serviceId: string; assignmentMode: "ANY_AVAILABLE" } | { serviceId: string; assignmentMode: "SPECIFIC"; staffId: string })[] };
export type Appointment = {
  checkedInAt: string | null; checkedInByUser?: { firstName: string; lastName: string } | null;
  rescheduleCount: number; cancelledAt: string | null; noShowAt: string | null; noShowGraceExpiresAt: string | null;
  recoveryAppointment: { bookingCode: string } | null; carriedAppointmentFeePaymentId: string | null;
  bookingPolicyVersion: { maxReschedules: number; rescheduleCutoffHours: number; cancellationCutoffHours: number; noShowGraceHours: number };
  payments: FeePayment[];
  bookingCode: string; status: string; startAt: string; endAt: string; holdExpiresAt: string | null;
  appointmentFeeAmount: string; serverTime: string; timeZone: string;
  customer: { firstName: string; lastName: string };
  appointmentServices: { id: string; serviceId: string; staffId: string; sequenceNo: number; serviceNameSnapshot: string; priceSnapshot: string; scheduledStartAt: string; scheduledEndAt: string; staff: { firstName: string; lastName: string } }[];
};
export type BookingResult = { appointment: Appointment; guestToken: string };
