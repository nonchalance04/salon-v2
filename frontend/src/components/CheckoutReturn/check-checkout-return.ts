import type { Appointment } from "../../types/booking";
import type { FeePayment } from "../../types/payments";

type Request = <T>(path: string, options?: RequestInit) => Promise<T>;

// A checkout redirect supplies no proof of payment. Ask the existing verified
// status endpoint, then reload the authoritative appointment with guest access.
export async function checkCheckoutReturn(
  appointment: Appointment,
  token: string,
  request: Request,
  signal?: AbortSignal,
) {
  if (appointment.status !== "PENDING_PAYMENT") {
    return { appointment, settled: true };
  }
  const pending = [...appointment.payments]
    .reverse()
    .find(payment => payment.provider === "paymongo" && payment.status === "PENDING");
  if (!pending) return { appointment, settled: true };

  const { payment } = await request<{ payment: FeePayment }>("/payments/status", {
    method: "POST",
    body: JSON.stringify({
      bookingCode: appointment.bookingCode,
      token,
      paymentId: pending.id,
    }),
    signal,
  });
  signal?.throwIfAborted();
  const result = await request<{ appointment: Appointment }>(
    "/appointments/access",
    {
      method: "POST",
      body: JSON.stringify({ bookingCode: appointment.bookingCode, token }),
      signal,
    },
  );
  return {
    appointment: result.appointment,
    settled: result.appointment.status !== "PENDING_PAYMENT" || payment.status !== "PENDING",
  };
}
