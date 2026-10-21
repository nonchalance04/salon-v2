import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { api } from "../../lib/api";

export function AppointmentCheckIn({ bookingCode, customerName, startAt, checkedInAt, checkedInByUser, timeZone, onCheckedIn, disabled = false }: {
  bookingCode: string; customerName: string; startAt: string; checkedInAt?: string | null;
  checkedInByUser?: { firstName: string; lastName: string } | null; timeZone: string;
  onCheckedIn: () => void; disabled?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const date = (value: Date) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
  async function checkIn() {
    setBusy(true); setError("");
    try {
      await api("/appointments/check-in", { method: "POST", body: JSON.stringify({ bookingCode }) });
      window.dispatchEvent(new Event("appointment-arrival-changed"));
      setConfirming(false); onCheckedIn();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to check in this customer."); }
    finally { setBusy(false); }
  }
  if (checkedInAt) return <p role="status">Checked in at {new Intl.DateTimeFormat("en-PH", { timeZone, dateStyle: "medium", timeStyle: "short" }).format(new Date(checkedInAt))}{checkedInByUser ? ` by ${checkedInByUser.firstName} ${checkedInByUser.lastName}` : ""}.</p>;
  if (date(new Date()) !== date(new Date(startAt))) return <p className="muted">Check-in is available on the appointment date.</p>;
  return <div>
    {confirming ? <fieldset disabled={busy || disabled}><legend>Confirm customer arrival</legend><p>Has {customerName} arrived for booking {bookingCode}? Check-in records arrival; service completion is recorded separately.</p><Button variant="outline" onClick={() => void checkIn()}>Confirm arrival</Button><Button variant="outline" onClick={() => setConfirming(false)}>Cancel</Button></fieldset>
      : <Button variant="outline" disabled={busy || disabled} onClick={() => setConfirming(true)}>Check in customer</Button>}
    {busy && <p role="status">Recording arrival…</p>}
    {error && <p role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">{error}</p>}
  </div>;
}
