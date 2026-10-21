// Bring in the tools for the no show correction view so this file can work with the rest of the application.
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

// Show the missed-visit correction form so staff can record an eligible customer arrival.
export function NoShowCorrection({ bookingCode, customerName, onCorrected, disabled, onNavigationStateChange }: {
  bookingCode: string; customerName: string; onCorrected: () => void; disabled: boolean;
  onNavigationStateChange?: (state: { busy: boolean; dirty: boolean }) => void;
}) {
  // Remember the current choices and screen status so the page can respond as the user works.
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [present, setPresent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Keep this view in step with its current inputs so changes are reflected on screen.
  useEffect(() => { onNavigationStateChange?.({ busy, dirty: open && Boolean(reason.trim() || present) }); }, [busy, open, reason, present, onNavigationStateChange]);
  // Submit the missed-visit correction so an eligible arrived customer can return to the active workflow.
  async function correct() {
    setBusy(true); setError("");
    try {
      await api("/appointments/no-show/correct", { method: "POST", body: JSON.stringify({ bookingCode, reason, customerPresent: present }) });
      window.dispatchEvent(new Event("appointment-arrival-changed"));
      setOpen(false); onCorrected();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to correct this appointment."); }
    finally { setBusy(false); }
  }
  if (!open) return <Button variant="outline" disabled={disabled} onClick={() => setOpen(true)}>Correct no-show / late arrival</Button>;
  // Show the prepared content and actions so the user can review the information and continue.
  return <form className="admin-warning tw:[.appointment-details_&]:m-0 tw:[.appointment-details_&]:text-[13px] tw:p-4.5 tw:mt-5
          tw:[border:1px_solid_#dfb783] tw:[background:#fff8e8] tw:rounded-[8px]" onSubmit={event => { event.preventDefault(); void correct(); }}><fieldset disabled={disabled || busy}>
    <legend>Restore the original appointment</legend>
    <p>{customerName} · {bookingCode}</p>
    <p>This restores the original staff and times and checks the customer in now. Availability is checked again when you confirm. It cannot extend the visit or replace an existing recovery booking.</p>
    <label>Reason for correction<Textarea required maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label>
    <label><input type="checkbox" required checked={present} onChange={event => setPresent(event.target.checked)} />I confirm this customer is physically present.</label>
    <div className="actions tw:flex tw:gap-3"><Button variant="outline" disabled={!present || !reason.trim()}>Restore and check in</Button><Button variant="outline" type="button" onClick={() => setOpen(false)}>Keep no-show</Button></div>
    <p>If the original visit has ended or its staff time is unavailable, arrange a new available booking.</p>
  </fieldset>{error && <p role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">{error}</p>}</form>;
}
