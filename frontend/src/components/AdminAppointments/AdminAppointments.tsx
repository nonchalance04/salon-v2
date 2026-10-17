import { Button } from "@/components/ui/Button";
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
  onPayment,
  onSettlement,
}: {
  initialFilters?: AppointmentFilters;
  onPayment?: (code: string) => void;
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
                      aria-expanded={selected === row.bookingCode}
                      onClick={() =>
                        setSelected(
                          selected === row.bookingCode ? null : row.bookingCode,
                        )
                      }
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
      {current && (
        <article className="admin-panel" aria-label="Selected appointment">
          <div className="section-heading">
            <div>
              <h3>
                {current.customer.firstName} {current.customer.lastName}
              </h3>
              <p>
                {current.bookingCode} · {format(current)}
              </p>
            </div>
            <Button variant="outline"
              onClick={() => {
                setSelected(null);
                setMarking(null);
              }}
            >
              Close details
            </Button>
          </div>
          <p>
            <Badge variant="secondary" className={`badge status-${current.status.toLowerCase()}`}>
              {current.status.replaceAll("_", " ")}
            </Badge>
          </p>
          <ol>
            {current.appointmentServices.map((service) => (
              <li key={service.id}>
                {service.serviceNameSnapshot} · {service.staff.firstName}{" "}
                {service.staff.lastName} · PHP {service.priceSnapshot}
              </li>
            ))}
          </ol>
          <p>
            Appointment fee: PHP {current.appointmentFeeAmount}
            {current.carriedAppointmentFeePaymentId ? " · carried credit" : ""}
          </p>
          {current.status === "PENDING_PAYMENT" && current.holdExpiresAt && (
            <p>
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
          )}
          <div className="actions">
            {onPayment && (
              <Button variant="outline"
                disabled={busy}
                onClick={() => onPayment(current.bookingCode)}
              >
                Review appointment fee
              </Button>
            )}
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
        </article>
      )}
    </section>
  );
}
