// Bring in the tools for the configuration view so this file can work with the rest of the application.
import { useId, useRef, type FormEvent } from "react";
import { Clock3, Scissors, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog";

// Show the service fields so an administrator can maintain the menu offering.
export function ServiceEditor({ editing, values, categories, busy, error, onChange, onSubmit, onClose, onRestoreFocus }: {
  editing: boolean;
  values: Record<string, string | boolean>;
  categories: string[];
  busy: boolean;
  error: string;
  onChange: (key: string, value: string | boolean) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
  onRestoreFocus: () => void;
}) {
  const categoryId = useId();
  // Remember the current choices and screen status so the page can respond as the user works.
  const name = useRef<HTMLInputElement>(null);
  // Show the prepared content and actions so the user can review the information and continue.
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="service-editor tw:[&_label]:m-0 tw:[&_label]:gap-2 tw:[&_label]:text-[12px] tw:[&_label]:font-semibold
          tw:[&_label]:text-[#4b4b45] tw:[&_label_>_span_>_small]:ml-1.5 tw:[&_label_>_span_>_small]:text-[#93928a]
          tw:[&_label_>_span_>_small]:text-[10px] tw:[&_label_>_span_>_small]:font-normal
          tw:[&_label_>_small]:text-[#85847c] tw:[&_label_>_small]:text-[11px] tw:[&_label_>_small]:font-normal
          tw:[&_textarea]:min-h-20.5 tw:[&_textarea]:max-h-[160px] tw:[&_textarea]:resize-y
          tw:[&_label_>_small]:leading-[1.5]" showCloseButton={false}
      onOpenAutoFocus={event => { event.preventDefault(); name.current?.focus(); }}
      onCloseAutoFocus={event => { event.preventDefault(); onRestoreFocus(); }}
      onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}
      onInteractOutside={event => event.preventDefault()}>
      <DialogHeader className="service-editor-header">
        <span className="service-editor-icon tw:grid tw:place-items-center tw:shrink-0 tw:w-11 tw:h-11 tw:rounded-[12px]
          tw:[background:#f8f2db] tw:text-[#95771c] tw:[.service-editor_&]:w-12.5 tw:[.service-editor_&]:h-12.5
          tw:down-540:[.service-editor_&]:w-10 tw:down-540:[.service-editor_&]:h-10"><Scissors size={23} aria-hidden="true" /></span>
        <div><p className="service-editor-eyebrow tw:[margin:0_0_6px] tw:text-[#90782b] tw:text-[10px] tw:font-bold tw:tracking-[.14em]">SERVICE MENU</p>
          <DialogTitle>{editing ? "Edit service" : "Add a service"}</DialogTitle>
          <DialogDescription>Set the details your clients see when booking.</DialogDescription>
        </div>
        <Button className="service-editor-close tw:[.service-editor_&]:self-start tw:[.service-editor_&]:shrink-0
          tw:[.service-editor_&]:ml-auto tw:[.service-editor_&]:text-[#77766f]" variant="ghost" size="icon" type="button" disabled={busy} aria-label="Close service editor" onClick={onClose}><X size={19} aria-hidden="true" /></Button>
      </DialogHeader>
      {/* Group the entry fields and submit action so the user can complete this step in one place. */}
      <form className="service-editor-form tw:flex tw:flex-col tw:min-h-0" onSubmit={onSubmit} aria-busy={busy}>
        <div className="service-editor-body tw:overflow-y-auto tw:[padding:26px_28px_22px] tw:down-540:py-5.5 tw:down-540:px-5">
          {error && <p role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">{error}</p>}
          <fieldset disabled={busy} className="service-editor-fields tw:[.service-editor_&]:[border:0] tw:[.service-editor_&]:[margin:0_0_26px]
          tw:[.service-editor_&]:p-0 tw:[&_legend]:w-full tw:[&_legend]:[margin:0_0_16px] tw:[&_legend]:p-0
          tw:[&_legend]:text-[13px] tw:[&_legend]:font-bold">
            <legend>Service details</legend>
            <div className="service-editor-grid tw:grid tw:grid-cols-[1fr_1fr] tw:gap-4.5 tw:down-540:grid-cols-[1fr] tw:down-540:gap-4">
              <label>Service name<Input ref={name} required maxLength={200} autoComplete="off" placeholder="e.g. Haircut & blow-dry" value={String(values.name)} onChange={e => onChange("name", e.target.value)} /></label>
              <label>Booking category<Input required maxLength={100} list={categoryId} placeholder="e.g. Hair Services" value={String(values.category)} onChange={e => onChange("category", e.target.value)} /><datalist id={categoryId}>{categories.map(category => <option key={category} value={category} />)}</datalist></label>
              <label className="service-editor-wide tw:[grid-column:1_/_-1]"><span>Description <small>Optional</small></span><Textarea rows={3} maxLength={2000} placeholder="Describe what’s included in this service…" value={String(values.description)} onChange={e => onChange("description", e.target.value)} /></label>
            </div>
          </fieldset>
          <fieldset disabled={busy} className="service-editor-fields tw:[.service-editor_&]:[border:0] tw:[.service-editor_&]:[margin:0_0_26px]
          tw:[.service-editor_&]:p-0 tw:[&_legend]:w-full tw:[&_legend]:[margin:0_0_16px] tw:[&_legend]:p-0
          tw:[&_legend]:text-[13px] tw:[&_legend]:font-bold">
            <legend>Pricing & timing</legend>
            <div className="service-editor-grid tw:grid tw:grid-cols-[1fr_1fr] tw:gap-4.5 tw:down-540:grid-cols-[1fr] tw:down-540:gap-4">
              <label>Price (PHP)<div className="service-editor-unit tw:relative tw:[&_>_span]:absolute tw:[&_>_svg]:absolute tw:[&_>_span]:left-[13px]
          tw:[&_>_svg]:left-[13px] tw:[&_>_span]:top-[50%] tw:[&_>_svg]:top-[50%] tw:[&_>_span]:text-[#8b897d]
          tw:[&_>_svg]:text-[#8b897d] tw:[&_>_span]:pointer-events-none tw:[&_>_svg]:pointer-events-none
          tw:[&_input]:pl-9"><span aria-hidden="true">₱</span><Input required type="number" min="0.01" max="9999999999.99" step="0.01" placeholder="0.00" value={String(values.price)} onChange={e => onChange("price", e.target.value)} /></div></label>
              <label>Duration (minutes)<div className="service-editor-unit tw:relative tw:[&_>_span]:absolute tw:[&_>_svg]:absolute tw:[&_>_span]:left-[13px]
          tw:[&_>_svg]:left-[13px] tw:[&_>_span]:top-[50%] tw:[&_>_svg]:top-[50%] tw:[&_>_span]:text-[#8b897d]
          tw:[&_>_svg]:text-[#8b897d] tw:[&_>_span]:pointer-events-none tw:[&_>_svg]:pointer-events-none
          tw:[&_input]:pl-9"><Clock3 size={16} aria-hidden="true" /><Input required type="number" min="1" max="2147483647" step="1" placeholder="60" value={String(values.durationMinutes)} onChange={e => onChange("durationMinutes", e.target.value)} /></div></label>
              <label className="service-editor-wide tw:[grid-column:1_/_-1]"><span>Extra time after service <small>Optional</small></span><div className="service-editor-buffer tw:flex tw:items-center tw:gap-2.5 tw:text-[#93928a] tw:text-[12px] tw:font-normal
          tw:[&_input]:max-w-[160px]"><Input type="number" min="0" max="2147483647" step="1" placeholder="Default" aria-describedby={`${categoryId}-buffer-help`} value={String(values.bufferMinutes)} onChange={e => onChange("bufferMinutes", e.target.value)} /><span>minutes</span></div><small id={`${categoryId}-buffer-help`}>Leave blank to use the buffer from appointment settings. Enter 0 for no extra time.</small></label>
            </div>
          </fieldset>
          <fieldset disabled={busy} className="service-editor-availability tw:[.service-editor_&]:p-4 tw:[.service-editor_&]:m-0
          tw:[.service-editor_&]:[border:1px_solid_#e7e5db] tw:[.service-editor_&]:rounded-[12px]
          tw:[.service-editor_&]:[background:#faf9f5] tw:[&_label]:relative tw:[&_label]:flex-row
          tw:[&_label]:items-center tw:[&_label]:gap-4.5 tw:[&_label]:cursor-pointer tw:[&_strong]:block
          tw:[&_strong]:mb-1 tw:[&_strong]:text-[12px] tw:[&_input[type=checkbox]]:absolute
          tw:[&_input[type=checkbox]]:right-0 tw:[&_input[type=checkbox]]:w-10 tw:[&_input[type=checkbox]]:h-6
          tw:[&_input[type=checkbox]]:m-0 tw:[&_input[type=checkbox]]:opacity-[0]
          tw:[&_input[type=checkbox]]:cursor-pointer tw:disabled:opacity-[.6]">
            <label><span><strong>Available for booking</strong><small>{values.isActive ? "Active services can appear in the booking menu." : "Inactive services are unavailable for new bookings."}</small></span><input type="checkbox" checked={Boolean(values.isActive)} onChange={e => onChange("isActive", e.target.checked)} /><span className="service-editor-toggle tw:w-10 tw:h-6 tw:shrink-0 tw:rounded-[20px] tw:[background:#c9c9c1]
          tw:pointer-events-none" aria-hidden="true" /></label>
          </fieldset>
          <p className="service-editor-history tw:flex tw:items-start tw:gap-2 tw:[margin:18px_0_0] tw:text-[#858277] tw:text-[11px]
          tw:[&_svg]:shrink-0 tw:[&_svg]:text-[#9a8b58] tw:leading-[1.5]"><ShieldCheck size={16} aria-hidden="true" />Existing bookings keep their original prices and durations.</p>
        </div>
        <div className="service-editor-footer tw:flex tw:items-center tw:justify-between tw:gap-4 tw:shrink-0 tw:py-4.5 tw:px-7
          tw:[border-top:1px_solid_#eceae3] tw:[background:#fcfcfa] tw:[&_>_span]:text-[10px]
          tw:[&_>_span]:text-[#959187] tw:[&_>_div]:flex tw:[&_>_div]:gap-2.5 tw:[&_button]:min-w-[100px]
          tw:[&_button]:text-[12px] tw:down-540:py-4 tw:down-540:px-5 tw:down-540:[&_>_span]:hidden
          tw:down-540:[&_>_div]:w-full tw:down-540:[&_button]:flex-1 tw:down-540:[&_button]:min-w-0"><span>All prices in Philippine pesos</span><div><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add service"}</Button></div></div>
      </form>
    </DialogContent>
  </Dialog>;
}
