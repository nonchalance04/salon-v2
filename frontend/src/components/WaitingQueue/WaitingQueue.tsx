import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useEffect, useId, useState, type FormEvent } from "react";
import { api } from "../../lib/api";

type Waiting = {
  timeZone: string;
  serverTime: string;
  page: number;
  pageSize: number;
  total: number;
  rows: {
    bookingCode: string;
    startAt: string;
    endAt: string;
    checkedInAt: string;
    minutesSinceCheckIn: number;
    needsReview: boolean;
    checkedInByUser: { firstName: string; lastName: string } | null;
    customer: { firstName: string; lastName: string };
    appointmentServices: {
      id: string;
      serviceNameSnapshot: string;
      staff: { firstName: string; lastName: string };
    }[];
  }[];
};

export function WaitingQueue({
  onSelect,
}: {
  onSelect: (code: string) => void;
}) {
  const heading = useId();
  const [data, setData] = useState<Waiting | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    const query = new URLSearchParams({
      page: String(page),
      pageSize: "25",
      search,
    });
    void api<Waiting>(`/reports/waiting-queue?${query}`, {
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
        if (page > lastPage) {
          setData(null);
          setPage(lastPage);
          return;
        }
        setData(result);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setData(null);
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load waiting customers.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [page, search, refresh]);
  useEffect(() => {
    const update = () => {
      if (document.visibilityState === "visible")
        setRefresh((value) => value + 1);
    };
    const timer = window.setInterval(update, 30000);
    window.addEventListener("focus", update);
    window.addEventListener("appointment-arrival-changed", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      window.removeEventListener("appointment-arrival-changed", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  const format = (value: string) =>
    new Intl.DateTimeFormat("en-PH", {
      timeZone: data?.timeZone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  function submit(event: FormEvent) {
    event.preventDefault();
    setData(null);
    setPage(1);
    setSearch(draft.trim());
    setRefresh((value) => value + 1);
  }
  return (
    <section
      className="admin-panel tw:p-6.5 tw:[background:white] tw:[border:1px_solid_#e3e3e3] tw:rounded-[13px] tw:my-6 tw:mx-0
          tw:[overflow-wrap:anywhere] tw:[&_h3]:mb-2 tw:down-1000:p-5 dashboard-list tw:workspace-main:min-w-0
          tw:workspace-main:p-6 tw:workspace-main:my-6 tw:workspace-main:mx-0 tw:workspace-main:[background:#fff]
          tw:workspace-main:rounded-[14px] tw:workspace-main:[overflow-wrap:anywhere] tw:[&_.section-heading]:items-start
          tw:[&_.section-heading]:gap-6 tw:[&_.section-heading_>_div]:min-w-0 tw:[&_.section-heading_>_div]:flex-1
          tw:[&_.section-heading_h3]:[margin:0_0_8px] tw:[&_.section-heading_p]:max-w-[72ch]
          tw:[&_.section-heading_p]:text-[13px] tw:[&_.section-heading_>_button]:shrink-0
          tw:[&_.cashier-search_label]:[flex:1_1_260px] tw:[&_.cashier-search_label]:min-w-0
          tw:[&_.cashier-search_label]:m-0 tw:[&_.cashier-search_input]:min-h-11 tw:[&_.cashier-search_input]:m-0
          tw:[&_.cashier-search_button]:min-h-11 tw:[&_.table-wrap]:w-full tw:[&_.table-wrap]:mt-4
          tw:[&_table]:table-fixed tw:[&_table]:whitespace-normal tw:workspace-main:[&_th]:p-4
          tw:workspace-main:[&_th]:align-top tw:workspace-main:[&_td]:align-top
          tw:workspace-main:[&_th]:[overflow-wrap:anywhere] tw:workspace-main:[&_td]:[overflow-wrap:anywhere]
          tw:workspace-main:[&_th]:min-w-0 tw:[&_th]:text-[10px] tw:[&_td_small]:inline-block tw:[&_td_small]:text-[12px]
          tw:[&_td_small]:mt-1 tw:[&_tbody_tr:hover]:[background:#fdfbf4] tw:[&_thead]:absolute tw:[&_thead]:w-[1px]
          tw:[&_thead]:h-[1px] tw:[&_thead]:overflow-hidden tw:[&_tbody]:grid tw:[&_tbody]:gap-4 tw:[&_tr]:grid
          tw:[&_tr]:rounded-[12px] tw:[&_tr]:overflow-hidden tw:[&_tr]:[background:#fff] tw:workspace-main:[&_td]:block
          tw:workspace-main:[&_td]:min-w-0 tw:workspace-main:[&_td]:w-auto tw:workspace-main:[&_td]:[border:0]
          tw:workspace-main:[&_td]:p-5 tw:[&_td_strong]:text-[16px] tw:[&_td_.error]:block tw:[&_td_.error]:mt-2.5
          tw:[&_td_.error]:py-2 tw:[&_td_.error]:px-2.5 tw:[&_td_.error]:text-[12px]
          tw:[@media(min-width:_761px)_and_(max-width:_1200px)]:[&_tr]:grid-cols-2
          tw:down-1100:[&_.section-heading]:flex-col tw:down-1100:[&_.section-heading]:gap-3.5
          tw:down-760:workspace-main:p-4 tw:down-760:[&_.table-wrap]:[border:0]
          tw:down-760:[&_.table-wrap]:[background:transparent] tw:down-760:[&_.table-wrap]:overflow-visible
          tw:down-760:[&_thead]:absolute tw:down-760:[&_thead]:w-[1px] tw:down-760:[&_thead]:h-[1px]
          tw:down-760:[&_thead]:overflow-hidden tw:down-760:[&_tbody]:grid tw:down-760:[&_tbody]:gap-4
          tw:down-760:[&_tr]:block tw:down-760:[&_tr]:rounded-[10px] tw:down-760:[&_tr]:overflow-hidden
          tw:down-760:workspace-main:[&_td]:block tw:down-760:workspace-main:[&_td]:w-auto
          tw:down-760:workspace-main:[&_td]:min-w-0 tw:down-760:workspace-main:[&_td]:py-3
          tw:down-760:workspace-main:[&_td]:px-4 tw:down-760:workspace-main:[&_td]:[border:0]
          tw:down-760:workspace-main:[&_td]:[border-bottom:1px_solid_#eee]
          tw:down-760:[&_.cashier-search_label]:[flex:auto] tw:[&_.section-heading_p]:leading-[1.6]
          tw:[&_th]:leading-[1.5] tw:[&_td]:leading-[1.6] dashboard-list-waiting tw:[&_table]:block tw:[&_table]:min-w-0
          tw:[&_tr]:grid-cols-[repeat(4,minmax(0,1fr))_190px] tw:down-760:[&_table]:block tw:down-760:[&_table]:min-w-0"
      aria-labelledby={heading}
    >
      <div className="section-heading tw:flex tw:justify-between tw:items-center tw:gap-5 tw:mb-5 tw:[&_.eyebrow]:mb-2.5
          tw:[&_h2]:text-[30px] tw:down-760:items-start tw:down-760:flex-col
          tw:down-600:[.confirmed-services_&]:items-start tw:down-600:[.confirmed-services_&]:flex-col
          tw:[.admin-scheduling-grid_&]:gap-2.5 tw:[.admin-scheduling-grid_&]:flex-wrap">
        <div>
          <h3 id={heading}>Checked-in waiting queue</h3>
          <p className="muted">
            Oldest check-in first, across all dates. These visits have no
            recorded service outcomes. Service start is not tracked separately,
            so confirm with the stylist before treating a customer as still
            waiting.
          </p>
        </div>
        {/* <button
          disabled={busy}
          onClick={() => setRefresh((value) => value + 1)}
        >
          {busy ? "Refreshing…" : "Refresh waiting queue"}
        </button> */}
      </div>
      <form className="cashier-search tw:flex tw:items-end tw:gap-4 tw:mt-6 tw:[&_label]:flex-1 tw:[&_label]:m-0
          tw:down-600:items-stretch tw:down-600:flex-col tw:[.confirmed-services_&]:[margin:16px_0_22px]" onSubmit={submit}>
        <label>
          Find waiting customer or booking
          <Input
            type="search"
            maxLength={100}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <Button variant="outline">Search</Button>
        {search && (
          <Button variant="outline"
            type="button"
            onClick={() => {
              setDraft("");
              setSearch("");
              setPage(1);
              setData(null);
            }}
          >
            Clear search
          </Button>
        )}
      </form>
      {error && (
        <p role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">
          {error}{" "}
          <Button variant="outline" onClick={() => setRefresh((value) => value + 1)}>
            Retry
          </Button>
        </p>
      )}
      {busy && !data && <p role="status">Loading waiting customers…</p>}
      {data && (
        <>
          <p>
            {data.total} checked-in{" "}
            {data.total === 1 ? "customer" : "customers"} · Updated{" "}
            {format(data.serverTime)} · Refreshes every 30 seconds
          </p>
          {data.rows.length ? (
            <div className="table-wrap tw:overflow-auto tw:[background:white] tw:[border:1px_solid_#dce0d8] tw:rounded-[10px]
          tw:[&_pre]:max-w-[36rem] tw:[&_pre]:max-h-[28rem] tw:[&_pre]:overflow-auto tw:[&_pre]:whitespace-pre-wrap
          tw:[&_pre]:[overflow-wrap:anywhere] tw:[&_pre]:text-[.8rem]">
              <table>
                <thead>
                  <tr>
                    <th>Customer / booking</th>
                    <th>Appointment</th>
                    <th>Arrival</th>
                    <th>Since check-in</th>
                    <th>Services / stylist</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.bookingCode}>
                      <td data-label="Customer / booking">
                        <strong>
                          {row.customer.firstName} {row.customer.lastName}
                        </strong>
                        <br />
                        <small>{row.bookingCode}</small>
                      </td>
                      <td data-label="Appointment">
                        {format(row.startAt)}
                        <br />
                        {row.needsReview && (
                          <span className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">
                            Needs review: scheduled visit has ended
                          </span>
                        )}
                      </td>
                      <td data-label="Arrival">
                        {format(row.checkedInAt)}
                        {row.checkedInByUser && (
                          <>
                            <br />
                            <small>
                              By {row.checkedInByUser.firstName}{" "}
                              {row.checkedInByUser.lastName}
                            </small>
                          </>
                        )}
                      </td>
                      <td data-label="Since check-in">
                        {row.minutesSinceCheckIn} min
                      </td>
                      <td data-label="Services / stylist">
                        {row.appointmentServices.map((service) => (
                          <div key={service.id}>
                            {service.serviceNameSnapshot}
                            <br />
                            <small>
                              {service.staff.firstName} {service.staff.lastName}
                            </small>
                          </div>
                        ))}
                      </td>
                      <td data-label="Action">
                        <Button variant="outline"
                          disabled={busy}
                          onClick={() => onSelect(row.bookingCode)}
                        >
                          Review services
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p role="status">
              {search
                ? "No waiting customers match your search."
                : "No checked-in customers awaiting service outcomes."}
            </p>
          )}
          <div className="actions tw:flex tw:gap-3 cashier-pagination tw:my-5.5 tw:mx-0 tw:items-center tw:flex-wrap
          tw:down-600:justify-between tw:[.dashboard-list_&_span]:mr-auto tw:down-760:[.dashboard-list_&_span]:[order:-1]
          tw:down-760:[.dashboard-list_&_span]:[flex-basis:100%] tw:down-760:[.dashboard-list_&_span]:m-0">
            <Button variant="outline"
              disabled={busy || page <= 1}
              onClick={() => {
                setData(null);
                setPage((value) => value - 1);
              }}
            >
              Previous
            </Button>
            <span>
              Page {page} of{" "}
              {Math.max(1, Math.ceil(data.total / data.pageSize))}
            </span>
            <Button variant="outline"
              disabled={busy || page * data.pageSize >= data.total}
              onClick={() => {
                setData(null);
                setPage((value) => value + 1);
              }}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
