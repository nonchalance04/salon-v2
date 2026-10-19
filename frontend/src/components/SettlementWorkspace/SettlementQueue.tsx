import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "../../lib/api";

export type QueueVisit = {
  bookingCode: string;
  startAt: string;
  checkedInAt: string | null;
  customer: { firstName: string; lastName: string };
};
type Queue = { timeZone: string; total: number; page: number; pageSize: number; rows: QueueVisit[] };

export function SettlementQueue({ selectedCode, disabled, refresh, onSelect }: {
  selectedCode?: string; disabled: boolean; refresh: number;
  onSelect: (code: string) => void;
}) {
  const [data, setData] = useState<Queue | null>(null);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(draft.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timer);
  }, [draft]);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    setData(null);
    const query = new URLSearchParams({ page: String(page), pageSize: "5", search });
    void api<Queue>(`/reports/confirmed-services?${query}`, { signal: controller.signal })
      .then(result => {
        if (controller.signal.aborted) return;
        const last = Math.max(1, Math.ceil(result.total / result.pageSize));
        if (page > last) { setPage(last); return; }
        setData(result);
      })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Unable to load bookings."); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [page, search, retry, refresh]);
  return <aside className="settlement-queue" aria-label="Bookings awaiting settlement">
    <div className="settlement-queue-heading"><h3>Awaiting settlement</h3><p>Includes previous dates</p></div>
    <label className="settlement-queue-search"><span className="sr-only">Search bookings awaiting settlement</span><Search size={17} aria-hidden="true" /><Input type="search" maxLength={100} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Customer or booking code" disabled={disabled} /></label>
    {busy && <p role="status" className="settlement-queue-message">Loading bookings…</p>}
    {error && <p role="alert" className="error">{error} <Button variant="outline" disabled={disabled} onClick={() => setRetry(value => value + 1)}>Retry list</Button></p>}
    {data && <>
      <div className="settlement-queue-visits">{data.rows.map(visit => <button type="button" key={visit.bookingCode} className="settlement-queue-visit" aria-current={selectedCode === visit.bookingCode ? "true" : undefined} disabled={disabled || busy} onClick={() => onSelect(visit.bookingCode)}>
        <span className="settlement-queue-visit-top"><strong>{visit.customer.firstName} {visit.customer.lastName}</strong><span className={`settlement-arrival ${visit.checkedInAt ? "arrived" : ""}`}>{visit.checkedInAt ? "Arrived" : "Not arrived"}</span></span>
        <small>{visit.bookingCode} · {new Intl.DateTimeFormat("en-PH", { timeZone: data.timeZone, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(visit.startAt))}</small>
      </button>)}</div>
      {!data.rows.length && <p className="settlement-queue-message">{search ? "No bookings match your search." : "No bookings awaiting settlement."}</p>}
      <div className="settlement-queue-footer"><span>{data.total} {data.total === 1 ? "booking" : "bookings"}</span><div><Button variant="outline" size="sm" disabled={disabled || busy || page === 1} onClick={() => setPage(value => value - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={disabled || busy || page * data.pageSize >= data.total} onClick={() => setPage(value => value + 1)}>Next</Button></div></div>
    </>}
  </aside>;
}
