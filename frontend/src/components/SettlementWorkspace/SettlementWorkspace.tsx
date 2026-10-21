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
          ? `outcomes-workspace${simplified ? " admin-settlement" : ""}${mode === "payments" ? " admin-payment-detail" : ""}`
          : undefined
      }
    >
      {simplified && (
        <div className="admin-settlement-page-heading">
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
        <div className="admin-settlement-empty">
          <h3>Select a booking</h3>
          <p>
            {mode === "services"
              ? "Choose a visit to review its service outcomes."
              : "Choose a visit awaiting settlement to review its services and payment."}
          </p>
        </div>
      )}
      {simplified && busy && !row && (
        <p className="admin-settlement-empty" role="status">
          Loading appointment…
        </p>
      )}
      {!simplified && !(admin && mode === "payments" && initialCode) && (
        <div className="outcomes-page-heading">
          <p className="eyebrow">
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
          ← Back to {backLabel}
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
            <details className="outcomes-lookup">
              <summary>Find another booking by code</summary>
              <form
                className="account-form"
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
        <p role="alert" className="error">
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
        <p role="status" className="success">
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
          ← Back to {backLabel}
        </Button>
      )}
      {row && (
        <div className="account-form outcomes-detail">
          <div className="outcomes-visit-heading">
            <div>
              <p className="eyebrow">BOOKING · {row.bookingCode}</p>
              <h3>
                {row.customer.firstName} {row.customer.lastName}
              </h3>
              <Badge
                variant="secondary"
                className={`badge status-${row.status.toLowerCase()}`}
              >
                {row.status.replaceAll("_", " ")}
              </Badge>
              {simplified && timeZone && (
                <p className="admin-settlement-reference">
                  {new Intl.DateTimeFormat("en-PH", {
                    timeZone,
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(row.startAt))}{" "}
                  · {timeZone}
                </p>
              )}
              {row.completionType && (
                <span className="outcomes-completion">
                  {row.completionType.replaceAll("_", " ")}
                </span>
              )}
            </div>
            {simplified && (
              <span className="admin-settlement-fee-status">
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
            <ol className="settlement-steps" aria-label="Settlement progress">
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
            <div className="outcomes-financial-summary">
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
              className="outcomes-editor"
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
                  <div className="admin-settlement-columns" aria-hidden="true">
                    <span>Service / Stylist</span>
                    <span>Booked price</span>
                    <span>Outcome</span>
                  </div>
                )}
                <div className="outcomes-service-list">
                  {row.services.map((s) => (
                    <label className="outcomes-service" key={s.id}>
                      <span className="outcomes-service-copy">
                        <strong>{s.name}</strong>
                        <small>Stylist · {s.staff}</small>
                        {!simplified && <span>PHP {s.price}</span>}
                      </span>
                      {simplified && (
                        <strong className="admin-settlement-price">
                          PHP {s.price}
                        </strong>
                      )}
                      <span className="outcomes-service-control">
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
                  <div className="outcomes-save">
                    {simplified && (
                      <span
                        className={`admin-settlement-save-state${dirty ? " is-dirty" : ""}`}
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
                      className="primary"
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
          <div className="payment-settlement-grid">
            {simplified && (
              <div className="admin-settlement-summary">
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
                  <div className="admin-settlement-amount">
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
              <section className="payment-recorded-services">
                {paymentLayout ? (
                  <>
                    <div className="payment-section-title">
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
                          <strong className="payment-service-price">
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
                  className="primary"
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
                  className="payment-collection-form"
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
                      <ul className="payment-charge-lines">
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
                      <div className="payment-amount-due">
                        <span>Full service amount due: </span>
                        <strong>PHP {row.amountDue}</strong>
                      </div>
                    )}
                    <div className="payment-tender-fields">
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
                          <p className="payment-change" role="status">
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
                    <label className="checkbox">
                      <input type="checkbox" required /> I have verified receipt
                      of PHP {row.amountDue}.
                    </label>
                    <Button
                      variant="default"
                      className="primary"
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
            <section className="outcomes-commissions">
              <h3>Final commissions</h3>
              <div className="table-wrap">
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
                    <div className="outcomes-payment" key={p.id}>
                      <div className="outcomes-payment-heading">
                        <strong>{p.type.replaceAll("_", " ")}</strong>
                        <Badge variant="secondary" className="badge">
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
                <section className="outcomes-payments">
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
                      <div className="receipt-preview-toolbar">
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
                <section className="outcomes-payments">
                  <h3>Payment history & receipts</h3>
                  {history}
                </section>
              );
            })()}
          {row.status === "COMPLETED" && onBack && (
            <Button
              variant="default"
              className="primary"
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
