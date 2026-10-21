import "./ReceiptContent.css";

import type { Receipt } from "../../types/receipt";

const value = (input: unknown) => typeof input === "string" ? input : "";
const object = (input: unknown): Record<string, unknown> => input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
const methodName = (method: string) => ({ CASH: "Cash", GCASH: "GCash", QRPH: "QR Ph", OTHER: "Other" })[method] || method.replaceAll("_", " ");

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
    <header className="receipt-header tw:receipt:flex tw:receipt:items-center tw:receipt:justify-between tw:receipt:gap-5
          tw:down-480:receipt:items-start tw:down-480:receipt:gap-3"><div className="receipt-brand tw:receipt:flex tw:receipt:flex-col tw:receipt:text-[#d3ae30] tw:receipt:shrink-0
          tw:receipt:[&_span]:text-[43px] tw:receipt:[&_span]:font-black tw:receipt:[&_span]:tracking-[-2.8px]
          tw:receipt:[&_small]:mt-[7px] tw:receipt:[&_small]:text-[#d3ae30] tw:receipt:[&_small]:text-[18px]
          tw:receipt:[&_small]:font-bold tw:receipt:[&_small]:tracking-[-.55px] tw:receipt:[&_span]:leading-[1]
          tw:receipt:[&_small]:leading-[1.2]"><span>CLIQUE</span><small>salon and spa</small></div><span className="receipt-label tw:receipt:py-[7px] tw:receipt:px-3 tw:receipt:[border:1px_solid_#ddddd7]
          tw:receipt:rounded-[99px] tw:receipt:text-[11px] tw:receipt:text-[#5e6059] tw:receipt:text-center
          tw:down-480:receipt:max-w-22.5 tw:down-480:receipt:py-1.5 tw:down-480:receipt:px-2.5">E-RECEIPT</span></header>
    <div className="receipt-salon tw:receipt:my-6 tw:receipt:mx-0 tw:receipt:text-[#73756f] tw:receipt:text-[12px]
          tw:receipt:[&_strong]:text-[#292a28] tw:receipt:[&_strong]:text-[14px] tw:receipt:[&_p]:[margin:4px_0_0]"><strong>{value(salon.name) || "Clique Salon & Spa"}</strong>{value(salon.address) && <p>{value(salon.address)}</p>}{value(salon.phone) && <p>{value(salon.phone)}</p>}</div>
    <div className="receipt-heading tw:receipt:pt-6 tw:receipt:[border-top:1px_solid_#ddddd7] tw:receipt:[&_>_div_h3]:m-0
          tw:receipt:[&_>_div_h3]:text-[#292a28] tw:receipt:[&_>_div_h3]:text-[28px] tw:receipt:[&_>_div_h3]:font-bold
          tw:receipt:[&_>_div_h3]:tracking-[-.8px] tw:down-480:receipt:[&_>_div_h3]:text-[24px]
          tw:receipt:[&_>_div_h3]:leading-[1.2]"><div><p className="receipt-eyebrow tw:receipt:[margin:0_0_12px] tw:receipt:text-[#987b1f] tw:receipt:text-[10px]
          tw:receipt:font-bold tw:receipt:tracking-[1.8px]">A LITTLE TIME FOR YOURSELF</p><h3>{r.type === "APPOINTMENT_FEE" ? "Your next moment of self-care." : "Thank you for your visit."}</h3><p>{type} <span className="receipt-paid tw:receipt:inline-block tw:receipt:ml-3 tw:receipt:py-[3px] tw:receipt:px-2.5
          tw:receipt:[border:1px_solid_#d4dfd0] tw:receipt:rounded-[99px] tw:receipt:[background:#edf2e9]
          tw:receipt:text-[#46613d] tw:receipt:text-[11px] tw:receipt:font-bold tw:receipt:align-middle">✓ Paid</span></p></div></div>
    <dl className="receipt-details tw:receipt:grid tw:receipt:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] tw:receipt:gap-5
          tw:receipt:[margin:0_0_24px] tw:receipt:p-5 tw:receipt:[background:#f3f3f1]
          tw:receipt:[border:1px_solid_#ddddd7] tw:receipt:rounded-[14px] tw:receipt:[&_>_div]:block
          tw:receipt:[&_>_div]:min-w-0 tw:receipt:[&_dt]:min-w-0 tw:receipt:[&_dt]:[margin:0_0_6px]
          tw:receipt:[&_dt]:text-[#73756f] tw:receipt:[&_dt]:text-[10px] tw:receipt:[&_dt]:font-bold
          tw:receipt:[&_dt]:tracking-[1px] tw:receipt:[&_dt]:uppercase tw:receipt:[&_dd]:m-0
          tw:receipt:[&_dd]:text-[#292a28] tw:receipt:[&_dd]:text-[13px] tw:receipt:[&_dd]:font-semibold
          tw:receipt:[&_dd]:[overflow-wrap:anywhere] tw:down-480:receipt:grid-cols-[minmax(0,1fr)]
          tw:down-480:receipt:p-4 tw:down-480:receipt:gap-4"><div><dt>Receipt number</dt><dd>{receipt.receiptNumber}</dd></div><div><dt>Booking reference</dt><dd>{value(r.bookingCode)}</dd></div><div><dt>Customer</dt><dd>{value(r.customerName)}</dd></div><div><dt>Paid on</dt><dd>{paidOn || "—"}</dd></div></dl>
    <table className="receipt-services tw:receipt:w-full tw:receipt:[margin:0_0_24px] tw:receipt:border-collapse
          tw:receipt:table-fixed tw:receipt:whitespace-normal tw:receipt:text-[13px] tw:receipt:[&_th]:py-3
          tw:receipt:[&_th]:px-2 tw:receipt:[&_td]:py-3 tw:receipt:[&_td]:px-2 tw:receipt:[&_th]:[border:0]
          tw:receipt:[&_td]:[border:0] tw:receipt:[&_th]:[border-bottom:1px_solid_#ddddd7]
          tw:receipt:[&_td]:[border-bottom:1px_solid_#ddddd7] tw:receipt:[&_th]:text-left tw:receipt:[&_td]:text-left
          tw:receipt:[&_td]:text-[#292a28] tw:receipt:[&_th]:[overflow-wrap:anywhere]
          tw:receipt:[&_td]:[overflow-wrap:anywhere] tw:receipt:[&_th]:text-[#73756f] tw:receipt:[&_th]:[background:#fff]
          tw:receipt:[&_th]:text-[10px] tw:receipt:[&_th]:font-bold tw:receipt:[&_th]:tracking-[.5px]
          tw:receipt:[&_th]:uppercase"><thead><tr><th scope="col">{r.type === "APPOINTMENT_FEE" ? "Payment description" : "Performed service"}</th><th scope="col">Amount ({currency})</th></tr></thead><tbody>{r.type === "APPOINTMENT_FEE" ? <tr><td>Appointment reservation fee</td><td>{value(r.amount)}</td></tr> : services.map((service, i) => <tr key={i}><td>{value(service.name)}</td><td>{value(service.amount)}</td></tr>)}</tbody></table>
    <div className="receipt-total tw:receipt:flex tw:receipt:flex-wrap tw:receipt:justify-between tw:receipt:items-center
          tw:receipt:gap-3 tw:receipt:p-5 tw:receipt:[background:#f5edd1] tw:receipt:[border:1px_solid_#e4d69d]
          tw:receipt:rounded-[14px] tw:receipt:[&_span]:text-[13px] tw:receipt:[&_span]:font-bold
          tw:receipt:[&_strong]:text-[#292a28] tw:receipt:[&_strong]:text-[26px] tw:receipt:[&_strong]:tracking-[-.7px]
          tw:receipt:[&_strong]:tabular-nums tw:down-480:receipt:p-4 tw:down-480:receipt:[&_strong]:text-[24px]"><span>Total paid</span><strong>{currency} {value(r.amount)}</strong></div>
    <dl className="receipt-payment tw:receipt:[&_>_div]:block tw:receipt:[&_>_div]:min-w-0 tw:receipt:[&_dt]:min-w-0
          tw:receipt:[&_dt]:[margin:0_0_6px] tw:receipt:[&_dt]:text-[#73756f] tw:receipt:[&_dt]:text-[10px]
          tw:receipt:[&_dt]:font-bold tw:receipt:[&_dt]:tracking-[1px] tw:receipt:[&_dt]:uppercase tw:receipt:[&_dd]:m-0
          tw:receipt:[&_dd]:text-[#292a28] tw:receipt:[&_dd]:text-[13px] tw:receipt:[&_dd]:font-semibold
          tw:receipt:[&_dd]:[overflow-wrap:anywhere] tw:receipt:grid tw:receipt:gap-4.5 tw:receipt:my-6 tw:receipt:mx-0"><div><dt>Payment method</dt><dd>{methodName(value(r.method)) || "—"}</dd></div><div><dt>Payment reference</dt><dd>{value(r.paymentReference) || value(r.externalReference) || "—"}</dd></div></dl>
    {value(r.paymentReference) && r.provider === "paymongo" && value(r.externalReference) && <dl className="receipt-payment tw:receipt:[&_>_div]:block tw:receipt:[&_>_div]:min-w-0 tw:receipt:[&_dt]:min-w-0
          tw:receipt:[&_dt]:[margin:0_0_6px] tw:receipt:[&_dt]:text-[#73756f] tw:receipt:[&_dt]:text-[10px]
          tw:receipt:[&_dt]:font-bold tw:receipt:[&_dt]:tracking-[1px] tw:receipt:[&_dt]:uppercase tw:receipt:[&_dd]:m-0
          tw:receipt:[&_dd]:text-[#292a28] tw:receipt:[&_dd]:text-[13px] tw:receipt:[&_dd]:font-semibold
          tw:receipt:[&_dd]:[overflow-wrap:anywhere] tw:receipt:grid tw:receipt:gap-4.5 tw:receipt:my-6 tw:receipt:mx-0"><div><dt>Provider reference</dt><dd>{value(r.externalReference)}</dd></div></dl>}
    {r.type === "APPOINTMENT_FEE" && <section className="receipt-visit tw:receipt:p-5 tw:receipt:[margin:0_0_24px] tw:receipt:[border:1px_solid_#e6e1d4]
          tw:receipt:[background:#faf9f5] tw:receipt:rounded-[14px] tw:down-480:receipt:p-4"><p className="receipt-eyebrow tw:receipt:[margin:0_0_12px] tw:receipt:text-[#987b1f] tw:receipt:text-[10px]
          tw:receipt:font-bold tw:receipt:tracking-[1.8px]">YOUR APPOINTMENT</p>{visitDate && <p className="receipt-visit-date tw:receipt:text-[13px] tw:receipt:[margin:0_0_14px]">{visitDate} · {timeZone}</p>}{scheduled.map((service, i) => <div className="receipt-visit-service tw:receipt:flex tw:receipt:flex-wrap tw:receipt:justify-between tw:receipt:gap-[6px_16px]
          tw:receipt:text-[12px] tw:receipt:py-2 tw:receipt:px-0 tw:receipt:[border-bottom:1px_solid_#e6e1d4]
          tw:receipt:[&_span]:text-[#73756f]" key={i}><strong>{value(service.name)}</strong><span>{value(service.staffName)}</span></div>)}<p className="receipt-fee-note tw:receipt:text-[11px] tw:receipt:text-[#73756f] tw:receipt:[margin:14px_0_0]
          tw:receipt:leading-[1.5]">This receipt covers the appointment fee only. Service charges are separate and payable at the salon.</p></section>}
    <footer className="receipt-footer tw:receipt:[border-top:1px_solid_#ddddd7] tw:receipt:pt-5 tw:receipt:text-center
          tw:receipt:text-[#73756f] tw:receipt:[&_p]:[margin:0_0_6px] tw:receipt:[&_p]:text-[13px]
          tw:receipt:[&_small]:text-[#73756f] tw:receipt:[&_small]:text-[11px] tw:receipt:[&_small]:block"><p>Your beauty. Our passion.</p><small>Keep this e-receipt for your records.{r.issuedBy === "SYSTEM" ? " Automatically issued after verified payment." : ""}</small>{value(salon.email) && <small>{value(salon.email)}</small>}</footer>
  </>;
}
