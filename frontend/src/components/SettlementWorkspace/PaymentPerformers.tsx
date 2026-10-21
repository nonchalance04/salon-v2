import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { NativeSelect, NativeSelectOption } from "@/components/ui/NativeSelect";
import { Textarea } from "@/components/ui/Textarea";

export type PerformerService = {
  id: string; name: string; staff: string; outcome: string;
  bookedStaff?: string; performedBy?: string; performedByStaffId?: string;
  performerOptions?: { id: string; name: string }[];
  performerAssignment?: { reason: string; customerAgreed: boolean; recordedAt: string; recordedByUserId: string; recordedByName?: string; recordedByRole?: string } | null;
};

export function PaymentPerformers({ services, editable, busy, error, timeZone, onSave, onEditingChange }: {
  services: PerformerService[]; editable: boolean; busy: boolean; error: string; timeZone?: string;
  onSave: (input: { appointmentServiceId: string; staffId: string; reason: string; customerAgreed: true }) => void;
  onEditingChange: (editing: boolean) => void;
}) {
  const [selected, setSelected] = useState<PerformerService | null>(null);
  const [staffId, setStaffId] = useState("");
  const [reason, setReason] = useState("");
  const [agreed, setAgreed] = useState(false);
  useEffect(() => {
    onEditingChange(Boolean(selected));
    return () => onEditingChange(false);
  }, [selected, onEditingChange]);
  const performed = services.filter(service => service.outcome === "PERFORMED");
  if (!performed.length) return null;
  const replacement = selected?.performerOptions?.find(option => option.id === staffId);
  return (
    <section className="tw:my-6 tw:rounded-xl tw:border tw:border-solid tw:border-[#e5e3e8] tw:bg-white tw:p-5 tw:down-600:p-4" aria-labelledby="payment-performers-title">
      <h3 id="payment-performers-title" className="tw:mb-2 tw:text-lg tw:font-bold">Performed by</h3>
      <p className="tw:mb-4 tw:text-sm tw:text-[#686868]">Confirm who performed each service before payment. The recorded performer receives the service commission.</p>
      <ul className="tw:m-0 tw:list-none tw:p-0">
        {performed.map(service => <li key={service.id} className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:border-0 tw:border-t tw:border-solid tw:border-[#ece9ef] tw:py-4">
          <div className="tw:min-w-0 tw:flex-1 tw:[overflow-wrap:anywhere]">
            <strong className="tw:block">{service.name}</strong>
            <p className="tw:mb-0 tw:mt-1 tw:text-sm tw:text-[#686868]">Booked stylist: {service.bookedStaff ?? service.staff}</p>
            <p className="tw:mb-0 tw:mt-1 tw:text-sm">Performed by: <strong>{service.performedBy ?? service.staff}</strong></p>
            {editable && <p className="tw:mb-0 tw:mt-2 tw:text-sm tw:text-[#166534]">Commission for this service will be credited to <strong>{service.performedBy ?? service.staff}</strong> when payment is finalized.</p>}
            {service.performerAssignment && <div className="tw:mt-2 tw:text-xs tw:text-[#686868] tw:[&_p]:mb-0 tw:[&_p]:mt-1">
              <p>Replacement reason: {service.performerAssignment.reason}</p>
              <p>Customer agreement: {service.performerAssignment.customerAgreed ? "Confirmed" : "Not recorded"}</p>
              <p>Recorded by: {service.performerAssignment.recordedByName || service.performerAssignment.recordedByUserId}{service.performerAssignment.recordedByRole ? ` · ${service.performerAssignment.recordedByRole === "ADMIN" ? "Admin" : "Cashier"}` : ""}</p>
              <p>Recorded at: <time dateTime={service.performerAssignment.recordedAt}>{new Intl.DateTimeFormat("en-PH", { timeZone: timeZone || "UTC", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(service.performerAssignment.recordedAt))}</time> · {timeZone || "UTC"}</p>
            </div>}
          </div>
          {editable && <Button type="button" variant="outline" disabled={busy || !(service.performerOptions ?? []).some(option => option.id !== service.performedByStaffId)} onClick={() => {
            setSelected(service); setStaffId(""); setReason(""); setAgreed(false);
          }}>Change performing staff<span className="sr-only"> for {service.name}</span></Button>}
        </li>)}
      </ul>
      {!editable && <p className="tw:mb-0 tw:text-xs tw:text-[#686868]">Performers are locked after payment is finalized.</p>}
      <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open && !busy) setSelected(null); }}>
        <DialogContent showCloseButton={!busy}>
          <DialogHeader>
            <DialogTitle>Change performing staff</DialogTitle>
            <DialogDescription>Record who actually performed {selected?.name}. The original booking and saved service outcome stay in the history.</DialogDescription>
          </DialogHeader>
          <form onSubmit={event => {
            event.preventDefault();
            if (!busy && selected && replacement && reason.trim() && agreed) onSave({ appointmentServiceId: selected.id, staffId, reason: reason.trim(), customerAgreed: true });
          }}>
            <fieldset disabled={busy} className="tw:m-0 tw:min-w-0 tw:border-0 tw:p-0">
              <label>Replacement staff
                <NativeSelect required value={staffId} onChange={event => setStaffId(event.target.value)}>
                  <NativeSelectOption value="" disabled>Select a qualified staff member</NativeSelectOption>
                  {(selected?.performerOptions ?? []).filter(option => option.id !== selected?.performedByStaffId).map(option => <NativeSelectOption key={option.id} value={option.id}>{option.name}</NativeSelectOption>)}
                </NativeSelect>
              </label>
              <label>Reason for replacement
                <Textarea required maxLength={500} value={reason} onChange={event => setReason(event.target.value)} placeholder="For example, the booked stylist was absent." />
              </label>
              <label className="tw:flex-row tw:items-start tw:gap-2 tw:[&_input]:mt-1 tw:[&_input]:h-4 tw:[&_input]:w-4 tw:[&_input]:shrink-0">
                <input type="checkbox" required checked={agreed} onChange={event => setAgreed(event.target.checked)} />
                Customer agreed to this replacement, and this staff member performed the service.
              </label>
              {replacement && <p className="tw:rounded-lg tw:bg-[#edf7ef] tw:p-3 tw:text-sm tw:text-[#166534]">Commission for this service will go to <strong>{replacement.name}</strong> when payment is finalized.</p>}
              {error && <p role="alert" className="tw:rounded-lg tw:bg-[#fff0ed] tw:p-3 tw:text-sm tw:text-[#963923]">{error}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
                <Button type="submit" disabled={!replacement || !reason.trim() || !agreed}>{busy ? "Saving…" : "Save performing staff"}</Button>
              </DialogFooter>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
