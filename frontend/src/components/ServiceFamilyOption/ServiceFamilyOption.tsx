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
    return <Button variant="outline" type="button" className={`service-option tw:customer:flex tw:customer:[align-items:end] tw:customer:justify-between tw:customer:gap-4.5 tw:customer:text-left tw:customer:[&_h3]:mb-1.5 tw:customer:[&_strong]:text-[14px]  ${isSelected ? "selected" : ""}`} key={service.id}
      aria-label={`${isSelected ? "Remove" : "Select"} ${service.name} (${service.category})`} aria-pressed={isSelected} onClick={() => { if (isSelected) onRemove(service); else onSelect(service); setOpen(false); }}>
      <div><h3>{label}</h3><p className="service-duration tw:customer:flex tw:customer:gap-2.5 tw:customer:items-center tw:customer:text-[12px]
          tw:customer:font-normal tw:customer:text-[#73756f] tw:customer:mb-2.5">◷ {service.durationMinutes} min{isSelected && <span className="service-added tw:customer:text-[#796020] tw:customer:[background:#f1e8c9] tw:customer:rounded-[20px]
          tw:customer:py-0.5 tw:customer:px-2 tw:customer:text-[10px] tw:customer:font-semibold">Selected</span>}</p>
        {service.description && service.description.trim().toLowerCase() !== serviceMenuCategory(service).toLowerCase() && <p className="muted">{service.description}</p>}
        <strong>{money(service.price)}</strong></div><span className="select-circle tw:customer:shrink-0 public:[border:1px_solid_#d0d2c9] public:[background:#fff] public:w-9
          public:h-9 public:rounded-[50%] public:grid public:place-items-center public:text-[#777b70]
          public:[&.selected]:text-[#fff]" aria-hidden="true">{isSelected ? "-" : "＋"}</span>
    </Button>;
  }
  if (!multiple) return option(family.options[0].service, family.options[0].service.name);
  return <section className={`service-family tw:customer:[border:1px_solid_#e0e0d9] tw:customer:rounded-[14px] tw:customer:[background:#fff] tw:customer:overflow-hidden  ${selected ? "selected" : ""}`} aria-label={family.name}>
    <div className="service-family-controls tw:customer:flex tw:customer:items-center"><Button variant="outline" ref={triggerRef} type="button" className="service-family-heading tw:customer:flex tw:customer:items-center tw:customer:justify-between tw:customer:gap-4
          tw:customer:w-full tw:customer:p-[23px] tw:customer:[background:transparent] tw:customer:[border:0]
          tw:customer:text-left tw:customer:text-[#292a28] tw:customer:[&_strong]:block
          tw:customer:[&_strong]:text-[17px] tw:customer:focus-visible:[outline:2px_solid_#85702f]
          tw:customer:focus-visible:outline-offset-[-4px] tw:customer:focus-visible:rounded-[14px]
          tw:down-480:customer:p-4.5" aria-haspopup="dialog" aria-controls={open ? optionsId : undefined}
      onClick={() => setOpen(true)}>
      <span><strong>{family.name}</strong><span className="service-family-caption tw:customer:block tw:customer:mt-2 tw:customer:text-[#73756f] tw:customer:text-[12px]
          tw:customer:font-normal tw:customer:leading-[1.6]">{selected ? selected.label : `${family.options.length} options · From ${money(minimumPrice)}`}</span></span>
      <span className="service-family-action">{selected ? "Change" : "Choose"}</span>
    </Button>{selected && <Button variant="outline" type="button" className="service-family-remove tw:customer:grid tw:customer:place-items-center tw:customer:shrink-0 tw:customer:w-11
          tw:customer:h-11 tw:customer:mr-4.5 tw:customer:p-0 tw:customer:[border:1px_solid_#bca452]
          tw:customer:rounded-[50%] tw:customer:[background:#fffdf5] tw:customer:text-[#292a28] tw:customer:text-[24px]
          tw:customer:hover:[background:#f1e8c9] tw:customer:focus-visible:[outline:2px_solid_#85702f]
          tw:customer:focus-visible:outline-offset-[3px]" aria-label={`Remove ${selected.service.name} (${selected.service.category})`} onClick={() => onRemove(selected.service)}>-</Button>}</div>
    {open && <ServiceOptionsDialog id={optionsId} name={family.name} triggerRef={triggerRef} onClose={() => setOpen(false)}>
      {family.options.map(({ service, label }) => option(service, label))}
    </ServiceOptionsDialog>}
  </section>;
}

function ServiceOptionsDialog({ id, name, triggerRef, onClose, children }: {
  id: string; name: string; triggerRef: React.RefObject<HTMLButtonElement | null>; onClose: () => void; children: React.ReactNode;
}) {
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent id={id} className="service-options-dialog tw:customer:fixed tw:customer:[inset:auto] tw:customer:top-[50%] tw:customer:left-[50%]
          tw:customer:m-0 tw:customer:w-[min(520px,calc(100%_-_32px))] tw:customer:max-h-[calc(100dvh_-_40px)]
          tw:customer:p-0 tw:customer:[border:1px_solid_#e0e0d9] tw:customer:rounded-[20px] tw:customer:[background:#fff]
          tw:customer:text-[#292a28] tw:customer:overflow-auto" showCloseButton={false}
      aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
      onCloseAutoFocus={event => { event.preventDefault(); triggerRef.current?.focus(); }}>
    <div className="service-options-content tw:customer:p-7 tw:down-480:customer:py-5.5 tw:down-480:customer:px-4.5">
      <div className="service-options-header tw:customer:flex tw:customer:justify-between tw:customer:items-start tw:customer:gap-4
          tw:customer:[&_h2]:text-[26px] tw:customer:[&_h2]:[margin:0_0_12px] tw:customer:[&_h2]:leading-[1.25]"><div><p className="booking-kicker tw:customer:text-[#85702f] tw:customer:text-[10px] tw:customer:font-bold
          tw:customer:tracking-[.15em] tw:customer:[margin:0_0_12px] tw:down-480:customer:text-[9px]">CUSTOMIZE YOUR SERVICE</p>
        <DialogTitle asChild><h2 id={`${id}-title`}>{name}</h2></DialogTitle></div>
        <Button variant="outline" type="button" className="service-options-close tw:customer:grid tw:customer:place-items-center tw:customer:shrink-0 tw:customer:w-9
          tw:customer:h-9 tw:customer:p-0 tw:customer:[border:1px_solid_#ddddd7] tw:customer:rounded-[50%]
          tw:customer:[background:#fff] tw:customer:text-[23px]" aria-label="Close service options" onClick={onClose} autoFocus>×</Button>
      </div>
      <DialogDescription asChild><p id={`${id}-description`} className="muted">Choose the option that suits you. Prices and duration are shown below.</p></DialogDescription>
      <div className="service-family-options tw:customer:grid tw:customer:gap-2.5 tw:customer:[padding:0_18px_18px]
          tw:customer:[&>p]:[margin:0_0_2px] tw:customer:[&>p]:text-[12px] tw:customer:[&>p]:text-[#73756f]
          tw:down-480:customer:[padding:0_12px_12px]">{children}</div>
    </div>
  </DialogContent></Dialog>;
}
