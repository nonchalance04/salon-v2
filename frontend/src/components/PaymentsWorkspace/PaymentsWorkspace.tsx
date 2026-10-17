import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/NativeSelect";
import { createPaymentKey } from "../../utils/payment-key";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import { paymentStatusLabel } from "../../utils/payment-presentation";
import { FeePaymentHistory } from "../FeePaymentHistory";
import type { FeePayment } from "../../types/payments";

type StaffBooking = { bookingCode: string; status: string; appointmentFeeAmount: string; customer: { firstName: string; lastName: string }; payments: FeePayment[] };
type ReviewPayment = FeePayment & { provider: string; method: string; externalReference: string | null; reconciliationReason: string | null; appointment: { bookingCode: string; status: string } };
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

export function PaymentsWorkspace({ admin, initialCode }: { admin: boolean; initialCode?: string }) {
  const [booking, setBooking] = useState<StaffBooking | null>(null);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const key = useRef("");
  if (!key.current) key.current = createPaymentKey();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [review, setReview] = useState<ReviewPayment[]>([]);
  const [onlyReview, setOnlyReview] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  async function lookup(code: string) { setBooking((await api<{ appointment: StaffBooking }>("/payments/lookup", { method: "POST", body: JSON.stringify({ bookingCode: code }) })).appointment); }
  async function loadReview(next?: string, filter = onlyReview) {
    const result = await api<{ payments: ReviewPayment[]; nextCursor: string | null }>(`/payments?reconciliationOnly=${filter}${next ? `&cursor=${encodeURIComponent(next)}` : ""}`);
    setReview(old => next ? [...old, ...result.payments] : result.payments); setCursor(result.nextCursor);
  }
  useEffect(() => { if (admin) void loadReview(undefined, onlyReview).catch(err => setError(message(err))); }, [admin, onlyReview]);
  useEffect(() => { if (initialCode) void act(() => lookup(initialCode)); }, [initialCode]);
  async function act(work: () => Promise<void>) {
    if (sending.current) return;
    sending.current = true; setBusy(true); setError(""); setNotice("");
    try { await work(); } catch (err) { setError(message(err)); }
    finally { sending.current = false; setBusy(false); }
  }
  async function record(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!booking) return;
    const data = new FormData(event.currentTarget);
    await act(async () => {
      const { payment } = await api<{ payment: FeePayment & { appointment: { status: string } } }>("/payments/manual", { method: "POST", body: JSON.stringify({ bookingCode: booking.bookingCode,
        amount: booking.appointmentFeeAmount, currency: "PHP", method: String(data.get("method")), idempotencyKey: key.current }) });
      key.current = createPaymentKey();
      setNotice(`Payment recorded${payment.reconciliationStatus === "REQUIRED" ? " for reconciliation" : ""}. Booking status: ${payment.appointment.status.replaceAll("_", " ")}.`);
      await lookup(booking.bookingCode); if (admin) await loadReview();
    });
  }
  return <section className="payments-workspace"><h2>Appointment-fee payments</h2><p>Record money already received. A salon payment reference is generated automatically and included on the receipt.</p>
    <form className="account-form" onSubmit={event => { event.preventDefault(); const code = String(new FormData(event.currentTarget).get("code")).trim(); void act(async () => { await lookup(code); key.current = createPaymentKey(); }); }}>
      <label>Booking code<Input name="code" required maxLength={100} defaultValue={initialCode} /></label><Button variant="outline" disabled={busy}>Find booking</Button>
    </form>
    {booking && <div className="account-form"><h3>{booking.bookingCode} · {booking.customer.firstName} {booking.customer.lastName}</h3><p>Status: {booking.status} · Appointment fee: PHP {booking.appointmentFeeAmount}</p>
      {booking.status !== "PENDING_PAYMENT" && <p>Recording a separate capture here will flag it for reconciliation and will not restore or confirm the booking.</p>}
      <form onSubmit={event => void record(event)} key={booking.bookingCode}><fieldset disabled={busy}><label>Payment method<NativeSelect name="method"><NativeSelectOption value="CASH">Cash</NativeSelectOption><NativeSelectOption value="GCASH">GCash</NativeSelectOption><NativeSelectOption value="OTHER">Other</NativeSelectOption></NativeSelect></label>
        <label className="checkbox"><input type="checkbox" required /> I have verified receipt of PHP {booking.appointmentFeeAmount}.</label>
        <Button variant="default" className="primary" disabled={busy}>Record received appointment fee</Button></fieldset></form>
      <FeePaymentHistory payments={booking.payments} />
      {admin && booking.payments.filter(p => p.status === "PENDING").map(p => <p key={p.id}>Pending payment attempt: <code>{p.id}</code></p>)}
      {booking.payments.filter(p => p.status === "SUCCEEDED" && !p.receipt).map(p => <Button variant="outline" key={p.id} disabled={busy} onClick={() => void act(async () => { await api("/payments/receipts", { method: "POST", body: JSON.stringify({ paymentId: p.id }) }); await lookup(booking.bookingCode); setNotice("Receipt issued."); if (admin) await loadReview(); })}>Issue receipt for PHP {p.amount}</Button>)}
    </div>}
    {notice && <p role="status" className="success">{notice}</p>}{error && <p role="alert" className="error">{error}</p>}
    {admin && <section><h3>Payment reconciliation</h3>
      <details><summary>Recover an uncertain PayMongo checkout</summary><p>Use the payment attempt ID and checkout session ID from the matching PayMongo dashboard record. Recovery verifies the merchant record before applying it.</p>
        <form className="account-form" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); void act(async () => {
          await api("/payments/recover-checkout", { method: "POST", body: JSON.stringify({ paymentId: String(data.get("paymentId")).trim(), checkoutReference: String(data.get("checkoutReference")).trim() }) });
          setNotice("PayMongo checkout verified. Refresh the booking to view its current payment status."); await loadReview();
        }); }}><label>Payment attempt ID<Input name="paymentId" required /></label><label>PayMongo checkout session ID<Input name="checkoutReference" required pattern="cs_[A-Za-z0-9]+" /></label><Button variant="outline" disabled={busy}>Verify and recover checkout</Button></form>
      </details><p>Review late or additional captures with the salon’s payment records. Contact the salon administrator about payment discrepancies.</p>
      <label className="checkbox"><input type="checkbox" checked={onlyReview} onChange={event => setOnlyReview(event.target.checked)} /> Show only payments requiring reconciliation</label>
      <Button variant="outline" disabled={busy} onClick={() => void act(() => loadReview())}>Refresh payments</Button>
      <div className="table-wrap"><table><thead><tr><th>Booking</th><th>Payment</th><th>Reference</th><th>Review</th></tr></thead><tbody>{review.map(p => <tr key={p.id}><td><Button variant="outline" disabled={busy} onClick={() => void act(() => lookup(p.appointment.bookingCode))}>{p.appointment.bookingCode}</Button><br />{p.appointment.status}</td><td>PHP {p.amount}<br />{paymentStatusLabel(p.status)} · {p.provider}</td><td>{p.externalReference ?? "Pending"}</td><td>{p.reconciliationReason?.replaceAll("_", " ") ?? p.reconciliationStatus}</td></tr>)}</tbody></table></div>
      {!review.length && <p>No matching payments.</p>}{cursor && <Button variant="outline" disabled={busy} onClick={() => void act(() => loadReview(cursor))}>Load more</Button>}
    </section>}
  </section>;
}
