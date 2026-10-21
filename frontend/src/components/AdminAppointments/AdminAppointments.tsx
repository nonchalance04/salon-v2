import { CalendarDays, Clock3, Search, Scissors, UserRound } from "lucide-react";
import "./AdminAppointments.css";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/NativeSelect";
import { Badge } from "@/components/ui/Badge";
import { NoShowCorrection } from "../NoShowCorrection";
import { AppointmentCheckIn } from "../AppointmentCheckIn";
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import type { Appointment } from "../../types/booking";
import type { AppointmentFilters } from "../../types/appointment-filters";

const message = (error: unknown) => error instanceof Error ? error.message : "Please try again.";
const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: "Pending payment", CONFIRMED: "Confirmed", COMPLETED: "Completed",
  CANCELLED: "Cancelled", NO_SHOW: "No-show", EXPIRED: "Expired",
};

export function AdminAppointments({ initialFilters = {} }: {
  initialFilters?: AppointmentFilters;
}) {
  const [rows, setRows] = useState<Appointment[]>([]);
  const [filters, setFilters] = useState<AppointmentFilters>(initialFilters);
  const [search, setSearch] = useState(initialFilters.search ?? "");
  const [ready, setReady] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [pageStarts, setPageStarts] = useState<(string | undefined)[]>([undefined]);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [marking, setMarking] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [zone, setZone] = useState("");
  const generation = useRef(0);
  const detailsTrigger = useRef<HTMLButtonElement | null>(null);

  async function load(next?: string, queryFilters = filters, targetPage = 0) {
    const attempt = ++generation.current;
    setBusy(true);
    setError("");
    const query = new URLSearchParams(Object.entries(queryFilters).filter(([, value]) => Boolean(value)) as [string, string][]);
    if (next) query.set("cursor", next);
    try {
      const result = await api<{ appointments: Appointment[]; nextCursor: string | null }>(`/appointments?${query}`);
      if (attempt !== generation.current) return;
      setRows(result.appointments);
      setCursor(result.nextCursor);
      setPage(targetPage);
      setPageStarts(previous => [...previous.slice(0, targetPage), next]);
    } catch (err) {
      if (attempt === generation.current) setError(message(err));
    } finally {
      if (attempt === generation.current) setBusy(false);
    }
  }
  async function initialize() {
    const attempt = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const salon = await api<{ timeZone: string }>("/salon");
      if (attempt !== generation.current) return;
      setZone(salon.timeZone);
      if (!Object.keys(initialFilters).length) {
        const today = new Intl.DateTimeFormat("en-CA", { timeZone: salon.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
        setFilters({ from: today, to: today });
      }
      setReady(true);
    } catch (err) {
      if (attempt === generation.current) { setError(message(err)); setBusy(false); }
    }
  }
  useEffect(() => {
    void initialize();
    return () => { generation.current++; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    setRows([]);
    setCursor(null);
    setPage(0);
    setPageStarts([undefined]);
    setSelected(null);
    void load(undefined, filters);
    return () => { generation.current++; };
  }, [filters, ready]);
  useEffect(() => {
    if (search.trim() === (filters.search ?? "")) return;
    const timer = window.setTimeout(() => setFilters(previous => ({ ...previous, search: search.trim() || undefined })), 350);
    return () => window.clearTimeout(timer);
  }, [search, filters.search]);
  const refresh = () => ready ? load(pageStarts[page], filters, page) : initialize();
  async function mark(code: string) {
    setBusy(true);
    setError("");
    try {
      await api("/appointments/no-show", { method: "POST", body: JSON.stringify({ bookingCode: code }) });
      setMarking(null);
      await refresh();
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }
  const current = rows.find(row => row.bookingCode === selected);
  const singleDate = filters.from && filters.from === filters.to ? filters.from : "";
  const dateLabel = singleDate
    ? new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${singleDate}T12:00:00Z`))
    : filters.from || filters.to ? `${filters.from ?? "Any date"} through ${filters.to ?? "Any date"}` : "All appointments";
  return (
    <section className="admin-bookings tw:min-w-0 tw:[&_table]:whitespace-normal tw:[&_table]:table-fixed
          tw:workspace-main:[&_th]:normal-case tw:workspace-main:[&_th]:tracking-[0] tw:workspace-main:[&_th]:text-[12px]
          tw:workspace-main:[&_th]:font-semibold tw:workspace-main:[&_th]:text-[#655e70]
          tw:workspace-main:[&_th]:[background:#f5f3f6] tw:workspace-main:[&_th]:py-4.5 tw:workspace-main:[&_th]:px-3
          tw:workspace-main:[&_td]:py-4.5 tw:workspace-main:[&_td]:px-3 tw:workspace-main:[&_th]:[overflow-wrap:anywhere]
          tw:workspace-main:[&_td]:[overflow-wrap:anywhere] tw:[&_td]:text-[13px] tw:[&_td]:align-middle
          tw:[&_td_small]:block tw:[&_td_small]:mt-1 tw:[&_td_small]:text-[11px] tw:[&_td_button]:[border-color:#bda3b7]
          tw:[&_td_button]:px-2.5 tw:[&_td_button]:text-[12px] tw:[&_td_button]:whitespace-nowrap
          tw:down-1200:[&_table]:min-w-[780px] tw:down-700:[&_table]:block tw:down-700:[&_tbody]:block
          tw:down-700:[&_table]:min-w-0 tw:down-700:[&_tbody]:min-w-0 tw:down-700:[&_thead]:absolute
          tw:down-700:[&_thead]:w-[1px] tw:down-700:[&_thead]:h-[1px] tw:down-700:[&_thead]:overflow-hidden
          tw:down-700:[&_tr]:grid tw:down-700:[&_tr]:grid-cols-[1fr_1fr] tw:down-700:[&_tr]:gap-3.5
          tw:down-700:[&_tr]:py-4.5 tw:down-700:[&_tr]:px-0 tw:down-700:[&_tr]:[border-top:1px_solid_#eae7ed]
          tw:down-700:workspace-main:[&_td]:block tw:down-700:workspace-main:[&_td]:p-0
          tw:down-700:workspace-main:[&_td]:[border:0] tw:down-700:workspace-main:[&_td]:min-w-0
          tw:down-700:[&_td_button]:w-full" aria-labelledby="appointments-title">
      <div className="admin-bookings-heading tw:flex tw:justify-between tw:items-center tw:gap-5 tw:mb-6
          tw:workspace-main:[&_h2]:[margin:0_0_7px] tw:workspace-main:[&_h2]:text-[30px] tw:[&_p]:m-0
          tw:[&_p]:text-[#77717c] tw:[&_p]:text-[14px] tw:down-700:items-start">
        <div><h2 id="appointments-title">Appointments</h2><p>Find and review salon bookings{zone ? ` · ${zone}` : ""}</p></div>
      </div>
      <div className="admin-bookings-panel tw:[background:#fff] tw:[border:1px_solid_#e5e3e8] tw:rounded-[12px] tw:overflow-hidden">
        <form className="admin-bookings-filters tw:grid tw:grid-cols-[minmax(200px,1fr)_175px_190px_auto] tw:gap-4 tw:[align-items:end]
          tw:p-6 tw:[border-bottom:1px_solid_#eae7ed] tw:[&_label]:m-0 tw:[&_label]:min-w-0 tw:[&_label]:text-[12px]
          tw:[&_label]:font-medium tw:[&_label]:gap-1.5 tw:[&_input]:min-h-10.5 tw:[&_select]:min-h-10.5
          tw:[&_input]:w-full tw:[&_select]:w-full tw:[&_input]:text-[13px] tw:[&_select]:text-[13px]
          tw:[&_button]:min-h-10.5 tw:[&_button]:[border-color:#bda3b7]
          tw:down-1200:grid-cols-[minmax(170px,1fr)_160px_170px] tw:down-1200:[&_>_button]:[grid-column:3]
          tw:down-1200:[&_>_button]:[justify-self:end] tw:down-700:grid-cols-[1fr_1fr] tw:down-700:p-4.5
          tw:down-700:gap-3.5 tw:down-700:[&_>_button]:[grid-column:2]" onSubmit={event => { event.preventDefault(); setFilters(previous => ({ ...previous, search: search.trim() || undefined })); }}>
          <label className="admin-bookings-search tw:relative tw:[&_>_svg]:absolute tw:[&_>_svg]:left-[13px] tw:[&_>_svg]:top-3
          tw:[&_>_svg]:text-[#807987] tw:[&_>_svg]:pointer-events-none tw:[&_input]:pl-10
          tw:down-700:[grid-column:1_/_-1]"><span className="sr-only tw:absolute tw:w-[1px] tw:h-[1px] tw:overflow-hidden">Customer name or booking code</span><Search size={19} aria-hidden="true" /><Input type="search" maxLength={100} placeholder="Customer name or booking code" value={search} disabled={!ready} onChange={event => setSearch(event.target.value)} /></label>
          <label>Date<Input type="date" value={singleDate} disabled={!ready} onChange={event => setFilters(previous => ({ ...previous, from: event.target.value || undefined, to: event.target.value || undefined }))} /></label>
          <label>Status<NativeSelect aria-label="Status" value={filters.status ?? ""} disabled={!ready} onChange={event => setFilters(previous => ({ ...previous, status: event.target.value || undefined }))}>
            <NativeSelectOption value="">All statuses</NativeSelectOption>
            {Object.entries(statusLabels).map(([status, label]) => <NativeSelectOption key={status} value={status}>{label}</NativeSelectOption>)}
          </NativeSelect></label>
          <Button type="button" variant="outline" disabled={!ready} onClick={() => { setSearch(""); setFilters({}); }}>Clear</Button>
        </form>
        <div className="admin-bookings-results tw:[padding:20px_24px_0] tw:down-700:[padding:18px_18px_0]" aria-busy={busy}>
          <div className="admin-bookings-list-heading tw:flex tw:gap-2.5 tw:flex-wrap tw:items-center tw:mb-4 tw:[&_h3]:m-0
          tw:[&_h3]:text-[18px]"><h3>{dateLabel}</h3>
            {filters.attention && <span className="admin-bookings-filter-note tw:py-1 tw:px-[9px] tw:rounded-[6px] tw:[background:#fff6e5] tw:text-[#80551c]
          tw:text-[12px]">{filters.attention === "unsettled" ? "Unsettled services" : "Active payment holds"}</span>}
            {filters.staffId && <span className="admin-bookings-filter-note tw:py-1 tw:px-[9px] tw:rounded-[6px] tw:[background:#fff6e5] tw:text-[#80551c]
          tw:text-[12px]">Selected stylist filter active</span>}
          </div>
          {error && <p role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">{error} <Button variant="outline" disabled={busy} onClick={() => void refresh()}>Retry</Button></p>}
          {busy && <p role="status" className="admin-bookings-message tw:py-5 tw:px-0 tw:text-[#77717c] tw:text-[14px]">Loading appointments…</p>}
          {!busy && !error && !rows.length && <p className="admin-bookings-message tw:py-5 tw:px-0 tw:text-[#77717c] tw:text-[14px]" role="status">No appointments match these filters.</p>}
          {!!rows.length && <div className="admin-bookings-table-scroll tw:overflow-x-auto"><table>
            <thead><tr><th>{singleDate ? "Time" : "Date / Time"}</th><th>Customer / Booking</th><th>Services / Stylist</th><th>Booking status</th><th>Arrival</th><th>Action</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.bookingCode}>
              <td data-label="Date / Time">{!singleDate && <small>{new Intl.DateTimeFormat("en-PH", { timeZone: row.timeZone, dateStyle: "medium" }).format(new Date(row.startAt))}</small>}<span>{new Intl.DateTimeFormat("en-PH", { timeZone: row.timeZone, timeStyle: "short" }).format(new Date(row.startAt))}</span></td>
              <td data-label="Customer / Booking"><strong>{row.customer.firstName} {row.customer.lastName}</strong><small>{row.bookingCode}</small></td>
              <td data-label="Services / Stylist">{row.appointmentServices.map(service => <div key={service.id}>{service.serviceNameSnapshot} <span className="admin-bookings-stylist tw:text-[#77717c]">· {service.staff.firstName} {service.staff.lastName}</span></div>)}</td>
              <td data-label="Booking status"><span className={`admin-bookings-status tw:inline-block tw:py-[5px] tw:px-2.5 tw:rounded-[16px] tw:[background:#f0eef2] tw:text-[#696472] tw:text-[11px] tw:[&.confirmed]:text-[#276744] tw:[&.arrived]:text-[#276744] tw:[&.confirmed]:[background:#e6f5e9] tw:[&.arrived]:[background:#e6f5e9] tw:[&.completed]:text-[#74419b] tw:[&.completed]:[background:#f0e6fb] tw:[&.pending_payment]:text-[#88571c] tw:[&.pending_payment]:[background:#fff2da] tw:[&.cancelled]:text-[#99445b] tw:[&.no_show]:text-[#99445b] tw:[&.cancelled]:[background:#fbe9ed] tw:[&.no_show]:[background:#fbe9ed]  ${row.status.toLowerCase()}`}>{statusLabels[row.status] ?? row.status}</span></td>
              <td data-label="Arrival"><span className={`admin-bookings-status tw:inline-block tw:py-[5px] tw:px-2.5 tw:rounded-[16px] tw:[background:#f0eef2] tw:text-[#696472] tw:text-[11px] tw:[&.confirmed]:text-[#276744] tw:[&.arrived]:text-[#276744] tw:[&.confirmed]:[background:#e6f5e9] tw:[&.arrived]:[background:#e6f5e9] tw:[&.completed]:text-[#74419b] tw:[&.completed]:[background:#f0e6fb] tw:[&.pending_payment]:text-[#88571c] tw:[&.pending_payment]:[background:#fff2da] tw:[&.cancelled]:text-[#99445b] tw:[&.no_show]:text-[#99445b] tw:[&.cancelled]:[background:#fbe9ed] tw:[&.no_show]:[background:#fbe9ed]  ${row.checkedInAt ? "arrived" : ""}`}>{row.checkedInAt ? "Arrived" : "Not arrived"}</span></td>
              <td data-label="Action"><Button variant="outline" disabled={busy} aria-haspopup="dialog" onClick={event => { detailsTrigger.current = event.currentTarget; setMarking(null); setSelected(row.bookingCode); }}>View details</Button></td>
            </tr>)}</tbody>
          </table></div>}
        </div>
        <div className="admin-bookings-pagination tw:flex tw:justify-between tw:items-center tw:gap-4 tw:[border-top:1px_solid_#eae7ed]
          tw:py-5 tw:px-6 tw:text-[12px] tw:text-[#77717c] tw:[&_>_div]:flex tw:[&_>_div]:gap-2.5 tw:down-700:p-4.5
          tw:down-700:flex-wrap">
          <span>{rows.length ? `Showing ${page * 50 + 1}–${page * 50 + rows.length} appointments` : "0 appointments"}{cursor ? " · More available" : ""}</span>
          <div><Button variant="outline" disabled={busy || page === 0} onClick={() => void load(pageStarts[page - 1], filters, page - 1)}>Previous</Button><Button variant="outline" disabled={busy || !cursor} onClick={() => cursor && void load(cursor, filters, page + 1)}>Next</Button></div>
        </div>
      </div>
      <Dialog
        open={Boolean(current)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setMarking(null);
          }
        }}
      >
      {current && (
        <DialogContent
          className="appointment-details tw:[&_h3]:m-0 tw:[&_h3]:text-[14px] tw:[&_.actions]:flex tw:[&_.actions]:flex-wrap
          tw:[&_.actions]:gap-2"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            detailsTrigger.current?.focus();
          }}
        >
          <DialogHeader className="appointment-details-header tw:shrink-0">
            <span className="appointment-details-eyebrow tw:text-[11px] tw:font-bold tw:tracking-[.12em] tw:uppercase tw:text-[#85702d]">Appointment details</span>
            <DialogTitle className="appointment-details-title">
              {current.customer.firstName} {current.customer.lastName}
            </DialogTitle>
            <DialogDescription className="appointment-details-reference tw:[&_span]:[font-family:ui-monospace,monospace] tw:[&_span]:text-[#414141]">
              Booking <span>{current.bookingCode}</span>
            </DialogDescription>
            <Badge variant="secondary" className={`appointment-details-status tw:mt-1 tw:text-[10px] tw:tracking-[.05em] tw:py-[5px] tw:px-2.5 tw:[&.status-confirmed]:[background:#e8f0fc] tw:[&.status-confirmed]:text-[#285ba1] tw:[&.status-completed]:[background:#e5f3e9] tw:[&.status-completed]:text-[#24653d] tw:[&.status-pending_payment]:[background:#fff0d7] tw:[&.status-pending_payment]:text-[#7b500d] tw:[&.status-no_show]:[background:#ffe9e6] tw:[&.status-no_show]:text-[#a13324]  status-${current.status.toLowerCase()}`}>
              {current.status.replaceAll("_", " ")}
            </Badge>
          </DialogHeader>
          <div className="appointment-details-body tw:py-6 tw:px-7 tw:grid tw:gap-5.5 tw:min-w-0 tw:down-580:p-5 tw:overflow-y-auto
          tw:min-h-0">
            <dl className="appointment-details-schedule tw:grid tw:grid-cols-[1fr_1fr] tw:gap-6 tw:m-0 tw:[&_dt]:flex
          tw:[&_dt]:items-center tw:[&_dt]:gap-2 tw:[&_dt]:text-[12px] tw:[&_dt]:text-[#686868] tw:[&_dt]:mb-2
          tw:[&_dd]:m-0 tw:[&_dd]:text-[14px] tw:[&_dd]:font-semibold tw:[&_small]:block tw:[&_small]:mt-1
          tw:[&_small]:text-[#777] tw:[&_small]:text-[11px] tw:down-580:grid-cols-[1fr] tw:down-580:gap-4">
              <div>
                <dt><CalendarDays size={16} aria-hidden="true" /> Appointment date</dt>
                <dd>{new Intl.DateTimeFormat("en-PH", { timeZone: current.timeZone, dateStyle: "full" }).format(new Date(current.startAt))}</dd>
              </div>
              <div>
                <dt><Clock3 size={16} aria-hidden="true" /> Scheduled time</dt>
                <dd>{new Intl.DateTimeFormat("en-PH", { timeZone: current.timeZone, timeStyle: "short" }).format(new Date(current.startAt))} – {new Intl.DateTimeFormat("en-PH", { timeZone: current.timeZone, timeStyle: "short" }).format(new Date(current.endAt))}</dd>
                <small>{current.timeZone}</small>
              </div>
            </dl>
            <section className="appointment-details-services tw:[&_ol]:[list-style:none] tw:[&_ol]:m-0 tw:[&_ol]:py-0 tw:[&_ol]:px-4
          tw:[&_ol]:[border:1px_solid_#e8e8e8] tw:[&_ol]:rounded-[12px] tw:[&_li]:flex tw:[&_li]:items-center
          tw:[&_li]:gap-3 tw:[&_li]:py-4 tw:[&_li]:px-0 tw:down-580:[&_li]:flex-wrap" aria-label="Booked services">
              <div className="appointment-details-section-heading tw:flex tw:items-center tw:justify-between tw:gap-3 tw:mb-3 tw:[&_h3]:flex
          tw:[&_h3]:items-center tw:[&_h3]:gap-2 tw:[&_>_span]:text-[#777] tw:[&_>_span]:text-[12px]">
                <h3><Scissors size={17} aria-hidden="true" /> Booked services</h3>
                <span>{current.appointmentServices.length} {current.appointmentServices.length === 1 ? "service" : "services"}</span>
              </div>
              <ol>
                {current.appointmentServices.map((service, index) => (
                  <li key={service.id}>
                    <span className="appointment-details-sequence tw:w-7.5 tw:h-7.5 tw:shrink-0 tw:grid tw:place-items-center tw:rounded-[8px]
          tw:[background:#f5f4ee] tw:text-[#8b7840] tw:text-[11px] tw:font-semibold" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <div className="appointment-details-service-name tw:flex-1 tw:min-w-0 tw:[&_strong]:block tw:[&_strong]:text-[14px]
          tw:[&_>_span]:flex tw:[&_>_span]:items-center tw:[&_>_span]:gap-[5px] tw:[&_>_span]:mt-[5px]
          tw:[&_>_span]:text-[12px] tw:[&_>_span]:text-[#777]">
                      <strong>{service.serviceNameSnapshot}</strong>
                      <span><UserRound size={13} aria-hidden="true" /> {service.staff.firstName} {service.staff.lastName}</span>
                    </div>
                    <strong className="appointment-details-price tw:text-[13px] tw:tabular-nums tw:text-right tw:down-580:ml-auto">{new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(service.priceSnapshot))}</strong>
                  </li>
                ))}
              </ol>
            </section>
            <div className="appointment-details-fee tw:flex tw:justify-between tw:items-center tw:gap-4 tw:p-4 tw:[background:#faf8ef]
          tw:[border:1px_solid_#ece6ce] tw:rounded-[12px] tw:text-[14px] tw:[&_span]:block tw:[&_span]:mt-1
          tw:[&_span]:text-[12px] tw:[&_span]:text-[#827957] tw:[&_>_strong]:text-[17px] tw:[&_>_strong]:tabular-nums
          tw:[&_>_strong]:text-right">
              <div><strong>Appointment fee</strong><span>{current.carriedAppointmentFeePaymentId ? "Carried credit applied" : "Booking reservation fee"}</span></div>
              <strong>{new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(current.appointmentFeeAmount))}</strong>
            </div>
            <p className="admin-note tw:[.appointment-details_&]:m-0 tw:[.appointment-details_&]:text-[12px]
          tw:[.appointment-details_&]:text-[#777] tw:text-[13px] tw:mt-4.5 tw:mb-0
          tw:[.appointment-details_&]:leading-[1.6] muted">Successful PayMongo appointment-fee payments are recorded automatically. View payment history and receipts in Reports.</p>
          {current.status === "PENDING_PAYMENT" && current.holdExpiresAt && (
            <p className="appointment-details-hold tw:m-0 tw:text-[13px] tw:text-[#686868] tw:leading-[1.6]">
              Payment hold{" "}
              {Date.parse(current.holdExpiresAt) <
              Date.parse(current.serverTime)
                ? "expired"
                : "expires"}{" "}
              at{" "}
              {new Intl.DateTimeFormat("en-PH", {
                timeZone: current.timeZone,
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(current.holdExpiresAt))}
              .
            </p>
          )}
          {current.status === "CONFIRMED" && (
            <section className="appointment-details-arrival tw:pt-5 tw:[border-top:1px_solid_#eee] tw:[&_h3]:mb-3 tw:[&_p]:m-0
          tw:[&_p]:text-[13px] tw:[&_p]:text-[#686868] tw:[&_fieldset]:m-0 tw:[&_fieldset]:p-4
          tw:[&_fieldset]:[border:1px_solid_#e3e3e3] tw:[&_fieldset]:rounded-[10px]
          tw:[&_fieldset_button]:[margin:12px_8px_0_0] tw:[&_p]:leading-[1.6]" aria-label="Customer arrival">
            <h3>Customer arrival</h3>
            <AppointmentCheckIn
              bookingCode={current.bookingCode}
              customerName={`${current.customer.firstName} ${current.customer.lastName}`}
              startAt={current.startAt}
              checkedInAt={current.checkedInAt}
              checkedInByUser={current.checkedInByUser}
              timeZone={current.timeZone}
              disabled={busy}
              onCheckedIn={() => {
                setMarking(null);
                void refresh();
              }}
            />
            </section>
          )}
          {current.status === "NO_SHOW" && !current.recoveryAppointment && (
            <NoShowCorrection
              key={current.bookingCode}
              bookingCode={current.bookingCode}
              customerName={`${current.customer.firstName} ${current.customer.lastName}`}
              disabled={busy}
              onCorrected={() => void refresh()}
            />
          )}
          {current.status === "CONFIRMED" && (
            <p className="admin-note tw:[.appointment-details_&]:m-0 tw:[.appointment-details_&]:text-[12px]
          tw:[.appointment-details_&]:text-[#777] tw:text-[13px] tw:mt-4.5 tw:mb-0
          tw:[.appointment-details_&]:leading-[1.6] muted">
              Rescheduling follows the booking’s original policy. Changes used:{" "}
              {current.rescheduleCount} /{" "}
              {current.bookingPolicyVersion.maxReschedules}.
            </p>
          )}
          {marking === current.bookingCode && !current.checkedInAt && (
            <div className="admin-warning tw:[.appointment-details_&]:m-0 tw:[.appointment-details_&]:text-[13px] tw:p-4.5 tw:mt-5
          tw:[border:1px_solid_#dfb783] tw:[background:#fff8e8] tw:rounded-[8px]">
              <p>
                Confirm the customer failed to appear according to salon
                procedure. This releases the reservation and preserves the
                missed visit.
              </p>
              <div className="actions tw:flex tw:gap-3">
                <Button variant="outline"
                  disabled={busy}
                  onClick={() => void mark(current.bookingCode)}
                >
                  Confirm no-show
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => setMarking(null)}>
                  Keep confirmed
                </Button>
              </div>
            </div>
          )}
          </div>
          <footer className="appointment-details-footer tw:flex tw:items-center tw:justify-between tw:gap-3 tw:py-4.5 tw:px-7
          tw:[background:#fafafa] tw:[border-top:1px_solid_#e9e9e9] tw:[&_button]:text-[12px] tw:down-580:py-4
          tw:down-580:px-5 tw:down-580:flex-col-reverse tw:down-580:items-stretch tw:shrink-0 tw:flex-wrap
          tw:[&_>_button]:shrink-0">
            <Button variant="outline" onClick={() => { setSelected(null); setMarking(null); }}>Back to Appointments</Button>
          <div className="appointment-details-actions tw:flex tw:flex-wrap tw:justify-end tw:gap-2 tw:[&:empty]:hidden
          tw:down-580:flex-col tw:flex-1">
            {current.status === "CONFIRMED" &&
              !current.checkedInAt &&
              Date.parse(current.startAt) <= Date.parse(current.serverTime) && (
                <Button variant="outline"
                  disabled={busy}
                  onClick={() => setMarking(current.bookingCode)}
                >
                  Mark no-show
                </Button>
              )}
          </div>
          </footer>
        </DialogContent>
      )}
      </Dialog>
    </section>
  );
}
