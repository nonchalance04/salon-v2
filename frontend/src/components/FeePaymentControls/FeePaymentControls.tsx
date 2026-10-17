import { createPaymentKey } from "../../utils/payment-key";
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { startPaymentSync } from "../../utils/payment-sync";
import type { FeePayment } from "../../types/payments";

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

export function FeePaymentControls({ bookingCode, token, onChange, pending }: { bookingCode: string; token: string; onChange: () => Promise<void>; pending?: FeePayment }) {
  const [options, setOptions] = useState<{ onlineAvailable: boolean; testMode: boolean; sandbox: boolean } | null>(null);
  const [payment, setPayment] = useState<FeePayment | null>(pending ?? null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const key = useRef("");
  if (!key.current) key.current = createPaymentKey();
  const sending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const changed = useRef(onChange); changed.current = onChange;
  useEffect(() => { if (pending) setPayment(pending); }, [pending?.id, pending?.status]);
  useEffect(() => { api<{ onlineAvailable: boolean; testMode: boolean; sandbox: boolean }>("/payments/options").then(setOptions).catch(err => setError(message(err))); }, []);
  useEffect(() => {
    if (!options?.onlineAvailable || options.testMode || payment?.status !== "PENDING") return;
    return startPaymentSync(checkPayment);
  }, [bookingCode, token, options?.onlineAvailable, options?.testMode, payment?.id, payment?.status]);
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
  return <div className="fee-payment">
    {options?.onlineAvailable ? <>
      {options.testMode && <p role="note"><strong>Development payment simulator — no real money is collected.</strong></p>}
      {(!payment || !options.testMode) && !checkoutUrl ? <button type="button" className="primary" disabled={busy} onClick={() => void checkout()}>{busy ? "Opening payment…" : options.testMode ? "Open test payment" : "Pay with GCash"}</button> : options.testMode && <div className="actions"><button type="button" disabled={busy} onClick={() => void simulate("SUCCEEDED")}>Simulate successful payment</button><button type="button" disabled={busy} onClick={() => void simulate("FAILED")}>Simulate failed payment</button></div>}
      {options.sandbox && <p role="note">PayMongo sandbox — no real money is collected.</p>}
      {checkoutUrl && <p><a className="payment-link" href={checkoutUrl} rel="noreferrer">Continue to GCash on PayMongo →</a></p>}
      {!options.testMode && <p>Complete payment in this tab. When PayMongo returns you to the salon, your booking restores automatically on this browser and confirms after payment is verified.</p>}
      {!options.testMode && payment?.status === "PENDING" && <p role="status">Waiting for payment confirmation… Status updates automatically when you return to the salon.</p>}
      {!options.testMode && payment && <button type="button" disabled={busy} onClick={() => void checkPayment()}>Check payment status</button>}
    </> : options && <p>Contact the salon to pay the appointment fee before your hold expires. Online payment is not configured.</p>}
    {error && <p role="alert" className="error">{error}</p>}
  </div>;
}
