import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, CalendarDays, Check, Coins, CreditCard, RefreshCw, Scissors, TriangleAlert, UsersRound, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api } from "../../lib/api";
import type { Appointment } from "../../types/booking";
import type { AppointmentFilters } from "../../types/appointment-filters";
import "./AdminDashboard.css";

type Dashboard = {
  timeZone: string;
  appointments: { status: string; count: number }[];
  finalizedCommissions: string;
  commissionCount: number;
  attention: { unsettled: number };
};
type Collections = {
  totals: { currency: string; captured: string; netCashMovement: string }[];
  typeTotals: { currency: string; type: string; captured: string }[];
};
type Snapshot = { dashboard: Dashboard; collections: Collections; appointments: Appointment[]; date: string; updated: Date };
const money = (value: string, currency = "PHP") => new Intl.NumberFormat("en-PH", { style: "currency", currency }).format(Number(value));
const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: "Pending payment", CONFIRMED: "Confirmed", COMPLETED: "Completed",
  CANCELLED: "Cancelled", NO_SHOW: "No-show", EXPIRED: "Expired",
};

function Metric({ icon: Icon, label, value, tone = "plum", children }: {
  icon: LucideIcon; label: string; value: string | number; tone?: string; children?: ReactNode;
}) {
  return <article className="admin-overview-metric">
    <div className="admin-overview-metric-top">
      <span className={`admin-overview-icon ${tone}`}><Icon size={23} aria-hidden="true" /></span>
      <div><p>{label}</p><strong>{value}</strong></div>
    </div>
    {children}
  </article>;
}

