import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CheckCheck, Scissors, ShieldCheck } from "lucide-react";
import { StaffManagementDialog } from "../StaffManagementDialog/StaffManagementDialog";
import { api } from "../../lib/api";

import "./StaffSkillsEditor.css";

type Service = { id: string; name: string; category: string; isActive: boolean };
type Qualification = { serviceId: string; commissionRate: string; isActive: boolean };
export function StaffSkillsEditor({ staffId, name, services, qualifications, busy, error, errorDetails, onStart, onBusy, onSaved, onError, onClose, onRestoreFocus }: {
  staffId: string; name: string; services: Service[]; qualifications: Qualification[]; busy: boolean;
  error: string; errorDetails?: ReactNode; onStart: () => void; onRestoreFocus: () => void;
  onBusy: (busy: boolean) => void; onSaved: () => Promise<void>; onError: (error: unknown) => void; onClose: () => void;
}) {
  const [selected, setSelected] = useState(() => new Set(qualifications.filter(row => row.isActive).map(row => row.serviceId)));
  const [rates, setRates] = useState<Record<string, string>>(() => Object.fromEntries(services.map(service => {
    const qualification = qualifications.find(row => row.serviceId === service.id);
    return [service.id, qualification ? (Number(qualification.commissionRate) * 100).toFixed(2) : "40"];
  })));
  const sending = useRef(false);
  const errorPanel = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) errorPanel.current?.scrollIntoView({ block: "nearest" }); }, [error]);
  const groups = [...new Set(services.map(row => row.category))].sort((a, b) => a.localeCompare(b));
  const toggle = (id: string, checked: boolean) => setSelected(current => {
    const next = new Set(current); if (checked) next.add(id); else next.delete(id); return next;
  });
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
  return <StaffManagementDialog title="Manage skills" description="Choose their services and set the commission for each one." name={name} icon={<Scissors size={23} />} busy={busy} onClose={onClose} onRestoreFocus={onRestoreFocus}>
    <form className="staff-management-form staff-skills-editor" onSubmit={save} aria-busy={busy} aria-label={`Manage skills for ${name}`}>
    <div className="staff-management-body" tabIndex={-1}>
      {error && <div ref={errorPanel} role="alert" className="error"><p>{error}</p>{errorDetails}</div>}
      <div className="skills-selection-summary"><CheckCheck size={20} aria-hidden="true" /><div><strong role="status">{selected.size} service{selected.size === 1 ? "" : "s"} selected</strong><p>{selected.size === 0 ? "No services selected. This staff member will be unavailable for new bookings." : "Only selected services are eligible for booking."}</p></div><span>Commission per service</span></div>
      <fieldset disabled={busy} className="skills-fields" aria-label="Service qualifications">
      {groups.map(category => <fieldset className="skills-group" key={category}><legend>{category}</legend>
        {services.filter(row => row.category === category).map(service => <div className="skills-service" key={service.id}>
          <label className="skills-check"><input type="checkbox" checked={selected.has(service.id)} disabled={!service.isActive && !qualifications.some(row => row.serviceId === service.id && row.isActive)} onChange={event => toggle(service.id, event.target.checked)} />
            <span>{service.name}{!service.isActive && <small>Inactive service · unavailable for booking</small>}</span></label>
          {selected.has(service.id) && <label className="skills-rate">Commission (%)<Input aria-label={`Commission for ${service.name} (%)`} type="number" required min="0" max="100" step="0.01" value={rates[service.id] ?? "40"} onChange={event => setRates(current => ({ ...current, [service.id]: event.target.value }))} /></label>}
        </div>)}
      </fieldset>)}
      {services.length === 0 && <div className="skills-empty"><Scissors size={25} aria-hidden="true" /><strong>No services to assign yet</strong><p>Add services to the salon menu, then return here to set up this staff member’s skills.</p></div>}
      </fieldset>
      <p className="staff-management-note"><ShieldCheck size={16} aria-hidden="true" />Removing a service required by an upcoming reservation is blocked. Existing bookings keep their saved commission rates.</p>
    </div>
    <div className="staff-management-footer"><span>Commission rates apply to new bookings</span><div><Button variant="outline" type="button" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save skills"}</Button></div></div>
    </form>
  </StaffManagementDialog>;
}
