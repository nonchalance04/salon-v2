import { CalendarDays, Clock3, RefreshCw, Search, Scissors, UserRound } from "lucide-react";
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

export function AdminAppointments({ initialFilters = {}, onSettlement }: {
  initialFilters?: AppointmentFilters;
  onSettlement?: (code: string) => void;
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
    <section className="admin-bookings" aria-labelledby="appointments-title">
      <div className="admin-bookings-heading">
        <div><h2 id="appointments-title">Appointments</h2><p>Find and review salon bookings{zone ? ` · ${zone}` : ""}</p></div>
        <Button variant="outline" disabled={busy} onClick={() => void refresh()}><RefreshCw size={16} aria-hidden="true" />{busy ? "Refreshing…" : "Refresh"}</Button>
      </div>
      <div className="admin-bookings-panel">
        <form className="admin-bookings-filters" onSubmit={event => { event.preventDefault(); setFilters(previous => ({ ...previous, search: search.trim() || undefined })); }}>
          <label className="admin-bookings-search"><span className="sr-only">Customer name or booking code</span><Search size={19} aria-hidden="true" /><Input type="search" maxLength={100} placeholder="Customer name or booking code" value={search} disabled={!ready} onChange={event => setSearch(event.target.value)} /></label>
          <label>Date<Input type="date" value={singleDate} disabled={!ready} onChange={event => setFilters(previous => ({ ...previous, from: event.target.value || undefined, to: event.target.value || undefined }))} /></label>
          <label>Status<NativeSelect aria-label="Status" value={filters.status ?? ""} disabled={!ready} onChange={event => setFilters(previous => ({ ...previous, status: event.target.value || undefined }))}>
            <NativeSelectOption value="">All statuses</NativeSelectOption>
            {Object.entries(statusLabels).map(([status, label]) => <NativeSelectOption key={status} value={status}>{label}</NativeSelectOption>)}
          </NativeSelect></label>
          <Button type="button" variant="outline" disabled={!ready} onClick={() => { setSearch(""); setFilters({}); }}>Clear</Button>
        </form>
        <div className="admin-bookings-results" aria-busy={busy}>
          <div className="admin-bookings-list-heading"><h3>{dateLabel}</h3>
            {filters.attention && <span className="admin-bookings-filter-note">{filters.attention === "unsettled" ? "Unsettled services" : "Active payment holds"}</span>}
            {filters.staffId && <span className="admin-bookings-filter-note">Selected stylist filter active</span>}
          </div>
          {error && <p role="alert" className="error">{error} <Button variant="outline" disabled={busy} onClick={() => void refresh()}>Retry</Button></p>}
          {busy && <p role="status" className="admin-bookings-message">Loading appointments…</p>}
          {!busy && !error && !rows.length && <p className="admin-bookings-message" role="status">No appointments match these filters.</p>}
          {!!rows.length && <div className="admin-bookings-table-scroll"><table>
            <thead><tr><th>{singleDate ? "Time" : "Date / Time"}</th><th>Customer / Booking</th><th>Services / Stylist</th><th>Booking status</th><th>Arrival</th><th>Action</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.bookingCode}>
              <td data-label="Date / Time">{!singleDate && <small>{new Intl.DateTimeFormat("en-PH", { timeZone: row.timeZone, dateStyle: "medium" }).format(new Date(row.startAt))}</small>}<span>{new Intl.DateTimeFormat("en-PH", { timeZone: row.timeZone, timeStyle: "short" }).format(new Date(row.startAt))}</span></td>
              <td data-label="Customer / Booking"><strong>{row.customer.firstName} {row.customer.lastName}</strong><small>{row.bookingCode}</small></td>
              <td data-label="Services / Stylist">{row.appointmentServices.map(service => <div key={service.id}>{service.serviceNameSnapshot} <span className="admin-bookings-stylist">· {service.staff.firstName} {service.staff.lastName}</span></div>)}</td>
              <td data-label="Booking status"><span className={`admin-bookings-status ${row.status.toLowerCase()}`}>{statusLabels[row.status] ?? row.status}</span></td>
              <td data-label="Arrival"><span className={`admin-bookings-status ${row.checkedInAt ? "arrived" : ""}`}>{row.checkedInAt ? "Arrived" : "Not arrived"}</span></td>
              <td data-label="Action"><Button variant="outline" disabled={busy} aria-haspopup="dialog" onClick={event => { detailsTrigger.current = event.currentTarget; setMarking(null); setSelected(row.bookingCode); }}>View details</Button></td>
            </tr>)}</tbody>
          </table></div>}
        </div>
        <div className="admin-bookings-pagination">
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
          className="appointment-details"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            detailsTrigger.current?.focus();
          }}
        >
          <DialogHeader className="appointment-details-header">
            <span className="appointment-details-eyebrow">Appointment details</span>
            <DialogTitle className="appointment-details-title">
              {current.customer.firstName} {current.customer.lastName}
            </DialogTitle>
            <DialogDescription className="appointment-details-reference">
              Booking <span>{current.bookingCode}</span>
            </DialogDescription>
            <Badge variant="secondary" className={`appointment-details-status status-${current.status.toLowerCase()}`}>
              {current.status.replaceAll("_", " ")}
            </Badge>
          </DialogHeader>
          <div className="appointment-details-body">
            <dl className="appointment-details-schedule">
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
            <section className="appointment-details-services" aria-label="Booked services">
              <div className="appointment-details-section-heading">
                <h3><Scissors size={17} aria-hidden="true" /> Booked services</h3>
                <span>{current.appointmentServices.length} {current.appointmentServices.length === 1 ? "service" : "services"}</span>
              </div>
              <ol>
                {current.appointmentServices.map((service, index) => (
                  <li key={service.id}>
                    <span className="appointment-details-sequence" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <div className="appointment-details-service-name">
                      <strong>{service.serviceNameSnapshot}</strong>
                      <span><UserRound size={13} aria-hidden="true" /> {service.staff.firstName} {service.staff.lastName}</span>
                    </div>
                    <strong className="appointment-details-price">{new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(service.priceSnapshot))}</strong>
                  </li>
                ))}
              </ol>
            </section>
            <div className="appointment-details-fee">
              <div><strong>Appointment fee</strong><span>{current.carriedAppointmentFeePaymentId ? "Carried credit applied" : "Booking reservation fee"}</span></div>
              <strong>{new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(current.appointmentFeeAmount))}</strong>
            </div>
            <p className="admin-note muted">Successful PayMongo appointment-fee payments are recorded automatically. View payment history and receipts in Reports.</p>
          {current.status === "PENDING_PAYMENT" && current.holdExpiresAt && (
            <p className="appointment-details-hold">
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
            <section className="appointment-details-arrival" aria-label="Customer arrival">
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
            <p className="admin-note muted">
              Rescheduling follows the booking’s original policy. Changes used:{" "}
              {current.rescheduleCount} /{" "}
              {current.bookingPolicyVersion.maxReschedules}.
            </p>
          )}
          {marking === current.bookingCode && !current.checkedInAt && (
            <div className="admin-warning">
              <p>
                Confirm the customer failed to appear according to salon
                procedure. This releases the reservation and preserves the
                missed visit.
              </p>
              <div className="actions">
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
          <footer className="appointment-details-footer">
            <Button variant="outline" onClick={() => { setSelected(null); setMarking(null); }}>Close details</Button>
          <div className="appointment-details-actions">
            {onSettlement &&
              ["CONFIRMED", "COMPLETED"].includes(current.status) && (
                <Button variant="default"
                  className="primary"
                  disabled={busy}
                  onClick={() => onSettlement(current.bookingCode)}
                >
                  {current.status === "COMPLETED"
                    ? "View settlement / receipt"
                    : "Settle services"}
                </Button>
              )}
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
