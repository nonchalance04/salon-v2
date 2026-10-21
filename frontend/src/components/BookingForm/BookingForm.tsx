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
      const email = String(data.get("email") ?? "").trim();
      const phone = String(data.get("phone") ?? "").trim();
      if (!email && !phone) throw new Error("Enter an email address or phone number before proceeding to payment.");
      const result = await api<BookingResult>("/appointments", { method: "POST", body: JSON.stringify({ ...plan,
        customer: { firstName: String(data.get("firstName")).trim(), lastName: String(data.get("lastName")).trim(), ...(phone ? { phone: philippinePhoneNumber(phone) } : {}), ...(email ? { email } : {}) },
      }) });
      onBooked(result);
    } catch (err) { setError(message(err)); }
    finally { sending.current = false; setBusy(false); onBusy(false); }
  }
  return <form className="account-form tw:[border:1px_solid_#dce0d8] tw:[background:white] tw:p-7 tw:rounded-[10px] tw:mb-[25px]
          tw:down-760:p-5" onSubmit={submit}><h3>Your contact details</h3>
    <fieldset disabled={busy}><div className="form-grid tw:grid tw:grid-cols-[1fr_1fr] tw:gap-[0_24px] tw:down-760:grid-cols-[1fr]">
      <label>First name<Input name="firstName" required maxLength={100} autoComplete="given-name" /></label>
      <label>Last name<Input name="lastName" required maxLength={100} autoComplete="family-name" /></label>
      <label>Phone (optional)<PhoneInput name="phone" required={false} /></label>
      <label>Email (optional)<Input name="email" type="email" maxLength={254} autoComplete="email" /></label>
    </div></fieldset>
    <p>Enter an email address or phone number. If you provide both, notifications will be sent to both.</p>
    <p>Submitting reserves a temporary hold. Your booking is confirmed only after appointment-fee payment.</p>
    <p className="muted">Availability, fees, and Any Available staff assignments are checked again when you submit.</p>
    {error && <p role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">{error}</p>}
    <Button variant="default" className="primary tw:[background:#203c34] tw:text-[white] tw:[border-color:#203c34] tw:hover:[background:#31584c]
          tw:[.login-card_&]:w-full tw:[.login-card_&]:mt-1.5" disabled={busy}>{busy ? "Reserving your visit…" : "Reserve a temporary hold"}</Button>
  </form>;
}
