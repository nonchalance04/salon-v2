import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NativeSelect } from "@/components/ui/NativeSelect";
import { api } from "../../lib/api";

type Filters = { from: string; to: string; method: string; type: string };
type Sales = {
  date: string; currency: string; successfulPayments: number; returnedPayments: number;
  appointmentFees: string; servicePayments: string; collected: string; returned: string; netCollections: string;
};
type Movement = {
  id: string; bookingCode: string; eventAt: string; eventType: "COLLECTED" | "RETURNED";
  type: string; method: string; currency: string; amount: string; reconciliationStatus: string;
};
type Report = {
  from: string; to: string; timeZone: string; rows: Sales[]; totals: Sales[];
  transactions: Movement[]; totalMovements: number; page: number; pageSize: number;
};
const methods: Record<string, string> = { CASH: "Cash", GCASH: "GCash", QRPH: "QR Ph", OTHER: "Other" };
const types: Record<string, string> = { APPOINTMENT_FEE: "Appointment Fee", SERVICE_PAYMENT: "Service Payment" };
function money(value: string, currency: string) {
  const negative = value.startsWith("-");
  const [whole, cents = "00"] = value.replace(/^-/, "").split(".");
  return `${negative ? "−" : ""}${currency === "PHP" ? "₱" : `${currency} `}${whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${cents}`;
}
function day(value: string) {
  return new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00Z`));
}

export function SalesSummary() {
  const [draft, setDraft] = useState<Filters>({ from: "", to: "", method: "", type: "" });
  const [applied, setApplied] = useState<Filters | null>(null);
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
      const initial = { from: today, to: today, method: "", type: "" };
      setTimeZone(salon.timeZone); setDraft(initial); setApplied(initial);
    }).catch(err => { if (active) { setError(err instanceof Error ? err.message : "Unable to load salon date."); setBusy(false); } });
    return () => { active = false; };
  }, [salonRetry]);
  useEffect(() => {
    if (!applied) return;
    let active = true;
    setBusy(true); setError(""); setReport(null);
    const query = new URLSearchParams({ from: applied.from, to: applied.to, page: String(page), pageSize: "25" });
    if (applied.method) query.set("method", applied.method);
    if (applied.type) query.set("type", applied.type);
    void api<Report>(`/reports/sales-summary?${query}`).then(result => { if (active) setReport(result); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : "Unable to load sales summary."); })
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
  const pendingFilters = applied && Object.keys(draft).some(key => draft[key as keyof Filters] !== applied[key as keyof Filters]);
  const hasReturns = report?.totals.some(row => row.returnedPayments > 0) ?? false;
  const headers = ["Date", "Successful payments", "Appointment fees", "Service payments", "Total collected", ...(hasReturns ? ["Returned payments", "Net collections"] : [])];
  function amounts(row: Sales) {
    return <><td>{row.successfulPayments}</td><td>{money(row.appointmentFees, row.currency)}</td><td>{money(row.servicePayments, row.currency)}</td><td>{money(row.collected, row.currency)}</td>{hasReturns && <><td>{money(row.returned, row.currency)}</td><td>{money(row.netCollections, row.currency)}</td></>}</>;
  }
  return <section className="reports sales-summary" aria-busy={busy}>
    <div className="appointment-report-heading"><div><h2>Sales Summary</h2><p>Review money collected by day, payment method, and payment type.</p></div>
      <Button variant="outline" disabled={busy} onClick={() => applied ? setRevision(n => n + 1) : setSalonRetry(n => n + 1)}>Refresh</Button>
    </div>
    <form className="appointment-report-filters sales-summary-filters" onSubmit={submit}>
      <label>From<Input type="date" required value={draft.from} disabled={busy} onChange={e => setDraft({ ...draft, from: e.target.value })} /></label>
      <label>Through<Input type="date" required min={draft.from} value={draft.to} disabled={busy} onChange={e => setDraft({ ...draft, to: e.target.value })} /></label>
      <label>Payment method<NativeSelect aria-label="Payment method" value={draft.method} disabled={busy} onChange={e => setDraft({ ...draft, method: e.target.value })}><option value="">All methods</option>{Object.entries(methods).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</NativeSelect></label>
      <label>Payment type<NativeSelect aria-label="Payment type" value={draft.type} disabled={busy} onChange={e => setDraft({ ...draft, type: e.target.value })}><option value="">All types</option>{Object.entries(types).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</NativeSelect></label>
      <Button type="submit" disabled={busy || !timeZone}>Apply filters</Button>
    </form>
    <p className="sales-summary-note">Choose up to 366 days. Collections use payment collection date; returns use recorded return date. {timeZone && `Salon time · ${timeZone}.`}</p>
    {pendingFilters && <p role="status" className="sales-summary-note">Filters changed. Select Apply filters to update results.</p>}
    {error && <p role="alert" className="error">{error}</p>}
    {busy && <p role="status">Loading sales summary…</p>}
    {report && applied && <>
      <div className="appointment-report-list-heading"><h3>Daily collections</h3><span>{day(report.from)} – {day(report.to)} · {methods[applied.method] ?? "All methods"} · {types[applied.type] ?? "All types"}</span></div>
      {!report.rows.length ? <p className="report-empty">No collections or returned payments match these filters.</p> : <>
        <div className="table-wrap sales-table-wrap" role="region" aria-label="Daily collections table" tabIndex={0}>
          <table className="sales-table"><caption className="sr-only">Daily collections and totals for the full filtered period</caption>
            <thead><tr>{headers.map(header => <th scope="col" key={header}>{header}</th>)}</tr></thead>
            <tbody>{report.rows.map(row => <tr key={`${row.date}-${row.currency}`}><th scope="row">{day(row.date)}<span className="appointment-report-subtext">{row.currency}</span></th>{amounts(row)}</tr>)}</tbody>
            <tfoot>{report.totals.map(row => <tr key={row.currency}><th scope="row">Total · {row.currency}</th>{amounts(row)}</tr>)}</tfoot>
          </table>
        </div>
        <p className="sales-summary-note">Totals cover all filtered transactions. Pending and failed attempts and transferred booking-fee credits are excluded. Collected amounts include successful captures awaiting reconciliation.{hasReturns && " Returned payments are shown separately and deducted from net collections."}</p>
        <Button variant="outline" aria-expanded={showDetails} aria-controls="sales-payment-details" onClick={() => setShowDetails(value => !value)}>{showDetails ? "Hide payment details" : "View payment details"}</Button>
        {showDetails && <div id="sales-payment-details" className="sales-payment-details"><h3>Payment details</h3><p className="sales-summary-note">Each row is a collection or recorded return. A payment collected and returned in this period has two rows.</p>
          <div className="table-wrap sales-table-wrap" role="region" aria-label="Payment details table" tabIndex={0}>
            <table className="sales-table"><caption className="sr-only">Individual collections and returned payments</caption><thead><tr>{["Booking code", "Date / time", "Payment type", "Method", "Movement", "Amount"].map(header => <th scope="col" key={header}>{header}</th>)}</tr></thead>
              <tbody>{report.transactions.map(row => <tr key={`${row.id}-${row.eventType}`}><th scope="row">{row.bookingCode}</th><td>{new Intl.DateTimeFormat("en-PH", { timeZone: report.timeZone, year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(row.eventAt))}</td><td>{types[row.type] ?? row.type}</td><td>{methods[row.method] ?? row.method}</td><td>{row.eventType === "COLLECTED" ? "Collected" : "Returned"}{row.eventType === "COLLECTED" && row.reconciliationStatus === "REQUIRED" && <span className="appointment-report-subtext">Needs reconciliation</span>}</td><td>{money(row.amount, row.currency)}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="actions report-pagination"><span>{report.totalMovements} movements · Page {report.page} of {Math.max(1, Math.ceil(report.totalMovements / report.pageSize))}</span><Button variant="outline" disabled={busy || report.page <= 1} onClick={() => setPage(n => n - 1)}>Previous</Button><Button variant="outline" disabled={busy || report.page * report.pageSize >= report.totalMovements} onClick={() => setPage(n => n + 1)}>Next</Button></div>
        </div>}
      </>}
    </>}
  </section>;
}
