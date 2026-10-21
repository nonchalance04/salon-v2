import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { CalendarDays, Check, Coins, CreditCard, Scissors, TriangleAlert, UsersRound, X, type LucideIcon } from "lucide-react";
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
  return <article className="admin-overview-metric tw:[background:#fff] tw:[border:1px_solid_#e7e5e8] tw:rounded-[12px] tw:py-[23px] tw:px-5
          tw:min-w-0 tw:[&_p]:text-[14px] tw:[&_p]:[margin:0_0_7px] tw:[&_p]:text-[#55515c] tw:[&_strong]:block
          tw:[&_strong]:text-[clamp(23px,2.2vw,33px)] tw:[&_strong]:tracking-[-.035em] tw:[&_strong]:tabular-nums
          tw:[&_strong]:[overflow-wrap:anywhere] tw:[&_>_small]:block tw:[&_>_small]:mt-4 tw:[&_>_small]:text-[12px]
          tw:down-700:py-4.5 tw:down-700:px-3.5 tw:[&_strong]:leading-[1.2]">
    <div className="admin-overview-metric-top tw:flex tw:gap-[15px] tw:items-center tw:[&_>_div]:min-w-0
          tw:down-700:[.admin-overview-stats_&]:items-start tw:down-700:[.admin-overview-stats_&]:flex-col
          tw:down-700:[.admin-overview-stats_&]:gap-2.5">
      <span className={`admin-overview-icon tw:w-12 tw:h-12 tw:rounded-[50%] tw:grid tw:place-items-center tw:[flex:0_0_48px] tw:[background:#f3e9f1] tw:[&.green]:text-[#16734c] tw:[&.green]:[background:#e4f5ec] tw:[&.purple]:text-[#6d4889] tw:[&.purple]:[background:#eee8f7] tw:[&.rose]:text-[#9c4462] tw:[&.rose]:[background:#fbe8ed]  ${tone}`}><Icon size={23} aria-hidden="true" /></span>
      <div><p>{label}</p><strong>{value}</strong></div>
    </div>
    {children}
  </article>;
}

