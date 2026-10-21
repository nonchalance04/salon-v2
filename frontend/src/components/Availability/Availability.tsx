// Bring in the tools for the availability view so this file can work with the rest of the application.
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/NativeSelect";
import { Link } from "react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Temporal } from "@js-temporal/polyfill";
import { api } from "../../lib/api";
import { BookingForm } from "../BookingForm";
import { AppointmentView } from "../AppointmentView";

// Describe the information used by the availability view so different parts of the application agree on its contents.
type Service = { id: string; name: string; description: string | null; price: string; durationMinutes: number };
type Staff = { id: string; firstName: string; lastName: string; serviceIds: string[] };
type Selection = { key: number; serviceId: string; staffId: string };
type Slot = { startAt: string; endAt: string; services: { sequenceNo: number; serviceId: string; serviceName: string; staffName: string; startAt: string; endAt: string; reservedUntilAt: string; bufferMinutes: number }[] };
type Result = { timeZone: string; generatedAt: string; earliest: string; latest: string; slots: Slot[] };
// Choose a readable error message so the screen can explain what went wrong.
const message = (error: unknown) => error instanceof Error ? error.message : "Please try again.";
// Show the visit search and matching times so staff can find a suitable booking.
export function Availability() {
  // Remember the current choices and screen status so the page can respond as the user works.
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [timeZone, setTimeZone] = useState("");
  const [date, setDate] = useState("");
  const [selections, setSelections] = useState<Selection[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [hour, setHour] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [booked, setBooked] = useState<Parameters<typeof AppointmentView>[0] | null>(null);
  const request = useRef(0);
  const nextKey = useRef(0);
  // Load the saved information so the screen can show current salon records.
  async function load() {
    setLoading(true); setError("");
    try {
      const [catalog, people] = await Promise.all([api<{ services: Service[] }>("/services"), api<{ timeZone: string; staff: Staff[] }>("/availability/staff")]);
      setServices(catalog.services); setStaff(people.staff); setTimeZone(people.timeZone);
      setDate(Temporal.Now.zonedDateTimeISO(people.timeZone).toPlainDate().toString());
      setSelections(catalog.services[0] ? [{ key: nextKey.current++, serviceId: catalog.services[0].id, staffId: "" }] : []);
    } catch (err) { setError(message(err)); }
    finally { setLoading(false); }
  }
  // Load the information this view needs when its inputs change so the displayed results stay current.
  useEffect(() => { void load(); return () => { request.current++; }; }, []);
  // Clear results that depend on earlier choices so an outdated visit cannot be selected.
  function invalidate() { request.current++; setResult(null); setSelected(null); setHour(""); setBusy(false); setError(""); }
  // Apply the changed visit choice and clear dependent results so the next search uses the updated plan.
  function change(key: number, values: Partial<Selection>) {
    invalidate(); setSelections(rows => rows.map(row => row.key === key ? { ...row, ...values } : row));
  }
  // Find the matching choices so the person using this feature can review the available results.
  async function search(event: FormEvent) {
    event.preventDefault();
    const generation = ++request.current;
    setBusy(true); setError(""); setResult(null); setSelected(null); setHour("");
    try {
      const response = await api<Result>("/availability", { method: "POST", body: JSON.stringify({ date,
        services: selections.map(row => row.staffId ? { serviceId: row.serviceId, assignmentMode: "SPECIFIC", staffId: row.staffId } : { serviceId: row.serviceId, assignmentMode: "ANY_AVAILABLE" }),
      }) });
      if (generation !== request.current) return;
      setResult(response);
      if (response.slots[0]) setHour(hourKey(response.slots[0].startAt, response.timeZone));
    } catch (err) { if (generation === request.current) setError(message(err)); }
    finally { if (generation === request.current) setBusy(false); }
  }
  // Format the visit time for display so the schedule can be read in the salon time zone.
  const format = (instant: string) => new Intl.DateTimeFormat(undefined, { timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(instant));
  // Group a start time by its hour so the list of available times can be organized.
  const hourKey = (instant: string, zone = timeZone) => Temporal.Instant.from(instant).toZonedDateTimeISO(zone).toString().slice(0, 13) + Temporal.Instant.from(instant).toZonedDateTimeISO(zone).offset;
  const groups = [...new Map((result?.slots ?? []).map(slot => [hourKey(slot.startAt), slot.startAt])).entries()];
  // Show the prepared content and actions so the user can review the information and continue.
  return <div className="workspace tw:[&_header]:py-6 tw:[&_header]:px-[5vw] tw:[&_header]:[border-bottom:1px_solid_#dce0d8]
          tw:[&_header]:flex tw:[&_header]:justify-between tw:[&_header]:items-center tw:[&_header]:[background:#fff]
          tw:[&_header_.wordmark]:text-[23px] tw:down-760:[&_header]:p-5"><header><Link className="wordmark tw:text-[27px] tw:tracking-[.16em] tw:no-underline tw:font-semibold tw:inline-flex tw:flex-col
          tw:[&_span]:text-[10px] tw:[&_span]:tracking-[.5em] tw:[&_span]:mt-1.5 tw:[.intro_&]:self-start
          tw:leading-[1.2]" to="/availability">CLIQUE<span>SALON</span></Link><Link to="/">Staff sign in</Link><Link to="/help">Salon help</Link></header>
    <main className="workspace-main tw:m-auto tw:[padding:60px_32px_80px] tw:[&>h1]:text-[46px] tw:[&>h1]:mb-2 tw:down-760:py-9.5
          tw:down-760:px-5 tw:down-760:[&>h1]:text-[38px] availability-page tw:max-w-[1000px]"><p className="eyebrow public:text-[12px] public:tracking-[0.17em] public:font-bold public:text-[#987b1f]
          public:down-639:text-[11px] tw:text-[11px] tw:tracking-[.18em] tw:font-bold tw:mb-5 tw:[.cashier-main>&]:mb-2.5">MAKE TIME FOR YOURSELF</p><h1>Find your salon time.</h1>
      <p className="welcome tw:text-[#64736b] tw:mb-[55px] tw:down-760:mb-[35px] tw:[.cashier-main>&]:mb-6">Choose your services in the order you’d like them, then find a time that fits.</p>
      {booked ? <AppointmentView initial={booked.initial} token={booked.token} /> : <fieldset disabled={bookingBusy} className="booking-selection tw:[border:0] tw:p-0 tw:m-0 tw:min-w-0">
      {loading ? <p role="status">Loading services…</p> : <>
        {timeZone && <p className="muted">All dates and times are in {timeZone}.</p>}
        {!timeZone ? <Button variant="outline" onClick={() => void load()}>Retry loading services</Button> : !services.length ? <p>No services are available yet. Please check back later.</p> : <form onSubmit={search} className="account-form tw:[border:1px_solid_#dce0d8] tw:[background:white] tw:p-7 tw:rounded-[10px] tw:mb-[25px]
          tw:down-760:p-5">
          <h2>Your visit</h2>
          {selections.map((row, index) => {
            const service = services.find(s => s.id === row.serviceId);
            // Show the prepared content and actions so the user can review the information and continue.
            return <fieldset key={row.key} className="visit-service tw:rounded-[12px] tw:p-4.5 tw:my-4 tw:mx-0 tw:min-w-0 tw:[&_legend]:font-semibold
          tw:[&_legend]:py-0 tw:[&_legend]:px-2"><legend>Service {index + 1}</legend><div className="form-grid tw:grid tw:grid-cols-[1fr_1fr] tw:gap-[0_24px] tw:down-760:grid-cols-[1fr]">
              <label>Service<NativeSelect value={row.serviceId} onChange={e => change(row.key, { serviceId: e.target.value, staffId: "" })}>{services.map(s => <NativeSelectOption key={s.id} value={s.id}>{s.name} · PHP {s.price} · {s.durationMinutes} min</NativeSelectOption>)}</NativeSelect></label>
              <label>Staff<NativeSelect value={row.staffId} onChange={e => change(row.key, { staffId: e.target.value })}><NativeSelectOption value="">Any available staff</NativeSelectOption>{staff.filter(s => s.serviceIds.includes(row.serviceId)).map(s => <NativeSelectOption key={s.id} value={s.id}>{s.firstName} {s.lastName}</NativeSelectOption>)}</NativeSelect></label>
            </div>{service?.description && <p className="muted">{service.description}</p>}
              <div className="actions tw:flex tw:gap-3"><Button variant="outline" type="button" disabled={index === 0} aria-label={`Move service ${index + 1} earlier`} onClick={() => { invalidate(); setSelections(rows => { const copy = [...rows]; [copy[index - 1], copy[index]] = [copy[index]!, copy[index - 1]!]; return copy; }); }}>Move earlier</Button>
                <Button variant="outline" type="button" disabled={selections.length === 1} aria-label={`Remove service ${index + 1}`} onClick={() => { invalidate(); setSelections(rows => rows.filter(s => s.key !== row.key)); }}>Remove</Button></div>
            </fieldset>;
          })}
          <Button variant="outline" type="button" disabled={selections.length >= 20} onClick={() => { invalidate(); setSelections(rows => [...rows, { key: nextKey.current++, serviceId: services[0]!.id, staffId: "" }]); }}>+ Add another service</Button>
          <label className="visit-date tw:max-w-[320px] tw:mt-6">Visit date<Input type="date" required value={date} onChange={e => { invalidate(); setDate(e.target.value); }} /></label>
          <p className="muted">Services run one after another, including any buffer between them.</p>
          <Button variant="default" className="primary tw:[background:#203c34] tw:text-[white] tw:[border-color:#203c34] tw:hover:[background:#31584c]
          tw:[.login-card_&]:w-full tw:[.login-card_&]:mt-1.5" disabled={busy || !selections.length}>{busy ? "Finding times…" : "Find available times"}</Button>
        </form>}
      </>}
      {error && <p role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">{error}</p>}
      {result && <section className="availability-results tw:mt-8 tw:[&_>_label]:max-w-[320px]" aria-labelledby="times-title"><h2 id="times-title">Available starting times</h2>
        <p className="muted">Times are advisory. Availability will be checked again when you submit a booking.</p>
        {!result.slots.length ? <p role="status">No times match this visit. Try another date, different staff, or fewer services.</p> : <>
          <label>Browse by hour<NativeSelect value={hour} onChange={e => setHour(e.target.value)}>{groups.map(([key, instant]) => <NativeSelectOption key={key} value={key}>{new Intl.DateTimeFormat(undefined, { timeZone, hour: "numeric", timeZoneName: "short" }).format(new Date(instant))}</NativeSelectOption>)}</NativeSelect></label>
          <div className="time-options tw:customer:grid tw:customer:grid-cols-3 tw:flex tw:flex-wrap tw:gap-2 tw:my-5 tw:mx-0
          tw:[&_button[aria-pressed=true]]:[background:#315949] tw:[&_button[aria-pressed=true]]:text-[white]
          tw:[&_button[aria-pressed=true]]:[border-color:#315949]" aria-label="Available starting times">{result.slots.filter(slot => hourKey(slot.startAt) === hour).map(slot => <Button variant="outline" type="button" key={slot.startAt} aria-pressed={selected?.startAt === slot.startAt} onClick={() => setSelected(slot)}>{format(slot.startAt)}</Button>)}</div>
        </>}
        {selected && <section className="visit-summary tw:customer:[background:white] tw:customer:[border:1px_solid_#ddddd7] tw:customer:rounded-[20px]
          tw:customer:mt-0 tw:[background:#eef3ef] tw:p-6 tw:rounded-[12px] tw:mt-6 tw:[&_li]:py-2 tw:[&_li]:px-0
          tw:[&_input[readonly]]:w-full tw:[&_input[readonly]]:box-border tw:workspace-main:[background:#fff]
          tw:workspace-main:[border:1px_solid_#e3e3e3]" aria-label="Selected visit"><h3>Your selected visit</h3><p>{date} · {format(selected.startAt)} – {format(selected.endAt)}</p>
          <ol>{selected.services.map(s => <li key={s.sequenceNo}><strong>{s.serviceName}</strong> with {s.staffName}<br />{format(s.startAt)} – {format(s.endAt)}{s.bufferMinutes > 0 && <span className="muted"> · {s.bufferMinutes} min buffer, through {format(s.reservedUntilAt)}</span>}</li>)}</ol>
          {/* Collect customer contact details so the selected visit can be reserved and linked to its customer. */}
          <BookingForm key={selected.startAt} plan={{ date, startAt: selected.startAt, services: selections.map(row => row.staffId ? { serviceId: row.serviceId, assignmentMode: "SPECIFIC", staffId: row.staffId } : { serviceId: row.serviceId, assignmentMode: "ANY_AVAILABLE" }) }} onBusy={setBookingBusy} onBooked={response => setBooked({ initial: response.appointment, token: response.guestToken })} /></section>}
      </section>}
      </fieldset>}
    </main><footer>Clique Salon · A little care. A beautiful day.</footer></div>;
}
