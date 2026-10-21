import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { AppointmentCheckIn } from "../AppointmentCheckIn";
import { useEffect, useId, useState, type FormEvent } from "react";
import { api } from "../../lib/api";

type ConfirmedBookings = {
  timeZone: string;
  page: number;
  pageSize: number;
  total: number;
  rows: {
    bookingCode: string;
    startAt: string;
    checkedInAt: string | null;
    checkedInByUser: { firstName: string; lastName: string } | null;
    customer: { firstName: string; lastName: string };
    appointmentServices: {
      id: string;
      serviceNameSnapshot: string;
      priceSnapshot: string;
      outcome: string;
      staff: { firstName: string; lastName: string };
    }[];
  }[];
};

export function ConfirmedServices({
  admin,
  onSelect,
  disabled = false,
  arrivalOnly = false,
  manageOutcomes = false,
  paymentDesk = false,
}: {
  admin: boolean;
  onSelect: (code: string) => void;
  disabled?: boolean;
  arrivalOnly?: boolean;
  manageOutcomes?: boolean;
  paymentDesk?: boolean;
}) {
  const heading = useId();
  const [data, setData] = useState<ConfirmedBookings | null>(null);
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
      pageSize: "5",
      search,
    });
    if (arrivalOnly) query.set("arrivalToday", "true");
    else if (!admin && !manageOutcomes) query.set("paymentReady", "true");
    void api<ConfirmedBookings>(`/reports/confirmed-services?${query}`, {
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
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load confirmed services.",
          );
          setData(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [page, search, refresh, admin, arrivalOnly, manageOutcomes]);
  useEffect(() => {
    const update = () => {
      if (document.visibilityState === "visible")
        setRefresh((value) => value + 1);
    };
    const timer = window.setInterval(update, 30000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  function submit(event: FormEvent) {
    event.preventDefault();
    setData(null);
    setPage(1);
    setSearch(draft.trim());
    setRefresh((value) => value + 1);
  }
  return (
    <section
      className={`confirmed-services dashboard-list tw:workspace-main:min-w-0 tw:workspace-main:p-6 tw:workspace-main:my-6 tw:workspace-main:mx-0 tw:workspace-main:[background:#fff] tw:workspace-main:rounded-[14px] tw:workspace-main:[overflow-wrap:anywhere] tw:[&_.section-heading]:items-start tw:[&_.section-heading]:gap-6 tw:[&_.section-heading_>_div]:min-w-0 tw:[&_.section-heading_>_div]:flex-1 tw:[&_.section-heading_h3]:[margin:0_0_8px] tw:[&_.section-heading_p]:max-w-[72ch] tw:[&_.section-heading_p]:text-[13px] tw:[&_.section-heading_>_button]:shrink-0 tw:[&_.cashier-search_label]:[flex:1_1_260px] tw:[&_.cashier-search_label]:min-w-0 tw:[&_.cashier-search_label]:m-0 tw:[&_.cashier-search_input]:min-h-11 tw:[&_.cashier-search_input]:m-0 tw:[&_.cashier-search_button]:min-h-11 tw:[&_.table-wrap]:w-full tw:[&_.table-wrap]:mt-4 tw:[&_table]:table-fixed tw:[&_table]:whitespace-normal tw:workspace-main:[&_th]:p-4 tw:workspace-main:[&_th]:align-top tw:workspace-main:[&_td]:align-top tw:workspace-main:[&_th]:[overflow-wrap:anywhere] tw:workspace-main:[&_td]:[overflow-wrap:anywhere] tw:workspace-main:[&_th]:min-w-0 tw:[&_th]:text-[10px] tw:[&_td_small]:inline-block tw:[&_td_small]:text-[12px] tw:[&_td_small]:mt-1 tw:[&_tbody_tr:hover]:[background:#fdfbf4] tw:[&_table]:block tw:[&_table]:min-w-0 tw:[&_thead]:absolute tw:[&_thead]:w-[1px] tw:[&_thead]:h-[1px] tw:[&_thead]:overflow-hidden tw:[&_tbody]:grid tw:[&_tbody]:gap-4 tw:[&_tr]:grid tw:[&_tr]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)_190px] tw:[&_tr]:rounded-[12px] tw:[&_tr]:overflow-hidden tw:[&_tr]:[background:#fff] tw:workspace-main:[&_td]:block tw:workspace-main:[&_td]:min-w-0 tw:workspace-main:[&_td]:w-auto tw:workspace-main:[&_td]:[border:0] tw:workspace-main:[&_td]:p-5 tw:[&_td_strong]:text-[16px] tw:[&_td_.error]:block tw:[&_td_.error]:mt-2.5 tw:[&_td_.error]:py-2 tw:[&_td_.error]:px-2.5 tw:[&_td_.error]:text-[12px] tw:[@media(min-width:_761px)_and_(max-width:_1200px)]:[&_tr]:grid-cols-2 tw:down-1100:[&_.section-heading]:flex-col tw:down-1100:[&_.section-heading]:gap-3.5 tw:down-760:workspace-main:p-4 tw:down-760:[&_.table-wrap]:[border:0] tw:down-760:[&_.table-wrap]:[background:transparent] tw:down-760:[&_.table-wrap]:overflow-visible tw:down-760:[&_table]:block tw:down-760:[&_table]:min-w-0 tw:down-760:[&_thead]:absolute tw:down-760:[&_thead]:w-[1px] tw:down-760:[&_thead]:h-[1px] tw:down-760:[&_thead]:overflow-hidden tw:down-760:[&_tbody]:grid tw:down-760:[&_tbody]:gap-4 tw:down-760:[&_tr]:block tw:down-760:[&_tr]:rounded-[10px] tw:down-760:[&_tr]:overflow-hidden tw:down-760:workspace-main:[&_td]:block tw:down-760:workspace-main:[&_td]:w-auto tw:down-760:workspace-main:[&_td]:min-w-0 tw:down-760:workspace-main:[&_td]:py-3 tw:down-760:workspace-main:[&_td]:px-4 tw:down-760:workspace-main:[&_td]:[border:0] tw:down-760:workspace-main:[&_td]:[border-bottom:1px_solid_#eee] tw:down-760:[&_.cashier-search_label]:[flex:auto] tw:[&_.section-heading_p]:leading-[1.6] tw:[&_th]:leading-[1.5] tw:[&_td]:leading-[1.6] ${paymentDesk ? " payment-ready-list tw:[.admin-payments_&]:rounded-[14px] tw:[.admin-payments_&_tr]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_180px] tw:down-1150:[.admin-payments_&_tr]:grid-cols-[1fr_1fr] tw:down-600:[.admin-payments_&_tr]:grid-cols-[1fr] " : ""}`}
      aria-labelledby={heading}
    >
      <div className="section-heading tw:flex tw:justify-between tw:items-center tw:gap-5 tw:mb-5 tw:[&_.eyebrow]:mb-2.5
          tw:[&_h2]:text-[30px] tw:down-760:items-start tw:down-760:flex-col
          tw:down-600:[.confirmed-services_&]:items-start tw:down-600:[.confirmed-services_&]:flex-col
          tw:[.admin-scheduling-grid_&]:gap-2.5 tw:[.admin-scheduling-grid_&]:flex-wrap">
        <div>
          <h3 id={heading}>
            {arrivalOnly
              ? "Customer check-in"
              : admin || manageOutcomes
                ? "Confirmed services"
                : "Ready for payment"}
          </h3>
          <p className="muted">
            {arrivalOnly
              ? "Confirm physical arrival for today’s appointments. Checked-in customers are protected from automatic no-show marking and appear in the waiting queue. Refreshes every 30 seconds."
              : `Select a customer to ${admin || manageOutcomes ? "review their services" : "process their service payment"}. Includes all appointment dates and refreshes every 30 seconds.`}
          </p>
        </div>
        {paymentDesk && <Button variant="outline" disabled={busy || disabled} onClick={() => setRefresh(value => value + 1)}>{busy ? "Refreshing…" : "Refresh list"}</Button>}
      </div>
      <form className="cashier-search tw:flex tw:items-end tw:gap-4 tw:mt-6 tw:[&_label]:flex-1 tw:[&_label]:m-0
          tw:down-600:items-stretch tw:down-600:flex-col tw:[.confirmed-services_&]:[margin:16px_0_22px]" onSubmit={submit}>
        <label>
          Search customer or booking code
          <Input
            type="search"
            maxLength={100}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Customer name or booking code"
          />
        </label>
        <Button variant="outline" disabled={disabled}>Search</Button>
        {search && (
          <Button variant="outline"
            type="button"
            disabled={disabled}
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
      {busy && !data && <p role="status">Loading confirmed services…</p>}
      {data && (
        <>
          <p className={paymentDesk ? "payment-list-count tw:[.admin-payments_&]:text-[12px] tw:[.admin-payments_&]:font-semibold tw:[.admin-payments_&]:text-[#686868] tw:[.admin-payments_&]:py-1 " : undefined} aria-live="polite">
            {data.total} {paymentDesk ? (data.total === 1 ? "visit ready for payment" : "visits ready for payment") : `confirmed ${data.total === 1 ? "booking" : "bookings"}`} ·{" "}
            {data.timeZone}
          </p>
          {data.rows.length ? (
            <div className="table-wrap tw:overflow-auto tw:[background:white] tw:[border:1px_solid_#dce0d8] tw:rounded-[10px]
          tw:[&_pre]:max-w-[36rem] tw:[&_pre]:max-h-[28rem] tw:[&_pre]:overflow-auto tw:[&_pre]:whitespace-pre-wrap
          tw:[&_pre]:[overflow-wrap:anywhere] tw:[&_pre]:text-[.8rem]">
              <table>
                <thead>
                  <tr>
                    <th>Appointment</th>
                    <th>Customer</th>
                    <th>Services / staff</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.bookingCode}>
                      <td data-label="Appointment">
                        {new Intl.DateTimeFormat("en-PH", {
                          timeZone: data.timeZone,
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(row.startAt))}
                        <br />
                        <small>{row.bookingCode}</small>
                      </td>
                      <td data-label="Customer">
                        <strong>
                          {row.customer.firstName} {row.customer.lastName}
                        </strong>
                        <br />
                        <Badge variant="secondary" className="badge tw:inline-block tw:py-1 tw:px-2.5 tw:rounded-[20px] tw:[background:#eeece8] tw:text-[12px]
          tw:text-[#65675f] tw:[&.active]:[background:#e6efe4] tw:[&.active]:text-[#365c3c] active">Confirmed</Badge>
                      </td>
                      <td data-label="Services / staff">
                        {row.appointmentServices.map((service) => (
                          <div key={service.id}>
                            {service.serviceNameSnapshot} · PHP{" "}
                            {service.priceSnapshot}
                            <br />
                            <small>
                              {service.staff.firstName} {service.staff.lastName}{" "}
                              · {service.outcome.replaceAll("_", " ")}
                            </small>
                          </div>
                        ))}
                      </td>
                      <td data-label="Action">
                        {(admin || arrivalOnly) && (
                          <AppointmentCheckIn
                            bookingCode={row.bookingCode}
                            customerName={`${row.customer.firstName} ${row.customer.lastName}`}
                            startAt={row.startAt}
                            checkedInAt={row.checkedInAt}
                            checkedInByUser={row.checkedInByUser}
                            timeZone={data.timeZone}
                            disabled={disabled || busy}
                            onCheckedIn={() => setRefresh((value) => value + 1)}
                          />
                        )}
                        {!arrivalOnly && (
                          <Button variant={paymentDesk ? "default" : "outline"} className={paymentDesk ? "primary tw:[background:#203c34] tw:text-[white] tw:[border-color:#203c34] tw:hover:[background:#31584c] tw:[.login-card_&]:w-full tw:[.login-card_&]:mt-1.5 " : undefined}
                            disabled={disabled || busy}
                            onClick={() => onSelect(row.bookingCode)}
                          >
                            {admin || manageOutcomes ? "Review services" : "Process payment"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>
              {search
                ? "No confirmed bookings match your search."
                : arrivalOnly
                  ? "No confirmed visits awaiting service today."
                  : admin || manageOutcomes
                    ? "No confirmed services awaiting settlement."
                    : "No visits ready for payment. Record all service outcomes before collection."}
            </p>
          )}
          <div className="actions tw:flex tw:gap-3 cashier-pagination tw:my-5.5 tw:mx-0 tw:items-center tw:flex-wrap
          tw:down-600:justify-between tw:[.dashboard-list_&_span]:mr-auto tw:down-760:[.dashboard-list_&_span]:[order:-1]
          tw:down-760:[.dashboard-list_&_span]:[flex-basis:100%] tw:down-760:[.dashboard-list_&_span]:m-0">
            <Button variant="outline"
              disabled={disabled || busy || page === 1}
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
              disabled={disabled || busy || page * data.pageSize >= data.total}
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