export function AdminDashboard({ onSettlement, onAppointments }: {
  onSettlement: (code: string) => void;
  onAppointments: (filters: AppointmentFilters) => void;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const activeRequest = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  async function load() {
    inFlight.current = true;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const options = { signal: controller.signal };
    setBusy(true);
    setError("");
    try {
      const salon = await api<{ timeZone: string }>("/salon", options);
      const date = new Intl.DateTimeFormat("en-CA", { timeZone: salon.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      const query = new URLSearchParams({ from: date, to: date });
      // The existing appointment API pages by ID. Read today's pages before sorting
      // so the preview shows the earliest visits, even when bookings were added later.
      async function todaysAppointments() {
        const rows: Appointment[] = [];
        let cursor: string | null = null;
        do {
          const pageQuery = new URLSearchParams(query);
          if (cursor) pageQuery.set("cursor", cursor);
          const page = await api<{ appointments: Appointment[]; nextCursor: string | null }>(`/appointments?${pageQuery}`, options);
          rows.push(...page.appointments);
          cursor = page.nextCursor;
        } while (cursor);
        return rows.sort((a, b) => a.startAt.localeCompare(b.startAt) || a.bookingCode.localeCompare(b.bookingCode));
      }
      const [dashboard, collections, appointments] = await Promise.all([
        api<Dashboard>(`/reports/dashboard?${query}`, options),
        api<Collections>(`/reports/collections?${query}`, options),
        todaysAppointments(),
      ]);
      if (!controller.signal.aborted) setSnapshot({ dashboard, collections, appointments, date, updated: new Date() });
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Unable to load the dashboard.");
    } finally {
      if (!controller.signal.aborted) { inFlight.current = false; setBusy(false); }
    }
  }
  useEffect(() => {
    void load();
    const refresh = () => { if (document.visibilityState === "visible" && !inFlight.current) void load(); };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { activeRequest.current?.abort(); window.clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  const data = snapshot?.dashboard;
  const count = (status: string) => data?.appointments.find(row => row.status === status)?.count ?? 0;
  const total = data?.appointments.reduce((sum, row) => sum + row.count, 0) ?? 0;
  const preview = snapshot?.appointments.slice(0, 3) ?? [];
  return <section className="admin-overview" aria-label="Admin dashboard" aria-busy={busy}>
    <div className="admin-overview-toolbar">
      <div><p className="admin-overview-date">{snapshot ? new Intl.DateTimeFormat("en-PH", { timeZone: data!.timeZone, weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(snapshot.updated) : "Today’s overview"}</p>
        {snapshot && <small>{data!.timeZone} · Updated {new Intl.DateTimeFormat("en-PH", { timeZone: data!.timeZone, hour: "numeric", minute: "2-digit" }).format(snapshot.updated)}</small>}
      </div>
      <Button variant="outline" disabled={busy} onClick={() => void load()}><RefreshCw size={16} aria-hidden="true" />{busy ? "Refreshing…" : "Refresh"}</Button>
    </div>
    {error && <div className="error" role="alert">{error} {snapshot && "Showing the last successful update."} <Button variant="outline" disabled={busy} onClick={() => void load()}>Retry</Button></div>}
    {busy && !snapshot && <p role="status">Loading today’s dashboard…</p>}
    {snapshot && data && <>
      <section aria-labelledby="admin-overview-appointments-title">
        <h2 id="admin-overview-appointments-title">Appointments today</h2>
        <div className="admin-overview-stats">
          <Metric icon={CalendarDays} label="Total appointments" value={total}><small>All booking statuses</small></Metric>
          <Metric icon={Check} label="Confirmed" value={count("CONFIRMED")} tone="green" />
          <Metric icon={Scissors} label="Completed" value={count("COMPLETED")} tone="purple" />
          <Metric icon={X} label="Cancelled / No-show" value={`${count("CANCELLED")} / ${count("NO_SHOW")}`} tone="rose" />
        </div>
      </section>
      <section aria-labelledby="admin-overview-financial-title">
        <h2 id="admin-overview-financial-title">Financial summary · Today</h2>
        <div className="admin-overview-finances">
          {(snapshot.collections.totals.length ? snapshot.collections.totals : [{ currency: "PHP", captured: "0", netCashMovement: "0" }]).map(row => <Fragment key={row.currency}>
            <Metric icon={Coins} label={`Total collections${row.currency === "PHP" ? "" : ` · ${row.currency}`}`} value={money(row.captured, row.currency)}>
              <dl className="admin-overview-breakdown">{[["APPOINTMENT_FEE", "Appointment fees"], ["SERVICE_PAYMENT", "Service payments"]].map(([type, label]) => <div key={type}><dt>{label}</dt><dd>{money(snapshot.collections.typeTotals.find(item => item.currency === row.currency && item.type === type)?.captured ?? "0", row.currency)}</dd></div>)}</dl>
            </Metric>
            <Metric icon={CreditCard} label={`Net collections${row.currency === "PHP" ? "" : ` · ${row.currency}`}`} value={money(row.netCashMovement, row.currency)}><small>After recorded adjustments</small></Metric>
          </Fragment>)}
          <Metric icon={UsersRound} label="Finalized commissions" value={money(data.finalizedCommissions)}><small>Shown separately from collections</small></Metric>
        </div>
        <p className="admin-overview-note">Collections use capture time; commissions use finalization time. Carried credits are not new collections.</p>
      </section>
      <section className="admin-overview-bookings" aria-labelledby="admin-overview-bookings-title">
        <div className="admin-overview-list-heading">
          <h2 id="admin-overview-bookings-title">Today’s appointments</h2>
          <div>
            {data.attention.unsettled > 0 && <Button variant="outline" className="admin-overview-unsettled" onClick={() => onAppointments({ attention: "unsettled" })}><TriangleAlert size={15} aria-hidden="true" />{data.attention.unsettled} unsettled · All dates</Button>}
            <Button variant="link" onClick={() => onAppointments({ from: snapshot.date, to: snapshot.date })}>View all <ArrowRight size={16} aria-hidden="true" /></Button>
          </div>
        </div>
        {preview.length ? <>
          <div className="admin-overview-table-scroll"><table>
            <thead><tr><th>Time</th><th>Customer</th><th>Service / Stylist</th><th>Booking / Arrival</th><th>Action</th></tr></thead>
            <tbody>{preview.map(row => <tr key={row.bookingCode}>
              <td data-label="Time"><strong>{new Intl.DateTimeFormat("en-PH", { timeZone: data.timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(row.startAt))}</strong></td>
              <td data-label="Customer">{row.customer.firstName} {row.customer.lastName}<small>{row.bookingCode}</small></td>
              <td data-label="Service / Stylist">{row.appointmentServices.map(service => <div key={service.id}>{service.serviceNameSnapshot} <span>· {service.staff.firstName} {service.staff.lastName}</span></div>)}</td>
              <td data-label="Booking / Arrival"><span className={`admin-overview-status ${row.status.toLowerCase()}`}>{statusLabels[row.status] ?? row.status}</span>{row.checkedInAt && <small className="admin-overview-arrived">Arrived</small>}</td>
              <td data-label="Action"><Button variant="outline" aria-label={`${row.status === "CONFIRMED" ? "Review services for" : "View appointment for"} ${row.customer.firstName} ${row.customer.lastName}`} onClick={() => row.status === "CONFIRMED" ? onSettlement(row.bookingCode) : onAppointments({ from: snapshot.date, to: snapshot.date, search: row.bookingCode })}>{row.status === "CONFIRMED" ? "Review" : "View"}</Button></td>
            </tr>)}</tbody>
          </table></div>
          <p className="admin-overview-list-footer">Showing {preview.length} of {snapshot.appointments.length} appointments · Earliest first</p>
        </> : <p className="admin-overview-empty">No appointments scheduled for today.</p>}
      </section>
    </>}
  </section>;
}
