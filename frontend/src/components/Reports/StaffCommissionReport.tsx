// Bring in the tools for the reports view so this file can work with the rest of the application.
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NativeSelect } from "@/components/ui/NativeSelect";
import { api } from "../../lib/api";

// Describe the information used by the reports view so different parts of the application agree on its contents.
type Filters = { from: string; to: string; staffId: string };
type Staff = { staffId: string; name: string; state: string };
type Totals = { currency: string; serviceCount: number; commissionBase: string; commissionAmount: string };
type Detail = Staff & {
  id: string; finalizedAt: string; bookingCode: string; serviceName: string; currency: string;
  commissionBase: string; commissionRate: string; commissionAmount: string;
  bookedStaffId: string; bookedStaffName: string;
  paymentRecordedBy: { id: string; name: string; role: "ADMIN" | "CASHIER" } | null;
  replacement: { reason: string; customerAgreed: boolean; recordedAt: string; recordedByUserId: string; recordedByName: string; recordedByRole: string } | null;
};
type Report = {
  from: string; to: string; timeZone: string; staffOptions: Staff[]; rows: (Staff & Totals)[]; totals: Totals[];
  details: Detail[]; total: number; page: number; pageSize: number;
};
// Format the amount as Philippine pesos so prices and payments are easy to recognize.
function money(value: string, currency: string) {
  const negative = value.startsWith("-");
  const [whole, cents = "00"] = value.replace(/^-/, "").split(".");
  return `${negative ? "−" : ""}${currency === "PHP" ? "₱" : `${currency} `}${whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${cents}`;
}
// Format the selected date so the report shows a readable calendar day.
function day(value: string) {
  return new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00Z`));
}

// Show finalized commission totals so administrators can review staff earnings.
export function StaffCommissionReport() {
  // Remember the current choices and screen status so the page can respond as the user works.
  const [draft, setDraft] = useState<Filters>({ from: "", to: "", staffId: "" });
  const [applied, setApplied] = useState<Filters | null>(null);
  const [staffOptions, setStaffOptions] = useState<Staff[]>([]);
  const [timeZone, setTimeZone] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [salonRetry, setSalonRetry] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(true);
  // Load the information this view needs when its inputs change so the displayed results stay current.
  useEffect(() => {
    let active = true;
    setBusy(true); setError("");
    void api<{ timeZone: string }>("/salon").then(salon => {
      if (!active) return;
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: salon.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      const initial = { from: today, to: today, staffId: "" };
      setTimeZone(salon.timeZone); setDraft(initial); setApplied(initial);
    }).catch(err => { if (active) { setError(err instanceof Error ? err.message : "Unable to load salon date."); setBusy(false); } });
    return () => { active = false; };
  }, [salonRetry]);
  // Load the information this view needs when its inputs change so the displayed results stay current.
  useEffect(() => {
    if (!applied) return;
    let active = true;
    setBusy(true); setError(""); setReport(null);
    const query = new URLSearchParams({ from: applied.from, to: applied.to, page: String(page), pageSize: "25" });
    if (applied.staffId) query.set("staffId", applied.staffId);
    void api<Report>(`/reports/commission-summary?${query}`).then(result => {
      if (active) { setReport(result); setStaffOptions(result.staffOptions); }
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : "Unable to load commission report."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [applied, page, revision]);
  // Handle the submitted form so the selected action can use the entered details.
  function submit(event: FormEvent) {
    event.preventDefault();
    const days = (Date.parse(draft.to) - Date.parse(draft.from)) / 86_400_000;
    if (!Number.isFinite(days) || days < 0 || days >= 366) {
      setError("Choose an ordered date range of at most 366 days."); return;
    }
    setPage(1); setApplied({ ...draft });
  }
  const pendingFilters = applied && (draft.from !== applied.from || draft.to !== applied.to || draft.staffId !== applied.staffId);
  function dateTime(value: string) {
    return new Intl.DateTimeFormat("en-PH", { timeZone: report?.timeZone || timeZone, year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
  }
  // Choose a readable staff label so commission rows identify the right professional.
  function staffLabel(staff: Staff) {
    const duplicate = staffOptions.some(other => other.staffId !== staff.staffId && other.name === staff.name);
    return `${staff.name}${staff.state === "Active" ? "" : ` · ${staff.state}`}${duplicate ? ` · ${staff.staffId.slice(0, 8)}` : ""}`;
  }
  // Arrange the report amounts for display so the totals can be compared consistently.
  function amounts(row: Totals) {
    // Show the prepared content and actions so the user can review the information and continue.
    return <><td>{row.serviceCount}</td><td>{money(row.commissionBase, row.currency)}</td><td>{money(row.commissionAmount, row.currency)}</td></>;
  }
  // Show the prepared content and actions so the user can review the information and continue.
  return <section className="reports tw:min-w-0 tw:[&_>_.account-form_label]:mb-0 tw:[&_>_.account-form_>_button]:mt-4.5
          tw:down-640:[&_>_.account-form]:p-4.5 commission-report" aria-busy={busy}>
    <div className="appointment-report-heading tw:flex tw:items-center tw:justify-between tw:gap-5 tw:mb-6 tw:[&_h2]:my-1.5
          tw:[&_h2]:mx-0 tw:[&_p]:m-0 tw:[&_p]:text-[#686868] tw:[&_p]:text-[14px] tw:down-640:items-start"><div><h2>Staff Commission Report</h2><p>Review finalized commissions credited to the staff who performed each service.</p></div>
    </div>
    {/* Group the entry fields and submit action so the user can complete this step in one place. */}
    <form className="appointment-report-filters tw:flex tw:items-end tw:flex-wrap tw:gap-4.5 tw:p-5 tw:[border:1px_solid_#e4dfd3]
          tw:[background:#fff] tw:rounded-[12px] tw:[&_label]:grid tw:[&_label]:gap-2 tw:[&_label]:text-[13px]
          tw:[&_label]:font-semibold tw:[&_label]:m-0 tw:[&_p]:[margin:0_0_2px] tw:[&_p]:text-[12px]
          tw:[&_p]:text-[#686868] tw:down-640:[&_label]:[flex:1_1_140px] tw:down-640:[&_p]:[flex-basis:100%]
          tw:[&_p]:leading-[1.6] sales-summary-filters tw:[&_label]:[flex:1_1_155px]" onSubmit={submit}>
      <label>From<Input type="date" required value={draft.from} disabled={busy} onChange={e => setDraft({ ...draft, from: e.target.value })} /></label>
      <label>Through<Input type="date" required min={draft.from} value={draft.to} disabled={busy} onChange={e => setDraft({ ...draft, to: e.target.value })} /></label>
      <label>Staff member<NativeSelect aria-label="Staff member" value={draft.staffId} disabled={busy} onChange={e => setDraft({ ...draft, staffId: e.target.value })}><option value="">All staff</option>{staffOptions.map(staff => <option key={staff.staffId} value={staff.staffId}>{staffLabel(staff)}</option>)}</NativeSelect></label>
      <Button type="submit" disabled={busy || !timeZone}>Apply filters</Button>
    </form>
    <p className="sales-summary-note tw:[margin:12px_0_22px] tw:text-[12px] tw:text-[#686868] tw:leading-[1.6]">Choose up to 366 days, based on commission finalization date. {timeZone && `Salon time · ${timeZone}.`} Finalized commissions do not indicate payment to staff.</p>
    {pendingFilters && <p role="status" className="sales-summary-note tw:[margin:12px_0_22px] tw:text-[12px] tw:text-[#686868] tw:leading-[1.6]">Filters changed. Select Apply filters to update results.</p>}
    {error && <p role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">{error} <Button variant="outline" disabled={busy} onClick={() => applied ? setRevision(n => n + 1) : setSalonRetry(n => n + 1)}>Retry</Button></p>}
    {busy && <p role="status">Loading commission report…</p>}
    {report && applied && <>
      <div className="appointment-report-list-heading tw:flex tw:items-center tw:justify-between tw:flex-wrap tw:gap-2 tw:[&_h3]:m-0
          tw:[&_h3]:text-[16px] tw:[&_>_span]:text-[12px] tw:[&_>_span]:text-[#686868]"><h3>Finalized commissions</h3><span>{day(report.from)} – {day(report.to)} · {staffOptions.find(staff => staff.staffId === applied.staffId)?.name ?? "All staff"}</span></div>
      {!report.rows.length ? <p className="report-empty tw:[.reports_&]:p-6 tw:[.reports_&]:[border:1px_dashed_#d6d6cf] tw:[.reports_&]:rounded-[10px]
          tw:[.reports_&]:text-[#686868] tw:[.reports_&]:[background:#fff]">No finalized commissions match these filters.</p> : <>
        <div className="table-wrap tw:overflow-auto tw:[&_pre]:max-w-[36rem] tw:[&_pre]:max-h-[28rem] tw:[&_pre]:overflow-auto
          tw:[&_pre]:whitespace-pre-wrap tw:[&_pre]:[overflow-wrap:anywhere] tw:[&_pre]:text-[.8rem] sales-table-wrap
          tw:max-w-full tw:overflow-x-auto tw:my-4 tw:mx-0 tw:[border:1px_solid_#e4dfd3] tw:rounded-[10px]
          tw:[background:#fff] tw:focus-visible:[outline:3px_solid_#987b1f] tw:focus-visible:outline-offset-[3px]" role="region" aria-label="Staff commission summary table" tabIndex={0}>
          {/* Show the records in labeled columns so their details can be compared row by row. */}
          <table className="sales-table tw:w-full tw:min-w-[800px] tw:border-collapse tw:text-[13px] tw:[&_th]:p-4 tw:[&_td]:p-4
          tw:[&_th]:[border-bottom:1px_solid_#e4dfd3] tw:[&_td]:[border-bottom:1px_solid_#e4dfd3] tw:[&_th]:text-right
          tw:[&_td]:text-right tw:[&_th]:tabular-nums tw:[&_td]:tabular-nums tw:[&_thead_th]:[background:#f5f3eb]
          tw:[&_thead_th]:text-[11px] tw:[&_thead_th]:text-[#686454] tw:[&_thead_th]:[border-bottom:2px_solid_#bca45b]
          tw:[&_tbody_th]:font-medium tw:[&_tbody_th]:normal-case tw:[&_tfoot_th]:normal-case
          tw:[&_tbody_th]:tracking-[normal] tw:[&_tfoot_th]:tracking-[normal] tw:[&_tbody_tr:hover]:[background:#faf8f0]
          tw:[&_tfoot]:[background:#f5f3eb] tw:[&_tfoot]:font-bold tw:[.sales-payment-details_&_th]:text-left
          tw:[.sales-payment-details_&_td]:text-left commission-summary-table"><caption className="sr-only tw:absolute tw:w-[1px] tw:h-[1px] tw:overflow-hidden">Finalized commissions per staff member for the full filtered period</caption>
            <thead><tr>{["Staff member", "Services with finalized commissions", "Commission base", "Total commission"].map(header => <th scope="col" key={header}>{header}</th>)}</tr></thead>
            <tbody>{report.rows.map(row => <tr key={`${row.staffId}-${row.currency}`}><th scope="row">{staffLabel(row)}<span className="appointment-report-subtext tw:block tw:text-[12px] tw:font-normal tw:text-[#686868] tw:mt-[3px]
          tw:[overflow-wrap:anywhere]">{row.currency}</span></th>{amounts(row)}</tr>)}</tbody>
            <tfoot>{report.totals.map(row => <tr key={row.currency}><th scope="row">Total · {row.currency}</th>{amounts(row)}</tr>)}</tfoot>
          </table>
        </div>
        <p className="sales-summary-note tw:[margin:12px_0_22px] tw:text-[12px] tw:text-[#686868] tw:leading-[1.6]">Totals cover all filtered records. Stored commission bases, rates, and amounts are preserved when current prices or rates change.</p>
        <Button variant="outline" aria-expanded={showDetails} aria-controls="staff-commission-details" onClick={() => setShowDetails(value => !value)}>{showDetails ? "Hide commission details" : "View commission details"}</Button>
        {showDetails && <div id="staff-commission-details" className="sales-payment-details tw:mt-6"><h3>Commission details</h3>
          <div className="table-wrap tw:overflow-auto tw:[&_pre]:max-w-[36rem] tw:[&_pre]:max-h-[28rem] tw:[&_pre]:overflow-auto
          tw:[&_pre]:whitespace-pre-wrap tw:[&_pre]:[overflow-wrap:anywhere] tw:[&_pre]:text-[.8rem] sales-table-wrap
          tw:max-w-full tw:overflow-x-auto tw:my-4 tw:mx-0 tw:[border:1px_solid_#e4dfd3] tw:rounded-[10px]
          tw:[background:#fff] tw:focus-visible:[outline:3px_solid_#987b1f] tw:focus-visible:outline-offset-[3px]" role="region" aria-label="Commission details table" tabIndex={0}>
            {/* Show the records in labeled columns so their details can be compared row by row. */}
            <table className="sales-table tw:w-full tw:min-w-[800px] tw:border-collapse tw:text-[13px] tw:[&_th]:p-4 tw:[&_td]:p-4
          tw:[&_th]:[border-bottom:1px_solid_#e4dfd3] tw:[&_td]:[border-bottom:1px_solid_#e4dfd3] tw:[&_th]:text-right
          tw:[&_td]:text-right tw:[&_th]:tabular-nums tw:[&_td]:tabular-nums tw:[&_thead_th]:[background:#f5f3eb]
          tw:[&_thead_th]:text-[11px] tw:[&_thead_th]:text-[#686454] tw:[&_thead_th]:[border-bottom:2px_solid_#bca45b]
          tw:[&_tbody_th]:font-medium tw:[&_tbody_th]:normal-case tw:[&_tfoot_th]:normal-case
          tw:[&_tbody_th]:tracking-[normal] tw:[&_tfoot_th]:tracking-[normal] tw:[&_tbody_tr:hover]:[background:#faf8f0]
          tw:[&_tfoot]:[background:#f5f3eb] tw:[&_tfoot]:font-bold tw:[.sales-payment-details_&_th]:text-left
          tw:[.sales-payment-details_&_td]:text-left commission-details-table
          tw:[.sales-payment-details_&]:min-w-[1100px]"><caption className="sr-only tw:absolute tw:w-[1px] tw:h-[1px] tw:overflow-hidden">Individual finalized service commissions</caption>
              <thead><tr>{["Finalized date / time", "Booking code", "Performed by / Commission recipient", "Service", "Commission base", "Rate", "Commission amount", "Performer details"].map(header => <th scope="col" key={header}>{header}</th>)}</tr></thead>
              <tbody>{report.details.map(row => <tr key={row.id}>
                <td>{dateTime(row.finalizedAt)}</td><th scope="row">{row.bookingCode}</th>
                <td><strong>{staffLabel(row)}</strong></td><td>{row.serviceName}</td>
                <td>{money(row.commissionBase, row.currency)}</td><td>{row.commissionRate}%</td><td>{money(row.commissionAmount, row.currency)}</td>
                <td>
                  <details open className="tw:min-w-56 tw:max-w-80 tw:whitespace-normal tw:text-left tw:[overflow-wrap:anywhere]">
                    <summary className="tw:relative tw:cursor-pointer tw:font-semibold tw:text-[#75601e] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-4">Performer details<span className="sr-only"> for {row.bookingCode} · {row.serviceName}</span></summary>
                    <dl className="tw:mb-0 tw:mt-3 tw:grid tw:gap-3 tw:rounded-lg tw:bg-[#f5f3eb] tw:p-3 tw:text-xs tw:[&_dt]:font-semibold tw:[&_dd]:m-0 tw:[&_dd]:mt-1">
                      <div><dt>Booked stylist</dt><dd>{row.bookedStaffName || "Not recorded"}</dd></div>
                      <div><dt>Performed by / Commission recipient</dt><dd>{row.name}</dd></div>
                      <div><dt>Payment recorded by</dt><dd>{row.paymentRecordedBy ? `${row.paymentRecordedBy.role === "CASHIER" ? "Cashier" : "Admin"} · ${row.paymentRecordedBy.name}` : "Not recorded"}</dd></div>
                      {row.replacement ? <>
                        <div><dt>Replacement reason</dt><dd>{row.replacement.reason}</dd></div>
                        <div><dt>Customer agreement</dt><dd>{row.replacement.customerAgreed ? "Confirmed" : "Not recorded"}</dd></div>
                        <div><dt>Replacement recorded by</dt><dd>{row.replacement.recordedByName} · {row.replacement.recordedByRole === "ADMIN" ? "Admin" : "Cashier"}</dd></div>
                        <div><dt>Replacement recorded at</dt><dd>{dateTime(row.replacement.recordedAt)} · {report.timeZone}</dd></div>
                      </> : <div><dt>Replacement</dt><dd>No replacement recorded.</dd></div>}
                    </dl>
                  </details>
                </td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="actions tw:flex tw:gap-3 report-pagination tw:[.reports_&]:items-center tw:[.reports_&]:justify-end
          tw:[.reports_&]:gap-4 tw:[.reports_&]:my-5 tw:[.reports_&]:mx-0 tw:[.reports_&_span]:text-[13px]
          tw:[.reports_&_span]:text-[#686868] tw:down-640:[.reports_&]:justify-between tw:down-640:[.reports_&]:flex-wrap
          tw:down-640:[.reports_&]:gap-2.5 tw:down-640:[.reports_&_button]:py-[9px] tw:down-640:[.reports_&_button]:px-3"><span>{report.total} records · Page {report.page} of {Math.max(1, Math.ceil(report.total / report.pageSize))}</span><Button variant="outline" disabled={busy || report.page <= 1} onClick={() => setPage(n => n - 1)}>Previous</Button><Button variant="outline" disabled={busy || report.page * report.pageSize >= report.total} onClick={() => setPage(n => n + 1)}>Next</Button></div>
        </div>}
      </>}
    </>}
  </section>;
}
