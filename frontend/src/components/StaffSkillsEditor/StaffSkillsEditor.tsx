// Bring in the tools for the staff skills editor view so this file can work with the rest of the application.
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CheckCheck, Scissors, ShieldCheck } from "lucide-react";
import { StaffManagementDialog } from "../StaffManagementDialog/StaffManagementDialog";
import { api } from "../../lib/api";

import "./StaffSkillsEditor.css";

// Describe the information used by the staff skills editor view so different parts of the application agree on its contents.
type Service = { id: string; name: string; category: string; isActive: boolean };
type Qualification = { serviceId: string; commissionRate: string; isActive: boolean };
// Show the staff service skills so administrators can maintain who is qualified for each offering.
export function StaffSkillsEditor({ staffId, name, services, qualifications, busy, error, errorDetails, onStart, onBusy, onSaved, onError, onClose, onRestoreFocus }: {
  staffId: string; name: string; services: Service[]; qualifications: Qualification[]; busy: boolean;
  error: string; errorDetails?: ReactNode; onStart: () => void; onRestoreFocus: () => void;
  onBusy: (busy: boolean) => void; onSaved: () => Promise<void>; onError: (error: unknown) => void; onClose: () => void;
}) {
  // Remember the current choices and screen status so the page can respond as the user works.
  const [selected, setSelected] = useState(() => new Set(qualifications.filter(row => row.isActive).map(row => row.serviceId)));
  const [rates, setRates] = useState<Record<string, string>>(() => Object.fromEntries(services.map(service => {
    const qualification = qualifications.find(row => row.serviceId === service.id);
    return [service.id, qualification ? (Number(qualification.commissionRate) * 100).toFixed(2) : "40"];
  })));
  const sending = useRef(false);
  const errorPanel = useRef<HTMLDivElement>(null);
  // Bring the relevant content into view so the user can find the new information or error.
  useEffect(() => { if (error) errorPanel.current?.scrollIntoView({ block: "nearest" }); }, [error]);
  const groups = [...new Set(services.map(row => row.category))].sort((a, b) => a.localeCompare(b));
  // Change the selected staff skill so the editor reflects the services that person can provide.
  const toggle = (id: string, checked: boolean) => setSelected(current => {
    const next = new Set(current); if (checked) next.add(id); else next.delete(id); return next;
  });
  // Check and submit the edited details so the saved record matches the form.
  async function save(event: FormEvent) {
    event.preventDefault(); if (sending.current) return;
    sending.current = true; onBusy(true); onStart();
    try {
      await api(`/configuration/staff/${staffId}/skills`, { method: "PUT", body: JSON.stringify({
        services: [...selected].map(serviceId => ({ serviceId, commissionRate: (Number(rates[serviceId]) / 100).toFixed(4) })),
      }) });
      await onSaved();
    } catch (error) { onError(error); }
    finally { sending.current = false; onBusy(false); }
  }
  // Show the prepared content and actions so the user can review the information and continue.
  return <StaffManagementDialog title="Manage skills" description="Choose their services and set the commission for each one." name={name} icon={<Scissors size={23} />} busy={busy} onClose={onClose} onRestoreFocus={onRestoreFocus}>
    {/* Group the entry fields and submit action so the user can complete this step in one place. */}
    <form className="staff-management-form tw:flex tw:flex-col tw:min-h-0 staff-skills-editor" onSubmit={save} aria-busy={busy} aria-label={`Manage skills for ${name}`}>
    <div className="staff-management-body tw:py-6 tw:px-7 tw:overflow-y-auto tw:min-h-0 tw:down-540:py-5.5 tw:down-540:px-5" tabIndex={-1}>
      {error && <div ref={errorPanel} role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]"><p>{error}</p>{errorDetails}</div>}
      <div className="skills-selection-summary tw:flex tw:items-center tw:gap-3 tw:p-4 tw:mb-5.5 tw:[border:1px_solid_#e9e3cf]
          tw:[background:#fbf9ef] tw:rounded-[12px] tw:text-[#9a812c] tw:[&_>_div]:flex-1 tw:[&_strong]:text-[13px]
          tw:[&_strong]:text-[#6c603b] tw:[&_p]:text-[11px] tw:[&_p]:text-[#928870] tw:[&_p]:[margin:4px_0_0]
          tw:[&_>_span]:text-[10px] tw:[&_>_span]:text-[#a29778] tw:[&_>_svg]:shrink-0 tw:down-540:[&_>_span]:hidden
          tw:[&_p]:leading-[1.6]"><CheckCheck size={20} aria-hidden="true" /><div><strong role="status">{selected.size} service{selected.size === 1 ? "" : "s"} selected</strong><p>{selected.size === 0 ? "No services selected. This staff member will be unavailable for new bookings." : "Only selected services are eligible for booking."}</p></div><span>Commission per service</span></div>
      <fieldset disabled={busy} className="skills-fields tw:[.staff-skills-editor_&]:[border:0] tw:[.staff-skills-editor_&]:p-0
          tw:[.staff-skills-editor_&]:m-0" aria-label="Service qualifications">
      {groups.map(category => <fieldset className="skills-group tw:[.staff-skills-editor_&]:[border:1px_solid_#e5e3da] tw:[.staff-skills-editor_&]:rounded-[12px]
          tw:[.staff-skills-editor_&]:py-0 tw:[.staff-skills-editor_&]:px-4.5
          tw:[.staff-skills-editor_&]:[margin:0_0_20px] tw:[.staff-skills-editor_&_legend]:py-0
          tw:[.staff-skills-editor_&_legend]:px-2 tw:[.staff-skills-editor_&_legend]:text-[#6e684f]
          tw:[.staff-skills-editor_&_legend]:text-[12px] tw:[.staff-skills-editor_&_legend]:font-semibold
          tw:down-540:[.staff-skills-editor_&]:py-0 tw:down-540:[.staff-skills-editor_&]:px-3" key={category}><legend>{category}</legend>
        {services.filter(row => row.category === category).map(service => <div className="skills-service tw:[.staff-skills-editor_&]:flex tw:[.staff-skills-editor_&]:items-center
          tw:[.staff-skills-editor_&]:justify-between tw:[.staff-skills-editor_&]:gap-5 tw:[.staff-skills-editor_&]:py-4
          tw:[.staff-skills-editor_&]:px-0 tw:down-540:[.staff-skills-editor_&]:items-start
          tw:down-540:[.staff-skills-editor_&]:flex-col tw:down-540:[.staff-skills-editor_&]:gap-3" key={service.id}>
          <label className="skills-check tw:[.staff-skills-editor_&]:flex tw:[.staff-skills-editor_&]:flex-row
          tw:[.staff-skills-editor_&]:items-center tw:[.staff-skills-editor_&]:gap-3 tw:[.staff-skills-editor_&]:min-w-0
          tw:[.staff-skills-editor_&]:flex-1 tw:[.staff-skills-editor_&]:cursor-pointer
          tw:[.staff-skills-editor_&_>_span]:[overflow-wrap:anywhere] tw:[.staff-skills-editor_&_input]:w-4.5
          tw:[.staff-skills-editor_&_input]:h-4.5 tw:[.staff-skills-editor_&_input]:shrink-0
          tw:[.staff-skills-editor_&_input]:m-0 tw:[.staff-skills-editor_&_input]:p-0
          tw:[.staff-skills-editor_&_input]:[accent-color:#b5952c] tw:[.staff-skills-editor_&_small]:block
          tw:[.staff-skills-editor_&_small]:mt-1 tw:[.staff-skills-editor_&_small]:text-[#a19379]
          tw:[.staff-skills-editor_&_small]:text-[10px] tw:[.staff-skills-editor_&_small]:font-normal
          tw:[.staff-skills-editor_&]:leading-[1.5]"><input type="checkbox" checked={selected.has(service.id)} disabled={!service.isActive && !qualifications.some(row => row.serviceId === service.id && row.isActive)} onChange={event => toggle(service.id, event.target.checked)} />
            <span>{service.name}{!service.isActive && <small>Inactive service · unavailable for booking</small>}</span></label>
          {selected.has(service.id) && <label className="skills-rate tw:[.staff-skills-editor_&]:w-[125px] tw:[.staff-skills-editor_&]:shrink-0
          tw:[.staff-skills-editor_&]:text-[10px] tw:[.staff-skills-editor_&]:text-[#938b77]
          tw:[.staff-skills-editor_&]:gap-[5px] tw:[.staff-skills-editor_&_input]:h-9.5
          tw:down-540:[.staff-skills-editor_&]:ml-7.5">Commission (%)<Input aria-label={`Commission for ${service.name} (%)`} type="number" required min="0" max="100" step="0.01" value={rates[service.id] ?? "40"} onChange={event => setRates(current => ({ ...current, [service.id]: event.target.value }))} /></label>}
        </div>)}
      </fieldset>)}
      {services.length === 0 && <div className="skills-empty tw:grid tw:[justify-items:center] tw:gap-3 tw:py-9 tw:px-5.5 tw:[border:1px_dashed_#dedace]
          tw:rounded-[12px] tw:text-[#9b8b56] tw:text-center tw:[&_strong]:text-[14px] tw:[&_strong]:text-[#6f6a58]
          tw:[&_p]:max-w-[340px] tw:[&_p]:m-0 tw:[&_p]:text-[12px] tw:[&_p]:text-[#939080] tw:[&_p]:leading-[1.7]"><Scissors size={25} aria-hidden="true" /><strong>No services to assign yet</strong><p>Add services to the salon menu, then return here to set up this staff member’s skills.</p></div>}
      </fieldset>
      <p className="staff-management-note tw:flex tw:items-start tw:gap-2 tw:py-3.5 tw:px-4 tw:[margin:20px_0_0]
          tw:[background:#faf8ef] tw:rounded-[10px] tw:text-[#8a805f] tw:text-[11px] tw:[&_svg]:shrink-0
          tw:[&_svg]:mt-[1px] tw:leading-[1.6]"><ShieldCheck size={16} aria-hidden="true" />Removing a service required by an upcoming reservation is blocked. Existing bookings keep their saved commission rates.</p>
    </div>
    <div className="staff-management-footer tw:flex tw:items-center tw:justify-between tw:shrink-0 tw:gap-3.5 tw:py-4.5 tw:px-7
          tw:[background:#fcfcfa] tw:[border-top:1px_solid_#eceae3] tw:[&_>_span]:text-[#979181]
          tw:[&_>_span]:text-[10px] tw:[&_>_div]:flex tw:[&_>_div]:gap-2.5 tw:[&_button]:min-w-[100px]
          tw:[&_button]:text-[12px] tw:down-540:py-4 tw:down-540:px-5 tw:down-540:[&_>_span]:hidden
          tw:down-540:[&_>_div]:w-full tw:down-540:[&_button]:flex-1 tw:down-540:[&_button]:min-w-0"><span>Commission rates apply to new bookings</span><div><Button variant="outline" type="button" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save skills"}</Button></div></div>
    </form>
  </StaffManagementDialog>;
}
