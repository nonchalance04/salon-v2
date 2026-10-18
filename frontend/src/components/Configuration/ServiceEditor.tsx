import { useId, useRef, type FormEvent } from "react";
import { Clock3, Scissors, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog";

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
  const name = useRef<HTMLInputElement>(null);
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="service-editor" showCloseButton={false}
      onOpenAutoFocus={event => { event.preventDefault(); name.current?.focus(); }}
      onCloseAutoFocus={event => { event.preventDefault(); onRestoreFocus(); }}
      onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}
      onInteractOutside={event => event.preventDefault()}>
      <DialogHeader className="service-editor-header">
        <span className="service-editor-icon"><Scissors size={23} aria-hidden="true" /></span>
        <div><p className="service-editor-eyebrow">SERVICE MENU</p>
          <DialogTitle>{editing ? "Edit service" : "Add a service"}</DialogTitle>
          <DialogDescription>Set the details your clients see when booking.</DialogDescription>
        </div>
        <Button className="service-editor-close" variant="ghost" size="icon" type="button" disabled={busy} aria-label="Close service editor" onClick={onClose}><X size={19} aria-hidden="true" /></Button>
      </DialogHeader>
      <form className="service-editor-form" onSubmit={onSubmit} aria-busy={busy}>
        <div className="service-editor-body">
          {error && <p role="alert" className="error">{error}</p>}
          <fieldset disabled={busy} className="service-editor-fields">
            <legend>Service details</legend>
            <div className="service-editor-grid">
              <label>Service name<Input ref={name} required maxLength={200} autoComplete="off" placeholder="e.g. Haircut & blow-dry" value={String(values.name)} onChange={e => onChange("name", e.target.value)} /></label>
              <label>Booking category<Input required maxLength={100} list={categoryId} placeholder="e.g. Hair Services" value={String(values.category)} onChange={e => onChange("category", e.target.value)} /><datalist id={categoryId}>{categories.map(category => <option key={category} value={category} />)}</datalist></label>
              <label className="service-editor-wide"><span>Description <small>Optional</small></span><Textarea rows={3} maxLength={2000} placeholder="Describe what’s included in this service…" value={String(values.description)} onChange={e => onChange("description", e.target.value)} /></label>
            </div>
          </fieldset>
          <fieldset disabled={busy} className="service-editor-fields">
            <legend>Pricing & timing</legend>
            <div className="service-editor-grid">
              <label>Price (PHP)<div className="service-editor-unit"><span aria-hidden="true">₱</span><Input required type="number" min="0.01" max="9999999999.99" step="0.01" placeholder="0.00" value={String(values.price)} onChange={e => onChange("price", e.target.value)} /></div></label>
              <label>Duration (minutes)<div className="service-editor-unit"><Clock3 size={16} aria-hidden="true" /><Input required type="number" min="1" max="2147483647" step="1" placeholder="60" value={String(values.durationMinutes)} onChange={e => onChange("durationMinutes", e.target.value)} /></div></label>
              <label className="service-editor-wide"><span>Extra time after service <small>Optional</small></span><div className="service-editor-buffer"><Input type="number" min="0" max="2147483647" step="1" placeholder="Default" aria-describedby={`${categoryId}-buffer-help`} value={String(values.bufferMinutes)} onChange={e => onChange("bufferMinutes", e.target.value)} /><span>minutes</span></div><small id={`${categoryId}-buffer-help`}>Leave blank to use the buffer from appointment settings. Enter 0 for no extra time.</small></label>
            </div>
          </fieldset>
          <fieldset disabled={busy} className="service-editor-availability">
            <label><span><strong>Available for booking</strong><small>{values.isActive ? "Active services can appear in the booking menu." : "Inactive services are unavailable for new bookings."}</small></span><input type="checkbox" checked={Boolean(values.isActive)} onChange={e => onChange("isActive", e.target.checked)} /><span className="service-editor-toggle" aria-hidden="true" /></label>
          </fieldset>
          <p className="service-editor-history"><ShieldCheck size={16} aria-hidden="true" />Existing bookings keep their original prices and durations.</p>
        </div>
        <div className="service-editor-footer"><span>All prices in Philippine pesos</span><div><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add service"}</Button></div></div>
      </form>
    </DialogContent>
  </Dialog>;
}
