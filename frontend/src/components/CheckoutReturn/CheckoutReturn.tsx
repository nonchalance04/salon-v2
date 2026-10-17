import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import type { Appointment } from "../../types/booking";
import { startPaymentSync } from "../../utils/payment-sync";
import { checkCheckoutReturn } from "./check-checkout-return";

export function CheckoutReturn({ appointment, token, onResolved }: {
  appointment: Appointment;
  token: string;
  onResolved: (appointment: Appointment) => void;
}) {
  const latest = useRef(appointment);
  const resolved = useRef(onResolved);
  resolved.current = onResolved;
  const [attempt, setAttempt] = useState(0);
  const [delayed, setDelayed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setDelayed(false);
    setError("");
    const timer = window.setTimeout(() => setDelayed(true), 30_000);
    const stop = startPaymentSync(async () => {
      try {
        const result = await checkCheckoutReturn(latest.current, token, api, controller.signal);
        if (!active) return false;
        latest.current = result.appointment;
        setError("");
        if (result.settled) {
          resolved.current(result.appointment);
          return false;
        }
      } catch (err) {
        if (!active) return false;
        setError(err instanceof Error ? err.message : "Please try again.");
      }
      return true;
    });
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
      stop();
    };
  }, [appointment.bookingCode, token, attempt]);

  return (
    <section className="account-form" aria-labelledby="checkout-return-title" aria-busy={!delayed && !error}>
      <p className="eyebrow">YOUR VISIT</p>
      <h1 id="checkout-return-title" className="section-title">
        {error ? "We couldn’t check your payment" : delayed ? "Still waiting for payment confirmation" : "Checking your payment…"}
      </h1>
      <p role="status">
        {delayed || error
          ? "Your booking has not been confirmed yet. We’ll keep checking for an update."
          : "Please wait while we check your payment and restore your booking."}
      </p>
      {error && <p className="error" role="alert">{error}</p>}
      {(delayed || error) && (
        <div className="actions">
          <button type="button" onClick={() => setAttempt(value => value + 1)}>Check again</button>
          <button type="button" onClick={() => resolved.current(latest.current)}>View appointment</button>
        </div>
      )}
    </section>
  );
}
