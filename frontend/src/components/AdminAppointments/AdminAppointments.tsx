import { CalendarDays, Clock3, Scissors, UserRound } from "lucide-react";
import "./AdminAppointments.css";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/NativeSelect";
import { Badge } from "@/components/ui/Badge";
import { WaitingQueue } from "../WaitingQueue";
import { NoShowCorrection } from "../NoShowCorrection";
import { AppointmentCheckIn } from "../AppointmentCheckIn";
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import type { Appointment } from "../../types/booking";
import type { AppointmentFilters } from "../../types/appointment-filters";

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

export function AdminAppointments({
  initialFilters = {},
  onSettlement,
}: {
  initialFilters?: AppointmentFilters;
  onSettlement?: (code: string) => void;
}) {
  const [rows, setRows] = useState<Appointment[]>([]);
  const [filters, setFilters] = useState<AppointmentFilters>(initialFilters);
  const [staff, setStaff] = useState<
    { id: string; firstName: string; lastName: string }[]
  >([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [marking, setMarking] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [zone, setZone] = useState("");
  const generation = useRef(0);
  const detailsTrigger = useRef<HTMLButtonElement | null>(null);
  async function load(next?: string, queryFilters = filters) {
    const attempt = ++generation.current;
    setBusy(true);
    setError("");
    const query = new URLSearchParams(
      Object.entries(queryFilters).filter(([, value]) => Boolean(value)) as [
        string,
        string,
      ][],
    );
    if (next) query.set("cursor", next);
    try {
      const result = await api<{
        appointments: Appointment[];
        nextCursor: string | null;
      }>(`/appointments?${query}`);
      if (attempt !== generation.current) return;
      setRows((previous) =>
        next ? [...previous, ...result.appointments] : result.appointments,
      );
      setCursor(result.nextCursor);
    } catch (err) {
      if (attempt === generation.current) setError(message(err));
    } finally {
      if (attempt === generation.current) setBusy(false);
    }
  }
  useEffect(() => {
    void load();
    void Promise.all([
      api<{ staff: { id: string; firstName: string; lastName: string }[] }>(
        "/configuration",
      ),
      api<{ timeZone: string }>("/salon"),
    ])
      .then(([catalog, salon]) => {
        setStaff(catalog.staff);
        setZone(salon.timeZone);
      })
      .catch((err) => setError(message(err)));
    return () => {
      generation.current++;
    };
  }, []);
  async function mark(code: string) {
    setBusy(true);
    setError("");
    try {
      await api("/appointments/no-show", {
        method: "POST",
        body: JSON.stringify({ bookingCode: code }),
      });
      setMarking(null);
      await load();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  const current = rows.find((row) => row.bookingCode === selected);
  const format = (row: Appointment) =>
    new Intl.DateTimeFormat("en-PH", {
      timeZone: row.timeZone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(row.startAt));
  return (
    <section aria-labelledby="appointments-title">
      <div className="section-heading">
        <div>
          <h2 id="appointments-title">Appointments</h2>
          <p className="muted">
            Filter all bookings{zone ? ` in ${zone}` : ""}. Open a booking to
            review details and available actions.
          </p>
        </div>
        {/* <button disabled={busy} onClick={() => void load()}>
          Refresh appointments
        </button> */}
      </div>
      {onSettlement && <WaitingQueue onSelect={onSettlement} />}
      <form
        className="account-form admin-appointment-filters"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const next = Object.fromEntries(
            ["from", "to", "status", "staffId", "search", "attention"]
              .map((key) => [key, String(form.get(key) ?? "").trim()])
              .filter(([, value]) => value),
          ) as AppointmentFilters;
          setFilters(next);
          setRows([]);
          setSelected(null);
          setCursor(null);
          void load(undefined, next);
        }}
        key={JSON.stringify(initialFilters)}
      >
        <fieldset disabled={busy}>
          <div className="form-grid">
            <label>
              From date
              <Input
                name="from"
                type="date"
                defaultValue={initialFilters.from}
              />
            </label>
            <label>
              Through date
              <Input name="to" type="date" defaultValue={initialFilters.to} />
            </label>
            <label>
              Status
              <NativeSelect name="status" defaultValue={initialFilters.status ?? ""}>
                <NativeSelectOption value="">All statuses</NativeSelectOption>
                {[
                  "PENDING_PAYMENT",
                  "CONFIRMED",
                  "COMPLETED",
                  "CANCELLED",
                  "NO_SHOW",
                  "EXPIRED",
                ].map((status) => (
                  <NativeSelectOption value={status} key={status}>
                    {status.replaceAll("_", " ")}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
            <label>
              Stylist
              <NativeSelect
                name="staffId"
                defaultValue={initialFilters.staffId ?? ""}
              >
                <NativeSelectOption value="">All stylists</NativeSelectOption>
                {staff.map((person) => (
                  <NativeSelectOption key={person.id} value={person.id}>
                    {person.firstName} {person.lastName}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
            <label>
              Customer or booking code
              <Input
                name="search"
                maxLength={100}
                defaultValue={initialFilters.search}
                placeholder="Search name or booking code"
              />
            </label>
            {/* <label>
              Needs attention
              <select
                name="attention"
                defaultValue={initialFilters.attention ?? ""}
              >
                <option value="">All bookings</option>
                <option value="pending-fees">Active payment holds</option>
                <option value="unsettled">Unsettled services</option>
              </select>
            </label> */}
          </div>
          <div className="actions">
            <Button variant="default" className="primary">Apply filters</Button>
            <Button variant="outline"
              type="button"
              onClick={(event) => {
                event.currentTarget.form?.reset();
                const form = event.currentTarget.form;
                if (form) {
                  for (const element of Array.from(form.elements))
                    if (
                      element instanceof HTMLInputElement ||
                      element instanceof HTMLSelectElement
                    )
                      element.value = "";
                }
                setFilters({});
                setRows([]);
                setSelected(null);
                setCursor(null);
                void load(undefined, {});
              }}
            >
              Clear filters
            </Button>
          </div>
        </fieldset>
      </form>
      {error && (
        <p role="alert" className="error">
          {error}{" "}
          <Button variant="outline" disabled={busy} onClick={() => void load()}>
            Retry
          </Button>
        </p>
      )}
      {busy && <p role="status">Loading appointments…</p>}
      {!busy && !error && !rows.length && (
        <p className="empty-state" role="status">
          No appointments match these filters.
        </p>
      )}
      {!!rows.length && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Scheduled start</th>
                <th>Customer / booking</th>
                <th>Services / stylist</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.bookingCode}>
                  <td>{format(row)}</td>
                  <td>
                    <strong>
                      {row.customer.firstName} {row.customer.lastName}
                    </strong>
                    <br />
                    <small>{row.bookingCode}</small>
                  </td>
                  <td>
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
                  <td>
                    <Badge variant="secondary"
                      className={`badge status-${row.status.toLowerCase()}`}
                    >
                      {row.status.replaceAll("_", " ")}
                    </Badge>
                  </td>
                  <td>
                    <Button variant="outline"
                      disabled={busy}
                      aria-haspopup="dialog"
                      onClick={(event) => {
                        detailsTrigger.current = event.currentTarget;
                        setMarking(null);
                        setSelected(row.bookingCode);
                      }}
                    >
                      View details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {cursor && (
        <Button variant="outline"
          disabled={busy}
          className="admin-load-more"
          onClick={() => void load(cursor)}
        >
          Load more matching appointments
        </Button>
      )}
      <Dialog
        open={Boolean(current)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setMarking(null);
          }
        }}
      >
      {current && (
        <DialogContent
          className="appointment-details"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            detailsTrigger.current?.focus();
          }}
        >
          <DialogHeader className="appointment-details-header">
            <span className="appointment-details-eyebrow">Appointment details</span>
            <DialogTitle className="appointment-details-title">
              {current.customer.firstName} {current.customer.lastName}
            </DialogTitle>
            <DialogDescription className="appointment-details-reference">
              Booking <span>{current.bookingCode}</span>
            </DialogDescription>
            <Badge variant="secondary" className={`appointment-details-status status-${current.status.toLowerCase()}`}>
              {current.status.replaceAll("_", " ")}
            </Badge>
          </DialogHeader>
          <div className="appointment-details-body">
            <dl className="appointment-details-schedule">
              <div>
                <dt><CalendarDays size={16} aria-hidden="true" /> Appointment date</dt>
                <dd>{new Intl.DateTimeFormat("en-PH", { timeZone: current.timeZone, dateStyle: "full" }).format(new Date(current.startAt))}</dd>
              </div>
              <div>
                <dt><Clock3 size={16} aria-hidden="true" /> Scheduled time</dt>
                <dd>{new Intl.DateTimeFormat("en-PH", { timeZone: current.timeZone, timeStyle: "short" }).format(new Date(current.startAt))} – {new Intl.DateTimeFormat("en-PH", { timeZone: current.timeZone, timeStyle: "short" }).format(new Date(current.endAt))}</dd>
                <small>{current.timeZone}</small>
              </div>
            </dl>
            <section className="appointment-details-services" aria-label="Booked services">
              <div className="appointment-details-section-heading">
                <h3><Scissors size={17} aria-hidden="true" /> Booked services</h3>
                <span>{current.appointmentServices.length} {current.appointmentServices.length === 1 ? "service" : "services"}</span>
              </div>
              <ol>
                {current.appointmentServices.map((service, index) => (
                  <li key={service.id}>
                    <span className="appointment-details-sequence" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <div className="appointment-details-service-name">
                      <strong>{service.serviceNameSnapshot}</strong>
                      <span><UserRound size={13} aria-hidden="true" /> {service.staff.firstName} {service.staff.lastName}</span>
                    </div>
                    <strong className="appointment-details-price">{new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(service.priceSnapshot))}</strong>
                  </li>
                ))}
              </ol>
            </section>
            <div className="appointment-details-fee">
              <div><strong>Appointment fee</strong><span>{current.carriedAppointmentFeePaymentId ? "Carried credit applied" : "Booking reservation fee"}</span></div>
              <strong>{new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(current.appointmentFeeAmount))}</strong>
            </div>
            <p className="admin-note muted">Successful PayMongo appointment-fee payments are recorded automatically. View payment history and receipts in Reports.</p>
          {current.status === "PENDING_PAYMENT" && current.holdExpiresAt && (
            <p className="appointment-details-hold">
              Payment hold{" "}
              {Date.parse(current.holdExpiresAt) <
              Date.parse(current.serverTime)
                ? "expired"
                : "expires"}{" "}
              at{" "}
              {new Intl.DateTimeFormat("en-PH", {
                timeZone: current.timeZone,
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(current.holdExpiresAt))}
              .
            </p>
          )}
          {current.status === "CONFIRMED" && (
            <section className="appointment-details-arrival" aria-label="Customer arrival">
            <h3>Customer arrival</h3>
            <AppointmentCheckIn
              bookingCode={current.bookingCode}
              customerName={`${current.customer.firstName} ${current.customer.lastName}`}
              startAt={current.startAt}
              checkedInAt={current.checkedInAt}
              checkedInByUser={current.checkedInByUser}
              timeZone={current.timeZone}
              disabled={busy}
              onCheckedIn={() => {
                setMarking(null);
                void load();
              }}
            />
            </section>
          )}
          {current.status === "NO_SHOW" && !current.recoveryAppointment && (
            <NoShowCorrection
              key={current.bookingCode}
              bookingCode={current.bookingCode}
              customerName={`${current.customer.firstName} ${current.customer.lastName}`}
              disabled={busy}
              onCorrected={() => void load()}
            />
          )}
          {current.status === "CONFIRMED" && (
            <p className="admin-note muted">
              Rescheduling follows the booking’s original policy. Changes used:{" "}
              {current.rescheduleCount} /{" "}
              {current.bookingPolicyVersion.maxReschedules}.
            </p>
          )}
          {marking === current.bookingCode && !current.checkedInAt && (
            <div className="admin-warning">
              <p>
                Confirm the customer failed to appear according to salon
                procedure. This releases the reservation and preserves the
                missed visit.
              </p>
              <div className="actions">
                <Button variant="outline"
                  disabled={busy}
                  onClick={() => void mark(current.bookingCode)}
                >
                  Confirm no-show
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => setMarking(null)}>
                  Keep confirmed
                </Button>
              </div>
            </div>
          )}
          </div>
          <footer className="appointment-details-footer">
            <Button variant="outline" onClick={() => { setSelected(null); setMarking(null); }}>Close details</Button>
          <div className="appointment-details-actions">
            {onSettlement &&
              ["CONFIRMED", "COMPLETED"].includes(current.status) && (
                <Button variant="default"
                  className="primary"
                  disabled={busy}
                  onClick={() => onSettlement(current.bookingCode)}
                >
                  {current.status === "COMPLETED"
                    ? "View settlement / receipt"
                    : "Settle services"}
                </Button>
              )}
            {current.status === "CONFIRMED" &&
              !current.checkedInAt &&
              Date.parse(current.startAt) <= Date.parse(current.serverTime) && (
                <Button variant="outline"
                  disabled={busy}
                  onClick={() => setMarking(current.bookingCode)}
                >
                  Mark no-show
                </Button>
              )}
          </div>
          </footer>
        </DialogContent>
      )}
      </Dialog>
    </section>
  );
}
