// Bring in the tools for the reports view so this file can work with the rest of the application.
import { useCallback, useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NativeSelect } from "@/components/ui/NativeSelect";
import { api } from "../../lib/api";

// Describe the information used by the reports view so different parts of the application agree on its contents.
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
// Define readable names for saved states so screens can explain them consistently.
const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: "Pending fee", CONFIRMED: "Confirmed", COMPLETED: "Completed",
  CANCELLED: "Cancelled", NO_SHOW: "No-show", EXPIRED: "Expired",
};
const outcomeLabels: Record<string, string> = { SCHEDULED: "Scheduled", PERFORMED: "Performed", NOT_PERFORMED: "Not performed" };
// Combine the available name parts so the report can show a readable customer name.
const name = (person: Person) => `${person.firstName} ${person.lastName}`.trim();
// Choose the current or saved staff name so visits remain readable when staff details change.
function staffName(service: Service) {
  return name({ firstName: service.staffFirstNameSnapshot, lastName: service.staffLastNameSnapshot })
    || (service.staff ? name(service.staff) : "Former staff");
}

// Show appointment and service outcomes so staff can review visits in the report.
export function AppointmentReport() {
  // Remember the current choices and screen status so the page can respond as the user works.
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
  // Load the information this view needs when its inputs change so the displayed results stay current.
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
  // Load the information this view needs when its inputs change so the displayed results stay current.
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
  // Show the prepared content and actions so the user can review the information and continue.
  return <section className="reports tw:min-w-0 tw:[&_>_.account-form_label]:mb-0 tw:[&_>_.account-form_>_button]:mt-4.5
          tw:down-640:[&_>_.account-form]:p-4.5 appointment-report" aria-busy={busy}>
    <div className="appointment-report-heading tw:flex tw:items-center tw:justify-between tw:gap-5 tw:mb-6 tw:[&_h2]:my-1.5
          tw:[&_h2]:mx-0 tw:[&_p]:m-0 tw:[&_p]:text-[#686868] tw:[&_p]:text-[14px] tw:down-640:items-start"><div><h2>Appointment Report</h2><p>Review bookings, service outcomes, and assigned staff.</p></div>
    </div>
    {/* Group the entry fields and submit action so the user can complete this step in one place. */}
    <form className="appointment-report-filters tw:flex tw:items-end tw:flex-wrap tw:gap-4.5 tw:p-5 tw:[border:1px_solid_#e4dfd3]
          tw:[background:#fff] tw:rounded-[12px] tw:[&_label]:[flex:0_1_210px] tw:[&_label]:grid tw:[&_label]:gap-2
          tw:[&_label]:text-[13px] tw:[&_label]:font-semibold tw:[&_label]:m-0 tw:[&_p]:[margin:0_0_2px]
          tw:[&_p]:text-[12px] tw:[&_p]:text-[#686868] tw:down-640:[&_label]:[flex:1_1_140px]
          tw:down-640:[&_p]:[flex-basis:100%] tw:[&_p]:leading-[1.6]" onSubmit={e => e.preventDefault()}>
      <label>From<Input type="date" required value={from} onChange={e => changeDate(setFrom, e.target.value)} /></label>
      <label>Through<Input type="date" required min={from} value={to} onChange={e => changeDate(setTo, e.target.value)} /></label>
      <label>Status<NativeSelect aria-label="Status" value={status} onChange={e => changeDate(setStatus, e.target.value)}><option value="">All statuses</option>{Object.entries(statusLabels).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</NativeSelect></label>
      <p>Based on scheduled start date.<br />{timeZone ? `Salon time · ${timeZone}` : "Loading salon timezone…"}<br />Choose up to 366 days.</p>
    </form>
    {!validRange && timeZone && <p role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">Choose a start date and an end date on or after it.</p>}
    {error && <p role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">{error} <Button variant="outline" disabled={busy || (Boolean(timeZone) && !validRange)} onClick={() => timeZone ? setRevision(n => n + 1) : setRetrySalon(n => n + 1)}>Retry</Button></p>}
    <div className="appointment-report-records tw:mt-6"><div className="appointment-report-list-heading tw:flex tw:items-center tw:justify-between tw:flex-wrap tw:gap-2 tw:[&_h3]:m-0
          tw:[&_h3]:text-[16px] tw:[&_>_span]:text-[12px] tw:[&_>_span]:text-[#686868]"><h3>Appointment list</h3>{report && <span>{report.total} bookings · Latest scheduled first</span>}</div>
      {busy && <p role="status" className="appointment-report-message tw:grid tw:[justify-items:center] tw:text-center tw:py-12 tw:px-5 tw:mt-4
          tw:[background:#fff] tw:[border:1px_dashed_#d6d6cf] tw:rounded-[12px] tw:text-[#686868]
          tw:[&_h3]:text-[#34342f] tw:[&_h3]:[margin:14px_0_4px] tw:[&_h3]:text-[16px] tw:[&_p]:m-0 tw:[&_p]:text-[14px]">Loading appointment report…</p>}
      {!busy && report && !report.total && <div className="appointment-report-message tw:grid tw:[justify-items:center] tw:text-center tw:py-12 tw:px-5 tw:mt-4
          tw:[background:#fff] tw:[border:1px_dashed_#d6d6cf] tw:rounded-[12px] tw:text-[#686868]
          tw:[&_h3]:text-[#34342f] tw:[&_h3]:[margin:14px_0_4px] tw:[&_h3]:text-[16px] tw:[&_p]:m-0 tw:[&_p]:text-[14px]"><CalendarDays size={28} aria-hidden="true" /><h3>No appointments match these filters</h3><p>Try another date range or status.</p></div>}
      {report && report.rows.length > 0 && <>
        <div className="table-wrap tw:overflow-auto tw:[background:white] tw:[border:1px_solid_#dce0d8] tw:rounded-[10px]
          tw:[&_pre]:max-w-[36rem] tw:[&_pre]:max-h-[28rem] tw:[&_pre]:overflow-auto tw:[&_pre]:whitespace-pre-wrap
          tw:[&_pre]:[overflow-wrap:anywhere] tw:[&_pre]:text-[.8rem] report-table-wrap tw:[.reports_&]:relative
          tw:[.reports_&]:w-full tw:[.reports_&]:max-w-full tw:[.reports_&]:[margin:16px_0_24px]
          tw:[.reports_&]:overflow-x-auto tw:[.reports_&:focus-visible]:[outline:3px_solid_#987b1f]
          tw:[.reports_&:focus-visible]:outline-offset-[3px] tw:down-640:[.reports_&]:[border:0]
          tw:down-640:[.reports_&]:rounded-none tw:down-640:[.reports_&]:[background:transparent]
          tw:down-640:[.reports_&]:overflow-visible tw:down-640:[.appointment-report_&]:overflow-x-auto
          tw:down-640:[.appointment-report_&]:[background:#fff] tw:down-640:[.appointment-report_&]:rounded-[10px]" role="region" aria-label="Appointments table" tabIndex={0}>
          {/* Show the records in labeled columns so their details can be compared row by row. */}
          <table className="report-table tw:[.reports_&]:table-fixed tw:[.reports_&]:whitespace-normal tw:[.reports_&_th]:p-4
          tw:[.reports_&_td]:p-4 tw:[.reports_&_th]:align-top tw:[.reports_&_td]:align-top
          tw:[.reports_&_th]:[overflow-wrap:anywhere] tw:[.reports_&_td]:[overflow-wrap:anywhere]
          tw:[.reports_&_td]:[border-bottom:1px_solid_#d6d6cf] tw:[.reports_&_th]:text-[11px]
          tw:[.reports_&_th]:tracking-[.04em] tw:[.reports_&_th]:[border-bottom:2px_solid_#bca45b]
          tw:[.reports_&_td]:text-[13px] tw:[.reports_&_tbody_tr:hover]:[background:#f8f5e9]
          tw:down-640:[.reports_&]:block tw:down-640:[.reports_&]:w-full tw:down-640:[.reports_&_colgroup]:hidden
          tw:down-640:[.reports_&_thead]:absolute tw:down-640:[.reports_&_thead]:w-[1px]
          tw:down-640:[.reports_&_thead]:h-[1px] tw:down-640:[.reports_&_thead]:p-0
          tw:down-640:[.reports_&_thead]:overflow-hidden tw:down-640:[.reports_&_tbody]:block
          tw:down-640:[.reports_&_tbody_tr]:block tw:down-640:[.reports_&_tbody_tr]:mb-4
          tw:down-640:[.reports_&_tbody_tr]:[border:1px_solid_#deded6] tw:down-640:[.reports_&_tbody_tr]:rounded-[10px]
          tw:down-640:[.reports_&_tbody_tr]:[background:#fff] tw:down-640:[.reports_&_tbody_tr]:overflow-hidden
          tw:[.reports_&_th]:leading-[1.5] tw:[.reports_&_td]:leading-[1.6] appointment-report-table
          tw:[.reports_&_th]:text-left tw:[.reports_&_td]:text-left tw:[.reports_&_th]:[border-right:0]
          tw:[.reports_&_td]:[border-right:0] tw:[.reports_&_th]:[background:#f5f3eb] tw:[.reports_&_th]:text-[#686454]
          tw:down-640:[.reports_&_td]:text-left tw:down-640:[.appointment-report_&]:[display:table]
          tw:down-640:[.appointment-report_&]:w-[900px] tw:down-640:[.appointment-report_&_thead]:static
          tw:down-640:[.appointment-report_&_thead]:[display:table-header-group]
          tw:down-640:[.appointment-report_&_thead]:w-auto tw:down-640:[.appointment-report_&_thead]:h-auto
          tw:down-640:[.appointment-report_&_thead]:overflow-visible
          tw:down-640:[.appointment-report_&_tbody]:[display:table-row-group]
          tw:down-640:[.appointment-report_&_tbody_tr]:[display:table-row]
          tw:down-640:[.appointment-report_&_td]:[display:table-cell] tw:down-640:[.appointment-report_&_td]:p-4"><caption className="sr-only tw:absolute tw:w-[1px] tw:h-[1px] tw:overflow-hidden">Appointments by scheduled start date</caption>
            <thead><tr>{["Booking / customer", "Schedule", "Services / staff", "Status"].map(title => <th scope="col" key={title}>{title}</th>)}</tr></thead>
            <tbody>{report.rows.map(row => {
              const activeServices = row.appointmentServices.filter(service => service.membershipStatus === "ACTIVE");
              // Show the prepared content and actions so the user can review the information and continue.
              return <tr key={row.id}>
                <td data-label="Booking / customer"><div><strong>{name(row.customer)}</strong><span className="appointment-report-subtext tw:block tw:text-[12px] tw:font-normal tw:text-[#686868] tw:mt-[3px]
          tw:[overflow-wrap:anywhere]">{row.bookingCode}</span></div></td>
                <td data-label="Schedule"><div><strong>{date.format(new Date(row.startAt))}</strong><span className="appointment-report-subtext tw:block tw:text-[12px] tw:font-normal tw:text-[#686868] tw:mt-[3px]
          tw:[overflow-wrap:anywhere]">{time.format(new Date(row.startAt))} – {time.format(new Date(row.endAt))}{date.format(new Date(row.startAt)) !== date.format(new Date(row.endAt)) ? ` (${date.format(new Date(row.endAt))})` : ""}</span></div></td>
                <td data-label="Services / staff"><div><ul className="appointment-report-services tw:[list-style:none] tw:p-0 tw:m-0">{activeServices.map((service, index) => <li key={index}><strong>{service.serviceNameSnapshot}</strong><span className="appointment-report-subtext tw:block tw:text-[12px] tw:font-normal tw:text-[#686868] tw:mt-[3px]
          tw:[overflow-wrap:anywhere]">{staffName(service)}</span></li>)}</ul>{!activeServices.length && <span>No active services</span>}
                  {row.appointmentServices.length > 0 && <details className="appointment-report-outcomes tw:text-[12px] tw:mt-3 tw:[&_summary]:text-[#755c16] tw:[&_summary]:cursor-pointer
          tw:[&_ul]:[list-style:none] tw:[&_ul]:[margin:10px_0_0] tw:[&_ul]:p-0 tw:[&_li]:py-2 tw:[&_li]:px-0
          tw:[&_li]:[border-top:1px_solid_#e4dfd3]"><summary>Service outcomes & history</summary><ul>{row.appointmentServices.map((service, index) => <li key={index}>{service.serviceNameSnapshot} · {staffName(service)}<span className="appointment-report-subtext tw:block tw:text-[12px] tw:font-normal tw:text-[#686868] tw:mt-[3px]
          tw:[overflow-wrap:anywhere]">{outcomeLabels[service.outcome] ?? service.outcome}{service.membershipStatus === "REMOVED" ? " · Removed from booking" : ""}</span></li>)}</ul></details>}
                </div></td>
                <td data-label="Status"><div><span className={`appointment-report-status status-${row.status.toLowerCase()}`}>{statusLabels[row.status] ?? row.status}</span>{row.completionType === "NO_SERVICE_CLOSURE" && <span className="appointment-report-subtext tw:block tw:text-[12px] tw:font-normal tw:text-[#686868] tw:mt-[3px]
          tw:[overflow-wrap:anywhere]">Closed without service</span>}</div></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        <div className="actions tw:flex tw:gap-3 report-pagination tw:[.reports_&]:items-center tw:[.reports_&]:justify-end
          tw:[.reports_&]:gap-4 tw:[.reports_&]:my-5 tw:[.reports_&]:mx-0 tw:[.reports_&_span]:text-[13px]
          tw:[.reports_&_span]:text-[#686868] tw:down-640:[.reports_&]:justify-between tw:down-640:[.reports_&]:flex-wrap
          tw:down-640:[.reports_&]:gap-2.5 tw:down-640:[.reports_&_button]:py-[9px] tw:down-640:[.reports_&_button]:px-3"><span>Showing {(report.page - 1) * report.pageSize + 1}–{Math.min(report.page * report.pageSize, report.total)} of {report.total}</span><Button variant="outline" disabled={busy || report.page <= 1} onClick={() => setPage(n => n - 1)}>Previous</Button><span>Page {report.page} of {Math.ceil(report.total / report.pageSize)}</span><Button variant="outline" disabled={busy || report.page * report.pageSize >= report.total} onClick={() => setPage(n => n + 1)}>Next</Button></div>
      </>}
    </div>
  </section>;
}
