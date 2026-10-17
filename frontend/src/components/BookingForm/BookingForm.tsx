import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PhoneInput } from "../PhoneInput";
import { philippinePhoneNumber } from "../../utils/phone-number";
import { useRef, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import type { BookingPlan, BookingResult } from "../../types/booking";

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

export function BookingForm({ plan, onBusy, onBooked }: { plan: BookingPlan; onBusy: (busy: boolean) => void; onBooked: (result: BookingResult) => void }) {
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const data = new FormData(event.currentTarget);
    sending.current = true; setBusy(true); onBusy(true); setError("");
    try {
      const email = String(data.get("email")).trim();
      const result = await api<BookingResult>("/appointments", { method: "POST", body: JSON.stringify({ ...plan,
        customer: { firstName: String(data.get("firstName")).trim(), lastName: String(data.get("lastName")).trim(), phone: philippinePhoneNumber(String(data.get("phone"))), ...(email ? { email } : {}) },
      }) });
      onBooked(result);
    } catch (err) { setError(message(err)); }
    finally { sending.current = false; setBusy(false); onBusy(false); }
  }
  return <form className="account-form" onSubmit={submit}><h3>Your contact details</h3>
    <fieldset disabled={busy}><div className="form-grid">
      <label>First name<Input name="firstName" required maxLength={100} autoComplete="given-name" /></label>
      <label>Last name<Input name="lastName" required maxLength={100} autoComplete="family-name" /></label>
      <label>Phone<PhoneInput name="phone" /></label>
      <label>Email (optional)<Input name="email" type="email" maxLength={254} autoComplete="email" /></label>
    </div></fieldset>
    <p>Submitting reserves a temporary hold. Your booking is confirmed only after appointment-fee payment.</p>
    <p className="muted">Availability, fees, and Any Available staff assignments are checked again when you submit.</p>
    {error && <p role="alert" className="error">{error}</p>}
    <Button variant="default" className="primary" disabled={busy}>{busy ? "Reserving your visit…" : "Reserve a temporary hold"}</Button>
  </form>;
}
