// Bring in the tools for the appointment view view so this file can work with the rest of the application.
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { CalendarDays, Check, X } from "lucide-react";
import "./AppointmentView.css";
import { Button } from "@/components/ui/Button";
import { Link } from "react-router";
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { AppointmentManagement } from "../AppointmentManagement";
import { FeePaymentControls } from "../FeePaymentControls";
import { BookingConfirmation } from "../BookingConfirmation";
import type { Salon } from "../../types/salon";
import type { Appointment } from "../../types/booking";

// Choose a readable error message so the screen can explain what went wrong.
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

// Show the current appointment and available actions so the customer can follow their booking.
export function AppointmentView({
  initial,
  token: initialToken,
  salon = null,
  onBackHome,
}: {
  initial: Appointment;
  token: string;
  salon?: Salon | null;
  onBackHome?: () => void;
}) {
  // Remember the current choices and screen status so the page can respond as the user works.
  const [appointment, setAppointment] = useState(initial);
  const [token, setToken] = useState(initialToken);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [managing, setManaging] = useState(false);
  const [managementBusy, setManagementBusy] = useState(false);
  const [rescheduled, setRescheduled] = useState<Appointment | null>(null);
  const manageTrigger = useRef<HTMLElement | null>(null);
  // Keep this view in step with its current inputs so changes are reflected on screen.
  useEffect(() => {
    if (appointment.status !== "CONFIRMED") setManaging(false);
  }, [appointment.status]);
  // Open the booking-management view so the customer can change an eligible appointment.
  function openManagement() {
    if (appointment.status !== "CONFIRMED") return;
    manageTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setManaging(true);
  }
  // Monotonic elapsed time avoids relying on the customer's wall clock.
  const clock = useRef({
    received: performance.now(),
    server: Date.parse(initial.serverTime),
  });
  const refreshBusy = useRef(false);
  const activeCode = useRef(appointment.bookingCode);
  activeCode.current = appointment.bookingCode;
  // Reload the latest information so the next view or action reflects the current saved state.
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
  // Keep time-based screen updates running while this view is open so its status stays current.
  useEffect(() => {
    // Update the displayed time so the appointment countdown follows the current clock.
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
  // Keep time-based screen updates running while this view is open so its status stays current.
  useEffect(() => {
    const timer = setInterval(() => {
      void refresh();
    }, 15_000);
    return () => clearInterval(timer);
  }, [appointment.bookingCode, token]);
  // Format the visit time for display so the schedule can be read in the salon time zone.
  const format = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
      timeZone: appointment.timeZone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  // Convert the date to the format needed here so the selected salon day can be handled consistently.
  const date = (value: string) =>
    new Intl.DateTimeFormat("en-PH", {
      timeZone: appointment.timeZone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  // Convert the time to the format needed here so salon schedule values are handled consistently.
  const time = (value: string) =>
    new Intl.DateTimeFormat("en-PH", {
      timeZone: appointment.timeZone,
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  // Format the amount as Philippine pesos so prices and payments are easy to recognize.
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
  const managementDialog = (
    <Dialog open={managing} onOpenChange={open => { if (!managementBusy) setManaging(open); }}>
      <DialogContent className="appointment-management-dialog tw:customer:flex tw:customer:flex-col tw:customer:gap-0
          tw:customer:w-[calc(100%_-_32px)] tw:customer:max-w-[820px] tw:customer:max-h-[calc(100dvh_-_40px)]
          tw:customer:p-0 tw:customer:overflow-hidden tw:customer:[border:1px_solid_#e2dfd4] tw:customer:rounded-[20px]
          tw:customer:[background:#faf9f5] tw:customer:text-[#30332d] tw:down-600:customer:w-[calc(100%_-_20px)]
          tw:down-600:customer:max-w-[calc(100%_-_20px)] tw:down-600:customer:max-h-[calc(100dvh_-_20px)]
          tw:down-600:customer:rounded-[16px]" showCloseButton={false}
        onInteractOutside={event => event.preventDefault()}
        onEscapeKeyDown={event => { if (managementBusy) event.preventDefault(); }}
        onCloseAutoFocus={event => { event.preventDefault(); if (!rescheduled && manageTrigger.current?.isConnected) manageTrigger.current.focus(); }}>
        <DialogHeader className="appointment-management-header tw:customer:flex tw:customer:flex-row tw:customer:items-start tw:customer:gap-4
          tw:customer:py-6.5 tw:customer:px-7 tw:customer:[border-bottom:1px_solid_#e8e4d9]
          tw:customer:[background:white] tw:customer:text-left tw:customer:shrink-0 tw:customer:[&>div]:min-w-0
          tw:customer:[&>div]:flex-1 tw:customer:[&>button]:shrink-0 tw:customer:[&>button]:rounded-[50%]
          tw:customer:[&>button]:text-[#64685f] tw:down-600:customer:py-5 tw:down-600:customer:px-4
          tw:down-600:customer:gap-2.5">
          <span className="appointment-management-icon tw:customer:grid tw:customer:place-items-center tw:customer:w-12 tw:customer:h-12
          tw:customer:shrink-0 tw:customer:[border:1px_solid_#e8dfc7] tw:customer:rounded-[14px]
          tw:customer:[background:#f7f1e2] tw:customer:text-[#95762a] tw:down-600:customer:w-9 tw:down-600:customer:h-9
          tw:down-600:customer:rounded-[10px]" aria-hidden="true"><CalendarDays size={23} /></span>
          <div>
            <p className="appointment-management-eyebrow tw:customer:[margin:0_0_7px] tw:customer:text-[10px] tw:customer:font-bold
          tw:customer:tracking-[.15em] tw:customer:text-[#92752f]">YOUR APPOINTMENT</p>
            <DialogTitle>Manage your visit</DialogTitle>
            <DialogDescription>Review your booking, choose a new time, or cancel your appointment.</DialogDescription>
          </div>
          <Button variant="ghost" size="icon" type="button" aria-label="Close appointment management" disabled={managementBusy} onClick={() => setManaging(false)}><X size={20} /></Button>
        </DialogHeader>
        <div className="appointment-management-body tw:customer:[padding:24px_28px_28px] tw:customer:overflow-y-auto
          tw:customer:min-h-0 tw:down-600:customer:p-4">
          <div className="appointment-management-summary tw:customer:grid tw:customer:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]
          tw:customer:gap-6 tw:customer:p-5 tw:customer:[background:#f0eee5] tw:customer:[border:1px_solid_#e6e2d5]
          tw:customer:rounded-[12px] tw:customer:mb-4 tw:customer:[&_span]:block tw:customer:[&_span]:text-[9px]
          tw:customer:[&_span]:tracking-[.09em] tw:customer:[&_span]:text-[#777a70] tw:customer:[&_span]:mb-2
          tw:customer:[&_span]:font-semibold tw:customer:[&_strong]:block tw:customer:[&_strong]:text-[14px]
          tw:customer:[&_strong]:font-semibold tw:customer:[&_strong]:[overflow-wrap:anywhere]
          tw:customer:[&_p]:text-[12px] tw:customer:[&_p]:[margin:3px_0_0] tw:customer:[&_p]:text-[#74766f]
          tw:down-600:customer:grid-cols-[minmax(0,1fr)] tw:down-600:customer:gap-3.5 tw:down-600:customer:p-4
          tw:customer:[&_strong]:leading-[1.6]">
            <div><span>BOOKING REFERENCE</span><strong>{appointment.bookingCode}</strong></div>
            <div><span>CURRENT VISIT · {appointment.timeZone}</span><strong>{date(appointment.startAt)}</strong><p>{time(appointment.startAt)} – {time(appointment.endAt)}</p></div>
          </div>
          {managing && <AppointmentManagement key={appointment.bookingCode} appointment={appointment} token={token}
            onBusyChange={setManagementBusy}
            onRescheduled={setRescheduled}
            onChange={(updated, newToken) => {
              clock.current = { received: performance.now(), server: Date.parse(updated.serverTime) };
              setAppointment(updated);
              if (newToken) setToken(newToken);
              setManaging(false);
            }} />}
        </div>
      </DialogContent>
    </Dialog>
  );
  const rescheduleConfirmation = (
    <Dialog open={Boolean(rescheduled)} onOpenChange={open => { if (!open) setRescheduled(null); }}>
      <DialogContent className="appointment-change-success tw:customer:w-[calc(100%_-_32px)] tw:customer:max-w-[460px] tw:customer:p-8
          tw:customer:[border:1px_solid_#e2dfd4] tw:customer:rounded-[20px] tw:customer:[background:#faf9f5]
          tw:customer:text-[#30382d] tw:customer:gap-6 tw:down-480:customer:py-7 tw:down-480:customer:px-5"
        onCloseAutoFocus={event => {
          event.preventDefault();
          if (manageTrigger.current?.isConnected) manageTrigger.current.focus();
        }}>
        <DialogHeader>
          <span className="appointment-change-success-icon tw:customer:grid tw:customer:place-items-center tw:customer:w-15
          tw:customer:h-15 tw:customer:mb-1 tw:customer:rounded-[50%] tw:customer:[background:#e8efdf]
          tw:customer:text-[#465b37]" aria-hidden="true"><Check size={28} /></span>
          <DialogTitle>Your appointment has been updated</DialogTitle>
          <DialogDescription>Your changes are saved. We look forward to seeing you at your updated visit.</DialogDescription>
        </DialogHeader>
        {rescheduled && <div className="appointment-change-success-visit tw:customer:text-center tw:customer:py-5 tw:customer:px-4
          tw:customer:[border:1px_solid_#dce2d4] tw:customer:rounded-[12px] tw:customer:[background:#f0f4ec]
          tw:customer:[overflow-wrap:anywhere] tw:customer:[&>span]:block tw:customer:[&>span]:text-[9px]
          tw:customer:[&>span]:font-bold tw:customer:[&>span]:tracking-[.12em] tw:customer:[&>span]:text-[#6e7b5f]
          tw:customer:[&>span]:mb-2.5 tw:customer:[&_strong]:block tw:customer:[&_strong]:text-[16px]
          tw:customer:[&_p]:text-[15px] tw:customer:[&_p]:my-1.5 tw:customer:[&_p]:mx-0 tw:customer:[&_small]:text-[11px]
          tw:customer:[&_small]:text-[#707769] tw:customer:[&_strong]:leading-[1.5]">
          <span>YOUR UPDATED APPOINTMENT</span>
          <strong>{date(rescheduled.startAt)}</strong>
          <p>{time(rescheduled.startAt)} – {time(rescheduled.endAt)}</p>
          <small>{rescheduled.timeZone} · {rescheduled.bookingCode}</small>
        </div>}
        <Button type="button" onClick={() => setRescheduled(null)}>Got it</Button>
      </DialogContent>
    </Dialog>
  );
  if (appointment.status === "CONFIRMED")
    // Show the prepared content and actions so the user can review the information and continue.
    return <>
      {/* Show the reservation result and payment details so the customer understands the booking status. */}
      <BookingConfirmation key={appointment.bookingCode} appointment={appointment} salon={salon} token={token} onManage={openManagement} onBackHome={onBackHome} />
      {managementDialog}
      {rescheduleConfirmation}
    </>;
  return (
    <>
    {/* Group the selected visit details so the customer can review the plan before continuing. */}
    <section className="visit-summary tw:customer:[background:white] tw:customer:[border:1px_solid_#ddddd7] tw:customer:rounded-[20px]
          tw:customer:mt-0 tw:[background:#eef3ef] tw:p-6 tw:rounded-[12px] tw:mt-6 tw:[&_li]:py-2 tw:[&_li]:px-0
          tw:[&_input[readonly]]:w-full tw:[&_input[readonly]]:box-border tw:workspace-main:[background:#fff]
          tw:workspace-main:[border:1px_solid_#e3e3e3] reservation tw:customer:[&_h3]:text-[20px]
          tw:customer:[&_h3]:[margin:0_0_12px] tw:customer:[&_h3]:leading-[1.4] tw:customer:[&_p]:leading-[1.7]" aria-label="Your booking">
      {/* Show the page heading and its main controls so the current task is easy to identify. */}
      <header className="reservation-header tw:customer:flex tw:customer:justify-between tw:customer:items-center tw:customer:gap-6
          tw:customer:py-[25px] tw:customer:px-7 tw:customer:mb-6 tw:customer:[border:1px_solid_#e0e0d7]
          tw:customer:rounded-[16px] tw:customer:[background:white] tw:customer:[&_h2]:text-[24px]
          tw:customer:[&_h2]:[margin:0_0_8px] tw:customer:[&_h2]:tracking-[-.025em] tw:down-760:customer:items-start
          tw:down-760:customer:flex-col tw:down-760:customer:gap-4 tw:down-760:customer:p-5.5
          tw:down-760:customer:[&_h2]:text-[21px]">
        <div>
          <p className="booking-kicker tw:customer:text-[#85702f] tw:customer:text-[10px] tw:customer:font-bold
          tw:customer:tracking-[.15em] tw:customer:[margin:0_0_12px] tw:down-480:customer:text-[9px]">BOOKING REFERENCE</p>
          <h2>{appointment.bookingCode}</h2>
          <p className="muted">
            Booked for {appointment.customer.firstName}{" "}
            {appointment.customer.lastName}
          </p>
        </div>
        <span
          className={`reservation-status tw:customer:shrink-0 tw:customer:[border:1px_solid_#ded8c2] tw:customer:[background:#f7f0dc] tw:customer:text-[#796020] tw:customer:rounded-[30px] tw:customer:py-[9px] tw:customer:px-3.5 tw:customer:text-[10px] tw:customer:tracking-[.07em] tw:customer:font-bold tw:down-760:customer:shrink  reservation-status--${appointment.status.toLowerCase()}`}
        >
          {appointment.status.replaceAll("_", " ")}
        </span>
      </header>
      {appointment.status === "CONFIRMED" && (
        <p
          role="status"
          className="reservation-notice tw:customer:py-4 tw:customer:px-5 tw:customer:[border:1px_solid_#e7dcc0]
          tw:customer:rounded-[12px] tw:customer:text-[13px] tw:customer:mb-6 reservation-notice--success
          tw:customer:[background:#eaf1e7] tw:customer:[border-color:#d6e3d0] tw:customer:text-[#3e6245]"
        >
          ✓ Your appointment is confirmed. We look forward to seeing you.
        </p>
      )}
      {appointment.status === "EXPIRED" && (
        <p className="reservation-notice tw:customer:py-4 tw:customer:px-5 tw:customer:[border:1px_solid_#e7dcc0]
          tw:customer:rounded-[12px] tw:customer:[background:#f7f0dc] tw:customer:text-[13px] tw:customer:mb-6">
          This hold has expired and the time is released.{" "}
          <Link to="/availability">Find another time </Link>
        </p>
      )}
      <div className="reservation-grid tw:customer:grid tw:customer:grid-cols-[minmax(0,1fr)_360px] tw:customer:gap-6
          tw:customer:[align-items:start] tw:down-960:customer:grid-cols-[minmax(0,1fr)_310px]
          tw:down-960:customer:gap-4.5 tw:down-760:customer:grid-cols-[minmax(0,1fr)]">
        <div className="reservation-main tw:customer:grid tw:customer:gap-6 tw:customer:min-w-0">
          {/* Group the selected visit details so the customer can review the plan before continuing. */}
          <section className="reservation-card tw:customer:[background:white] tw:customer:[border:1px_solid_#e0e0d7]
          tw:customer:rounded-[16px] tw:customer:p-7 tw:customer:min-w-0 tw:down-960:customer:p-5.5
          tw:down-760:customer:p-5.5" aria-label="Visit details">
            <p className="booking-kicker tw:customer:text-[#85702f] tw:customer:text-[10px] tw:customer:font-bold
          tw:customer:tracking-[.15em] tw:customer:[margin:0_0_12px] tw:down-480:customer:text-[9px]">YOUR VISIT</p>
            <h3>{date(appointment.startAt)}</h3>
            <p className="reservation-time tw:customer:text-[20px] tw:customer:[margin:0_0_6px] tw:down-760:customer:text-[18px]">
              {time(appointment.startAt)} – {time(appointment.endAt)}
            </p>
            <p className="muted reservation-timezone">
              All times are in {appointment.timeZone}.
            </p>
            <ol className="reservation-services tw:customer:[list-style:none] tw:customer:p-0 tw:customer:m-0
          tw:customer:[border-top:1px_solid_#e8e8e1] tw:customer:[&_li]:py-5 tw:customer:[&_li]:px-0
          tw:customer:[&_li]:[border-bottom:1px_solid_#e8e8e1] tw:customer:[&_p]:text-[12px]
          tw:customer:[&_p]:[margin:6px_0_0]">
              {appointment.appointmentServices.map((service) => (
                <li key={service.sequenceNo}>
                  <div className="reservation-service-heading tw:customer:flex tw:customer:justify-between tw:customer:[align-items:start]
          tw:customer:gap-5 tw:customer:text-[14px] tw:down-760:customer:gap-3.5">
                    <strong>{service.serviceNameSnapshot}</strong>
                    <strong>{money(service.priceSnapshot)}</strong>
                  </div>
                  <p className="muted">
                    {service.staff.firstName} {service.staff.lastName}
                  </p>
                  <p className="reservation-service-time tw:customer:text-[#73756f]">
                    {format(service.scheduledStartAt)} –{" "}
                    {time(service.scheduledEndAt)}
                  </p>
                </li>
              ))}
            </ol>
            <div className="reservation-total tw:customer:flex tw:customer:justify-between tw:customer:items-baseline tw:customer:gap-5
          tw:customer:pt-5.5 tw:customer:text-[13px] tw:customer:[&_strong]:text-[24px]
          tw:customer:[&_strong]:tracking-[-.04em]">
              <span>Service total</span>
              <strong>{money(serviceTotal)}</strong>
            </div>
            <p className="muted reservation-footnote">
              Service charges are separate from the appointment fee.
            </p>
          </section>
        </div>
        {/* Keep the supporting information beside the main task so it stays available while the user works. */}
        <aside
          className="reservation-sidebar tw:customer:grid tw:customer:gap-6 tw:customer:min-w-0 tw:down-760:customer:[grid-row:1]"
          aria-label="Payment and booking access"
        >
          {appointment.status === "PENDING_PAYMENT" && (
            <section className="reservation-card tw:customer:[background:white] tw:customer:[border:1px_solid_#e0e0d7]
          tw:customer:rounded-[16px] tw:customer:p-7 tw:customer:min-w-0 tw:down-960:customer:p-5.5
          tw:down-760:customer:p-5.5 reservation-payment">
              <p className="booking-kicker tw:customer:text-[#85702f] tw:customer:text-[10px] tw:customer:font-bold
          tw:customer:tracking-[.15em] tw:customer:[margin:0_0_12px] tw:down-480:customer:text-[9px]">COMPLETE YOUR RESERVATION</p>
              <h3>Confirm your visit</h3>
              <p className="muted">
                Pay the appointment fee before your temporary hold expires.
              </p>
              <div className="reservation-hold tw:customer:[background:#f6f2e6] tw:customer:[border:1px_solid_#e9dfbe]
          tw:customer:rounded-[12px] tw:customer:flex tw:customer:flex-col tw:customer:items-center tw:customer:p-4.5
          tw:customer:[margin:22px_0_0] tw:customer:gap-1 tw:customer:[&>span]:text-[11px]
          tw:customer:[&>span]:text-[#796020] tw:customer:[&_strong]:text-[32px] tw:customer:[&_strong]:tabular-nums
          tw:customer:[&_strong]:tracking-[-.03em] tw:customer:[&_strong]:text-[#796020]" role="status">
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
              <div className="reservation-fee tw:customer:flex tw:customer:justify-between tw:customer:items-baseline tw:customer:gap-5
          tw:customer:pt-5.5 tw:customer:text-[13px] tw:customer:[&_strong]:text-[24px]
          tw:customer:[&_strong]:tracking-[-.04em]">
                <span>Appointment fee</span>
                <strong>{money(appointment.appointmentFeeAmount)}</strong>
              </div>
              <p className="muted reservation-footnote">
                Separate from your service charges.
              </p>
              {/* Show the available appointment-fee actions so the customer can continue or check payment. */}
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
        </aside>
      </div>
      {error && (
        <p role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">
          {error}
        </p>
      )}
    </section>
    {rescheduleConfirmation}
    </>
  );
}
