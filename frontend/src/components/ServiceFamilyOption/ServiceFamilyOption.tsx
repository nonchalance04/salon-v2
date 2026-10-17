import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useId, useRef, useState } from "react";
import { money } from "../../utils/money";
import type { CatalogService } from "../../types/salon";
import type { ServiceFamily } from "../../utils/service-variants";
import { serviceMenuCategory } from "../../utils/service-categories";

export function ServiceFamilyOption({ family, selectedIds, onSelect, onRemove }: {
  family: ServiceFamily<CatalogService>; selectedIds: string[]; onSelect: (service: CatalogService) => void; onRemove: (service: CatalogService) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionsId = useId();
  const selected = family.options.find(option => selectedIds.includes(option.service.id));
  const multiple = family.options.length > 1;
  const minimumPrice = Math.min(...family.options.map(option => Number(option.service.price)));
  function option(service: CatalogService, label: string) {
    const isSelected = selectedIds.includes(service.id);
    return <Button variant="outline" type="button" className={`service-option ${isSelected ? "selected" : ""}`} key={service.id}
      aria-label={`${isSelected ? "Remove" : "Select"} ${service.name} (${service.category})`} aria-pressed={isSelected} onClick={() => { if (isSelected) onRemove(service); else onSelect(service); setOpen(false); }}>
      <div><h3>{label}</h3><p className="service-duration">◷ {service.durationMinutes} min{isSelected && <span className="service-added">Selected</span>}</p>
        {service.description && service.description.trim().toLowerCase() !== serviceMenuCategory(service).toLowerCase() && <p className="muted">{service.description}</p>}
        <strong>{money(service.price)}</strong></div><span className="select-circle" aria-hidden="true">{isSelected ? "-" : "＋"}</span>
    </Button>;
  }
  if (!multiple) return option(family.options[0].service, family.options[0].service.name);
  return <section className={`service-family ${selected ? "selected" : ""}`} aria-label={family.name}>
    <div className="service-family-controls"><Button variant="outline" ref={triggerRef} type="button" className="service-family-heading" aria-haspopup="dialog" aria-controls={open ? optionsId : undefined}
      onClick={() => setOpen(true)}>
      <span><strong>{family.name}</strong><span className="service-family-caption">{selected ? selected.label : `${family.options.length} options · From ${money(minimumPrice)}`}</span></span>
      <span className="service-family-action">{selected ? "Change" : "Choose"}<span aria-hidden="true"> →</span></span>
    </Button>{selected && <Button variant="outline" type="button" className="service-family-remove" aria-label={`Remove ${selected.service.name} (${selected.service.category})`} onClick={() => onRemove(selected.service)}>-</Button>}</div>
    {open && <ServiceOptionsDialog id={optionsId} name={family.name} triggerRef={triggerRef} onClose={() => setOpen(false)}>
      {family.options.map(({ service, label }) => option(service, label))}
    </ServiceOptionsDialog>}
  </section>;
}

function ServiceOptionsDialog({ id, name, triggerRef, onClose, children }: {
  id: string; name: string; triggerRef: React.RefObject<HTMLButtonElement | null>; onClose: () => void; children: React.ReactNode;
}) {
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent id={id} className="service-options-dialog" showCloseButton={false}
      aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
      onCloseAutoFocus={event => { event.preventDefault(); triggerRef.current?.focus(); }}>
    <div className="service-options-content">
      <div className="service-options-header"><div><p className="booking-kicker">CUSTOMIZE YOUR SERVICE</p>
        <DialogTitle asChild><h2 id={`${id}-title`}>{name}</h2></DialogTitle></div>
        <Button variant="outline" type="button" className="service-options-close" aria-label="Close service options" onClick={onClose} autoFocus>×</Button>
      </div>
      <DialogDescription asChild><p id={`${id}-description`} className="muted">Choose the option that suits you. Prices and duration are shown below.</p></DialogDescription>
      <div className="service-family-options">{children}</div>
    </div>
  </DialogContent></Dialog>;
}
