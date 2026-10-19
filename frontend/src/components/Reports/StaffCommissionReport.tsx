import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NativeSelect } from "@/components/ui/NativeSelect";
import { api } from "../../lib/api";

type Filters = { from: string; to: string; staffId: string };
type Staff = { staffId: string; name: string; state: string };
type Totals = { currency: string; serviceCount: number; commissionBase: string; commissionAmount: string };
type Detail = Staff & { id: string; finalizedAt: string; bookingCode: string; serviceName: string; currency: string; commissionBase: string; commissionRate: string; commissionAmount: string };
type Report = {
  from: string; to: string; timeZone: string; staffOptions: Staff[]; rows: (Staff & Totals)[]; totals: Totals[];
  details: Detail[]; total: number; page: number; pageSize: number;
};
function money(value: string, currency: string) {
  const negative = value.startsWith("-");
  const [whole, cents = "00"] = value.replace(/^-/, "").split(".");
  return `${negative ? "−" : ""}${currency === "PHP" ? "₱" : `${currency} `}${whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${cents}`;
}
function day(value: string) {
  return new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00Z`));
}

export function StaffCommissionReport() {
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
  const [showDetails, setShowDetails] = useState(false);
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
  function submit(event: FormEvent) {
    event.preventDefault();
    const days = (Date.parse(draft.to) - Date.parse(draft.from)) / 86_400_000;
    if (!Number.isFinite(days) || days < 0 || days >= 366) {
      setError("Choose an ordered date range of at most 366 days."); return;
    }
    setPage(1); setApplied({ ...draft });
  }
  const pendingFilters = applied && (draft.from !== applied.from || draft.to !== applied.to || draft.staffId !== applied.staffId);
  function staffLabel(staff: Staff) {
    const duplicate = staffOptions.some(other => other.staffId !== staff.staffId && other.name === staff.name);
    return `${staff.name}${staff.state === "Active" ? "" : ` · ${staff.state}`}${duplicate ? ` · ${staff.staffId.slice(0, 8)}` : ""}`;
  }
  function amounts(row: Totals) {
    return <><td>{row.serviceCount}</td><td>{money(row.commissionBase, row.currency)}</td><td>{money(row.commissionAmount, row.currency)}</td></>;
  }
  return <section className="reports commission-report" aria-busy={busy}>
    <div className="appointment-report-heading"><div><h2>Staff Commission Report</h2><p>Review finalized commissions by staff member.</p></div>
      <Button variant="outline" disabled={busy} onClick={() => applied ? setRevision(n => n + 1) : setSalonRetry(n => n + 1)}>Refresh</Button>
    </div>
    <form className="appointment-report-filters sales-summary-filters" onSubmit={submit}>
      <label>From<Input type="date" required value={draft.from} disabled={busy} onChange={e => setDraft({ ...draft, from: e.target.value })} /></label>
      <label>Through<Input type="date" required min={draft.from} value={draft.to} disabled={busy} onChange={e => setDraft({ ...draft, to: e.target.value })} /></label>
      <label>Staff member<NativeSelect aria-label="Staff member" value={draft.staffId} disabled={busy} onChange={e => setDraft({ ...draft, staffId: e.target.value })}><option value="">All staff</option>{staffOptions.map(staff => <option key={staff.staffId} value={staff.staffId}>{staffLabel(staff)}</option>)}</NativeSelect></label>
      <Button type="submit" disabled={busy || !timeZone}>Apply filters</Button>
    </form>
    <p className="sales-summary-note">Choose up to 366 days, based on commission finalization date. {timeZone && `Salon time · ${timeZone}.`} Finalized commissions do not indicate payment to staff.</p>
    {pendingFilters && <p role="status" className="sales-summary-note">Filters changed. Select Apply filters to update results.</p>}
    {error && <p role="alert" className="error">{error}</p>}
    {busy && <p role="status">Loading commission report…</p>}
    {report && applied && <>
      <div className="appointment-report-list-heading"><h3>Finalized commissions</h3><span>{day(report.from)} – {day(report.to)} · {staffOptions.find(staff => staff.staffId === applied.staffId)?.name ?? "All staff"}</span></div>
      {!report.rows.length ? <p className="report-empty">No finalized commissions match these filters.</p> : <>
        <div className="table-wrap sales-table-wrap" role="region" aria-label="Staff commission summary table" tabIndex={0}>
          <table className="sales-table commission-summary-table"><caption className="sr-only">Finalized commissions per staff member for the full filtered period</caption>
            <thead><tr>{["Staff member", "Services with finalized commissions", "Commission base", "Total commission"].map(header => <th scope="col" key={header}>{header}</th>)}</tr></thead>
            <tbody>{report.rows.map(row => <tr key={`${row.staffId}-${row.currency}`}><th scope="row">{staffLabel(row)}<span className="appointment-report-subtext">{row.currency}</span></th>{amounts(row)}</tr>)}</tbody>
            <tfoot>{report.totals.map(row => <tr key={row.currency}><th scope="row">Total · {row.currency}</th>{amounts(row)}</tr>)}</tfoot>
          </table>
        </div>
        <p className="sales-summary-note">Totals cover all filtered records. Stored commission bases, rates, and amounts are preserved when current prices or rates change.</p>
        <Button variant="outline" aria-expanded={showDetails} aria-controls="staff-commission-details" onClick={() => setShowDetails(value => !value)}>{showDetails ? "Hide commission details" : "View commission details"}</Button>
        {showDetails && <div id="staff-commission-details" className="sales-payment-details"><h3>Commission details</h3>
          <div className="table-wrap sales-table-wrap" role="region" aria-label="Commission details table" tabIndex={0}>
            <table className="sales-table commission-details-table"><caption className="sr-only">Individual finalized service commissions</caption>
              <thead><tr>{["Finalized date / time", "Booking code", "Staff member", "Service", "Commission base", "Rate", "Commission amount"].map(header => <th scope="col" key={header}>{header}</th>)}</tr></thead>
              <tbody>{report.details.map(row => <tr key={row.id}><td>{new Intl.DateTimeFormat("en-PH", { timeZone: report.timeZone, year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(row.finalizedAt))}</td><th scope="row">{row.bookingCode}</th><td>{staffLabel(row)}</td><td>{row.serviceName}</td><td>{money(row.commissionBase, row.currency)}</td><td>{row.commissionRate}%</td><td>{money(row.commissionAmount, row.currency)}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="actions report-pagination"><span>{report.total} records · Page {report.page} of {Math.max(1, Math.ceil(report.total / report.pageSize))}</span><Button variant="outline" disabled={busy || report.page <= 1} onClick={() => setPage(n => n - 1)}>Previous</Button><Button variant="outline" disabled={busy || report.page * report.pageSize >= report.total} onClick={() => setPage(n => n + 1)}>Next</Button></div>
        </div>}
      </>}
    </>}
  </section>;
}
