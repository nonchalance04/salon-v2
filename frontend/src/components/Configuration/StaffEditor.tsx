import { useRef, type FormEvent, type ReactNode } from "react";
import { BadgeCheck, Phone, ShieldCheck, UserRoundPlus, UsersRound, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog";

export function StaffEditor({ editing, staffCode, values, busy, error, errorDetails, onChange, onSubmit, onClose, onRestoreFocus }: {
  editing: boolean;
  staffCode?: string;
  values: Record<string, string | boolean>;
  busy: boolean;
  error: string;
  errorDetails?: ReactNode;
  onChange: (key: string, value: string | boolean) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
  onRestoreFocus: () => void;
}) {
  const firstName = useRef<HTMLInputElement>(null);
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="staff-editor" showCloseButton={false}
      onOpenAutoFocus={event => { event.preventDefault(); firstName.current?.focus(); }}
      onCloseAutoFocus={event => { event.preventDefault(); onRestoreFocus(); }}
      onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}
      onInteractOutside={event => event.preventDefault()}>
      <DialogHeader className="staff-editor-header">
        <span className="staff-editor-icon">{editing ? <UsersRound size={23} aria-hidden="true" /> : <UserRoundPlus size={23} aria-hidden="true" />}</span>
        <div><p className="staff-editor-eyebrow">YOUR TEAM</p>
          <DialogTitle>{editing ? "Edit staff member" : "Add a staff member"}</DialogTitle>
          <DialogDescription>{editing ? "Keep their details and booking status up to date." : "Welcome a new professional to your salon team."}</DialogDescription>
        </div>
        <Button type="button" variant="ghost" size="icon" className="staff-editor-close" disabled={busy} aria-label="Close staff editor" onClick={onClose}><X size={19} aria-hidden="true" /></Button>
      </DialogHeader>
      <form className="staff-editor-form" onSubmit={onSubmit} aria-busy={busy}>
        <div className="staff-editor-body">
          {error && <div className="error" role="alert"><p>{error}</p>{errorDetails}</div>}
          <div className="staff-editor-id"><BadgeCheck size={19} aria-hidden="true" /><div><span>Staff ID</span><strong>{editing ? staffCode : "Assigned automatically"}</strong></div>{!editing && <small>Generated when saved</small>}</div>
          <fieldset className="staff-editor-fields" disabled={busy}>
            <legend>Personal details</legend>
            <div className="staff-editor-grid">
              <label>First name<Input ref={firstName} required maxLength={200} autoComplete="given-name" placeholder="e.g. Maria" value={String(values.firstName ?? "")} onChange={e => onChange("firstName", e.target.value)} /></label>
              <label><span>Last name {editing && <small>Optional</small>}</span><Input required={!editing} maxLength={200} autoComplete="family-name" placeholder="e.g. Santos" value={String(values.lastName ?? "")} onChange={e => onChange("lastName", e.target.value)} /></label>
              <label className="staff-editor-wide"><span>Phone number <small>Optional</small></span><div className="staff-editor-phone"><Phone size={16} aria-hidden="true" /><Input type="tel" maxLength={50} autoComplete="tel" placeholder="e.g. 0917 123 4567" value={String(values.phone ?? "")} onChange={e => onChange("phone", e.target.value)} /></div></label>
            </div>
          </fieldset>
          <fieldset className="staff-editor-availability" disabled={busy}>
            <legend className="sr-only">Booking status</legend>
            <label><span><strong>Active staff member</strong><small>{values.isActive ? "Can receive new bookings when skills and schedules are configured." : "Unavailable for new bookings. Their history is preserved."}</small></span><input type="checkbox" aria-label="Active staff member" checked={Boolean(values.isActive)} onChange={e => onChange("isActive", e.target.checked)} /><span className="staff-editor-toggle" aria-hidden="true" /></label>
          </fieldset>
          <div className="staff-editor-tip"><UsersRound size={18} aria-hidden="true" /><div><strong>{editing ? "Skills & public profile" : "Complete their setup"}</strong><p>{editing ? "Use Manage skills to update services and Edit public profile to change what clients see." : "After saving, assign services with Manage skills and add their public profile."}</p></div></div>
          <p className="staff-editor-history"><ShieldCheck size={15} aria-hidden="true" />Appointment and commission history is preserved.</p>
        </div>
        <div className="staff-editor-footer"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add staff member"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
