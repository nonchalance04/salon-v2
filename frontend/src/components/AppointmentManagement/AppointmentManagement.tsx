// Bring in the tools for the appointment management view so this file can work with the rest of the application.
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/NativeSelect";
import { CalendarDays, Check, Clock3, LoaderCircle, Plus, Scissors, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import type { Appointment } from "../../types/booking";

// Describe the information used by the appointment management view so different parts of the application agree on its contents.
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
// Choose a readable error message so the screen can explain what went wrong.
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

// Show booking change and cancellation choices so the visit can be managed within its rules.
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
  // Remember the current choices and screen status so the page can respond as the user works.
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
  // Keep this view in step with its current inputs so changes are reflected on screen.
  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);
  // Remember the current choices and screen status so the page can respond as the user works.
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
  // Format the visit time for display so the schedule can be read in the salon time zone.
  const format = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
      timeZone: appointment.timeZone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  // Convert the time to the format needed here so salon schedule values are handled consistently.
  const time = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
      timeZone: appointment.timeZone,
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  // Clear results that depend on earlier choices so an outdated visit cannot be selected.
  function invalidate() {
    generation.current++;
    setSlots(null);
    setStartAt("");
  }
  // Load the booking change choices so the customer can choose an eligible replacement visit.
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
  // Gather the current visit choices so the request uses the latest selection.
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
  // Find the matching choices so the person using this feature can review the available results.
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
  // Check and submit the edited details so the saved record matches the form.
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
  // Submit the booking cancellation so the customer sees the updated appointment result.
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
    <section className="appointment-manager tw:customer:text-[13px] tw:customer:min-w-0 tw:customer:[&_h3]:text-[16px]
          tw:customer:[&_h3]:font-semibold tw:customer:[&_h3]:[margin:0_0_6px] tw:customer:[&_h3]:tracking-[-.2px]
          tw:customer:[&_p]:m-0 tw:customer:[&_p]:text-[#74766f] tw:customer:[&_p]:text-[13px]
          tw:customer:[&_button]:rounded-[9px] tw:customer:[&_button]:text-[12px] tw:customer:[&_button]:cursor-pointer
          tw:customer:[&_button]:max-w-full tw:customer:[&_button:disabled]:cursor-default
          tw:customer:[&_button:disabled]:opacity-[.55] tw:customer:[&_label]:m-0 tw:customer:[&_label]:flex
          tw:customer:[&_label]:flex-col tw:customer:[&_label]:gap-2 tw:customer:[&_label]:min-w-0
          tw:customer:[&_label]:text-[12px] tw:customer:[&_label]:font-semibold tw:customer:[&_label]:text-[#51564b]
          tw:customer:[&_select]:w-full tw:customer:[&_input]:w-full tw:customer:[&_textarea]:w-full
          tw:customer:[&_select]:min-w-0 tw:customer:[&_input]:min-w-0 tw:customer:[&_textarea]:min-w-0
          tw:customer:[&_select]:max-w-full tw:customer:[&_input]:max-w-full tw:customer:[&_textarea]:max-w-full
          tw:customer:[&_select]:[border:1px_solid_#dcded3] tw:customer:[&_input]:[border:1px_solid_#dcded3]
          tw:customer:[&_textarea]:[border:1px_solid_#dcded3] tw:customer:[&_select]:rounded-[9px]
          tw:customer:[&_input]:rounded-[9px] tw:customer:[&_textarea]:rounded-[9px]
          tw:customer:[&_select]:[background:white] tw:customer:[&_input]:[background:white]
          tw:customer:[&_textarea]:[background:white] tw:customer:[&_select]:text-[13px]
          tw:customer:[&_input]:text-[13px] tw:customer:[&_textarea]:text-[13px] tw:customer:[&_select]:text-[#30332d]
          tw:customer:[&_input]:text-[#30332d] tw:customer:[&_textarea]:text-[#30332d] tw:customer:[&_select]:py-[11px]
          tw:customer:[&_select]:px-3 tw:customer:[&_input]:py-[11px] tw:customer:[&_input]:px-3
          tw:customer:[&_textarea]:py-[11px] tw:customer:[&_textarea]:px-3 tw:customer:[&_select]:m-0
          tw:customer:[&_input]:m-0 tw:customer:[&_textarea]:m-0 tw:customer:[&_select]:pr-8
          tw:customer:[&_select]:min-h-11 tw:customer:[&_select]:[text-overflow:ellipsis]
          tw:customer:[&_textarea]:resize-y tw:customer:[&_textarea]:min-h-21 tw:customer:leading-[1.6]
          tw:customer:[&_h3]:leading-[1.4] tw:customer:[&_p]:leading-[1.7]" aria-label="Manage appointment" aria-busy={busy}>
      <div className="appointment-manager-policy tw:customer:flex tw:customer:justify-between tw:customer:flex-wrap
          tw:customer:gap-[6px_16px] tw:customer:[padding:0_0_20px] tw:customer:text-[11px] tw:customer:text-[#7c7d74]">
        <span>{appointment.rescheduleCount} of {policy.maxReschedules} schedule changes used</span>
        {!recovery && <span>Reschedule at least {policy.rescheduleCutoffHours} hours before your visit</span>}
      </div>
      {appointment.carriedAppointmentFeePaymentId && <p className="appointment-manager-notice">Your appointment fee is covered by credit from the missed booking. No additional appointment-fee payment is due.</p>}
      {appointment.recoveryAppointment && <p className="appointment-manager-notice">Replacement booking: <strong>{appointment.recoveryAppointment.bookingCode}</strong>. Verify your phone number on Your appointment to manage it.</p>}
      {!editing && !confirmCancel && <div className="appointment-manager-options tw:customer:grid tw:customer:gap-3.5">
        <div className="appointment-manager-option tw:customer:[border:1px_solid_#e4e1d6] tw:customer:rounded-[14px] tw:customer:p-5.5
          tw:customer:[background:white] tw:customer:grid tw:customer:grid-cols-[36px_minmax(0,1fr)] tw:customer:gap-3.5
          tw:customer:[&>button]:[grid-column:2] tw:customer:[&>button]:[justify-self:start]
          tw:customer:[&>button]:mt-[3px] tw:down-600:customer:p-4.5 tw:down-600:customer:grid-cols-[26px_minmax(0,1fr)]
          tw:down-600:customer:gap-2.5 tw:down-600:customer:[&>button]:[grid-column:1/-1]
          tw:down-600:customer:[&>button]:[justify-self:stretch]">
          <span className="appointment-manager-option-icon tw:customer:text-[#92752f] tw:customer:pt-0.5" aria-hidden="true"><CalendarDays size={22} /></span>
          <div><h3>{recovery ? "Plan a replacement visit" : "Reschedule your visit"}</h3><p>{canChange ? "Choose your services, preferred professional, and a new available time." : changeUnavailable}</p></div>
          {canChange && <Button className="appointment-manager-primary" disabled={busy} onClick={() => void open()}>{recovery ? "Request a recovery booking" : "Reschedule or change services"}</Button>}
        </div>
        {canCancel && <div className="appointment-manager-option tw:customer:[border:1px_solid_#e4e1d6] tw:customer:rounded-[14px] tw:customer:p-5.5
          tw:customer:grid tw:customer:gap-3.5 tw:customer:[&>button]:[justify-self:start] tw:down-600:customer:p-4.5
          tw:down-600:customer:gap-2.5 tw:down-600:customer:[&>button]:[grid-column:1/-1]
          tw:down-600:customer:[&>button]:[justify-self:stretch] appointment-manager-cancel-option
          tw:customer:grid-cols-[minmax(0,1fr)_auto] tw:customer:items-center tw:customer:[background:transparent]
          tw:customer:py-5 tw:customer:px-5.5 tw:customer:[&>button]:[grid-column:auto] tw:customer:[&>button]:m-0
          tw:customer:[&>button]:text-[12px] tw:customer:[&_h3]:text-[14px]
          tw:down-600:customer:grid-cols-[minmax(0,1fr)]">
          <div><h3>Cancel this appointment</h3><p>Release your reserved time. Your collected appointment fee remains unchanged.</p></div>
          <Button variant="outline" disabled={busy} onClick={() => setConfirmCancel(true)}>Cancel appointment</Button>
        </div>}
        {!canChange && !canCancel && !appointment.recoveryAppointment && <p className="appointment-manager-help">Please contact the salon for assistance.</p>}
      </div>}
      {confirmCancel && <fieldset className="appointment-manager-cancel tw:customer:p-5.5 tw:customer:[border:1px_solid_#e9d9d1] tw:customer:rounded-[12px]
          tw:customer:[background:#fffaf7] tw:customer:min-w-0 tw:customer:[&_legend]:text-[16px]
          tw:customer:[&_legend]:font-semibold tw:customer:[&_legend]:py-0 tw:customer:[&_legend]:px-1.5" disabled={busy}>
        <legend>Cancel your appointment?</legend>
        <p>This releases your reserved time. The collected appointment fee remains unchanged.</p>
        <div className="appointment-manager-actions tw:customer:flex tw:customer:items-center tw:customer:justify-end
          tw:customer:flex-wrap tw:customer:gap-2.5 tw:customer:[border-top:1px_solid_#e4e1d6] tw:customer:m-0
          tw:customer:pt-5 tw:down-600:customer:[&>button]:flex-1 tw:down-600:customer:[&>button]:min-w-[120px]
          tw:down-600:customer:[&>button]:min-h-11 tw:down-600:customer:[&>button]:whitespace-nowrap">
          <Button variant="outline" onClick={() => setConfirmCancel(false)}>Keep appointment</Button>
          <Button variant="destructive" onClick={() => void cancel()}>Confirm cancellation</Button>
        </div>
      </fieldset>}
      {editing && <form className="appointment-manager-form" onSubmit={event => { event.preventDefault(); void search(); }}>
        <fieldset disabled={busy} className="appointment-manager-fields tw:customer:[border:0] tw:customer:p-0 tw:customer:m-0 tw:customer:min-w-0
          tw:customer:grid tw:customer:gap-4">
          <section className="appointment-manager-panel tw:customer:min-w-0 tw:customer:p-5.5 tw:customer:[background:#fff]
          tw:customer:[border:1px_solid_#e4e1d6] tw:customer:rounded-[14px] tw:down-600:customer:p-4" aria-label="Services and professionals">
          <div className="appointment-manager-step tw:customer:flex tw:customer:gap-3 tw:customer:items-start
          tw:customer:[margin:8px_0_18px] tw:customer:[&>span]:grid tw:customer:[&>span]:place-items-center
          tw:customer:[&>span]:shrink-0 tw:customer:[&>span]:text-[10px] tw:customer:[&>span]:font-bold
          tw:customer:[&_p]:text-[12px] tw:customer:[&>span]:w-8 tw:customer:[&>span]:h-8
          tw:customer:[&>span]:rounded-[10px] tw:customer:[&>span]:[background:#30382d] tw:customer:[&>span]:text-[white]
          tw:customer:[&_h3]:text-[17px]"><span>01</span><div><h3>{recovery ? "Plan your replacement visit" : "Services & professionals"}</h3><p>{recovery ? "Your original policy applies. Eligible unused appointment-fee credit is carried automatically; otherwise payment is required." : "Retained services keep their booked prices and durations. Added services use current values."}</p></div></div>
          <div className="appointment-manager-services tw:customer:grid tw:customer:gap-3">
            {rows.map((row, index) => <div className="appointment-manager-service tw:customer:[border:1px_solid_#e4e1d6] tw:customer:rounded-[12px]
          tw:customer:overflow-hidden tw:customer:min-w-0 tw:customer:[background:#fcfcf9]" key={row.key}>
              <div className="appointment-manager-service-heading tw:customer:flex tw:customer:items-center tw:customer:justify-between
          tw:customer:py-[9px] tw:customer:px-4 tw:customer:[border-bottom:1px_solid_#efede6] tw:customer:[&>span]:flex
          tw:customer:[&>span]:items-center tw:customer:[&>span]:gap-2 tw:customer:[&>span]:text-[11px]
          tw:customer:[&>span]:font-semibold tw:customer:[&>span]:text-[#727968] tw:customer:[&>div]:flex
          tw:customer:[&>div]:gap-1 tw:customer:[background:#f5f5ef] tw:customer:[&_button]:min-w-9
          tw:customer:[&_button]:min-h-9"><span><Scissors size={16} aria-hidden="true" />Service {index + 1}</span><div>
                <Button variant="ghost" size="sm" type="button" disabled={index === 0} aria-label={`Move service ${index + 1} earlier`} onClick={() => {
                  invalidate(); setRows(items => { const copy = [...items]; [copy[index - 1], copy[index]] = [copy[index]!, copy[index - 1]!]; return copy; });
                }}>Move earlier</Button>
                <Button variant="ghost" size="icon-sm" type="button" aria-label={`Remove service ${index + 1}`} onClick={() => { invalidate(); setRows(items => items.filter(item => item.key !== row.key)); }}><Trash2 size={16} /></Button>
              </div></div>
              <div className="appointment-manager-service-fields tw:customer:grid tw:customer:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]
          tw:customer:gap-4.5 tw:customer:p-4.5 tw:down-600:customer:grid-cols-[minmax(0,1fr)] tw:down-600:customer:gap-4">
                {row.appointmentServiceId ? <div className="appointment-manager-retained tw:customer:flex tw:customer:flex-col tw:customer:gap-1.5
          tw:customer:justify-center tw:customer:min-w-0 tw:customer:[&>span]:text-[11px]
          tw:customer:[&>span]:text-[#777b70] tw:customer:[&_strong]:text-[14px] tw:customer:[&_strong]:font-semibold
          tw:customer:[&_strong]:[overflow-wrap:anywhere] tw:customer:[&_small]:text-[10px]
          tw:customer:[&_small]:text-[#85887e]"><span>Booked service</span><strong>{row.label}</strong><small>Original price & duration retained</small></div> : <label>Service<NativeSelect value={row.serviceId} onChange={event => { invalidate(); setRows(items => items.map(item => item.key === row.key ? { ...item, serviceId: event.target.value, staffId: "" } : item)); }}>{services.map(service => <NativeSelectOption key={service.id} value={service.id}>{service.name} · PHP {service.price}</NativeSelectOption>)}</NativeSelect></label>}
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
          <section className="appointment-manager-panel tw:customer:min-w-0 tw:customer:p-5.5 tw:customer:[background:#fff]
          tw:customer:[border:1px_solid_#e4e1d6] tw:customer:rounded-[14px] tw:down-600:customer:p-4" aria-label="Date and time">
          <div className="appointment-manager-step tw:customer:flex tw:customer:gap-3 tw:customer:items-start
          tw:customer:[margin:8px_0_18px] tw:customer:[&>span]:grid tw:customer:[&>span]:place-items-center
          tw:customer:[&>span]:shrink-0 tw:customer:[&>span]:text-[10px] tw:customer:[&>span]:font-bold
          tw:customer:[&_p]:text-[12px] tw:customer:[&>span]:w-8 tw:customer:[&>span]:h-8
          tw:customer:[&>span]:rounded-[10px] tw:customer:[&>span]:[background:#30382d] tw:customer:[&>span]:text-[white]
          tw:customer:[&_h3]:text-[17px]"><span>02</span><div><h3>Find your new time</h3><p>All times follow {appointment.timeZone}. Availability is checked again when you confirm.</p></div></div>
          <div className="appointment-manager-date-row tw:customer:grid tw:customer:grid-cols-[minmax(0,1fr)_auto] tw:customer:gap-4
          tw:customer:[align-items:end] tw:customer:mb-4.5 tw:down-600:customer:grid-cols-[minmax(0,1fr)]
          tw:down-600:customer:gap-4 tw:down-600:customer:[&>button]:w-full">
            <label>New visit date<Input type="date" value={date} required onChange={event => { invalidate(); setDate(event.target.value); }} /></label>
            <Button className="appointment-manager-primary" disabled={!rows.length}><CalendarDays size={16} aria-hidden="true" />Find available times</Button>
          </div>
          {slots === null && <div className="appointment-manager-time-placeholder tw:customer:flex tw:customer:items-center tw:customer:justify-center
          tw:customer:gap-3 tw:customer:py-5.5 tw:customer:px-4 tw:customer:[border:1px_dashed_#dedfd4]
          tw:customer:rounded-[10px] tw:customer:[background:#fafaf6] tw:customer:text-[#848b79]
          tw:customer:[&_p]:text-[12px] tw:down-600:customer:justify-start"><Clock3 size={20} aria-hidden="true" /><p>Choose a date and search to see available times.</p></div>}
          {slots && (slots.length ? <div className="appointment-manager-time tw:customer:grid tw:customer:gap-4 tw:customer:my-4 tw:customer:mx-0">
            <fieldset className="appointment-manager-slot-picker tw:customer:[border:0] tw:customer:min-w-0 tw:customer:m-0 tw:customer:p-0
          tw:customer:[&_legend]:w-full tw:customer:[&_legend]:p-0 tw:customer:[&_legend]:mb-3
          tw:customer:[&_legend]:text-[12px] tw:customer:[&_legend]:font-semibold tw:customer:[&_legend]:text-[#51564b]
          tw:customer:[&_legend_span]:[float:right] tw:customer:[&_legend_span]:font-normal
          tw:customer:[&_legend_span]:text-[#73796d] tw:customer:[&_legend_span]:text-[11px]">
              <legend>Choose a start time <span>{slots.length} available</span></legend>
              <div className="appointment-manager-slot-grid tw:customer:grid tw:customer:grid-cols-[repeat(auto-fit,minmax(112px,1fr))]
          tw:customer:gap-2 tw:customer:max-h-[240px] tw:customer:overflow-y-auto tw:customer:p-1">
                {slots.map(slot => <label className={`appointment-manager-slot tw:customer:[&>svg]:opacity-[0] tw:customer:[&>svg]:text-[#fff] tw:customer:[&>svg]:shrink-0 tw:customer:hover:[border-color:#8c987e] tw:customer:hover:[background:#f6f8f2] ${startAt === slot.startAt ? " is-selected" : ""}`} key={slot.startAt}>
                  <input type="radio" name="reschedule-start" value={slot.startAt} checked={startAt === slot.startAt} onChange={() => setStartAt(slot.startAt)} />
                  <span>{time(slot.startAt)}</span><Check size={14} aria-hidden="true" />
                </label>)}
              </div>
            </fieldset>
            {selectedSlot && <div className="appointment-manager-preview tw:customer:py-4.5 tw:customer:px-5 tw:customer:[border:1px_solid_#dbe3d4]
          tw:customer:[background:#f0f4ec] tw:customer:rounded-[12px] tw:customer:[&>span]:flex
          tw:customer:[&>span]:items-center tw:customer:[&>span]:gap-[7px] tw:customer:[&>span]:tracking-[.1em]
          tw:customer:[&>span]:text-[9px] tw:customer:[&>span]:font-bold tw:customer:[&>span]:text-[#6e7b5f]
          tw:customer:[&>span]:mb-[7px] tw:customer:[&>strong]:block tw:customer:[&>strong]:text-[14px]
          tw:customer:[&>strong]:text-[#46553b] tw:customer:[&_ol]:[list-style:none]
          tw:customer:[&_ol]:[padding:12px_0_0] tw:customer:[&_ol]:[margin:14px_0_0]
          tw:customer:[&_ol]:[border-top:1px_solid_#dbe3d4] tw:customer:[&_li]:flex tw:customer:[&_li]:items-start
          tw:customer:[&_li]:gap-2.5 tw:customer:[&_li]:py-1.5 tw:customer:[&_li]:px-0 tw:customer:[&_li]:text-[13px]
          tw:customer:[&_li>svg]:shrink-0 tw:customer:[&_li>svg]:mt-[3px] tw:customer:[&_li>svg]:text-[#6e7b5f]
          tw:customer:[&>p]:text-[11px] tw:customer:[&>p]:mt-1 tw:customer:[&>p]:text-[#65765b]
          tw:customer:[&_li_span]:block tw:customer:[&_li_span]:text-[11px] tw:customer:[&_li_span]:text-[#747d6a]" aria-live="polite"><span><Check size={14} aria-hidden="true" /> YOUR UPDATED VISIT</span><strong>{format(selectedSlot.startAt)}</strong><p>Ends at {time(selectedSlot.endAt)} · {appointment.timeZone}</p><ol>{selectedSlot.services.map((service, index) => <li key={index}><Scissors size={15} aria-hidden="true" /><div>{service.serviceName}<span>with {service.staffName}</span></div></li>)}</ol></div>}
          </div> : <div role="status" className="appointment-manager-empty tw:customer:grid tw:customer:[justify-items:center] tw:customer:gap-2
          tw:customer:text-center tw:customer:py-6.5 tw:customer:px-4.5 tw:customer:[border:1px_dashed_#dfd8c6]
          tw:customer:[background:#faf7ee] tw:customer:rounded-[10px] tw:customer:text-[#92752f]
          tw:customer:[&_strong]:text-[14px] tw:customer:[&_strong]:text-[#5f604f] tw:customer:[&_p]:text-[12px]"><CalendarDays size={22} aria-hidden="true" /><strong>No times available on this date</strong><p>Try another date or choose a different professional.</p></div>)}
          </section>
          <section className="appointment-manager-panel tw:customer:min-w-0 tw:customer:p-5.5 tw:customer:[background:#fff]
          tw:customer:[border:1px_solid_#e4e1d6] tw:customer:rounded-[14px] tw:down-600:customer:p-4
          appointment-manager-note-panel" aria-label="Additional details">
            <label className="appointment-manager-reason tw:customer:my-5 tw:customer:mx-0 tw:customer:[&>span]:flex
          tw:customer:[&>span]:items-center tw:customer:[&>span]:justify-between tw:customer:[&>span]:gap-2.5
          tw:customer:[&_small]:text-[11px] tw:customer:[&_small]:font-normal tw:customer:[&_small]:text-[#73796d]
          tw:customer:[&_textarea]:min-h-19 tw:customer:[&_textarea]:[background:#fff]"><span>Reason for your change <small>Optional</small></span><Textarea maxLength={1000} rows={2} placeholder="Anything you’d like the salon to know?" value={reason} onChange={event => setReason(event.target.value)} /></label>
          </section>
          <div className="appointment-manager-actions tw:customer:flex tw:customer:items-center tw:customer:justify-end
          tw:customer:flex-wrap tw:customer:gap-2.5 tw:customer:[border-top:1px_solid_#e4e1d6] tw:customer:m-0
          tw:customer:pt-5 tw:down-600:customer:[&>button]:flex-1 tw:down-600:customer:[&>button]:min-w-[120px]
          tw:down-600:customer:[&>button]:min-h-11 tw:down-600:customer:[&>button]:whitespace-nowrap">
            <div className="appointment-manager-save-hint tw:customer:flex-1 tw:customer:min-w-[180px] tw:customer:text-[11px]
          tw:customer:text-[#747b6e] tw:down-600:customer:[flex-basis:100%]">{selectedSlot ? "Ready when you are. Review your new visit above." : "Select an available time to continue."}</div>
            <Button variant="outline" type="button" onClick={() => { setEditing(false); invalidate(); }}>Back</Button>
            <Button type="button" className="appointment-manager-primary" disabled={!selectedSlot} onClick={() => void save()}>{recovery ? "Create replacement booking" : "Confirm changes"}</Button>
          </div>
        </fieldset>
      </form>}
      {busy && <p role="status" className="appointment-manager-help appointment-manager-loading"><LoaderCircle size={16} aria-hidden="true" />Updating your booking options…</p>}
      {error && <p role="alert" className="appointment-manager-error">{error}</p>}
    </section>
  );
}
