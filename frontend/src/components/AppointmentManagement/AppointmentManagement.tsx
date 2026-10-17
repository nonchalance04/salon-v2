import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/NativeSelect";
import { useRef, useState } from "react";
import { api } from "../../lib/api";
import type { Appointment } from "../../types/booking";

type Selection = {
  key: number;
  serviceId: string;
  appointmentServiceId?: string;
  staffId: string;
  label: string;
};
type Catalog = { id: string; name: string; price: string };
type Staff = {
  id: string;
  firstName: string;
  lastName: string;
  serviceIds: string[];
};
type Slot = {
  startAt: string;
  endAt: string;
  services: { serviceName: string; staffName: string }[];
};
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

export function AppointmentManagement({
  appointment,
  token,
  onChange,
}: {
  appointment: Appointment;
  token: string;
  onChange: (appointment: Appointment, token?: string) => void;
}) {
  const recovery = appointment.status === "NO_SHOW";
  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [services, setServices] = useState<Catalog[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [rows, setRows] = useState<Selection[]>([]);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [startAt, setStartAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const key = useRef(0);
  const generation = useRef(0);
  const policy = appointment.bookingPolicyVersion;
  const now = Date.parse(appointment.serverTime);
  const canChange =
    !appointment.checkedInAt &&
    appointment.rescheduleCount < policy.maxReschedules &&
    (recovery
      ? !appointment.recoveryAppointment &&
        now <=
          Date.parse(appointment.startAt) + policy.noShowGraceHours * 3_600_000
      : appointment.status === "CONFIRMED" &&
        now <=
          Date.parse(appointment.startAt) -
            policy.rescheduleCutoffHours * 3_600_000);
  const canCancel =
    !appointment.checkedInAt &&
    appointment.status === "CONFIRMED" &&
    now <=
      Date.parse(appointment.startAt) -
        policy.cancellationCutoffHours * 3_600_000;
  const format = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
      timeZone: appointment.timeZone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  function invalidate() {
    generation.current++;
    setSlots(null);
    setStartAt("");
  }
  async function open() {
    setBusy(true);
    setError("");
    try {
      const [catalog, people] = await Promise.all([
        api<{ services: Catalog[] }>("/services"),
        api<{ staff: Staff[] }>("/availability/staff"),
      ]);
      setServices(catalog.services);
      setStaff(people.staff);
      setRows(
        appointment.appointmentServices
          .filter(
            (s) =>
              !recovery || catalog.services.some((c) => c.id === s.serviceId),
          )
          .map((s) => ({
            key: key.current++,
            serviceId: s.serviceId,
            ...(recovery ? {} : { appointmentServiceId: s.id }),
            staffId: s.staffId,
            label: s.serviceNameSnapshot,
          })),
      );
      setEditing(true);
      invalidate();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  const body = () => ({
    bookingCode: appointment.bookingCode,
    token,
    recovery,
    date,
    services: rows.map((row) => ({
      serviceId: row.serviceId,
      ...(row.appointmentServiceId
        ? { appointmentServiceId: row.appointmentServiceId }
        : {}),
      ...(row.staffId
        ? { assignmentMode: "SPECIFIC", staffId: row.staffId }
        : { assignmentMode: "ANY_AVAILABLE" }),
    })),
  });
  async function search() {
    const request = ++generation.current;
    setBusy(true);
    setError("");
    setSlots(null);
    setStartAt("");
    try {
      const result = await api<{ slots: Slot[] }>(
        "/appointments/change-options",
        { method: "POST", body: JSON.stringify(body()) },
      );
      if (generation.current === request) setSlots(result.slots);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{
        appointment: Appointment;
        guestToken?: string;
      }>("/appointments/change", {
        method: "POST",
        body: JSON.stringify({ ...body(), startAt, reason }),
      });
      setEditing(false);
      invalidate();
      onChange(result.appointment, result.guestToken);
    } catch (err) {
      setError(message(err));
      invalidate();
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    setBusy(true);
    setError("");
    try {
      await api("/appointments/cancel", {
        method: "POST",
        body: JSON.stringify({
          bookingCode: appointment.bookingCode,
          token,
          reason,
        }),
      });
      const result = await api<{ appointment: Appointment }>(
        "/appointments/access",
        {
          method: "POST",
          body: JSON.stringify({ bookingCode: appointment.bookingCode, token }),
        },
      );
      setConfirmCancel(false);
      setEditing(false);
      onChange(result.appointment);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Manage appointment">
      <h3>Manage your appointment</h3>
      <p>
        {appointment.rescheduleCount} of {policy.maxReschedules} allowed changes
        used.
      </p>
      {appointment.carriedAppointmentFeePaymentId && (
        <p>
          Appointment fee satisfied by credit from the missed booking. No
          additional appointment-fee payment is due.
        </p>
      )}
      {appointment.recoveryAppointment && (
        <p>
          Replacement booking: {appointment.recoveryAppointment.bookingCode}.
          Verify your phone number on Your appointment to manage the replacement
          booking.
        </p>
      )}
      {canChange && !editing && (
        <Button variant="outline" disabled={busy} onClick={() => void open()}>
          {recovery
            ? "Request a recovery booking"
            : "Reschedule or change services"}
        </Button>
      )}
      {canCancel && (
        <Button variant="outline" disabled={busy} onClick={() => setConfirmCancel(true)}>
          Cancel appointment
        </Button>
      )}
      {!canChange && !canCancel && !appointment.recoveryAppointment && (
        <p>
          No customer changes are currently available. Please contact the salon
          for assistance.
        </p>
      )}
      {confirmCancel && (
        <fieldset disabled={busy}>
          <legend>Confirm cancellation</legend>
          <p>
            This releases your reserved time. The collected appointment fee
            remains unchanged.
          </p>
          <Button variant="outline" onClick={() => void cancel()}>Confirm cancellation</Button>
          <Button variant="outline" onClick={() => setConfirmCancel(false)}>
            Keep appointment
          </Button>
        </fieldset>
      )}
      {editing && (
        <form
          className="account-form"
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <fieldset disabled={busy}>
            <legend>
              {recovery ? "Replacement visit" : "Replacement schedule"}
            </legend>
            <p>
              {recovery
                ? "The original policy applies. An eligible unused appointment fee is carried automatically; otherwise the new booking requires payment."
                : "Retained services keep their booked prices and durations. Added services use current values."}
            </p>
            {rows.map((row, index) => (
              <fieldset key={row.key}>
                <legend>Service {index + 1}</legend>
                {row.appointmentServiceId ? (
                  <p>{row.label} · retained booked service</p>
                ) : (
                  <label>
                    Service
                    <NativeSelect
                      value={row.serviceId}
                      onChange={(e) => {
                        invalidate();
                        setRows((items) =>
                          items.map((r) =>
                            r.key === row.key
                              ? { ...r, serviceId: e.target.value, staffId: "" }
                              : r,
                          ),
                        );
                      }}
                    >
                      {services.map((s) => (
                        <NativeSelectOption key={s.id} value={s.id}>
                          {s.name} · PHP {s.price}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </label>
                )}
                <label>
                  Staff
                  <NativeSelect
                    value={row.staffId}
                    onChange={(e) => {
                      invalidate();
                      setRows((items) =>
                        items.map((r) =>
                          r.key === row.key
                            ? { ...r, staffId: e.target.value }
                            : r,
                        ),
                      );
                    }}
                  >
                    <NativeSelectOption value="">Any available staff</NativeSelectOption>
                    {row.staffId &&
                      !staff.some(
                        (s) =>
                          s.id === row.staffId &&
                          s.serviceIds.includes(row.serviceId),
                      ) && (
                        <NativeSelectOption value={row.staffId}>
                          Previous staff (availability will be checked)
                        </NativeSelectOption>
                      )}
                    {staff
                      .filter((s) => s.serviceIds.includes(row.serviceId))
                      .map((s) => (
                        <NativeSelectOption key={s.id} value={s.id}>
                          {s.firstName} {s.lastName}
                        </NativeSelectOption>
                      ))}
                  </NativeSelect>
                </label>
                <Button variant="outline"
                  type="button"
                  disabled={index === 0}
                  onClick={() => {
                    invalidate();
                    setRows((items) => {
                      const copy = [...items];
                      [copy[index - 1], copy[index]] = [
                        copy[index]!,
                        copy[index - 1]!,
                      ];
                      return copy;
                    });
                  }}
                >
                  Move earlier
                </Button>
                <Button variant="outline"
                  type="button"
                  onClick={() => {
                    invalidate();
                    setRows((items) => items.filter((r) => r.key !== row.key));
                  }}
                >
                  Remove service {index + 1}
                </Button>
              </fieldset>
            ))}
            <Button variant="outline"
              type="button"
              disabled={!services.length || rows.length >= 20}
              onClick={() => {
                invalidate();
                setRows((items) => [
                  ...items,
                  {
                    key: key.current++,
                    serviceId: services[0]!.id,
                    staffId: "",
                    label: services[0]!.name,
                  },
                ]);
              }}
            >
              Add service
            </Button>
            <label>
              Visit date ({appointment.timeZone})
              <Input
                type="date"
                value={date}
                required
                onChange={(e) => {
                  invalidate();
                  setDate(e.target.value);
                }}
              />
            </label>
            <label>
              Reason (optional)
              <Textarea
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <Button variant="outline" disabled={!rows.length}>Find available times</Button>
            <Button variant="outline" type="button" onClick={() => setEditing(false)}>
              Close changes
            </Button>
            {slots &&
              (slots.length ? (
                <>
                  <label>
                    Available start
                    <NativeSelect
                      value={startAt}
                      onChange={(e) => setStartAt(e.target.value)}
                    >
                      <NativeSelectOption value="">Choose a time</NativeSelectOption>
                      {slots.map((s) => (
                        <NativeSelectOption key={s.startAt} value={s.startAt}>
                          {format(s.startAt)}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </label>
                  {startAt && (
                    <>
                      <ol>
                        {slots
                          .find((s) => s.startAt === startAt)
                          ?.services.map((s, i) => (
                            <li key={i}>
                              {s.serviceName} with {s.staffName}
                            </li>
                          ))}
                      </ol>
                      <p>
                        Availability and eligibility are checked again when you
                        confirm.
                      </p>
                      <Button variant="outline" type="button" onClick={() => void save()}>
                        {recovery
                          ? "Create replacement booking"
                          : "Confirm appointment changes"}
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <p role="status">
                  No available times. Try another date or staff member.
                </p>
              ))}
          </fieldset>
        </form>
      )}
      {busy && <p role="status">Working…</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
