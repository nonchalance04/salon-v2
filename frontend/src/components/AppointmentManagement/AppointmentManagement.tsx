import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/NativeSelect";
import { ArrowRight, ArrowUp, CalendarDays, Check, Clock3, LoaderCircle, Plus, Scissors, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import type { Appointment } from "../../types/booking";

type Selection = {
  key: number;
  serviceId: string;
  appointmentServiceId?: string;
  staffId: string;
  label: string;
};
type Catalog = { id: string; name: string; price: string };
type Staff = {
  id: string;
  firstName: string;
  lastName: string;
  serviceIds: string[];
};
type Slot = {
  startAt: string;
  endAt: string;
  services: { serviceName: string; staffName: string }[];
};
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

export function AppointmentManagement({
  appointment,
  token,
  onChange,
  onBusyChange,
  onRescheduled,
}: {
  appointment: Appointment;
  token: string;
  onChange: (appointment: Appointment, token?: string) => void;
  onBusyChange?: (busy: boolean) => void;
  onRescheduled?: (appointment: Appointment) => void;
}) {
  const recovery = appointment.status === "NO_SHOW";
  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [services, setServices] = useState<Catalog[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [rows, setRows] = useState<Selection[]>([]);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [startAt, setStartAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);
  const key = useRef(0);
  const generation = useRef(0);
  const policy = appointment.bookingPolicyVersion;
  const now = Date.parse(appointment.serverTime);
  const canChange =
    !appointment.checkedInAt &&
    appointment.rescheduleCount < policy.maxReschedules &&
    (recovery
      ? !appointment.recoveryAppointment &&
        now <=
          Date.parse(appointment.startAt) + policy.noShowGraceHours * 3_600_000
      : appointment.status === "CONFIRMED" &&
        now <=
          Date.parse(appointment.startAt) -
            policy.rescheduleCutoffHours * 3_600_000);
  const canCancel =
    !appointment.checkedInAt &&
    appointment.status === "CONFIRMED" &&
    now <=
      Date.parse(appointment.startAt) -
        policy.cancellationCutoffHours * 3_600_000;
  const format = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
      timeZone: appointment.timeZone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  const time = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
      timeZone: appointment.timeZone,
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  function invalidate() {
    generation.current++;
    setSlots(null);
    setStartAt("");
  }
  async function open() {
    setBusy(true);
    setError("");
    try {
      const [catalog, people] = await Promise.all([
        api<{ services: Catalog[] }>("/services"),
        api<{ staff: Staff[] }>("/availability/staff"),
      ]);
      setServices(catalog.services);
      setStaff(people.staff);
      setRows(
        appointment.appointmentServices
          .filter(
            (s) =>
              !recovery || catalog.services.some((c) => c.id === s.serviceId),
          )
          .map((s) => ({
            key: key.current++,
            serviceId: s.serviceId,
            ...(recovery ? {} : { appointmentServiceId: s.id }),
            staffId: s.staffId,
            label: s.serviceNameSnapshot,
          })),
      );
      setEditing(true);
      invalidate();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  const body = () => ({
    bookingCode: appointment.bookingCode,
    token,
    recovery,
    date,
    services: rows.map((row) => ({
      serviceId: row.serviceId,
      ...(row.appointmentServiceId
        ? { appointmentServiceId: row.appointmentServiceId }
        : {}),
      ...(row.staffId
        ? { assignmentMode: "SPECIFIC", staffId: row.staffId }
        : { assignmentMode: "ANY_AVAILABLE" }),
    })),
  });
  async function search() {
    const request = ++generation.current;
    setBusy(true);
    setError("");
    setSlots(null);
    setStartAt("");
    try {
      const result = await api<{ slots: Slot[] }>(
        "/appointments/change-options",
        { method: "POST", body: JSON.stringify(body()) },
      );
      if (generation.current === request) setSlots(result.slots);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{
        appointment: Appointment;
        guestToken?: string;
      }>("/appointments/change", {
        method: "POST",
        body: JSON.stringify({ ...body(), startAt, reason }),
      });
      setEditing(false);
      invalidate();
      onChange(result.appointment, result.guestToken);
      onRescheduled?.(result.appointment);
    } catch (err) {
      setError(message(err));
      invalidate();
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    setBusy(true);
    setError("");
    try {
      await api("/appointments/cancel", {
        method: "POST",
        body: JSON.stringify({
          bookingCode: appointment.bookingCode,
          token,
          reason,
        }),
      });
      const result = await api<{ appointment: Appointment }>(
        "/appointments/access",
        {
          method: "POST",
          body: JSON.stringify({ bookingCode: appointment.bookingCode, token }),
        },
      );
      setConfirmCancel(false);
      setEditing(false);
      onChange(result.appointment);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  const selectedSlot = slots?.find(slot => slot.startAt === startAt);
  const changeUnavailable = appointment.checkedInAt
    ? "Your arrival has been recorded. Please speak with the salon about any changes."
    : appointment.rescheduleCount >= policy.maxReschedules
      ? "All allowed schedule changes for this booking have been used."
      : "Rescheduling is unavailable for this booking’s current status or policy deadline.";
  return (
    <section className="appointment-manager" aria-label="Manage appointment" aria-busy={busy}>
      <div className="appointment-manager-policy">
        <span>{appointment.rescheduleCount} of {policy.maxReschedules} schedule changes used</span>
        {!recovery && <span>Reschedule at least {policy.rescheduleCutoffHours} hours before your visit</span>}
      </div>
      {appointment.carriedAppointmentFeePaymentId && <p className="appointment-manager-notice">Your appointment fee is covered by credit from the missed booking. No additional appointment-fee payment is due.</p>}
      {appointment.recoveryAppointment && <p className="appointment-manager-notice">Replacement booking: <strong>{appointment.recoveryAppointment.bookingCode}</strong>. Verify your phone number on Your appointment to manage it.</p>}
      {!editing && !confirmCancel && <div className="appointment-manager-options">
        <div className="appointment-manager-option">
          <span className="appointment-manager-option-icon" aria-hidden="true"><CalendarDays size={22} /></span>
          <div><h3>{recovery ? "Plan a replacement visit" : "Reschedule your visit"}</h3><p>{canChange ? "Choose your services, preferred professional, and a new available time." : changeUnavailable}</p></div>
          {canChange && <Button className="appointment-manager-primary" disabled={busy} onClick={() => void open()}>{recovery ? "Request a recovery booking" : "Reschedule or change services"}</Button>}
        </div>
        {canCancel && <div className="appointment-manager-option appointment-manager-cancel-option">
          <div><h3>Cancel this appointment</h3><p>Release your reserved time. Your collected appointment fee remains unchanged.</p></div>
          <Button variant="outline" disabled={busy} onClick={() => setConfirmCancel(true)}>Cancel appointment</Button>
        </div>}
        {!canChange && !canCancel && !appointment.recoveryAppointment && <p className="appointment-manager-help">Please contact the salon for assistance.</p>}
      </div>}
      {confirmCancel && <fieldset className="appointment-manager-cancel" disabled={busy}>
        <legend>Cancel your appointment?</legend>
        <p>This releases your reserved time. The collected appointment fee remains unchanged.</p>
        <div className="appointment-manager-actions">
          <Button variant="outline" onClick={() => setConfirmCancel(false)}>Keep appointment</Button>
          <Button variant="destructive" onClick={() => void cancel()}>Confirm cancellation</Button>
        </div>
      </fieldset>}
      {editing && <form className="appointment-manager-form" onSubmit={event => { event.preventDefault(); void search(); }}>
        <fieldset disabled={busy} className="appointment-manager-fields">
          <section className="appointment-manager-panel" aria-label="Services and professionals">
          <div className="appointment-manager-step"><span>01</span><div><h3>{recovery ? "Plan your replacement visit" : "Services & professionals"}</h3><p>{recovery ? "Your original policy applies. Eligible unused appointment-fee credit is carried automatically; otherwise payment is required." : "Retained services keep their booked prices and durations. Added services use current values."}</p></div></div>
          <div className="appointment-manager-services">
            {rows.map((row, index) => <div className="appointment-manager-service" key={row.key}>
              <div className="appointment-manager-service-heading"><span><Scissors size={16} aria-hidden="true" />Service {index + 1}</span><div>
                <Button variant="ghost" size="icon-sm" type="button" disabled={index === 0} aria-label={`Move service ${index + 1} earlier`} onClick={() => {
                  invalidate(); setRows(items => { const copy = [...items]; [copy[index - 1], copy[index]] = [copy[index]!, copy[index - 1]!]; return copy; });
                }}><ArrowUp size={16} /></Button>
                <Button variant="ghost" size="icon-sm" type="button" aria-label={`Remove service ${index + 1}`} onClick={() => { invalidate(); setRows(items => items.filter(item => item.key !== row.key)); }}><Trash2 size={16} /></Button>
              </div></div>
              <div className="appointment-manager-service-fields">
                {row.appointmentServiceId ? <div className="appointment-manager-retained"><span>Booked service</span><strong>{row.label}</strong><small>Original price & duration retained</small></div> : <label>Service<NativeSelect value={row.serviceId} onChange={event => { invalidate(); setRows(items => items.map(item => item.key === row.key ? { ...item, serviceId: event.target.value, staffId: "" } : item)); }}>{services.map(service => <NativeSelectOption key={service.id} value={service.id}>{service.name} · PHP {service.price}</NativeSelectOption>)}</NativeSelect></label>}
                <label>Preferred professional<NativeSelect value={row.staffId} onChange={event => { invalidate(); setRows(items => items.map(item => item.key === row.key ? { ...item, staffId: event.target.value } : item)); }}>
                  <NativeSelectOption value="">Any available staff</NativeSelectOption>
                  {row.staffId && !staff.some(person => person.id === row.staffId && person.serviceIds.includes(row.serviceId)) && <NativeSelectOption value={row.staffId}>Previous staff (availability will be checked)</NativeSelectOption>}
                  {staff.filter(person => person.serviceIds.includes(row.serviceId)).map(person => <NativeSelectOption key={person.id} value={person.id}>{person.firstName} {person.lastName}</NativeSelectOption>)}
                </NativeSelect></label>
              </div>
            </div>)}
          </div>
          <Button variant="outline" type="button" className="appointment-manager-add" disabled={!services.length || rows.length >= 20} onClick={() => { invalidate(); setRows(items => [...items, { key: key.current++, serviceId: services[0]!.id, staffId: "", label: services[0]!.name }]); }}><Plus size={16} />Add another service</Button>
          </section>
          <section className="appointment-manager-panel" aria-label="Date and time">
          <div className="appointment-manager-step"><span>02</span><div><h3>Find your new time</h3><p>All times follow {appointment.timeZone}. Availability is checked again when you confirm.</p></div></div>
          <div className="appointment-manager-date-row">
            <label>New visit date<Input type="date" value={date} required onChange={event => { invalidate(); setDate(event.target.value); }} /></label>
            <Button className="appointment-manager-primary" disabled={!rows.length}><CalendarDays size={16} aria-hidden="true" />Find available times</Button>
          </div>
          {slots === null && <div className="appointment-manager-time-placeholder"><Clock3 size={20} aria-hidden="true" /><p>Choose a date and search to see available times.</p></div>}
          {slots && (slots.length ? <div className="appointment-manager-time">
            <fieldset className="appointment-manager-slot-picker">
              <legend>Choose a start time <span>{slots.length} available</span></legend>
              <div className="appointment-manager-slot-grid">
                {slots.map(slot => <label className={`appointment-manager-slot${startAt === slot.startAt ? " is-selected" : ""}`} key={slot.startAt}>
                  <input type="radio" name="reschedule-start" value={slot.startAt} checked={startAt === slot.startAt} onChange={() => setStartAt(slot.startAt)} />
                  <span>{time(slot.startAt)}</span><Check size={14} aria-hidden="true" />
                </label>)}
              </div>
            </fieldset>
            {selectedSlot && <div className="appointment-manager-preview" aria-live="polite"><span><Check size={14} aria-hidden="true" /> YOUR UPDATED VISIT</span><strong>{format(selectedSlot.startAt)}</strong><p>Ends at {time(selectedSlot.endAt)} · {appointment.timeZone}</p><ol>{selectedSlot.services.map((service, index) => <li key={index}><Scissors size={15} aria-hidden="true" /><div>{service.serviceName}<span>with {service.staffName}</span></div></li>)}</ol></div>}
          </div> : <div role="status" className="appointment-manager-empty"><CalendarDays size={22} aria-hidden="true" /><strong>No times available on this date</strong><p>Try another date or choose a different professional.</p></div>)}
          </section>
          <section className="appointment-manager-panel appointment-manager-note-panel" aria-label="Additional details">
            <label className="appointment-manager-reason"><span>Reason for your change <small>Optional</small></span><Textarea maxLength={1000} rows={2} placeholder="Anything you’d like the salon to know?" value={reason} onChange={event => setReason(event.target.value)} /></label>
          </section>
          <div className="appointment-manager-actions">
            <div className="appointment-manager-save-hint">{selectedSlot ? "Ready when you are. Review your new visit above." : "Select an available time to continue."}</div>
            <Button variant="outline" type="button" onClick={() => { setEditing(false); invalidate(); }}>Back</Button>
            <Button type="button" className="appointment-manager-primary" disabled={!selectedSlot} onClick={() => void save()}>{recovery ? "Create replacement booking" : "Confirm changes"}<ArrowRight size={16} aria-hidden="true" /></Button>
          </div>
        </fieldset>
      </form>}
      {busy && <p role="status" className="appointment-manager-help appointment-manager-loading"><LoaderCircle size={16} aria-hidden="true" />Updating your booking options…</p>}
      {error && <p role="alert" className="appointment-manager-error">{error}</p>}
    </section>
  );
}
