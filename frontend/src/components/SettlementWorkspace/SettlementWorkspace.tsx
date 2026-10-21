import { CheckCircle2 } from "lucide-react";
import { SettlementQueue } from "./SettlementQueue";
import "./SettlementWorkspace.css";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/NativeSelect";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/Dialog";
import { createPaymentKey } from "../../utils/payment-key";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import { paymentStatusLabel } from "../../utils/payment-presentation";
import { cashChange } from "../../utils/cashier-money";
import { ConfirmedServices } from "../ConfirmedServices";
import { NoShowCorrection } from "../NoShowCorrection";
import { ReceiptPreviewButton } from "../ReceiptPreviewButton";
import type { Receipt } from "../../types/receipt";

type Outcome = "SCHEDULED" | "PERFORMED" | "NOT_PERFORMED";
type Appointment = {
  bookingCode: string;
  status: string;
  revision: string;
  startAt: string;
  completionType: string | null;
  customer: { firstName: string; lastName: string };
  eligibleAppointmentFee: string;
  carriedFee: boolean;
  amountDue: string;
  services: {
    id: string;
    name: string;
    staff: string;
    price: string;
    outcome: Outcome;
    actualChargedAmount: string | null;
  }[];
  payments: {
    id: string;
    type: string;
    status: string;
    amount: string;
    receipt: Receipt | null;
  }[];
  commissions?: {
    appointmentServiceId: string;
    serviceAmount: string;
    allocatedAppointmentFee: string;
    commissionBase: string;
    commissionRate: string;
    commissionAmount: string;
  }[];
};
export function SettlementWorkspace({
  admin,
  initialCode,
  onFinalized,
  onBack,
  mode = "combined",
  onOpenPayments,
  onOpenServices,
  onNavigationStateChange,
}: {
  admin: boolean;
  initialCode?: string;
  onFinalized?: () => void;
  onBack?: () => void;
  mode?: "services" | "payments" | "combined";
  onOpenPayments?: (code: string) => void;
  onOpenServices?: (code: string) => void;
  onNavigationStateChange?: (state: { busy: boolean; dirty: boolean }) => void;
}) {
  const simplified = admin && mode !== "payments";
  const [queueRefresh, setQueueRefresh] = useState(0);
  const [timeZone, setTimeZone] = useState<string>();
  const [row, setRow] = useState<Appointment | null>(null);
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [confirmOutcomes, setConfirmOutcomes] = useState(false);
  const cancelOutcomes = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [correctionNavigation, setCorrectionNavigation] = useState({
    busy: false,
    dirty: false,
  });
  const key = useRef("");
  if (!key.current) key.current = createPaymentKey();
  const sending = useRef(false);
  const [method, setMethod] = useState("CASH");
  const [tendered, setTendered] = useState("");
  function accept(appointment: Appointment) {
    setConfirmOutcomes(false);
    setQueueRefresh((value) => value + 1);
    setRow(appointment);
    setTendered("");
    setOutcomes(
      Object.fromEntries(appointment.services.map((s) => [s.id, s.outcome])),
    );
  }
  async function act(fn: () => Promise<void>) {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  async function lookup(code: string) {
    accept(
      (
        await api<{ appointment: Appointment }>("/settlement/lookup", {
          method: "POST",
          body: JSON.stringify({ bookingCode: code }),
        })
      ).appointment,
    );
  }
  useEffect(() => {
    if (!simplified) return;
    let active = true;
    void api<{ timeZone: string }>("/salon")
      .then((salon) => {
        if (active) setTimeZone(salon.timeZone);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [simplified]);
  useEffect(() => {
    if (initialCode) void act(() => lookup(initialCode));
  }, [initialCode]);
  async function save() {
    if (
      !row ||
      !dirty ||
      Object.values(outcomes).some((o) => o === "SCHEDULED")
    )
      return;
    await act(async () => {
      accept(
        (
          await api<{ appointment: Appointment }>("/settlement/outcomes", {
            method: "POST",
            body: JSON.stringify({
              bookingCode: row.bookingCode,
              revision: row.revision,
              services: row.services.map((s) => ({
                id: s.id,
                outcome: outcomes[s.id],
              })),
            }),
          })
        ).appointment,
      );
      setNotice(
        "Service outcomes saved. Neither Admin nor Cashier can change them.",
      );
    });
    setConfirmOutcomes(false);
  }
  const ready = row?.services.every((s) => s.outcome !== "SCHEDULED");
  const performed = row?.services.some((s) => s.outcome === "PERFORMED");
  const dirty = row?.services.some((s) => outcomes[s.id] !== s.outcome);
  const change = row ? cashChange(tendered, row.amountDue) : null;
  const manageServices = mode !== "payments";
  const collectPayments = mode !== "services";
  const paymentLayout = admin && mode === "payments";
  const backLabel = mode === "combined" ? "appointments" : mode;
  useEffect(() => {
    onNavigationStateChange?.({
      busy: busy || correctionNavigation.busy,
      dirty: Boolean(dirty || tendered || correctionNavigation.dirty),
    });
  }, [busy, dirty, tendered, correctionNavigation, onNavigationStateChange]);
  return (
    <section
      className={
        admin
          ? `outcomes-workspace tw:max-w-[1320px] tw:mx-auto tw:min-w-0 ${simplified ? " admin-settlement tw:workspace-main:grid tw:workspace-main:grid-cols-[minmax(240px,.85fr)_minmax(0,2fr)] tw:workspace-main:gap-5.5 tw:workspace-main:[align-items:start] tw:workspace-main:max-w-none tw:[&_>_.error]:[grid-column:2] tw:[&_>_.error]:m-0 tw:down-1200:workspace-main:grid-cols-[240px_minmax(0,1fr)] tw:down-1200:workspace-main:gap-4 tw:down-900:workspace-main:grid-cols-[minmax(0,1fr)] tw:workspace-main:text-[16px] tw:workspace-main:text-[#242027] tw:workspace-main:[&_input]:text-[16px] tw:workspace-main:[&_select]:text-[16px] tw:workspace-main:[&_input]:min-h-12 tw:workspace-main:[&_select]:min-h-12 tw:workspace-main:[&_small]:text-[#514b57] tw:workspace-main:leading-[1.6] tw:workspace-main:[&_input]:leading-[1.5] tw:workspace-main:[&_select]:leading-[1.5] " : ""}${mode === "payments" ? " admin-payment-detail tw:[.admin-payments_&_>_button]:mb-5 " : ""}`
          : undefined
      }
    >
      {simplified && (
        <div className="admin-settlement-page-heading tw:[grid-column:1_/_-1] tw:flex tw:items-center tw:justify-between tw:gap-5
          tw:workspace-main:[&_h2]:[margin:0_0_7px] tw:workspace-main:[&_h2]:text-[28px] tw:[&_p]:text-[#514b57]
          tw:[&_p]:m-0 tw:[&_p]:text-[14px] tw:down-520:flex-wrap tw:down-520:workspace-main:[&_h2]:text-[25px]">
          <div>
            <h2>
              {mode === "services"
                ? "Service outcomes"
                : "Service outcomes & payment"}
            </h2>
            <p>
              {mode === "services"
                ? "Record outcomes and close visits with no performed services"
                : "Review services and finalize a visit"}
            </p>
          </div>
        </div>
      )}
      {simplified && (
        <SettlementQueue
          selectedCode={row?.bookingCode ?? initialCode}
          disabled={busy || correctionNavigation.busy}
          refresh={queueRefresh}
          onSelect={(code) => {
            if (
              (dirty || tendered || correctionNavigation.dirty) &&
              !window.confirm(
                "Discard unsaved changes and open another booking?",
              )
            )
              return;
            void act(async () => {
              await lookup(code);
              key.current = createPaymentKey();
              setCorrectionNavigation({ busy: false, dirty: false });
            });
          }}
        />
      )}
      {simplified && !row && !busy && !error && (
        <div className="admin-settlement-empty tw:[grid-column:2] tw:m-0 tw:py-[35px] tw:px-6 tw:[background:white]
          tw:[border:1px_solid_#e7e3e9] tw:rounded-[12px] tw:[&_h3]:mb-2 tw:[&_h3]:text-[23px] tw:[&_p]:text-[#514b57]
          tw:[&_p]:text-[14px] tw:[&_p]:m-0">
          <h3>Select a booking</h3>
          <p>
            {mode === "services"
              ? "Choose a visit to review its service outcomes."
              : "Choose a visit awaiting settlement to review its services and payment."}
          </p>
        </div>
      )}
      {simplified && busy && !row && (
        <p className="admin-settlement-empty tw:[grid-column:2] tw:m-0 tw:py-[35px] tw:px-6 tw:[background:white]
          tw:[border:1px_solid_#e7e3e9] tw:rounded-[12px] tw:[&_h3]:mb-2 tw:[&_h3]:text-[23px] tw:[&_p]:text-[#514b57]
          tw:[&_p]:text-[14px] tw:[&_p]:m-0" role="status">
          Loading appointment…
        </p>
      )}
      {!simplified && !(admin && mode === "payments" && initialCode) && (
        <div className="outcomes-page-heading tw:[.outcomes-workspace_&]:mb-6 tw:[.outcomes-workspace_&]:max-w-[78ch]">
          <p className="eyebrow public:text-[12px] public:tracking-[0.17em] public:font-bold public:text-[#987b1f]
          public:down-639:text-[11px] tw:text-[11px] tw:tracking-[.18em] tw:font-bold tw:mb-5 tw:[.cashier-main>&]:mb-2.5">
            {mode === "payments"
              ? "PAYMENT DESK"
              : admin
                ? "SERVICE MANAGEMENT"
                : "PAYMENT DESK"}
          </p>
          <h2>
            {mode === "payments"
              ? "Process service payment"
              : admin
                ? "Service outcomes & payment"
                : mode === "services"
                  ? "Service outcomes"
                  : "Service outcomes & payment"}
          </h2>
          <p className="muted">
            {mode === "payments"
              ? "Review recorded services, collect the full amount due, and issue a receipt."
              : admin
                ? "Record service outcomes, collect payment, and close visits with no performed services."
                : mode === "services"
                  ? "Record service outcomes and restore eligible no-shows."
                  : "Record service outcomes, correct eligible no-shows, and collect the full service payment."}
          </p>
        </div>
      )}
      {!simplified && onBack && (
        <Button variant="outline" disabled={busy} onClick={onBack}>
           Back to {backLabel}
        </Button>
      )}
      {!simplified && !initialCode && !row && (
        <>
          <ConfirmedServices
            admin={admin}
            manageOutcomes={manageServices}
            disabled={busy}
            onSelect={(code) =>
              void act(async () => {
                await lookup(code);
                key.current = createPaymentKey();
              })
            }
          />
          {!admin && (
            <details className="outcomes-lookup tw:[.outcomes-workspace_&]:py-4.5 tw:[.outcomes-workspace_&]:px-5.5
          tw:[.outcomes-workspace_&]:rounded-[12px] tw:[.outcomes-workspace_&]:[background:#fff]
          tw:[.outcomes-workspace_&]:mt-5 tw:[.outcomes-workspace_&_summary]:cursor-pointer
          tw:[.outcomes-workspace_&_summary]:text-[14px] tw:[.outcomes-workspace_&_summary]:font-semibold
          tw:[.outcomes-workspace_&_form]:flex tw:[.outcomes-workspace_&_form]:items-end
          tw:[.outcomes-workspace_&_form]:gap-4 tw:[.outcomes-workspace_&_form]:[border:0]
          tw:[.outcomes-workspace_&_form]:[margin:20px_0_0] tw:[.outcomes-workspace_&_form]:p-0
          tw:[.outcomes-workspace_&_label]:flex-1 tw:[.outcomes-workspace_&_label]:m-0
          tw:[.outcomes-workspace_&_label]:max-w-[480px] tw:down-760:[.outcomes-workspace_&_form]:flex-col
          tw:down-760:[.outcomes-workspace_&_form]:items-stretch">
              <summary>Find another booking by code</summary>
              <form
                className="account-form tw:[border:1px_solid_#dce0d8] tw:[background:white] tw:p-7 tw:rounded-[10px] tw:mb-[25px]
          tw:down-760:p-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  const code = String(
                    new FormData(event.currentTarget).get("code"),
                  ).trim();
                  void act(async () => {
                    setRow(null);
                    await lookup(code);
                    key.current = createPaymentKey();
                  });
                }}
              >
                <label>
                  Booking code
                  <Input name="code" required maxLength={100} />
                </label>
                <Button variant="outline" disabled={busy}>
                  Find appointment
                </Button>
              </form>
            </details>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">
          {error}{" "}
          {initialCode && !row && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void act(() => lookup(initialCode))}
            >
              Retry appointment
            </Button>
          )}
        </p>
      )}
      {notice && (
        <p role="status" className="success tw:[.admin-settlement_>_&]:[grid-column:2] tw:[.admin-settlement_>_&]:m-0 tw:[background:#eaf2e9]
          tw:py-3 tw:px-4 tw:rounded-[6px] tw:[.clique-login-form_&]:text-[#203c34]">
          {notice}
        </p>
      )}
      {!simplified && !initialCode && row && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            setRow(null);
            setError("");
            setNotice("");
          }}
        >
           Back to {backLabel}
        </Button>
      )}
      {row && (
        <div className="account-form tw:[border:1px_solid_#dce0d8] tw:[background:white] tw:p-7 tw:rounded-[10px] tw:mb-[25px]
          tw:down-760:p-5 outcomes-detail">
          <div className="outcomes-visit-heading tw:[.admin-payment-detail_&]:pb-6 tw:down-600:[.admin-payment-detail_&_>_button]:w-full
          tw:flex tw:justify-between tw:items-start tw:gap-5 tw:mb-6 tw:[&_.eyebrow]:mb-2 tw:[&_h3]:text-[25px]
          tw:[&_h3]:[margin:0_0_12px] tw:[&_h3]:[overflow-wrap:anywhere] tw:down-760:flex-col tw:down-760:gap-4">
            <div>
              <p className="eyebrow public:text-[12px] public:tracking-[0.17em] public:font-bold public:text-[#987b1f]
          public:down-639:text-[11px] tw:text-[11px] tw:tracking-[.18em] tw:font-bold tw:mb-5 tw:[.cashier-main>&]:mb-2.5">BOOKING · {row.bookingCode}</p>
              <h3>
                {row.customer.firstName} {row.customer.lastName}
              </h3>
              <Badge
                variant="secondary"
                className={`badge tw:inline-block tw:py-1 tw:px-2.5 tw:rounded-[20px] tw:[background:#eeece8] tw:text-[12px] tw:text-[#65675f] tw:[&.active]:[background:#e6efe4] tw:[&.active]:text-[#365c3c]  status-${row.status.toLowerCase()}`}
              >
                {row.status.replaceAll("_", " ")}
              </Badge>
              {simplified && timeZone && (
                <p className="admin-settlement-reference tw:text-[#514b57] tw:text-[15px] tw:[margin:10px_0_0]">
                  {new Intl.DateTimeFormat("en-PH", {
                    timeZone,
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(row.startAt))}{" "}
                  · {timeZone}
                </p>
              )}
              {row.completionType && (
                <span className="outcomes-completion tw:inline-block tw:ml-3 tw:text-[12px] tw:text-[#686868]">
                  {row.completionType.replaceAll("_", " ")}
                </span>
              )}
            </div>
            {simplified && (
              <span className="admin-settlement-fee-status tw:flex tw:gap-2 tw:items-center tw:px-1 tw:text-[15px] tw:text-[#276744]">
                {Number(row.eligibleAppointmentFee) > 0 ? (
                  <>
                    <CheckCircle2 size={18} aria-hidden="true" />
                    {row.carriedFee
                      ? "Carried appointment fee verified"
                      : "Appointment fee verified"}
                  </>
                ) : (
                  "No eligible appointment fee"
                )}
              </span>
            )}
          </div>
          {manageServices && row.status === "NO_SHOW" && (
            <NoShowCorrection
              key={row.bookingCode}
              onNavigationStateChange={setCorrectionNavigation}
              bookingCode={row.bookingCode}
              customerName={`${row.customer.firstName} ${row.customer.lastName}`}
              disabled={busy}
              onCorrected={() =>
                void act(async () => {
                  await lookup(row.bookingCode);
                  setCorrectionNavigation({ busy: false, dirty: false });
                  setNotice("No-show corrected and customer checked in.");
                })
              }
            />
          )}
          {!simplified && collectPayments && (
            <ol className="settlement-steps tw:[.admin-payment-detail_&]:mb-6 tw:flex tw:gap-3.5 tw:[list-style:none] tw:p-0 tw:flex-wrap
          tw:my-6 tw:mx-0 tw:[&_li]:py-2 tw:[&_li]:px-3 tw:[&_li]:[border:1px_solid_#dce0d8] tw:[&_li]:rounded-[20px]
          tw:[&_li]:text-[13px] tw:[&_[aria-current=step]]:[background:#203c34] tw:[&_[aria-current=step]]:text-[#fff]
          tw:workspace-main:[&_[aria-current=step]]:text-[white]" aria-label="Settlement progress">
              <li aria-current={!ready || dirty ? "step" : undefined}>
                1. Review services
              </li>
              <li
                aria-current={
                  ready && !dirty && row.status === "CONFIRMED"
                    ? "step"
                    : undefined
                }
              >
                2. Collect payment
              </li>
              <li
                aria-current={row.status === "COMPLETED" ? "step" : undefined}
              >
                3. Receipt & finish
              </li>
            </ol>
          )}
          {!simplified && (
            <div className="outcomes-financial-summary tw:[.admin-payment-detail_&]:[background:#faf8f0]
          tw:[.admin-payment-detail_&]:[border-color:#e8dfbd] tw:[.outcomes-workspace_&]:grid
          tw:[.outcomes-workspace_&]:grid-cols-2 tw:[.outcomes-workspace_&]:gap-5 tw:[.outcomes-workspace_&]:p-5.5
          tw:[.outcomes-workspace_&]:[background:#f6f6f7] tw:[.outcomes-workspace_&]:rounded-[12px]
          tw:[.outcomes-workspace_&]:mb-7 tw:[&_>_div]:flex tw:[&_>_div]:flex-col tw:[&_>_div]:gap-1.5
          tw:[&_>_div]:min-w-0 tw:[&_>_div_>_span]:text-[12px] tw:[&_>_div_>_span]:text-[#686868]
          tw:[&_strong]:text-[26px] tw:[&_strong]:tabular-nums tw:[&_strong]:[overflow-wrap:anywhere]
          tw:[&_>_p]:[grid-column:1_/_-1] tw:[&_>_p]:text-[12px] tw:[&_>_p]:m-0 tw:[&_>_p]:pt-4 tw:[&_>_p]:text-[#686868]
          tw:down-760:[.outcomes-workspace_&]:p-4 tw:down-760:[.outcomes-workspace_&]:grid-cols-[1fr]
          tw:down-760:[.outcomes-workspace_&]:gap-4 tw:[&_>_p]:leading-[1.6]">
              <div>
                <span>Verified eligible appointment fee</span>
                <strong>PHP {row.eligibleAppointmentFee}</strong>
                {row.carriedFee && <small>Carried from original booking</small>}
              </div>
              <div>
                <span>Service amount due</span>
                <strong>PHP {row.amountDue}</strong>
              </div>
              <p>
                The service charge is collected separately; the appointment fee
                is not deducted from the service amount due.
              </p>
            </div>
          )}
          {!admin && Number(row.eligibleAppointmentFee) === 0 && (
            <p className="muted">
              No eligible appointment-fee payment is available. Check the
              payment history below and ask an Admin about disputed or missing
              payments.
            </p>
          )}
          {manageServices && (
            <form
              className="outcomes-editor tw:[&_fieldset]:min-w-0 tw:[&_fieldset]:[border:0] tw:[&_fieldset]:m-0 tw:[&_fieldset]:p-0
          tw:[&_legend]:text-[19px] tw:[&_legend]:font-bold tw:[&_legend]:p-0 tw:[&_legend]:mb-2
          tw:[&_fieldset_>_p]:text-[13px] tw:[&_fieldset_>_p]:mb-4.5"
              onSubmit={(event) => {
                event.preventDefault();
                if (
                  !busy &&
                  dirty &&
                  !Object.values(outcomes).some((o) => o === "SCHEDULED")
                )
                  setConfirmOutcomes(true);
              }}
            >
              <fieldset disabled={busy || row.status !== "CONFIRMED"}>
                <legend>Service outcomes</legend>
                <p className="muted">
                  Review each service and record whether it was performed. Once
                  saved, neither Admin nor Cashier can change its outcome.
                </p>
                {simplified && (
                  <div className="admin-settlement-columns tw:p-3 tw:text-[15px] tw:text-[#514b57] tw:[background:#f6f4f7]
          tw:rounded-[6px_6px_0_0]" aria-hidden="true">
                    <span>Service / Stylist</span>
                    <span>Booked price</span>
                    <span>Outcome</span>
                  </div>
                )}
                <div className="outcomes-service-list tw:grid tw:gap-3">
                  {row.services.map((s) => (
                    <label className="outcomes-service tw:[.outcomes-workspace_&]:grid
          tw:[.outcomes-workspace_&]:grid-cols-[minmax(0,1fr)_minmax(180px,260px)]
          tw:[.outcomes-workspace_&]:items-center tw:[.outcomes-workspace_&]:gap-6 tw:[.outcomes-workspace_&]:p-5
          tw:[.outcomes-workspace_&]:m-0 tw:[.outcomes-workspace_&]:rounded-[12px]
          tw:[.outcomes-editor_fieldset:disabled_&]:[background:#fafafa]
          tw:down-760:[.outcomes-workspace_&]:grid-cols-[1fr] tw:down-760:[.outcomes-workspace_&]:p-4
          tw:down-760:[.outcomes-workspace_&]:gap-4" key={s.id}>
                      <span className="outcomes-service-copy tw:flex tw:flex-col tw:gap-[5px] tw:min-w-0 tw:[overflow-wrap:anywhere]
          tw:[&_strong]:text-[16px] tw:[&_small]:font-normal tw:[&_small]:text-[12px] tw:[&_>_span]:mt-1
          tw:[&_>_span]:tabular-nums">
                        <strong>{s.name}</strong>
                        <small>Stylist · {s.staff}</small>
                        {!simplified && <span>PHP {s.price}</span>}
                      </span>
                      {simplified && (
                        <strong className="admin-settlement-price tw:text-[16px] tw:tabular-nums tw:down-520:whitespace-nowrap tw:down-520:text-right">
                          PHP {s.price}
                        </strong>
                      )}
                      <span className="outcomes-service-control tw:flex tw:flex-col tw:gap-2 tw:text-[12px] tw:text-[#686868] tw:[&_select]:min-h-11.5">
                        <span>Outcome</span>
                        <NativeSelect
                          aria-label={`Outcome for ${s.name}`}
                          value={outcomes[s.id]}
                          disabled={s.outcome !== "SCHEDULED"}
                          onChange={(event) =>
                            setOutcomes({
                              ...outcomes,
                              [s.id]: event.target.value as Outcome,
                            })
                          }
                        >
                          <NativeSelectOption value="SCHEDULED" disabled>
                            Select outcome
                          </NativeSelectOption>
                          <NativeSelectOption value="PERFORMED">
                            Performed
                          </NativeSelectOption>
                          <NativeSelectOption value="NOT_PERFORMED">
                            Not performed
                          </NativeSelectOption>
                        </NativeSelect>
                      </span>
                    </label>
                  ))}
                </div>
                {row.status === "CONFIRMED" && (
                  <div className="outcomes-save tw:flex tw:justify-end tw:[padding:18px_0_24px] tw:down-760:[&_button]:w-full
          tw:down-760:[&_button]:min-h-11">
                    {simplified && (
                      <span
                        className={`admin-settlement-save-state tw:inline-flex tw:gap-[7px] tw:items-center tw:text-[#276744] tw:text-[15px] tw:[&.is-dirty]:text-[#93631d] ${dirty ? " is-dirty" : ""}`}
                        role="status"
                      >
                        {dirty ? (
                          "Unsaved changes"
                        ) : ready ? (
                          <>
                            <CheckCircle2 size={17} aria-hidden="true" />
                            Outcomes saved
                          </>
                        ) : (
                          "Record an outcome for each service"
                        )}
                      </span>
                    )}
                    <Button
                      variant="default"
                      className="primary tw:[background:#203c34] tw:text-[white] tw:[border-color:#203c34] tw:hover:[background:#31584c]
          tw:[.login-card_&]:w-full tw:[.login-card_&]:mt-1.5"
                      disabled={
                        busy ||
                        !dirty ||
                        Object.values(outcomes).some((o) => o === "SCHEDULED")
                      }
                    >
                      Save outcomes
                    </Button>
                  </div>
                )}
              </fieldset>
            </form>
          )}
          <Dialog
            open={confirmOutcomes}
            onOpenChange={(open) => {
              if (!busy) setConfirmOutcomes(open);
            }}
          >
            <DialogContent
              showCloseButton={!busy}
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                cancelOutcomes.current?.focus();
              }}
            >
              <DialogTitle>Confirm service outcomes</DialogTitle>
              <DialogDescription>
                Saving these outcomes is permanent. Neither Admin nor Cashier
                can change a service marked Performed or Not performed, even
                before payment. Review your selections before confirming.
              </DialogDescription>
              <p>
                Booking {row.bookingCode} · {row.customer.firstName}{" "}
                {row.customer.lastName}
              </p>
              <ul>
                {row.services.map((s) => (
                  <li key={s.id}>
                    {s.name} ·{" "}
                    {outcomes[s.id] === "PERFORMED"
                      ? "Performed"
                      : "Not performed"}
                  </li>
                ))}
              </ul>
              <DialogFooter>
                <Button
                  ref={cancelOutcomes}
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setConfirmOutcomes(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void save()}
                >
                  {busy ? "Saving…" : "Confirm"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <div className="payment-settlement-grid tw:[.admin-payment-detail_&]:grid tw:[.admin-payment-detail_&]:gap-5
          tw:[.admin-payment-detail_&]:[align-items:start] tw:[.admin-payment-detail_&_>_*]:min-w-0
          tw:[.admin-payment-detail_&_>_*]:[grid-column:1] tw:[.admin-payment-detail_&_>_button]:[justify-self:start]">
            {simplified && (
              <div className="admin-settlement-summary tw:[&_h3]:[margin:0_0_20px] tw:[&_h3]:text-[23px] tw:[&_dl]:m-0 tw:[&_dl_>_div]:flex
          tw:[&_dl_>_div]:justify-between tw:[&_dl_>_div]:gap-5 tw:[&_dl_>_div]:mt-3 tw:[&_dl_>_div]:text-[16px]
          tw:[&_dd]:m-0 tw:[&_dd]:tabular-nums tw:[&_p]:text-[#514b57] tw:[&_p]:text-[15px] tw:[&_p]:[margin:14px_0_0]
          tw:down-520:[&_dl_>_div]:gap-3 tw:down-520:[&_dd]:text-right tw:down-520:[&_dd]:shrink-0">
                <h3>Payment summary</h3>
                <dl>
                  <div>
                    <dt>
                      Performed services
                      {dirty || !ready ? " · Saved outcomes" : ""}
                    </dt>
                    <dd>PHP {row.amountDue}</dd>
                  </div>
                  <div>
                    <dt>
                      {row.carriedFee
                        ? "Verified carried appointment fee"
                        : "Verified appointment fee"}
                    </dt>
                    <dd>PHP {row.eligibleAppointmentFee}</dd>
                  </div>
                  <div className="admin-settlement-amount tw:[.admin-settlement-summary_&]:[border-top:2px_solid_#d8ccd5]
          tw:[.admin-settlement-summary_&]:py-4.5 tw:[.admin-settlement-summary_&]:px-3.5
          tw:[.admin-settlement-summary_&]:[background:#f5edf3] tw:[.admin-settlement-summary_&]:rounded-[8px]
          tw:[.admin-settlement-summary_&]:text-[24px] tw:[.admin-settlement-summary_&]:font-bold
          tw:down-520:[.admin-settlement-summary_&]:text-[21px]">
                    <dt>
                      {row.status === "COMPLETED"
                        ? "Final service charge"
                        : "Service amount due"}
                    </dt>
                    <dd>PHP {row.amountDue}</dd>
                  </div>
                </dl>
                <p>
                  The appointment fee is separate and is not deducted from the
                  service charge.
                </p>
                {row.status === "CONFIRMED" && (!ready || dirty) && (
                  <p role="status">
                    Save all service outcomes before collecting payment.
                  </p>
                )}
                {row.status === "CONFIRMED" &&
                  ready &&
                  !dirty &&
                  !performed && (
                    <p role="status">
                      No service payment is due. Close this visit without
                      performed services below.
                    </p>
                  )}
                {row.status === "COMPLETED" && (
                  <p role="status">
                    This visit is finalized. Service outcomes are read-only.
                  </p>
                )}
              </div>
            )}
            {!simplified && collectPayments && (
              <section className="payment-recorded-services tw:[.admin-payment-detail_&_ul]:[list-style:none] tw:[.admin-payment-detail_&_ul]:p-0
          tw:[.admin-payment-detail_&_ul]:[margin:16px_0_0] tw:[.admin-payment-detail_&_li]:flex
          tw:[.admin-payment-detail_&_li]:flex-wrap tw:[.admin-payment-detail_&_li]:items-center
          tw:[.admin-payment-detail_&_li]:gap-3 tw:[.admin-payment-detail_&_li]:py-4.5
          tw:[.admin-payment-detail_&_li]:px-0 tw:[.admin-payment-detail_&_li]:text-[13px]
          tw:[.admin-payment-detail_&_li_>_div]:flex-1 tw:[.admin-payment-detail_&_li_>_div]:min-w-[140px]
          tw:[.admin-payment-detail_&_small]:block tw:[.admin-payment-detail_&_small]:mt-1.5">
                {paymentLayout ? (
                  <>
                    <div className="payment-section-title tw:[.admin-payment-detail_&]:flex tw:[.admin-payment-detail_&]:justify-between
          tw:[.admin-payment-detail_&]:items-center tw:[.admin-payment-detail_&]:gap-3
          tw:[.admin-payment-detail_&_h4]:text-[17px] tw:[.admin-payment-detail_&_h4]:m-0
          tw:[.admin-payment-detail_&_>_span]:text-[12px]">
                      <h4>Recorded services</h4>
                      <span className="muted">
                        {row.services.length}{" "}
                        {row.services.length === 1 ? "service" : "services"}
                      </span>
                    </div>
                    <ul>
                      {row.services.map((s) => (
                        <li key={s.id}>
                          <div>
                            <strong>{s.name}</strong>
                            <small>Stylist · {s.staff}</small>
                          </div>
                          <Badge variant="secondary">
                            {s.outcome.replaceAll("_", " ")}
                          </Badge>
                          <strong className="payment-service-price tw:[.admin-payment-detail_&]:tabular-nums">
                            PHP {s.actualChargedAmount ?? s.price}
                          </strong>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <h4>Recorded services</h4>
                    <ul>
                      {row.services.map((s) => (
                        <li key={s.id}>
                          {s.name} · {s.staff} ·{" "}
                          {s.outcome.replaceAll("_", " ")}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {row.status === "CONFIRMED" &&
                  (!ready ? (
                    <p role="status">
                      Record all service outcomes in Services before collecting
                      payment.
                    </p>
                  ) : (
                    !performed && (
                      <p role="status">
                        {admin
                          ? "No service payment is due. Close this visit with no performed services below."
                          : "No service payment is due. Ask an Admin to close this visit."}
                      </p>
                    )
                  ))}
              </section>
            )}
            {mode === "services" &&
              row.status === "CONFIRMED" &&
              ready &&
              !dirty &&
              performed &&
              onOpenPayments && (
                <Button
                  variant="default"
                  className="primary tw:[background:#203c34] tw:text-[white] tw:[border-color:#203c34] tw:hover:[background:#31584c]
          tw:[.login-card_&]:w-full tw:[.login-card_&]:mt-1.5"
                  disabled={busy}
                  onClick={() => onOpenPayments(row.bookingCode)}
                >
                  Continue to Payments
                </Button>
              )}
            {mode === "services" &&
              row.status === "COMPLETED" &&
              onOpenPayments && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => onOpenPayments(row.bookingCode)}
                >
                  View receipts in Payments
                </Button>
              )}
            {/* {mode === "payments" && onOpenServices && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => onOpenServices(row.bookingCode)}
              >
                Open in Services
              </Button>
            )} */}
            {row.status === "CONFIRMED" &&
              collectPayments &&
              ready &&
              !dirty &&
              performed && (
                <form
                  className="payment-collection-form tw:[.admin-payment-detail_&]:p-6 tw:[.admin-payment-detail_&]:[background:#f7f7f8]
          tw:[.admin-payment-detail_&]:rounded-[12px] tw:[.admin-payment-detail_&_fieldset]:[border:0]
          tw:[.admin-payment-detail_&_fieldset]:m-0 tw:[.admin-payment-detail_&_fieldset]:p-0
          tw:[.admin-payment-detail_&_fieldset]:min-w-0 tw:[.admin-payment-detail_&_legend]:font-bold
          tw:[.admin-payment-detail_&_legend]:text-[18px] tw:[.admin-payment-detail_&_legend]:mb-4
          tw:[.admin-payment-detail_&_legend]:p-0 tw:[.admin-payment-detail_&_fieldset_>_p]:text-[12px]
          tw:[.admin-payment-detail_&_fieldset_>_p]:text-[#686868] tw:down-600:[.admin-payment-detail_&]:p-4.5
          tw:[.admin-payment-detail_&_fieldset_>_p]:leading-[1.6]"
                  key={row.bookingCode}
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (method === "CASH" && change === null) {
                      setError(
                        "Enter cash tendered covering the full service amount.",
                      );
                      return;
                    }
                    if (
                      !window.confirm(
                        `Finalize service payment of PHP ${row.amountDue}? Outcomes and commissions will become final.`,
                      )
                    )
                      return;
                    void act(async () => {
                      accept(
                        (
                          await api<{ appointment: Appointment }>(
                            "/settlement/pay",
                            {
                              method: "POST",
                              body: JSON.stringify({
                                bookingCode: row.bookingCode,
                                revision: row.revision,
                                idempotencyKey: key.current,
                                amount: row.amountDue,
                                currency: "PHP",
                                method,
                              }),
                            },
                          )
                        ).appointment,
                      );
                      key.current = createPaymentKey();
                      setNotice(
                        `Service payment settled and receipt issued.${method === "CASH" ? ` Change to return: PHP ${change}.` : ""}`,
                      );
                      onFinalized?.();
                    });
                  }}
                >
                  <fieldset disabled={busy}>
                    <legend>
                      {simplified || paymentLayout
                        ? "Collect payment"
                        : "Review performed services"}
                    </legend>
                    {!simplified && (
                      <ul className="payment-charge-lines tw:[.admin-payment-detail_&]:pl-4.5 tw:[.admin-payment-detail_&]:text-[13px]
          tw:[.admin-payment-detail_&]:text-[#686868] tw:[.admin-payment-detail_&]:[margin:0_0_16px]">
                        {row.services
                          .filter((s) => s.outcome === "PERFORMED")
                          .map((s) => (
                            <li key={s.id}>
                              {s.name} · PHP {s.actualChargedAmount}
                            </li>
                          ))}
                      </ul>
                    )}
                    {!simplified && (
                      <div className="payment-amount-due tw:[.admin-payment-detail_&]:py-4.5 tw:[.admin-payment-detail_&]:px-0
          tw:[.admin-payment-detail_&]:mb-5 tw:[.admin-payment-detail_&]:flex tw:[.admin-payment-detail_&]:flex-col
          tw:[.admin-payment-detail_&]:gap-1.5 tw:[.admin-payment-detail_&_span]:text-[12px]
          tw:[.admin-payment-detail_&_span]:text-[#686868] tw:[.admin-payment-detail_&_strong]:text-[30px]
          tw:[.admin-payment-detail_&_strong]:tabular-nums tw:[.admin-payment-detail_&_strong]:[overflow-wrap:anywhere]">
                        <span>Full service amount due: </span>
                        <strong>PHP {row.amountDue}</strong>
                      </div>
                    )}
                    <div className="payment-tender-fields tw:[.admin-payment-detail_&]:grid tw:[.admin-payment-detail_&]:grid-cols-[1fr_1fr]
          tw:[.admin-payment-detail_&]:gap-x-4 tw:[.admin-payment-detail_&_label]:mb-3
          tw:[.admin-payment-detail_&_label]:min-w-0 tw:[.admin-payment-detail_&_input]:h-10.5
          tw:[.admin-payment-detail_&_select]:h-10.5 tw:[.admin-payment-detail_&_input]:w-full
          tw:[.admin-payment-detail_&_select]:w-full tw:down-600:[.admin-payment-detail_&]:grid-cols-[1fr]">
                      <label>
                        Payment method
                        <NativeSelect
                          name="method"
                          value={method}
                          onChange={(event) => {
                            setMethod(event.target.value);
                            setTendered("");
                          }}
                        >
                          <NativeSelectOption value="CASH">
                            Cash
                          </NativeSelectOption>
                          <NativeSelectOption value="GCASH">
                            GCash
                          </NativeSelectOption>
                          <NativeSelectOption value="OTHER">
                            Other
                          </NativeSelectOption>
                        </NativeSelect>
                      </label>
                      {method === "CASH" && (
                        <>
                          <label>
                            Cash tendered (PHP)
                            <Input
                              inputMode="decimal"
                              required
                              value={tendered}
                              onChange={(event) =>
                                setTendered(event.target.value)
                              }
                              maxLength={13}
                              placeholder="0.00"
                            />
                          </label>
                          <p className="payment-change tw:[.admin-payment-detail_&]:[grid-column:1_/_-1] tw:[.admin-payment-detail_&]:p-3
          tw:[.admin-payment-detail_&]:rounded-[8px] tw:[.admin-payment-detail_&]:[background:#eaeef0]
          tw:[.admin-payment-detail_&]:text-[13px]" role="status">
                            {change === null
                              ? "Enter sufficient cash with up to two decimal places."
                              : `Change to return: PHP ${change}`}
                          </p>
                        </>
                      )}
                    </div>
                    {method === "GCASH" && (
                      <p>
                        Verify the received transaction in the salon’s GCash or
                        provider records before finalizing.
                      </p>
                    )}
                    <p>
                      A payment reference is generated automatically on the
                      receipt.
                    </p>
                    <label className="checkbox tw:flex-row tw:items-center tw:[&_input]:w-4.5 tw:[&_input]:h-4.5 tw:[&_input]:[accent-color:#203c34]">
                      <input type="checkbox" required /> I have verified receipt
                      of PHP {row.amountDue}.
                    </label>
                    <Button
                      variant="default"
                      className="primary tw:[background:#203c34] tw:text-[white] tw:[border-color:#203c34] tw:hover:[background:#31584c]
          tw:[.login-card_&]:w-full tw:[.login-card_&]:mt-1.5"
                      disabled={method === "CASH" && change === null}
                    >
                      {simplified
                        ? `Collect PHP ${row.amountDue}`
                        : paymentLayout
                          ? "Finalize payment & issue receipt"
                          : "Finalize received service payment"}
                    </Button>
                  </fieldset>
                </form>
              )}
            {row.status === "CONFIRMED" &&
              admin &&
              ready &&
              !dirty &&
              !performed && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Close this appointment with all services not performed? The appointment fee is retained and outcomes become final.",
                      )
                    )
                      return;
                    void act(async () => {
                      accept(
                        (
                          await api<{ appointment: Appointment }>(
                            "/settlement/close",
                            {
                              method: "POST",
                              body: JSON.stringify({
                                bookingCode: row.bookingCode,
                                revision: row.revision,
                              }),
                            },
                          )
                        ).appointment,
                      );
                      setNotice(
                        "Appointment closed with no performed services.",
                      );
                      onFinalized?.();
                    });
                  }}
                >
                  Finalize no-service closure
                </Button>
              )}
          </div>
          {admin && row.commissions && row.commissions.length > 0 && (
            <section className="outcomes-commissions tw:mt-7 tw:pt-6 tw:[&_h3]:text-[19px] tw:[&_h3]:mb-4 tw:[&_table]:whitespace-normal
          tw:[&_table]:min-w-[660px] tw:[&_th]:p-4 tw:[&_td]:p-4 tw:[&_th]:tabular-nums tw:[&_td]:tabular-nums">
              <h3>Final commissions</h3>
              <div className="table-wrap tw:overflow-auto tw:[background:white] tw:[border:1px_solid_#dce0d8] tw:rounded-[10px]
          tw:[&_pre]:max-w-[36rem] tw:[&_pre]:max-h-[28rem] tw:[&_pre]:overflow-auto tw:[&_pre]:whitespace-pre-wrap
          tw:[&_pre]:[overflow-wrap:anywhere] tw:[&_pre]:text-[.8rem]">
                <table>
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Service amount</th>
                      <th>Fee allocation</th>
                      <th>Base</th>
                      <th>Rate</th>
                      <th>Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.commissions.map((c) => (
                      <tr key={c.appointmentServiceId}>
                        <td>
                          {
                            row.services.find(
                              (s) => s.id === c.appointmentServiceId,
                            )?.name
                          }
                        </td>
                        <td>{c.serviceAmount}</td>
                        <td>{c.allocatedAppointmentFee}</td>
                        <td>{c.commissionBase}</td>
                        <td>{c.commissionRate}</td>
                        <td>{c.commissionAmount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {mode !== "services" &&
            row.payments.length > 0 &&
            (() => {
              const history = (
                <>
                  {row.payments.map((p) => (
                    <div className="outcomes-payment tw:rounded-[12px] tw:p-4.5 tw:mt-3.5 tw:min-w-0 tw:down-760:p-3" key={p.id}>
                      <div className="outcomes-payment-heading tw:flex tw:items-center tw:gap-3 tw:flex-wrap tw:text-[12px]">
                        <strong>{p.type.replaceAll("_", " ")}</strong>
                        <Badge variant="secondary" className="badge tw:inline-block tw:py-1 tw:px-2.5 tw:rounded-[20px] tw:[background:#eeece8] tw:text-[12px]
          tw:text-[#65675f] tw:[&.active]:[background:#e6efe4] tw:[&.active]:text-[#365c3c]">
                          {paymentStatusLabel(p.status)}
                        </Badge>
                        <strong>PHP {p.amount}</strong>
                      </div>
                      {p.receipt && (
                        <div id={p.receipt.receiptNumber}>
                          <ReceiptPreviewButton receipt={p.receipt} label={`View receipt ${p.receipt.receiptNumber}`} />
                        </div>
                      )}
                    </div>
                  ))}
                </>
              );
              return admin ? (
                <section className="outcomes-payments tw:[.admin-payment-detail_&]:mt-7 tw:mt-7 tw:pt-6 tw:[&_h3]:text-[19px] tw:[&_h3]:mb-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" type="button">
                        Payment history & receipts ({row.payments.length})
                      </Button>
                    </DialogTrigger>
                    <DialogContent
                      showCloseButton={false}
                      aria-describedby={undefined}
                      style={{
                        maxHeight: "90vh",
                        overflowY: "auto",
                        maxWidth: "min(760px, 95vw)",
                      }}
                    >
                      <div className="receipt-preview-toolbar tw:flex tw:justify-between tw:items-center tw:gap-4 tw:text-[14px] tw:[&_button]:py-2
          tw:[&_button]:px-3 tw:[&_button]:[border:1px_solid_#ddddd7] tw:[&_button]:rounded-[99px]
          tw:[&_button]:[background:#fff] tw:[&_button]:text-[#292a28] tw:[&_button]:cursor-pointer">
                        <DialogTitle>Payment history & receipts</DialogTitle>
                        <DialogClose asChild>
                          <Button
                            variant="outline"
                            type="button"
                            aria-label="Close payment history"
                          >
                            Close ×
                          </Button>
                        </DialogClose>
                      </div>
                      {history}
                    </DialogContent>
                  </Dialog>
                </section>
              ) : (
                <section className="outcomes-payments tw:[.admin-payment-detail_&]:mt-7 tw:mt-7 tw:pt-6 tw:[&_h3]:text-[19px] tw:[&_h3]:mb-4">
                  <h3>Payment history & receipts</h3>
                  {history}
                </section>
              );
            })()}
          {row.status === "COMPLETED" && onBack && (
            <Button
              variant="default"
              className="primary tw:[background:#203c34] tw:text-[white] tw:[border-color:#203c34] tw:hover:[background:#31584c]
          tw:[.login-card_&]:w-full tw:[.login-card_&]:mt-1.5"
              disabled={busy}
              onClick={onBack}
            >
              Finish & return to {backLabel}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
