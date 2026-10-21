import { Button } from "@/components/ui/Button";
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
    <section className="account-form tw:[border:1px_solid_#dce0d8] tw:[background:white] tw:p-7 tw:rounded-[10px] tw:mb-[25px]
          tw:down-760:p-5" aria-labelledby="checkout-return-title" aria-busy={!delayed && !error}>
      <p className="eyebrow public:text-[12px] public:tracking-[0.17em] public:font-bold public:text-[#987b1f]
          public:down-639:text-[11px] tw:text-[11px] tw:tracking-[.18em] tw:font-bold tw:mb-5 tw:[.cashier-main>&]:mb-2.5">YOUR VISIT</p>
      <h1 id="checkout-return-title" className="section-title public:text-[38px] public:font-bold public:tracking-[-1.4px] public:down-639:text-[33px]
          public:leading-[1.18]">
        {error ? "We couldn’t check your payment" : delayed ? "Still waiting for payment confirmation" : "Checking your payment…"}
      </h1>
      <p role="status">
        {delayed || error
          ? "Your booking has not been confirmed yet. We’ll keep checking for an update."
          : "Please wait while we check your payment and restore your booking."}
      </p>
      {error && <p className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]" role="alert">{error}</p>}
      {(delayed || error) && (
        <div className="actions tw:flex tw:gap-3">
          <Button variant="outline" type="button" onClick={() => setAttempt(value => value + 1)}>Check again</Button>
          <Button variant="outline" type="button" onClick={() => resolved.current(latest.current)}>View appointment</Button>
        </div>
      )}
    </section>
  );
}
