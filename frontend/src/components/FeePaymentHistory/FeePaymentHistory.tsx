import { ReceiptView } from "../ReceiptView";
import { paymentStatusLabel } from "../../utils/payment-presentation";
import type { FeePayment } from "../../types/payments";

export function FeePaymentHistory({ payments }: { payments: FeePayment[] }) {
  return payments.length ? <section aria-label="Appointment-fee payments"><h3>Appointment-fee payments</h3>{payments.map(p => <div key={p.id} className="payment-record">
    <p>PHP {p.amount} · {paymentStatusLabel(p.status)}{p.reconciliationStatus === "REQUIRED" && " · Salon review required"}</p>
    {p.reconciliationStatus === "REQUIRED" && <p>This payment was not applied to the booking fee. Contact the salon for reconciliation.</p>}
    {p.receipt && <details><summary>Receipt {p.receipt.receiptNumber}</summary>{p.receipt.receiptSnapshot && <ReceiptView receipt={{ receiptNumber: p.receipt.receiptNumber, receiptSnapshot: p.receipt.receiptSnapshot }} />}</details>}
  </div>)}</section> : null;
}
