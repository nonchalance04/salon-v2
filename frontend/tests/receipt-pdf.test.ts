import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import { test } from "node:test";
import { createReceiptPdf, receiptPdfFilename } from "../src/utils/receipt-pdf.ts";

const receipt = {
  receiptNumber: "R-100001",
  receiptSnapshot: {
    type: "SERVICE_PAYMENT", bookingCode: "SL-example", customerName: "Test Guest",
    amount: "120.50", currency: "PHP", method: "CASH", paidAt: "2026-10-21T12:00:00Z",
    timeZone: "Asia/Manila", paymentReference: "P-100001",
    salon: { name: "Clique Salon", address: "Example address", phone: "09000000000" },
    services: [{ name: "Haircut", amount: "120.50" }],
  },
};
function pageText(pdf: ReturnType<typeof createReceiptPdf>) {
  const binary = Buffer.from(pdf.output("arraybuffer")).toString("latin1");
  return [...binary.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
    .map(match => inflateSync(Buffer.from(match[1], "latin1")).toString("latin1")).join("\n");
}

test("receipt PDF is a real PDF with saved amounts, references and salon-local payment time", () => {
  const pdf = createReceiptPdf(receipt);
  assert.equal(Buffer.from(pdf.output("arraybuffer")).subarray(0, 5).toString(), "%PDF-");
  const output = pageText(pdf);
  for (const value of ["R-100001", "SL-example", "Test Guest", "PHP 120.50", "P-100001", "Haircut", "8:00 PM", "Asia/Manila"]) assert.ok(output.includes(value), value);
  assert.equal(pdf.getNumberOfPages(), 1);
  assert.equal(receipt.receiptSnapshot.amount, "120.50");
});

test("appointment fee PDF retains separate-charge note, scheduled services and provider reference", () => {
  const output = pageText(createReceiptPdf({ ...receipt, receiptSnapshot: {
    ...receipt.receiptSnapshot, type: "APPOINTMENT_FEE", provider: "paymongo", method: "QRPH",
    externalReference: "merchant-reference", issuedBy: "SYSTEM",
    appointment: { startAt: "2026-10-22T02:00:00Z" },
    scheduledServices: [{ name: "Pedicure", staffName: "Test Stylist" }],
  } }));
  for (const value of ["Appointment reservation fee", "Pedicure", "Test Stylist", "merchant-reference", "QR Ph", "appointment fee only", "Automatically issued"]) assert.ok(output.includes(value), value);
  assert.ok(!output.includes("Haircut"));
});

test("long receipts wrap and continue on additional pages without losing the last service or total", () => {
  const pdf = createReceiptPdf({ ...receipt, receiptSnapshot: { ...receipt.receiptSnapshot,
    services: Array.from({ length: 90 }, (_, index) => ({ name: `Service ${index} ${"long name ".repeat(12)}`, amount: "120.50" })),
  } });
  assert.ok(pdf.getNumberOfPages() > 1);
  const output = pageText(pdf);
  assert.ok(output.includes("Service 89"));
  assert.ok(output.includes("Total paid: PHP 120.50"));
});

test("receipt PDF filenames cannot contain paths or browser filename punctuation", () => {
  assert.equal(receiptPdfFilename(receipt), "R-100001.pdf");
  assert.equal(receiptPdfFilename({ ...receipt, receiptNumber: "../../receipt:name" }), "______receipt_name.pdf");
  assert.equal(receiptPdfFilename({ ...receipt, receiptNumber: "" }), "receipt.pdf");
});
