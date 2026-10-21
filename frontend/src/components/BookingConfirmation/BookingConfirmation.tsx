// Bring in the tools for the booking confirmation view so this file can work with the rest of the application.
import { Button } from "@/components/ui/Button";
import { Link } from "react-router";
import type { Appointment } from "../../types/booking";
import type { Salon } from "../../types/salon";
import { useEffect, useState } from "react";
import { ReceiptPreviewButton } from "../ReceiptPreviewButton";
import { api } from "../../lib/api";
import type { FeePayment } from "../../types/payments";

import "./BookingConfirmation.css";

// Show the reservation result and payment details so the customer understands the booking status.
export function BookingConfirmation({
  appointment,
  salon,
  token,
  onManage,
  onBackHome,
}: {
  appointment: Appointment;
  salon: Salon | null;
  token: string;
  onManage: () => void;
  onBackHome?: () => void;
}) {
  const payment = appointment.payments.find(
    (p) => p.status === "SUCCEEDED" && p.satisfiesObligation,
  );
  // Remember the current choices and screen status so the page can respond as the user works.
  const [generated, setGenerated] = useState<FeePayment["receipt"]>(null);
  const [receiptError, setReceiptError] = useState("");
  const [retry, setRetry] = useState(0);
  const receipt = payment?.receipt ?? generated;
  // Load the information this view needs when its inputs change so the displayed results stay current.
  useEffect(() => {
    if (receipt?.receiptSnapshot || payment?.provider !== "paymongo") return;
    let active = true;
    setReceiptError("");
    void api<{ payment: FeePayment }>("/payments/customer-receipt", {
      method: "POST",
      body: JSON.stringify({
        bookingCode: appointment.bookingCode,
        token,
        paymentId: payment.id,
      }),
    })
      .then((result) => {
        if (active) setGenerated(result.payment.receipt);
      })
      .catch((error) => {
        if (active)
          setReceiptError(
            error instanceof Error
              ? error.message
              : "Unable to generate your receipt. Please try again.",
          );
      });
    return () => {
      active = false;
    };
  }, [
    appointment.bookingCode,
    payment?.id,
    payment?.provider,
    receipt?.receiptSnapshot,
    token,
    retry,
  ]);
  const services = appointment.appointmentServices;
  const staff = [
    ...new Set(services.map((s) => `${s.staff.firstName} ${s.staff.lastName}`)),
  ];
  const date = new Intl.DateTimeFormat("en-PH", {
    timeZone: appointment.timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(appointment.startAt));
  const time = new Intl.DateTimeFormat("en-PH", {
    timeZone: appointment.timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(appointment.startAt));
  const total =
    services.reduce(
      (sum, s) => sum + Math.round(Number(s.priceSnapshot) * 100),
      0,
    ) / 100;
  // Format the amount as Philippine pesos so prices and payments are easy to recognize.
  const money = (amount: string | number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(Number(amount));
  return (
    <section
      className="booking-confirmed tw:customer:max-w-[1120px] tw:customer:my-0 tw:customer:mx-auto
          tw:customer:[padding:16px_24px_60px] tw:customer:text-[#292929] tw:down-640:customer:pt-0 tw:down-640:customer:pb-10
          tw:down-640:customer:px-0"
      aria-labelledby="booking-confirmed-title"
    >
      {/* Show the page heading and its main controls so the current task is easy to identify. */}
      <header className="booking-confirmed-heading tw:customer:text-center tw:customer:mb-10 tw:customer:[&_h1]:text-[36px]
          tw:customer:[&_h1]:font-medium tw:customer:[&_h1]:tracking-[-.6px] tw:customer:[&_h1]:[margin:0_0_6px]
          tw:customer:[&_p]:m-0 tw:customer:[&_p]:text-[#777] tw:customer:[&_p]:text-[18px] tw:customer:[&_strong]:ml-3.5
          tw:customer:[&_strong]:text-[#b49836] tw:customer:[&_strong]:font-medium
          tw:customer:[&_strong]:[overflow-wrap:anywhere] tw:down-640:customer:[&_h1]:text-[28px]
          tw:down-640:customer:[&_strong]:block tw:down-640:customer:[&_strong]:[margin:6px_0_0]">
        <h1 id="booking-confirmed-title" tabIndex={-1}>
          Booking Confirmed!
        </h1>
        <p>
          Reference Number: <strong>{appointment.bookingCode}</strong>
        </p>
      </header>
      <div className="booking-confirmed-grid tw:customer:grid tw:customer:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] tw:customer:gap-5
          tw:customer:[align-items:start] tw:down-820:customer:grid-cols-[minmax(0,1fr)]">
        <article className="booking-confirmed-details tw:customer:[background:#fff] tw:customer:rounded-[10px] tw:customer:p-8
          tw:customer:relative tw:customer:overflow-hidden tw:customer:[&_h2]:relative
          tw:customer:[&_h2]:[margin:0_0_10px] tw:customer:[&_h2]:text-[32px] tw:customer:[&_h2]:tracking-[-.5px]
          tw:down-640:customer:p-5 tw:down-640:customer:[&_h2]:text-[24px] tw:customer:[&_h2]:leading-[1.2]">
          <p className="booking-confirmed-label tw:customer:text-[12px] tw:customer:[margin:0_0_20px_18px]">Booking Details</p>
          <span className="booking-confirmed-scissors tw:customer:absolute tw:customer:right-5.5 tw:customer:top-0.5
          tw:customer:text-[#e5e5e5] tw:customer:text-[120px] tw:customer:leading-[1]" aria-hidden="true">
            ✂
          </span>
          <h2>
            {appointment.customer.firstName} {appointment.customer.lastName}
          </h2>
          <dl className="booking-confirmed-facts tw:customer:relative tw:customer:[margin:0_0_20px] tw:customer:text-[16px]
          tw:customer:[&>div]:grid tw:customer:[&>div]:grid-cols-[100px_minmax(0,1fr)] tw:customer:[&>div]:gap-1.5
          tw:customer:[&>div]:my-1 tw:customer:[&>div]:mx-0 tw:customer:[&_dt]:text-[#777] tw:customer:[&_dd]:m-0
          tw:customer:[&_dd]:text-[#ad9031] tw:customer:[&_dd]:[overflow-wrap:anywhere]">
            <div>
              <dt>Hairdresser</dt>
              <dd>{staff.join(", ")}</dd>
            </div>
            <div>
              <dt>Services</dt>
              <dd>{services.map((s) => s.serviceNameSnapshot).join(", ")}</dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd>
                {payment?.method === "GCASH"
                  ? "GCash"
                  : payment?.method === "QRPH"
                    ? "QR Ph"
                  : payment?.method?.replaceAll("_", " ") ||
                    (appointment.carriedAppointmentFeePaymentId
                      ? "Carried appointment-fee credit"
                      : "Appointment fee paid")}
              </dd>
            </div>
          </dl>
          <dl className="booking-confirmed-totals tw:customer:grid tw:customer:grid-cols-[1.25fr_1fr_1fr] tw:customer:gap-4
          tw:customer:[background:#efe1b4] tw:customer:py-5 tw:customer:px-3 tw:customer:m-0
          tw:customer:rounded-[3px] tw:customer:[&_dt]:text-[10px] tw:customer:[&_dt]:uppercase
          tw:customer:[&_dt]:text-[#787364] tw:customer:[&_dt]:mb-1.5 tw:customer:[&_dd]:text-[22px]
          tw:customer:[&_dd]:m-0 tw:down-640:customer:gap-2.5 tw:down-640:customer:[&_dd]:text-[16px]
          tw:customer:[&_dd]:leading-[1.3]">
            <div>
              <dt>Date</dt>
              <dd>{date}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>{time}</dd>
            </div>
            <div>
              <dt>Service total</dt>
              <dd>{money(total)}</dd>
            </div>
          </dl>
          <p className="booking-confirmed-note tw:customer:text-[11px] tw:customer:text-[#777] tw:customer:[margin:12px_0_0]
          tw:customer:leading-[1.5]">
            {payment ? `Appointment fee paid: ${money(payment.amount)}. ` : ""}
            Service charges are separate. Times shown in {appointment.timeZone}.
          </p>
        </article>
        {/* Keep the supporting information beside the main task so it stays available while the user works. */}
        <aside className="booking-confirmed-sidebar tw:customer:grid tw:customer:gap-3">
          <div className="booking-confirmed-download tw:customer:[background:#fff] tw:customer:rounded-[10px] tw:customer:py-5
          tw:customer:px-7 tw:down-640:customer:px-5">
            {receipt?.receiptSnapshot ? (
              <ReceiptPreviewButton
                receipt={{
                  receiptNumber: receipt.receiptNumber,
                  receiptSnapshot: receipt.receiptSnapshot,
                }}
                label=" Download E-Receipt"
                className="booking-confirmed-receipt tw:customer:w-full tw:customer:[border:0] tw:customer:rounded-[3px]
          tw:customer:[background:#efe1b4] tw:customer:text-[#292929] tw:customer:p-3 tw:customer:cursor-pointer
          tw:customer:disabled:opacity-[.65] tw:customer:disabled:cursor-default"
              />
            ) : (
              <Button variant="outline"
                type="button"
                className="booking-confirmed-receipt tw:customer:w-full tw:customer:[border:0] tw:customer:rounded-[3px]
          tw:customer:[background:#efe1b4] tw:customer:text-[#292929] tw:customer:p-3 tw:customer:cursor-pointer
          tw:customer:disabled:opacity-[.65] tw:customer:disabled:cursor-default"
                disabled
              >
                 Download E-Receipt
              </Button>
            )}
            <p className="booking-confirmed-note tw:customer:text-[11px] tw:customer:text-[#777] tw:customer:[margin:12px_0_0]
          tw:customer:leading-[1.5]">
              {receipt?.receiptSnapshot
                ? "Preview your receipt, then print or save as PDF."
                : payment?.provider === "paymongo"
                  ? "Generating your e-receipt…"
                  : "Your e-receipt will be available once the salon issues it."}
            </p>
            {receiptError && (
              <>
                <p role="alert" className="error tw:[background:#fff0ed] tw:[border:1px_solid_#ecc5ba] tw:text-[#963923] tw:py-3 tw:px-4 tw:rounded-[6px]
          tw:text-[14px]">
                  {receiptError}
                </p>
                <Button variant="outline"
                  type="button"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  Retry e-receipt
                </Button>
              </>
            )}
          </div>
          {/* Group the contact us details so the related information can be reviewed together. */}
          <section className="booking-confirmed-contact tw:customer:[background:#fff] tw:customer:rounded-[10px] tw:customer:p-7 tw:down-640:customer:p-5
          tw:customer:[&_h2]:text-[18px] tw:customer:[&_h2]:[margin:0_0_8px] tw:customer:[&_p]:block
          tw:customer:[&_a]:block tw:customer:[&_p]:text-[14px] tw:customer:[&_a]:text-[14px] tw:customer:[&_p]:my-2
          tw:customer:[&_p]:mx-0 tw:customer:[&_a]:my-2 tw:customer:[&_a]:mx-0 tw:customer:[&_p]:[overflow-wrap:anywhere]
          tw:customer:[&_a]:[overflow-wrap:anywhere] tw:customer:[&_a]:text-[#977c24] tw:customer:[&_p]:leading-[1.5]
          tw:customer:[&_a]:leading-[1.5]">
            <h2>Contact Us</h2>
            <p>
              Have a concern? Contact our team and we’ll be happy to assist you!
            </p>
            {salon?.profile?.email && (
              <a href={`mailto:${salon.profile.email}`}>
                {salon.profile.email}
              </a>
            )}
            {salon?.profile?.phone && (
              <a href={`tel:${salon.profile.phone}`}>{salon.profile.phone}</a>
            )}
            {salon?.profile?.address && <p>{salon.profile.address}</p>}
            <Link className="booking-confirmed-help" to="/help">
              Visit the salon guide
            </Link>
          </section>
        </aside>
      </div>
      <div className="booking-confirmed-actions tw:customer:grid tw:customer:grid-cols-[1fr_auto_1fr] tw:customer:items-center
          tw:customer:gap-3 tw:customer:mt-7 tw:customer:text-[13px] tw:down-640:customer:grid-cols-2">
        {onBackHome && <Button variant="outline" type="button" className="tw:justify-self-start tw:col-start-1 tw:row-start-1" onClick={onBackHome}>Back to home</Button>}
        <Button variant="outline" type="button" className="tw:col-start-2 tw:row-start-1 tw:down-640:justify-self-end" onClick={onManage}>
          Manage appointment
        </Button>
      </div>
    </section>
  );
}
