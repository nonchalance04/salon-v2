import { Button } from "@/components/ui/Button";
import { Link } from "react-router";
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { AppointmentManagement } from "../AppointmentManagement";
import { FeePaymentControls } from "../FeePaymentControls";
import { FeePaymentHistory } from "../FeePaymentHistory";
import { BookingConfirmation } from "../BookingConfirmation";
import type { Salon } from "../../types/salon";
import type { Appointment } from "../../types/booking";

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

export function AppointmentView({
  initial,
  token: initialToken,
  salon = null,
}: {
  initial: Appointment;
  token: string;
  salon?: Salon | null;
}) {
  const [appointment, setAppointment] = useState(initial);
  const [token, setToken] = useState(initialToken);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [managing, setManaging] = useState(false);
  // Monotonic elapsed time avoids relying on the customer's wall clock.
  const clock = useRef({
    received: performance.now(),
    server: Date.parse(initial.serverTime),
  });
  const refreshBusy = useRef(false);
  const activeCode = useRef(appointment.bookingCode);
  activeCode.current = appointment.bookingCode;
  async function refresh() {
    if (refreshBusy.current) return;
    refreshBusy.current = true;
    try {
      const response = await api<{ appointment: Appointment }>(
        "/appointments/access",
        {
          method: "POST",
          body: JSON.stringify({ bookingCode: appointment.bookingCode, token }),
        },
      );
      if (response.appointment.bookingCode !== activeCode.current) return;
      clock.current = {
        received: performance.now(),
        server: Date.parse(response.appointment.serverTime),
      };
      setAppointment(response.appointment);
      setError("");
    } catch (err) {
      setError(message(err));
    } finally {
      refreshBusy.current = false;
    }
  }
  useEffect(() => {
    const tick = () =>
      setRemaining(
        appointment.holdExpiresAt
          ? Math.max(
              0,
              Math.ceil(
                (Date.parse(appointment.holdExpiresAt) -
                  clock.current.server -
                  (performance.now() - clock.current.received)) /
                  1000,
              ),
            )
          : 0,
      );
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [appointment]);
  useEffect(() => {
    const timer = setInterval(() => {
      void refresh();
    }, 15_000);
    return () => clearInterval(timer);
  }, [appointment.bookingCode, token]);
  const format = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
      timeZone: appointment.timeZone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  const date = (value: string) =>
    new Intl.DateTimeFormat("en-PH", {
      timeZone: appointment.timeZone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  const time = (value: string) =>
    new Intl.DateTimeFormat("en-PH", {
      timeZone: appointment.timeZone,
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  const money = (value: string | number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(Number(value));
  const serviceTotal =
    appointment.appointmentServices.reduce(
      (sum, service) => sum + Math.round(Number(service.priceSnapshot) * 100),
      0,
    ) / 100;
  if (appointment.status === "CONFIRMED" && !managing)
    return (
      <BookingConfirmation
        key={appointment.bookingCode}
        appointment={appointment}
        salon={salon}
        token={token}
        onManage={() => setManaging(true)}
      />
    );
  return (
    <section className="visit-summary reservation" aria-label="Your booking">
      <header className="reservation-header">
        <div>
          <p className="booking-kicker">BOOKING REFERENCE</p>
          <h2>{appointment.bookingCode}</h2>
          <p className="muted">
            Booked for {appointment.customer.firstName}{" "}
            {appointment.customer.lastName}
          </p>
        </div>
        <span
          className={`reservation-status reservation-status--${appointment.status.toLowerCase()}`}
        >
          {appointment.status.replaceAll("_", " ")}
        </span>
      </header>
      {appointment.status === "CONFIRMED" && (
        <p
          role="status"
          className="reservation-notice reservation-notice--success"
        >
          ✓ Your appointment is confirmed. We look forward to seeing you.
        </p>
      )}
      {appointment.status === "EXPIRED" && (
        <p className="reservation-notice">
          This hold has expired and the time is released.{" "}
          <Link to="/availability">Find another time →</Link>
        </p>
      )}
      <div className="reservation-grid">
        <div className="reservation-main">
          <section className="reservation-card" aria-label="Visit details">
            <p className="booking-kicker">YOUR VISIT</p>
            <h3>{date(appointment.startAt)}</h3>
            <p className="reservation-time">
              {time(appointment.startAt)} – {time(appointment.endAt)}
            </p>
            <p className="muted reservation-timezone">
              All times are in {appointment.timeZone}.
            </p>
            <ol className="reservation-services">
              {appointment.appointmentServices.map((service) => (
                <li key={service.sequenceNo}>
                  <div className="reservation-service-heading">
                    <strong>{service.serviceNameSnapshot}</strong>
                    <strong>{money(service.priceSnapshot)}</strong>
                  </div>
                  <p className="muted">
                    {service.staff.firstName} {service.staff.lastName}
                  </p>
                  <p className="reservation-service-time">
                    {format(service.scheduledStartAt)} –{" "}
                    {time(service.scheduledEndAt)}
                  </p>
                </li>
              ))}
            </ol>
            <div className="reservation-total">
              <span>Service total</span>
              <strong>{money(serviceTotal)}</strong>
            </div>
            <p className="muted reservation-footnote">
              Service charges are separate from the appointment fee.
            </p>
          </section>
          <div className="reservation-card reservation-management">
            <AppointmentManagement
              key={appointment.bookingCode}
              appointment={appointment}
              token={token}
              onChange={(updated, newToken) => {
                clock.current = {
                  received: performance.now(),
                  server: Date.parse(updated.serverTime),
                };
                setAppointment(updated);
                if (newToken) setToken(newToken);
              }}
            />
          </div>
        </div>
        <aside
          className="reservation-sidebar"
          aria-label="Payment and booking access"
        >
          {appointment.status === "PENDING_PAYMENT" && (
            <section className="reservation-card reservation-payment">
              <p className="booking-kicker">COMPLETE YOUR RESERVATION</p>
              <h3>Confirm your visit</h3>
              <p className="muted">
                Pay the appointment fee before your temporary hold expires.
              </p>
              <div className="reservation-hold" role="status">
                <span>Temporary hold</span>
                <strong>
                  {remaining > 0
                    ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
                    : "Time elapsed"}
                </strong>
                <span>
                  {remaining > 0
                    ? "remaining to complete payment"
                    : "Refresh to check the latest status."}
                </span>
              </div>
              <div className="reservation-fee">
                <span>Appointment fee</span>
                <strong>{money(appointment.appointmentFeeAmount)}</strong>
              </div>
              <p className="muted reservation-footnote">
                Separate from your service charges.
              </p>
              <FeePaymentControls
                bookingCode={appointment.bookingCode}
                token={token}
                onChange={refresh}
                pending={appointment.payments?.find(
                  (p) => p.status === "PENDING",
                )}
              />
            </section>
          )}
          {!!appointment.payments?.length && (
            <div className="reservation-card reservation-history">
              <FeePaymentHistory payments={appointment.payments} />
            </div>
          )}
        </aside>
      </div>
      <footer className="reservation-footer">
        <p className="muted">Check the latest booking and payment updates.</p>
        <Button variant="outline" type="button" onClick={() => void refresh()}>
          Refresh status ↻
        </Button>
      </footer>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
