import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCallback, useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { api } from "../../lib/api";
import { ReceiptPrintButton } from "../ReceiptPrintButton";
import { paymentStatusLabel, visibleReportEntries } from "../../utils/payment-presentation";

import "./Reports.css";
import { AppointmentReport } from "./AppointmentReport";
import { SalesSummary } from "./SalesSummary";
import { StaffCommissionReport } from "./StaffCommissionReport";

type Collections = { timeZone: string; basis: string; totals: { currency: string; captured: string; netCashMovement: string; successfulApplied: string; successfulUnapplied: string; reconciliationRequired: string }[]; methodTotals: Record<string, unknown>[]; typeTotals: Record<string, unknown>[]; breakdown: Record<string, unknown>[] };
type Report = { rows: Record<string, unknown>[]; total: number; page: number; pageSize: number; dateBasis: string; timeZone: string };
const reportLabels: Record<string, string> = {
  serviceNameSnapshot: "Service Name",
  priceSnapshot: "Price",
  recoveryOfAppointmentId: "Original Booking ID",
  carriedAppointmentFeePaymentId: "Transferred Booking Fee Payment ID",
};
const label = (key: string) => reportLabels[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, s => s.toUpperCase());
function Value({ value }: { value: unknown }) {
  if (value == null) return <>—</>;
  if (Array.isArray(value)) return <ul>{value.map((item, i) => <li key={i}><Value value={item} /></li>)}</ul>;
  if (typeof value === "object") return <dl className="report-details tw:[.reports_&]:min-w-0 tw:[.reports_&]:max-w-full tw:[.reports_&]:[margin:12px_0_0]
          tw:[.reports_&_>_div]:block tw:[.reports_&_>_div]:py-2 tw:[.reports_&_>_div]:px-0 tw:[.reports_&_>_div]:m-0
          tw:[.reports_&_>_div]:[border-bottom:1px_solid_#e7e7df] tw:[.reports_&_dt]:text-[11px]
          tw:[.reports_&_dt]:text-[#686868] tw:[.reports_&_dd]:[margin:4px_0_0]
          tw:[.reports_&_dd]:[overflow-wrap:anywhere] tw:min-w-[16rem] tw:max-w-[32rem] tw:my-[.75rem] tw:mx-0
          tw:[&_>_div]:mb-[.5rem] tw:[&_dt]:font-semibold tw:[&_dd]:[margin:.15rem_0_.5rem]
          tw:[&_dd]:[overflow-wrap:anywhere]">{visibleReportEntries(value as Record<string, unknown>).map(([key, item]) => <div key={key}><dt>{label(key)}</dt><dd><Value value={item} /></dd></div>)}</dl>;
  if (typeof value === "boolean") return <>{value ? "Yes" : "No"}</>;
  return <>{paymentStatusLabel(String(value))}</>;
}
const numericColumn = (key: string) => /(?:amount|price|captured|netCashMovement|successfulApplied|successfulUnapplied|reconciliationRequired|commissionBase|allocatedAppointmentFee|total|count|rate)$/i.test(key);
function columnWidth(key: string, rows: Record<string, unknown>[]) {
  if (rows.some(row => row[key] !== null && typeof row[key] === "object")) return 280;
  if (/Id$|Number$/.test(key)) return 220;
  if (/At$/.test(key)) return 200;
  if (numericColumn(key)) return 130;
  if (/Time$/.test(key)) return 120;
  if (["method", "provider", "currency"].includes(key)) return 130;
  if (key === "status") return 150;
  return 170;
}
function DataTable({ rows, renderCell, title = "Report records" }: { rows: Record<string, unknown>[]; renderCell?: (column: string, row: Record<string, unknown>) => ReactNode; title?: string }) {
  if (!rows.length) return <p className="report-empty tw:[.reports_&]:p-6 tw:[.reports_&]:[border:1px_dashed_#d6d6cf] tw:[.reports_&]:rounded-[10px]
          tw:[.reports_&]:text-[#686868] tw:[.reports_&]:[background:#fff]">No records in this period.</p>;
  const columns = visibleReportEntries(rows[0]).map(([key]) => key).filter(k => k !== "id");
  const widths = columns.map(column => columnWidth(column, rows));
  const style = { "--report-table-width": `${widths.reduce((sum, width) => sum + width, 0)}px` } as CSSProperties;
  return <div className="table-wrap tw:overflow-auto tw:[background:white] tw:[border:1px_solid_#dce0d8] tw:rounded-[10px]
          tw:[&_pre]:max-w-[36rem] tw:[&_pre]:max-h-[28rem] tw:[&_pre]:overflow-auto tw:[&_pre]:whitespace-pre-wrap
          tw:[&_pre]:[overflow-wrap:anywhere] tw:[&_pre]:text-[.8rem] report-table-wrap tw:[.reports_&]:relative
          tw:[.reports_&]:w-full tw:[.reports_&]:max-w-full tw:[.reports_&]:[margin:16px_0_24px]
          tw:[.reports_&]:overflow-x-auto tw:[.reports_&:focus-visible]:[outline:3px_solid_#987b1f]
          tw:[.reports_&:focus-visible]:outline-offset-[3px] tw:down-640:[.reports_&]:[border:0]
          tw:down-640:[.reports_&]:rounded-none tw:down-640:[.reports_&]:[background:transparent]
          tw:down-640:[.reports_&]:overflow-visible tw:down-640:[.appointment-report_&]:overflow-x-auto
          tw:down-640:[.appointment-report_&]:[background:#fff] tw:down-640:[.appointment-report_&]:rounded-[10px]" role="region" aria-label={`${title} table`} tabIndex={0}>
    <table className="report-table tw:[.reports_&]:table-fixed tw:[.reports_&]:whitespace-normal tw:[.reports_&_th]:p-4
          tw:[.reports_&_td]:p-4 tw:[.reports_&_th]:align-top tw:[.reports_&_td]:align-top
          tw:[.reports_&_th]:[overflow-wrap:anywhere] tw:[.reports_&_td]:[overflow-wrap:anywhere]
          tw:[.reports_&_th]:[border-right:1px_solid_#d6d6cf] tw:[.reports_&_td]:[border-right:1px_solid_#d6d6cf]
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
          tw:[.reports_&_th]:leading-[1.5] tw:[.reports_&_td]:leading-[1.6]" style={style} role="table">
      <caption className="sr-only tw:absolute tw:w-[1px] tw:h-[1px] tw:overflow-hidden">{title}</caption>
      <colgroup>{columns.map((column, i) => <col key={column} style={{ width: widths[i] }} />)}</colgroup>
      <thead role="rowgroup"><tr role="row">{columns.map(column => <th key={column} scope="col" role="columnheader" className={numericColumn(column) ? "report-numeric" : undefined}>{label(column)}</th>)}</tr></thead>
      <tbody role="rowgroup">{rows.map((row, i) => <tr key={String(row.id ?? i)} role="row">{columns.map(column => <td key={column} role="cell" data-label={label(column)} className={[numericColumn(column) ? "report-numeric" : "", row[column] !== null && typeof row[column] === "object" ? "report-detail-cell" : ""].filter(Boolean).join(" ")}>
        <div className="report-cell-value tw:[.reports_&]:min-w-0 tw:[.reports_&]:max-w-full tw:[.reports_&_>_button]:max-w-full
          tw:[.reports_&_>_button]:py-2 tw:[.reports_&_>_button]:px-3 tw:[.reports_&_>_button]:text-[12px]
          tw:[.reports_&_>_button]:whitespace-normal tw:[.reports_&_ul]:[list-style:none]
          tw:[.reports_&_ul]:[margin:12px_0_0] tw:[.reports_&_ul]:p-0 tw:[.reports_&_li]:p-3 tw:[.reports_&_li]:mb-2.5
          tw:[.reports_&_li]:[background:#f5f5f1] tw:[.reports_&_li]:[border:1px_solid_#e3e3dc]
          tw:[.reports_&_li]:rounded-[8px]">{renderCell?.(column, row) ?? (typeof row[column] === "object" && row[column] !== null ? <details className="report-cell-details tw:[.reports_&]:text-center tw:[.reports_&_>_summary]:w-[fit-content]
          tw:[.reports_&_>_summary]:mx-auto tw:[.reports_&_>_summary]:cursor-pointer
          tw:[.reports_&_>_summary]:font-semibold tw:[.reports_&_>_summary]:text-[#65500e]
          tw:[.reports_&_>_summary]:rounded-[4px] tw:[.reports_&_>_summary:focus-visible]:[outline:3px_solid_#987b1f]
          tw:[.reports_&_>_summary:focus-visible]:outline-offset-[3px]"><summary>View details<span className="sr-only tw:absolute tw:w-[1px] tw:h-[1px] tw:overflow-hidden">: {label(column)}, record {i + 1}</span></summary><Value value={row[column]} /></details> : <Value value={row[column]} />)}</div>
      </td>)}</tr>)}</tbody>
    </table>
  </div>;
}
function receiptCell(column: string, row: Record<string, unknown>) {
  const snapshot = row.receiptSnapshot;
  if (column !== "receiptSnapshot") return undefined;
  if (typeof row.receiptNumber !== "string" || !snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return <>—</>;
  return <ReceiptPrintButton label="Print / Save PDF" receipt={{ receiptNumber: row.receiptNumber, receiptSnapshot: snapshot as Record<string, unknown> }} />;
}
export function Reports({ admin, initialKind = "appointments" }: { admin: boolean; initialKind?: string }) {
  if (admin && initialKind === "payments") return <SalesSummary />;
  if (admin && initialKind === "commissions") return <StaffCommissionReport />;
  return admin && initialKind === "appointments" ? <AppointmentReport /> : <TransactionReports admin={admin} initialKind={initialKind} />;
}
function TransactionReports({ admin, initialKind = "appointments" }: { admin: boolean; initialKind?: string }) {
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [kind, setKind] = useState(initialKind); const [collections, setCollections] = useState<Collections | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  // Initialize using the configured salon timezone, rather than the browser's date.
  useEffect(() => { let active = true; void api<{ timeZone: string }>("/salon").then(salon => {
    if (!active) return; const today = new Intl.DateTimeFormat("en-CA", { timeZone: salon.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    setFrom(today); setTo(today);
  }).catch(err => { if (active) setError(err instanceof Error ? err.message : "Unable to load salon date."); }); return () => { active = false; }; }, []);
  const load = useCallback(async (page = 1) => {
    setBusy(true); setError(""); setReport(null); setCollections(null);
    const query = new URLSearchParams({ from, to, page: String(page), pageSize: "25" });
    try {
      if (admin) {
        const result = await api<Report>(`/reports/${kind}?${query}`);
        if (kind === "payments") {
          const timeFormat = new Intl.DateTimeFormat("en-PH", { timeZone: result.timeZone, hour: "numeric", minute: "2-digit", hour12: true });
          result.rows = result.rows.map(({ appointment, ...payment }) => ({
            bookingCode: appointment && typeof appointment === "object" && "bookingCode" in appointment ? appointment.bookingCode : null,
            ...Object.fromEntries(visibleReportEntries(payment).filter(([key]) => !["currency", "satisfiesObligation", "reconciliationStatus"].includes(key)).map(([key, value]) => {
              if (key === "createdAt" || key === "paidAt") {
                return [key === "createdAt" ? "createdTime" : "paidTime", value == null ? null : timeFormat.format(new Date(String(value)))];
              }
              return [key, value];
            })),
          }));
        }
        if (kind === "receipts" || kind === "appointments") {
          const dateTimeFormat = new Intl.DateTimeFormat("en-PH", { timeZone: result.timeZone, year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
          const dateColumns = kind === "receipts" ? ["issuedAt"] : ["startAt", "endAt"];
          result.rows = result.rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [
            key, dateColumns.includes(key) && value != null ? dateTimeFormat.format(new Date(String(value))) : value,
          ])));
        }
        setReport(result);
      } else setCollections(await api<Collections>(`/reports/collections?${query}`));
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load reports."); }
    finally { setBusy(false); }
  }, [admin, from, to, kind]);
  useEffect(() => {
    if (admin && from && to && to >= from) void load();
  }, [admin, from, to, load]);
  function submit(e: FormEvent) { e.preventDefault(); void load(); }
  function clear() { setCollections(null); setReport(null); }
  return <section className="reports tw:min-w-0 tw:[&_>_.account-form_label]:mb-0 tw:[&_>_.account-form_>_button]:mt-4.5
          tw:down-640:[&_>_.account-form]:p-4.5"><h2>{admin ? "Reports" : "Collection summary"}</h2><p>Choose up to 366 days in salon time. Reports use historical transactions and stored service values.</p>
    <form className="account-form tw:[border:1px_solid_#dce0d8] tw:[background:white] tw:p-7 tw:rounded-[10px] tw:mb-[25px]
          tw:down-760:p-5" onSubmit={submit}><div className="form-grid tw:grid tw:grid-cols-[1fr_1fr] tw:gap-[0_24px] tw:down-760:grid-cols-[1fr]"><label>From<Input type="date" required value={from} disabled={busy} onChange={e => { setFrom(e.target.value); clear(); }} /></label><label>Through<Input type="date" required value={to} min={from} disabled={busy} onChange={e => { setTo(e.target.value); clear(); }} /></label>
    {/* {admin && <label>Report<select value={kind} disabled={busy} onChange={e => { setKind(e.target.value); clear(); }}>{["appointments", "payments", "receipts", "commissions"].map(k => <option key={k} value={k}>{label(k)}</option>)}</select></label>} */}</div>{!admin && <Button variant="default" className="primary tw:[background:#203c34] tw:text-[white] tw:[border-color:#203c34] tw:hover:[background:#31584c]
          tw:[.login-card_&]:w-full tw:[.login-card_&]:mt-1.5" disabled={busy}>{busy ? "Loading…" : "Run report"}</Button>}</form>
    {admin && busy && <p role="status">Loading…</p>}
    {error && <p role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">{error}</p>}
    {collections && <><h3>Collections</h3><p>{collections.basis} Timezone: {collections.timeZone}.</p><DataTable rows={collections.totals} title="Collections" /><p>Successful applied and unapplied amounts describe current payment status. Reconciliation required is a subset, not an additional collection.</p><h3>Collections by payment method</h3><DataTable rows={collections.methodTotals} title="Collections by method" /><h3>Appointment fees & service payment captures</h3><DataTable rows={collections.typeTotals} title="Collections by payment type" /><details><summary>Collection breakdown by payment type and method</summary><DataTable rows={collections.breakdown} title="Collection breakdown" /></details></>}
    {report && <><h3>{label(kind)}</h3><p>{report.total} records · Date basis: {report.dateBasis}. Timestamps in details use ISO format with UTC offsets.</p>{kind === "receipts" && <p>Use Print / Save PDF to open the formatted receipt, then choose Save as PDF in the print destination.</p>}<DataTable rows={report.rows} title={label(kind)} renderCell={kind === "receipts" ? receiptCell : undefined} /><div className="actions tw:flex tw:gap-3 report-pagination tw:[.reports_&]:items-center tw:[.reports_&]:justify-end
          tw:[.reports_&]:gap-4 tw:[.reports_&]:my-5 tw:[.reports_&]:mx-0 tw:[.reports_&_span]:text-[13px]
          tw:[.reports_&_span]:text-[#686868] tw:down-640:[.reports_&]:justify-between tw:down-640:[.reports_&]:flex-wrap
          tw:down-640:[.reports_&]:gap-2.5 tw:down-640:[.reports_&_button]:py-[9px] tw:down-640:[.reports_&_button]:px-3"><Button variant="outline" disabled={busy || report.page <= 1} onClick={() => void load(report.page - 1)}>Previous</Button><span>Page {report.page} of {Math.max(1, Math.ceil(report.total / report.pageSize))}</span><Button variant="outline" disabled={busy || report.page * report.pageSize >= report.total} onClick={() => void load(report.page + 1)}>Next</Button></div></>}
  </section>;
}
