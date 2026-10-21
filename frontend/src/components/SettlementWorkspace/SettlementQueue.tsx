// Bring in the tools for the settlement workspace view so this file can work with the rest of the application.
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "../../lib/api";

// Describe the information used by the settlement workspace view so different parts of the application agree on its contents.
export type QueueVisit = {
  bookingCode: string;
  startAt: string;
  checkedInAt: string | null;
  customer: { firstName: string; lastName: string };
};
type Queue = { timeZone: string; total: number; page: number; pageSize: number; rows: QueueVisit[] };

// Show visits awaiting settlement so the cashier can select an appointment to finish.
export function SettlementQueue({ selectedCode, disabled, refresh, onSelect }: {
  selectedCode?: string; disabled: boolean; refresh: number;
  onSelect: (code: string) => void;
}) {
  // Remember the current choices and screen status so the page can respond as the user works.
  const [data, setData] = useState<Queue | null>(null);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  // Keep time-based screen updates running while this view is open so its status stays current.
  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(draft.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timer);
  }, [draft]);
  // Load the information this view needs when its inputs change so the displayed results stay current.
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
  // Show the prepared content and actions so the user can review the information and continue.
  return <aside className="settlement-queue tw:[grid-column:1] tw:[grid-row:2_/_span_6] tw:[background:white]
          tw:[border:1px_solid_#e7e3e9] tw:rounded-[12px] tw:py-5 tw:px-3.5 tw:min-w-0" aria-label="Bookings awaiting settlement">
    <div className="settlement-queue-heading tw:py-0 tw:px-1.5 tw:[&_h3]:text-[22px] tw:[&_h3]:[margin:0_0_5px]
          tw:[&_p]:text-[#514b57] tw:[&_p]:text-[15px] tw:[&_p]:mb-4.5"><h3>Awaiting settlement</h3><p>Includes previous dates</p></div>
    <label className="settlement-queue-search tw:relative tw:[margin:0_6px_16px] tw:[&_>_svg]:absolute tw:[&_>_svg]:left-3
          tw:[&_>_svg]:top-[17px] tw:[&_>_svg]:text-[#5f5767] tw:[&_>_svg]:pointer-events-none tw:[&_input]:pl-9
          tw:[&_input]:text-[15px] tw:[&_input]:min-h-10.5"><span className="sr-only tw:absolute tw:w-[1px] tw:h-[1px] tw:overflow-hidden">Search bookings awaiting settlement</span><Search size={17} aria-hidden="true" /><Input type="search" maxLength={100} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Customer or booking code" disabled={disabled} /></label>
    {busy && <p role="status" className="settlement-queue-message tw:py-4 tw:px-1.5 tw:text-[#514b57] tw:text-[16px]">Loading bookings…</p>}
    {error && <p role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">{error} <Button variant="outline" disabled={disabled} onClick={() => setRetry(value => value + 1)}>Retry list</Button></p>}
    {data && <>
      <div className="settlement-queue-visits tw:grid tw:gap-[3px] tw:down-900:max-h-[280px] tw:down-900:overflow-y-auto">{data.rows.map(visit => <button type="button" key={visit.bookingCode} className="settlement-queue-visit tw:workspace-main:block tw:workspace-main:w-full tw:workspace-main:[border:0]
          tw:workspace-main:[border-left:4px_solid_transparent] tw:workspace-main:[border-bottom:1px_solid_#f0edf1]
          tw:workspace-main:rounded-[6px] tw:workspace-main:[background:white] tw:workspace-main:text-left
          tw:workspace-main:py-[17px] tw:workspace-main:px-2.5 tw:workspace-main:text-[#242424]
          tw:workspace-main:font-normal tw:workspace-main:[&[aria-current]]:[background:#f2eaf0]
          tw:workspace-main:hover:[background:#f7f2f6] tw:[&_strong]:text-[17px] tw:[&_strong]:[overflow-wrap:anywhere]
          tw:[&_small]:block tw:[&_small]:mt-2 tw:[&_small]:text-[14px] tw:[&_small]:leading-[1.6]" aria-current={selectedCode === visit.bookingCode ? "true" : undefined} disabled={disabled || busy} onClick={() => onSelect(visit.bookingCode)}>
        <span className="settlement-queue-visit-top tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2
          tw:down-520:items-start"><strong>{visit.customer.firstName} {visit.customer.lastName}</strong><span className={`settlement-arrival tw:text-[14px] tw:py-1 tw:px-2 tw:rounded-[16px] tw:[background:#f1eff3] tw:text-[#51495b] tw:whitespace-nowrap tw:[&.arrived]:text-[#246743] tw:[&.arrived]:[background:#dff3e5]  ${visit.checkedInAt ? "arrived" : ""}`}>{visit.checkedInAt ? "Arrived" : "Not arrived"}</span></span>
        <small>{visit.bookingCode} · {new Intl.DateTimeFormat("en-PH", { timeZone: data.timeZone, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(visit.startAt))}</small>
      </button>)}</div>
      {!data.rows.length && <p className="settlement-queue-message tw:py-4 tw:px-1.5 tw:text-[#514b57] tw:text-[16px]">{search ? "No bookings match your search." : "No bookings awaiting settlement."}</p>}
      <div className="settlement-queue-footer tw:[border-top:1px_solid_#eae7ed] tw:[margin:24px_6px_0] tw:pt-4 tw:text-[15px]
          tw:text-[#514b57] tw:[&_>_div]:flex tw:[&_>_div]:gap-2 tw:[&_>_div]:mt-3 tw:[&_button]:text-[14px]"><span>{data.total} {data.total === 1 ? "booking" : "bookings"}</span><div><Button variant="outline" size="sm" disabled={disabled || busy || page === 1} onClick={() => setPage(value => value - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={disabled || busy || page * data.pageSize >= data.total} onClick={() => setPage(value => value + 1)}>Next</Button></div></div>
    </>}
  </aside>;
}
