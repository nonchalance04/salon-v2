import { useCallback, useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NativeSelect } from "@/components/ui/NativeSelect";
import { api } from "../../lib/api";

type Person = { firstName: string; lastName: string };
type Service = {
  serviceNameSnapshot: string; membershipStatus: string; outcome: string;
  staffFirstNameSnapshot: string; staffLastNameSnapshot: string; staff: Person | null;
};
type Booking = {
  id: string; bookingCode: string; customer: Person; status: string;
  startAt: string; endAt: string; completionType: string | null; appointmentServices: Service[];
};
type Report = {
  rows: Booking[]; total: number; page: number; pageSize: number;
  timeZone: string;
};
const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: "Pending fee", CONFIRMED: "Confirmed", COMPLETED: "Completed",
  CANCELLED: "Cancelled", NO_SHOW: "No-show", EXPIRED: "Expired",
};
const outcomeLabels: Record<string, string> = { SCHEDULED: "Scheduled", PERFORMED: "Performed", NOT_PERFORMED: "Not performed" };
const name = (person: Person) => `${person.firstName} ${person.lastName}`.trim();
function staffName(service: Service) {
  return name({ firstName: service.staffFirstNameSnapshot, lastName: service.staffLastNameSnapshot })
    || (service.staff ? name(service.staff) : "Former staff");
}

export function AppointmentReport() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [timeZone, setTimeZone] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [retrySalon, setRetrySalon] = useState(0);
  useEffect(() => {
    let active = true;
    setBusy(true); setError("");
    void api<{ timeZone: string }>("/salon").then(salon => {
      if (!active) return;
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: salon.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      setTimeZone(salon.timeZone); setFrom(today); setTo(today);
    }).catch(err => { if (active) { setError(err instanceof Error ? err.message : "Unable to load salon date."); setBusy(false); } });
    return () => { active = false; };
  }, [retrySalon]);
  const validRange = Boolean(from && to && to >= from);
  useEffect(() => {
    if (!validRange) { if (timeZone) { setBusy(false); setError(""); } return; }
    let active = true;
    setBusy(true); setError(""); setReport(null);
    const query = new URLSearchParams({ from, to, page: String(page), pageSize: "25" });
    if (status) query.set("status", status);
    void api<Report>(`/reports/appointments?${query}`).then(result => {
      if (active) setReport(result);
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : "Unable to load appointments."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [from, to, status, page, revision, validRange, timeZone]);
  const changeDate = useCallback((setter: (value: string) => void, value: string) => {
    setter(value); setPage(1); setReport(null);
  }, []);
  const date = new Intl.DateTimeFormat("en-PH", { timeZone: timeZone || "UTC", month: "short", day: "numeric", year: "numeric" });
  const time = new Intl.DateTimeFormat("en-PH", { timeZone: timeZone || "UTC", hour: "numeric", minute: "2-digit" });
  return <section className="reports appointment-report" aria-busy={busy}>
    <div className="appointment-report-heading"><div><h2>Appointment Report</h2><p>Review bookings, service outcomes, and assigned staff.</p></div>
      <Button variant="outline" disabled={busy || (Boolean(timeZone) && !validRange)} onClick={() => timeZone ? setRevision(n => n + 1) : setRetrySalon(n => n + 1)}>Refresh</Button>
    </div>
    <form className="appointment-report-filters" onSubmit={e => e.preventDefault()}>
      <label>From<Input type="date" required value={from} onChange={e => changeDate(setFrom, e.target.value)} /></label>
      <label>Through<Input type="date" required min={from} value={to} onChange={e => changeDate(setTo, e.target.value)} /></label>
      <label>Status<NativeSelect aria-label="Status" value={status} onChange={e => changeDate(setStatus, e.target.value)}><option value="">All statuses</option>{Object.entries(statusLabels).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</NativeSelect></label>
      <p>Based on scheduled start date.<br />{timeZone ? `Salon time · ${timeZone}` : "Loading salon timezone…"}<br />Choose up to 366 days.</p>
    </form>
    {!validRange && timeZone && <p role="alert" className="error">Choose a start date and an end date on or after it.</p>}
    {error && <p role="alert" className="error">{error} Use Refresh to try again.</p>}
    <div className="appointment-report-records"><div className="appointment-report-list-heading"><h3>Appointment list</h3>{report && <span>{report.total} bookings · Latest scheduled first</span>}</div>
      {busy && <p role="status" className="appointment-report-message">Loading appointment report…</p>}
      {!busy && report && !report.total && <div className="appointment-report-message"><CalendarDays size={28} aria-hidden="true" /><h3>No appointments match these filters</h3><p>Try another date range or status.</p></div>}
      {report && report.rows.length > 0 && <>
        <div className="table-wrap report-table-wrap" role="region" aria-label="Appointments table" tabIndex={0}>
          <table className="report-table appointment-report-table"><caption className="sr-only">Appointments by scheduled start date</caption>
            <thead><tr>{["Booking / customer", "Schedule", "Services / staff", "Status"].map(title => <th scope="col" key={title}>{title}</th>)}</tr></thead>
            <tbody>{report.rows.map(row => {
              const activeServices = row.appointmentServices.filter(service => service.membershipStatus === "ACTIVE");
              return <tr key={row.id}>
                <td data-label="Booking / customer"><div><strong>{name(row.customer)}</strong><span className="appointment-report-subtext">{row.bookingCode}</span></div></td>
                <td data-label="Schedule"><div><strong>{date.format(new Date(row.startAt))}</strong><span className="appointment-report-subtext">{time.format(new Date(row.startAt))} – {time.format(new Date(row.endAt))}{date.format(new Date(row.startAt)) !== date.format(new Date(row.endAt)) ? ` (${date.format(new Date(row.endAt))})` : ""}</span></div></td>
                <td data-label="Services / staff"><div><ul className="appointment-report-services">{activeServices.map((service, index) => <li key={index}><strong>{service.serviceNameSnapshot}</strong><span className="appointment-report-subtext">{staffName(service)}</span></li>)}</ul>{!activeServices.length && <span>No active services</span>}
                  {row.appointmentServices.length > 0 && <details className="appointment-report-outcomes"><summary>Service outcomes & history</summary><ul>{row.appointmentServices.map((service, index) => <li key={index}>{service.serviceNameSnapshot} · {staffName(service)}<span className="appointment-report-subtext">{outcomeLabels[service.outcome] ?? service.outcome}{service.membershipStatus === "REMOVED" ? " · Removed from booking" : ""}</span></li>)}</ul></details>}
                </div></td>
                <td data-label="Status"><div><span className={`appointment-report-status status-${row.status.toLowerCase()}`}>{statusLabels[row.status] ?? row.status}</span>{row.completionType === "NO_SERVICE_CLOSURE" && <span className="appointment-report-subtext">Closed without service</span>}</div></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        <div className="actions report-pagination"><span>Showing {(report.page - 1) * report.pageSize + 1}–{Math.min(report.page * report.pageSize, report.total)} of {report.total}</span><Button variant="outline" disabled={busy || report.page <= 1} onClick={() => setPage(n => n - 1)}>Previous</Button><span>Page {report.page} of {Math.ceil(report.total / report.pageSize)}</span><Button variant="outline" disabled={busy || report.page * report.pageSize >= report.total} onClick={() => setPage(n => n + 1)}>Next</Button></div>
      </>}
    </div>
  </section>;
}
