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
    <DialogContent className="staff-editor tw:[&_label]:m-0 tw:[&_label]:gap-2 tw:[&_label]:text-[12px] tw:[&_label]:font-semibold
          tw:[&_label]:text-[#4b4b45] tw:[&_label_>_span_>_small]:ml-1.5 tw:[&_label_>_span_>_small]:text-[#93928a]
          tw:[&_label_>_span_>_small]:text-[10px] tw:[&_label_>_span_>_small]:font-normal" showCloseButton={false}
      onOpenAutoFocus={event => { event.preventDefault(); firstName.current?.focus(); }}
      onCloseAutoFocus={event => { event.preventDefault(); onRestoreFocus(); }}
      onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}
      onInteractOutside={event => event.preventDefault()}>
      <DialogHeader className="staff-editor-header">
        <span className="staff-editor-icon tw:grid tw:place-items-center tw:shrink-0 tw:w-12.5 tw:h-12.5 tw:rounded-[13px]
          tw:[background:#f8f2db] tw:text-[#95771c] tw:down-540:w-10 tw:down-540:h-10">{editing ? <UsersRound size={23} aria-hidden="true" /> : <UserRoundPlus size={23} aria-hidden="true" />}</span>
        <div><p className="staff-editor-eyebrow tw:[margin:0_0_6px] tw:text-[#90782b] tw:text-[10px] tw:font-bold tw:tracking-[.14em]">YOUR TEAM</p>
          <DialogTitle>{editing ? "Edit staff member" : "Add a staff member"}</DialogTitle>
          <DialogDescription>{editing ? "Keep their details and booking status up to date." : "Welcome a new professional to your salon team."}</DialogDescription>
        </div>
        <Button type="button" variant="ghost" size="icon" className="staff-editor-close tw:[.staff-editor_&]:self-start tw:[.staff-editor_&]:shrink-0 tw:[.staff-editor_&]:ml-auto
          tw:[.staff-editor_&]:text-[#77766f]" disabled={busy} aria-label="Close staff editor" onClick={onClose}><X size={19} aria-hidden="true" /></Button>
      </DialogHeader>
      <form className="staff-editor-form tw:flex tw:flex-col tw:min-h-0" onSubmit={onSubmit} aria-busy={busy}>
        <div className="staff-editor-body tw:overflow-y-auto tw:py-6 tw:px-7 tw:[&_.error]:[margin:0_0_18px] tw:[&_.error]:text-[13px]
          tw:[&_.error_p]:mb-0 tw:[&_.error_ul]:pl-4.5 tw:[&_.error_li]:mt-2.5 tw:[&_.error_li]:[overflow-wrap:anywhere]
          tw:[&_.error_button]:mt-2 tw:[&_.error_button]:text-[11px] tw:down-540:py-5.5 tw:down-540:px-5">
          {error && <div className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]" role="alert"><p>{error}</p>{errorDetails}</div>}
          <div className="staff-editor-id tw:flex tw:items-center tw:gap-2.5 tw:py-3.5 tw:px-4 tw:mb-6.5 tw:[border:1px_dashed_#dfdac9]
          tw:[background:#fdfcf8] tw:rounded-[10px] tw:text-[#9b8c58] tw:[&_div]:flex-1 tw:[&_span]:block
          tw:[&_span]:text-[10px] tw:[&_span]:text-[#928c7a] tw:[&_span]:mb-[3px] tw:[&_strong]:block
          tw:[&_strong]:text-[#6c6247] tw:[&_strong]:text-[12px] tw:[&_strong]:font-semibold
          tw:[&_>_small]:text-[#9b9483] tw:[&_>_small]:text-[10px] tw:down-540:[&_>_small]:hidden"><BadgeCheck size={19} aria-hidden="true" /><div><span>Staff ID</span><strong>{editing ? staffCode : "Assigned automatically"}</strong></div>{!editing && <small>Generated when saved</small>}</div>
          <fieldset className="staff-editor-fields tw:[.staff-editor_&]:[margin:0_0_24px] tw:[.staff-editor_&]:p-0
          tw:[.staff-editor_&]:[border:0] tw:[&_legend]:w-full tw:[&_legend]:[margin:0_0_16px] tw:[&_legend]:p-0
          tw:[&_legend]:text-[13px] tw:[&_legend]:font-bold" disabled={busy}>
            <legend>Personal details</legend>
            <div className="staff-editor-grid tw:grid tw:grid-cols-[1fr_1fr] tw:gap-4.5 tw:down-540:grid-cols-[1fr] tw:down-540:gap-4">
              <label>First name<Input ref={firstName} required maxLength={200} autoComplete="given-name" placeholder="e.g. Maria" value={String(values.firstName ?? "")} onChange={e => onChange("firstName", e.target.value)} /></label>
              <label><span>Last name {editing && <small>Optional</small>}</span><Input required={!editing} maxLength={200} autoComplete="family-name" placeholder="e.g. Santos" value={String(values.lastName ?? "")} onChange={e => onChange("lastName", e.target.value)} /></label>
              <label className="staff-editor-wide tw:[grid-column:1_/_-1]"><span>Phone number <small>Optional</small></span><div className="staff-editor-phone tw:relative tw:[&_>_svg]:absolute tw:[&_>_svg]:left-[13px] tw:[&_>_svg]:top-[50%]
          tw:[&_>_svg]:text-[#9b9686] tw:[&_>_svg]:pointer-events-none tw:[&_input]:pl-9"><Phone size={16} aria-hidden="true" /><Input type="tel" maxLength={50} autoComplete="tel" placeholder="e.g. 0917 123 4567" value={String(values.phone ?? "")} onChange={e => onChange("phone", e.target.value)} /></div></label>
            </div>
          </fieldset>
          <fieldset className="staff-editor-availability tw:[.staff-editor_&]:p-4 tw:[.staff-editor_&]:m-0
          tw:[.staff-editor_&]:[border:1px_solid_#e7e5db] tw:[.staff-editor_&]:rounded-[12px]
          tw:[.staff-editor_&]:[background:#faf9f5] tw:[&_label]:relative tw:[&_label]:flex-row tw:[&_label]:items-center
          tw:[&_label]:gap-4.5 tw:[&_label]:cursor-pointer tw:[&_strong]:block tw:[&_strong]:mb-1
          tw:[&_strong]:text-[12px] tw:[&_input[type=checkbox]]:absolute tw:[&_input[type=checkbox]]:right-0
          tw:[&_input[type=checkbox]]:w-10 tw:[&_input[type=checkbox]]:h-6 tw:[&_input[type=checkbox]]:m-0
          tw:[&_input[type=checkbox]]:opacity-[0] tw:[&_input[type=checkbox]]:cursor-pointer tw:disabled:opacity-[.6]" disabled={busy}>
            <legend className="sr-only tw:absolute tw:w-[1px] tw:h-[1px] tw:overflow-hidden">Booking status</legend>
            <label><span><strong>Active staff member</strong><small>{values.isActive ? "Can receive new bookings when skills and schedules are configured." : "Unavailable for new bookings. Their history is preserved."}</small></span><input type="checkbox" aria-label="Active staff member" checked={Boolean(values.isActive)} onChange={e => onChange("isActive", e.target.checked)} /><span className="staff-editor-toggle tw:w-10 tw:h-6 tw:shrink-0 tw:rounded-[20px] tw:[background:#c9c9c1] tw:pointer-events-none" aria-hidden="true" /></label>
          </fieldset>
          <div className="staff-editor-tip tw:flex tw:items-start tw:gap-2.5 tw:p-4 tw:mt-4.5 tw:[background:#f5f6f7] tw:rounded-[10px]
          tw:[&_>_svg]:text-[#909291] tw:[&_>_svg]:shrink-0 tw:[&_strong]:block tw:[&_strong]:mb-[5px]
          tw:[&_strong]:text-[11px] tw:[&_strong]:text-[#626764] tw:[&_p]:m-0 tw:[&_p]:text-[#858883]
          tw:[&_p]:text-[11px] tw:[&_p]:leading-[1.6]"><UsersRound size={18} aria-hidden="true" /><div><strong>{editing ? "Skills & public profile" : "Complete their setup"}</strong><p>{editing ? "Use Manage skills to update services and Edit public profile to change what clients see." : "After saving, assign services with Manage skills and add their public profile."}</p></div></div>
          <p className="staff-editor-history tw:flex tw:items-start tw:gap-2 tw:[margin:18px_0_0] tw:text-[#858277] tw:text-[11px]
          tw:[&_svg]:text-[#9a8b58] tw:[&_svg]:shrink-0 tw:leading-[1.5]"><ShieldCheck size={15} aria-hidden="true" />Appointment and commission history is preserved.</p>
        </div>
        <div className="staff-editor-footer tw:flex tw:shrink-0 tw:justify-end tw:gap-2.5 tw:py-4.5 tw:px-7
          tw:[border-top:1px_solid_#eceae3] tw:[background:#fcfcfa] tw:[&_button]:min-w-[100px] tw:[&_button]:text-[12px]
          tw:down-540:py-4 tw:down-540:px-5 tw:down-540:[&_button]:flex-1 tw:down-540:[&_button]:min-w-0"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add staff member"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
