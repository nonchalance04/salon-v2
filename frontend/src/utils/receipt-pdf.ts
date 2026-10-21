import { jsPDF } from "jspdf";
import type { Receipt } from "../types/receipt.ts";

const text = (value: unknown) => typeof value === "string" ? value : "";
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export function receiptPdfFilename(receipt: Receipt) {
  return `${receipt.receiptNumber.replace(/[^a-zA-Z0-9_-]/g, "_") || "receipt"}.pdf`;
}

/** Generate locally from the issued snapshot; no payment or receipt records are changed. */
export function createReceiptPdf(receipt: Receipt) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  pdf.setProperties({ title: `Receipt ${receipt.receiptNumber}`, subject: "Salon payment receipt", creator: "Clique Salon" });
  const r = receipt.receiptSnapshot;
  const salon = record(r.salon);
  const currency = text(r.currency) || "PHP";
  const timeZone = text(r.timeZone) || "Asia/Manila";
  const fee = r.type === "APPOINTMENT_FEE";
  let y = 22;
  function line(value: string, size = 11, bold = false) {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const height = size * 0.48;
    for (const part of pdf.splitTextToSize(value || "-", 166) as string[]) {
      if (y + height > 277) {
        pdf.addPage();
        y = 22;
      }
      pdf.text(part, 22, y);
      y += height;
    }
    y += 2;
  }
  function date(value: unknown) {
    const raw = text(value);
    const parsed = new Date(raw);
    if (!raw || Number.isNaN(parsed.getTime())) return raw || "-";
    return `${new Intl.DateTimeFormat("en-PH", { timeZone, dateStyle: "medium", timeStyle: "short" }).format(parsed)} (${timeZone})`;
  }
  pdf.setTextColor(158, 123, 24);
  line("CLIQUE", 28, true);
  line("salon and spa", 12);
  pdf.setTextColor(41, 42, 40);
  line(text(salon.name) || "Clique Salon & Spa", 12, true);
  if (text(salon.address)) line(text(salon.address));
  if (text(salon.phone)) line(text(salon.phone));
  y += 4;
  line("E-RECEIPT", 17, true);
  line(`${fee ? "Appointment fee" : "Service payment"} - Paid`, 12, true);
  line(`Receipt number: ${receipt.receiptNumber}`);
  line(`Booking reference: ${text(r.bookingCode)}`);
  line(`Customer: ${text(r.customerName)}`);
  line(`Paid on: ${date(r.paidAt)}`);
  y += 4;
  line(fee ? "Payment description" : "Performed services", 12, true);
  if (fee) line(`Appointment reservation fee - ${currency} ${text(r.amount)}`);
  else if (Array.isArray(r.services)) for (const service of r.services) {
    const item = record(service);
    line(`${text(item.name)} - ${currency} ${text(item.amount)}`);
  }
  y += 3;
  line(`Total paid: ${currency} ${text(r.amount)}`, 15, true);
  const method = text(r.method);
  line(`Payment method: ${({ CASH: "Cash", GCASH: "GCash", QRPH: "QR Ph", OTHER: "Other" } as Record<string, string>)[method] || method || "-"}`);
  line(`Payment reference: ${text(r.paymentReference) || text(r.externalReference) || "-"}`);
  if (text(r.paymentReference) && r.provider === "paymongo" && text(r.externalReference)) line(`Provider reference: ${text(r.externalReference)}`);
  if (fee) {
    y += 4;
    line("Your appointment", 12, true);
    const visit = record(r.appointment);
    if (text(visit.startAt)) line(date(visit.startAt));
    if (Array.isArray(r.scheduledServices)) for (const service of r.scheduledServices) {
      const item = record(service);
      line(`${text(item.name)} - ${text(item.staffName)}`);
    }
    line("This receipt covers the appointment fee only. Service charges are separate and payable at the salon.", 10);
  }
  y += 5;
  line("Your beauty. Our passion.", 12, true);
  line(`Keep this e-receipt for your records.${r.issuedBy === "SYSTEM" ? " Automatically issued after verified payment." : ""}`, 10);
  if (text(salon.email)) line(text(salon.email), 10);
  return pdf;
}
