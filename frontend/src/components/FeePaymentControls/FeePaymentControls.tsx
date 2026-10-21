// Bring in the tools for the fee payment controls view so this file can work with the rest of the application.
import { Button } from "@/components/ui/Button";
import { createPaymentKey } from "../../utils/payment-key";
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { startPaymentSync } from "../../utils/payment-sync";
import type { FeePayment } from "../../types/payments";

// Choose a readable error message so the screen can explain what went wrong.
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

// Show the available appointment-fee actions so the customer can continue or check payment.
export function FeePaymentControls({ bookingCode, token, onChange, pending }: { bookingCode: string; token: string; onChange: () => Promise<void>; pending?: FeePayment }) {
  // Remember the current choices and screen status so the page can respond as the user works.
  const [options, setOptions] = useState<{ onlineAvailable: boolean; testMode: boolean; sandbox: boolean } | null>(null);
  const [payment, setPayment] = useState<FeePayment | null>(pending ?? null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const key = useRef("");
  if (!key.current) key.current = createPaymentKey();
  // Remember the current choices and screen status so the page can respond as the user works.
  const sending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const changed = useRef(onChange); changed.current = onChange;
  // Keep this view in step with its current inputs so changes are reflected on screen.
  useEffect(() => { if (pending) setPayment(pending); }, [pending?.id, pending?.status]);
  // Load the information this view needs when its inputs change so the displayed results stay current.
  useEffect(() => { api<{ onlineAvailable: boolean; testMode: boolean; sandbox: boolean }>("/payments/options").then(setOptions).catch(err => setError(message(err))); }, []);
  // Keep this view in step with its current inputs so changes are reflected on screen.
  useEffect(() => {
    if (!options?.onlineAvailable || options.testMode || payment?.status !== "PENDING") return;
    return startPaymentSync(checkPayment);
  }, [bookingCode, token, options?.onlineAvailable, options?.testMode, payment?.id, payment?.status]);
  // Create or reuse the booking checkout so the customer can pay the required appointment fee.
  async function checkout() {
    if (sending.current) return;
    sending.current = true; setBusy(true); setError("");
    try {
      const result = await api<{ payment: FeePayment; checkoutUrl: string | null }>("/payments/checkout", { method: "POST", body: JSON.stringify({ bookingCode, token, idempotencyKey: key.current }) });
      setPayment(result.payment);
      setCheckoutUrl(result.checkoutUrl);
      await onChange();
    } catch (err) { setError(message(err)); }
    finally { sending.current = false; setBusy(false); }
  }
  // Run the supported test-payment path so payment behavior can be exercised in the test setup.
  async function simulate(outcome: "SUCCEEDED" | "FAILED") {
    if (!payment || sending.current) return;
    sending.current = true; setBusy(true); setError("");
    try {
      await api("/payments/test-capture", { method: "POST", body: JSON.stringify({ bookingCode, token, paymentId: payment.id, outcome }) });
      if (outcome === "FAILED") { key.current = createPaymentKey(); setPayment(null); setError("Test payment failed. You can try again while the hold is active."); }
      await onChange();
    } catch (err) { setError(message(err)); }
    finally { sending.current = false; setBusy(false); }
  }
  // Reload the payment result so the booking can reflect the latest provider status.
  async function checkPayment() {
    if (!payment || sending.current) return true;
    sending.current = true; setBusy(true); setError("");
    try {
      const result = await api<{ payment: FeePayment }>("/payments/status", { method: "POST", body: JSON.stringify({ bookingCode, token, paymentId: payment.id }) });
      await changed.current();
      setPayment(result.payment);
      return result.payment.status === "PENDING";
    } catch (err) { setError(message(err)); return true; }
    finally { sending.current = false; setBusy(false); }
  }
  // Show the prepared content and actions so the user can review the information and continue.
  return <div className="fee-payment tw:[&_.actions]:flex-wrap">
    {options?.onlineAvailable ? <>
      {options.testMode && <p role="note"><strong>Development payment simulator — no real money is collected.</strong></p>}
      {(!payment || !options.testMode) && !checkoutUrl ? <Button variant="default" type="button" className="primary tw:[background:#203c34] tw:text-[white] tw:[border-color:#203c34] tw:hover:[background:#31584c]
          tw:[.login-card_&]:w-full tw:[.login-card_&]:mt-1.5" disabled={busy} onClick={() => void checkout()}>{busy ? "Opening payment…" : options.testMode ? "Open test payment" : "Pay booking fee"}</Button> : options.testMode && <div className="actions tw:flex tw:gap-3"><Button variant="outline" type="button" disabled={busy} onClick={() => void simulate("SUCCEEDED")}>Simulate successful payment</Button><Button variant="outline" type="button" disabled={busy} onClick={() => void simulate("FAILED")}>Simulate failed payment</Button></div>}
      {options.sandbox && <p role="note">PayMongo sandbox — use PayMongo’s test controls to simulate payment. Do not scan and pay QR codes using a real banking or wallet app.</p>}
      {checkoutUrl && <p><a className="payment-link" href={checkoutUrl} rel="noreferrer">Continue to PayMongo </a></p>}
      {!options.testMode && <p>Complete payment in this tab. When PayMongo returns you to the salon, your booking restores automatically on this browser and confirms after payment is verified.</p>}
      {!options.testMode && payment?.status === "PENDING" && <p role="status">Waiting for payment confirmation… Status updates automatically when you return to the salon.</p>}
    </> : options && <p>Contact the salon to pay the appointment fee before your hold expires. Online payment is not configured.</p>}
    {error && <p role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">{error}</p>}
  </div>;
}
