import "./ReceiptContent.css";

import type { Receipt } from "../../types/receipt";

const value = (input: unknown) => typeof input === "string" ? input : "";
const object = (input: unknown): Record<string, unknown> => input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
const methodName = (method: string) => ({ CASH: "Cash", GCASH: "GCash", OTHER: "Other" })[method] || method.replaceAll("_", " ");

export function ReceiptContent({ receipt }: { receipt: Receipt }) {
  const r = receipt.receiptSnapshot;
  const salon = object(r.salon);
  const currency = value(r.currency) || "PHP";
  const paidAt = value(r.paidAt);
  const timeZone = value(r.timeZone) || "Asia/Manila";
  const date = new Date(paidAt);
  const paidOn = paidAt && !Number.isNaN(date.getTime())
    ? `${new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone }).format(date)} (${timeZone})` : paidAt;
  const services = Array.isArray(r.services) ? r.services.map(object) : [];
  const scheduled = Array.isArray(r.scheduledServices) ? r.scheduledServices.map(object) : [];
  const visit = object(r.appointment);
  const startAt = new Date(value(visit.startAt));
  const visitDate = !Number.isNaN(startAt.getTime()) ? new Intl.DateTimeFormat("en-PH", { timeZone, dateStyle: "medium", timeStyle: "short" }).format(startAt) : "";
  const type = r.type === "APPOINTMENT_FEE" ? "Appointment fee" : r.type === "SERVICE_PAYMENT" ? "Service payment" : value(r.type).replaceAll("_", " ");
  return <>
    <header className="receipt-header"><div className="receipt-brand"><span>CLIQUE</span><small>salon and spa</small></div><span className="receipt-label">E-RECEIPT</span></header>
    <div className="receipt-salon"><strong>{value(salon.name) || "Clique Salon & Spa"}</strong>{value(salon.address) && <p>{value(salon.address)}</p>}{value(salon.phone) && <p>{value(salon.phone)}</p>}</div>
    <div className="receipt-heading"><div><p className="receipt-eyebrow">A LITTLE TIME FOR YOURSELF</p><h3>{r.type === "APPOINTMENT_FEE" ? "Your next moment of self-care." : "Thank you for your visit."}</h3><p>{type} <span className="receipt-paid">✓ Paid</span></p></div></div>
    <dl className="receipt-details"><div><dt>Receipt number</dt><dd>{receipt.receiptNumber}</dd></div><div><dt>Booking reference</dt><dd>{value(r.bookingCode)}</dd></div><div><dt>Customer</dt><dd>{value(r.customerName)}</dd></div><div><dt>Paid on</dt><dd>{paidOn || "—"}</dd></div></dl>
    <table className="receipt-services"><thead><tr><th scope="col">{r.type === "APPOINTMENT_FEE" ? "Payment description" : "Performed service"}</th><th scope="col">Amount ({currency})</th></tr></thead><tbody>{r.type === "APPOINTMENT_FEE" ? <tr><td>Appointment reservation fee</td><td>{value(r.amount)}</td></tr> : services.map((service, i) => <tr key={i}><td>{value(service.name)}</td><td>{value(service.amount)}</td></tr>)}</tbody></table>
    <div className="receipt-total"><span>Total paid</span><strong>{currency} {value(r.amount)}</strong></div>
    <dl className="receipt-payment"><div><dt>Payment method</dt><dd>{methodName(value(r.method)) || "—"}</dd></div><div><dt>Payment reference</dt><dd>{value(r.externalReference) || "—"}</dd></div></dl>
    {r.type === "APPOINTMENT_FEE" && <section className="receipt-visit"><p className="receipt-eyebrow">YOUR APPOINTMENT</p>{visitDate && <p className="receipt-visit-date">{visitDate} · {timeZone}</p>}{scheduled.map((service, i) => <div className="receipt-visit-service" key={i}><strong>{value(service.name)}</strong><span>{value(service.staffName)}</span></div>)}<p className="receipt-fee-note">This receipt covers the appointment fee only. Service charges are separate and payable at the salon.</p></section>}
    <footer className="receipt-footer"><p>Your beauty. Our passion.</p><small>Keep this e-receipt for your records.{r.issuedBy === "SYSTEM" ? " Automatically issued after verified payment." : ""}</small>{value(salon.email) && <small>{value(salon.email)}</small>}</footer>
  </>;
}