export function AdminDashboard({ onAppointments }: {
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
  return <section className="admin-overview tw:grid tw:gap-7 tw:min-w-0 tw:workspace-main:[&_h2]:text-[21px]
          tw:workspace-main:[&_h2]:[margin:0_0_16px] tw:workspace-main:[&_h2]:tracking-[-.025em]
          tw:[&_table]:whitespace-normal tw:[&_table]:table-fixed tw:workspace-main:[&_th]:[background:#f6f4f7]
          tw:workspace-main:[&_th]:normal-case tw:workspace-main:[&_th]:tracking-[0] tw:workspace-main:[&_th]:text-[12px]
          tw:workspace-main:[&_th]:font-medium tw:workspace-main:[&_td]:py-[15px] tw:workspace-main:[&_td]:px-3
          tw:workspace-main:[&_th]:py-[15px] tw:workspace-main:[&_th]:px-3
          tw:workspace-main:[&_td]:[overflow-wrap:anywhere] tw:workspace-main:[&_th]:[overflow-wrap:anywhere]
          tw:[&_td]:align-middle tw:[&_td]:text-[13px] tw:[&_td_small]:block tw:[&_td_small]:mt-[5px]
          tw:[&_td_small]:text-[11px] tw:[&_td_button]:[border-color:#bba1b4] tw:[&_td_button]:w-full
          tw:[&_td_button]:px-2.5 tw:[&_td_button]:whitespace-nowrap tw:down-700:[&_table]:block
          tw:down-700:[&_tbody]:block tw:down-700:[&_thead]:absolute tw:down-700:[&_thead]:w-[1px]
          tw:down-700:[&_thead]:h-[1px] tw:down-700:[&_thead]:overflow-hidden tw:down-700:[&_tr]:grid
          tw:down-700:[&_tr]:gap-3 tw:down-700:[&_tr]:py-4.5 tw:down-700:[&_tr]:px-0
          tw:down-700:[&_tr]:[border-top:1px_solid_#eeecf0] tw:down-700:workspace-main:[&_td]:block
          tw:down-700:workspace-main:[&_td]:p-0 tw:down-700:workspace-main:[&_td]:[border:0]" aria-label="Admin dashboard" aria-busy={busy}>
    <div className="admin-overview-toolbar tw:flex tw:items-center tw:justify-between tw:gap-4">
      <div><p className="admin-overview-date tw:[margin:0_0_3px] tw:text-[15px] tw:font-semibold">{snapshot ? new Intl.DateTimeFormat("en-PH", { timeZone: data!.timeZone, weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(snapshot.updated) : "Today’s overview"}</p>
        {snapshot && <small>{data!.timeZone} · Updated {new Intl.DateTimeFormat("en-PH", { timeZone: data!.timeZone, hour: "numeric", minute: "2-digit" }).format(snapshot.updated)}</small>}
      </div>
    </div>
    {error && <div className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]" role="alert">{error} {snapshot && "Showing the last successful update."} <Button variant="outline" disabled={busy} onClick={() => void load()}>Retry</Button></div>}
    {busy && !snapshot && <p role="status">Loading today’s dashboard…</p>}
    {snapshot && data && <>
      <section aria-labelledby="admin-overview-appointments-title">
        <h2 id="admin-overview-appointments-title">Appointments today</h2>
        <div className="admin-overview-stats tw:grid tw:grid-cols-4 tw:gap-4 tw:down-1200:grid-cols-2">
          <Metric icon={CalendarDays} label="Total appointments" value={total}><small>All booking statuses</small></Metric>
          <Metric icon={Check} label="Confirmed" value={count("CONFIRMED")} tone="green" />
          <Metric icon={Scissors} label="Completed" value={count("COMPLETED")} tone="purple" />
          <Metric icon={X} label="Cancelled / No-show" value={`${count("CANCELLED")} / ${count("NO_SHOW")}`} tone="rose" />
        </div>
      </section>
      <section aria-labelledby="admin-overview-financial-title">
        <h2 id="admin-overview-financial-title">Financial summary · Today</h2>
        <div className="admin-overview-finances tw:grid tw:grid-cols-3 tw:gap-4 tw:down-1200:grid-cols-2 tw:down-700:grid-cols-[1fr]">
          {(snapshot.collections.totals.length ? snapshot.collections.totals : [{ currency: "PHP", captured: "0", netCashMovement: "0" }]).map(row => <Fragment key={row.currency}>
            <Metric icon={Coins} label={`Total collections${row.currency === "PHP" ? "" : ` · ${row.currency}`}`} value={money(row.captured, row.currency)}>
              <dl className="admin-overview-breakdown tw:[margin:20px_0_0] tw:pt-3.5 tw:[border-top:1px_solid_#eeecf0] tw:text-[12px]
          tw:[&_>_div]:flex tw:[&_>_div]:justify-between tw:[&_>_div]:gap-3 tw:[&_>_div]:mt-[5px] tw:[&_dd]:m-0
          tw:[&_dd]:tabular-nums">{[["APPOINTMENT_FEE", "Appointment fees"], ["SERVICE_PAYMENT", "Service payments"]].map(([type, label]) => <div key={type}><dt>{label}</dt><dd>{money(snapshot.collections.typeTotals.find(item => item.currency === row.currency && item.type === type)?.captured ?? "0", row.currency)}</dd></div>)}</dl>
            </Metric>
            <Metric icon={CreditCard} label={`Net collections${row.currency === "PHP" ? "" : ` · ${row.currency}`}`} value={money(row.netCashMovement, row.currency)}><small>After recorded adjustments</small></Metric>
          </Fragment>)}
          <Metric icon={UsersRound} label="Finalized commissions" value={money(data.finalizedCommissions)}><small>Shown separately from collections</small></Metric>
        </div>
        <p className="admin-overview-note tw:text-[#77717c] tw:text-[12px] tw:[margin:12px_0_0]">Collections use capture time; commissions use finalization time. Carried credits are not new collections.</p>
      </section>
      <section className="admin-overview-bookings tw:min-w-0 tw:[background:#fff] tw:[border:1px_solid_#e7e5e8] tw:rounded-[12px]
          tw:p-5.5 tw:down-700:p-4" aria-labelledby="admin-overview-bookings-title">
        <div className="admin-overview-list-heading tw:flex tw:items-center tw:justify-between tw:gap-4 tw:mb-4 tw:flex-wrap
          tw:workspace-main:[&_h2]:m-0 tw:[&_>_div]:flex tw:[&_>_div]:flex-wrap tw:[&_>_div]:items-center
          tw:[&_>_div]:gap-2.5">
          <h2 id="admin-overview-bookings-title">Today’s appointments</h2>
          <div>
            {data.attention.unsettled > 0 && <Button variant="outline" className="admin-overview-unsettled tw:[.admin-overview_&]:[background:#fff8e9] tw:[.admin-overview_&]:text-[#895006]
          tw:[.admin-overview_&]:[border-color:#f1d6a5] tw:[.admin-overview_&]:text-[12px]" onClick={() => onAppointments({ attention: "unsettled" })}><TriangleAlert size={15} aria-hidden="true" />{data.attention.unsettled} unsettled · All dates</Button>}
            <Button variant="link" onClick={() => onAppointments({ from: snapshot.date, to: snapshot.date })}>View all </Button>
          </div>
        </div>
        {preview.length ? <>
          <div className="admin-overview-table-scroll tw:overflow-x-auto"><table>
            <thead><tr><th>Time</th><th>Customer</th><th>Service / Stylist</th><th>Booking / Arrival</th><th>Action</th></tr></thead>
            <tbody>{preview.map(row => <tr key={row.bookingCode}>
              <td data-label="Time"><strong>{new Intl.DateTimeFormat("en-PH", { timeZone: data.timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(row.startAt))}</strong></td>
              <td data-label="Customer">{row.customer.firstName} {row.customer.lastName}<small>{row.bookingCode}</small></td>
              <td data-label="Service / Stylist">{row.appointmentServices.map(service => <div key={service.id}>{service.serviceNameSnapshot} <span>· {service.staff.firstName} {service.staff.lastName}</span></div>)}</td>
              <td data-label="Booking / Arrival"><span className={`admin-overview-status tw:inline-block tw:py-1 tw:px-[9px] tw:rounded-[6px] tw:text-[11px] tw:[background:#f0eef3] tw:text-[#5f576d] tw:[&.completed]:text-[#17653e] tw:[&.completed]:[background:#e6f5ec] tw:[&.cancelled]:[background:#fbecef] tw:[&.no_show]:[background:#fbecef] tw:[&.cancelled]:text-[#96435a] tw:[&.no_show]:text-[#96435a]  ${row.status.toLowerCase()}`}>{statusLabels[row.status] ?? row.status}</span>{row.checkedInAt && <small className="admin-overview-arrived tw:workspace-main:text-[#17653e]">Arrived</small>}</td>
              <td data-label="Action"><Button variant="outline" aria-label={`View appointment for ${row.customer.firstName} ${row.customer.lastName}`} onClick={() => onAppointments({ from: snapshot.date, to: snapshot.date, search: row.bookingCode })}>View</Button></td>
            </tr>)}</tbody>
          </table></div>
          <p className="admin-overview-list-footer tw:m-0 tw:[border-top:1px_solid_#eeecf0] tw:pt-4 tw:text-[#77717c] tw:text-[12px]">Showing {preview.length} of {snapshot.appointments.length} appointments · Earliest first</p>
        </> : <p className="admin-overview-empty tw:py-6 tw:px-0 tw:text-[#77717c] tw:m-0">No appointments scheduled for today.</p>}
      </section>
    </>}
  </section>;
}
