import { ReceiptPreviewButton } from "../ReceiptPreviewButton";
import { paymentStatusLabel } from "../../utils/payment-presentation";
import type { FeePayment } from "../../types/payments";

export function FeePaymentHistory({ payments }: { payments: FeePayment[] }) {
  return payments.length ? <section aria-label="Appointment-fee payments"><h3>Appointment-fee payments</h3>{payments.map(p => <div key={p.id} className="payment-record tw:py-3 tw:px-0 tw:[border-bottom:1px_solid_#dce0d8] tw:[&_summary]:cursor-pointer
          tw:[&_summary]:[overflow-wrap:anywhere] tw:[&_dl]:mt-3 tw:[&_dt]:font-semibold tw:[&_dd]:[margin:0_0_10px]
          tw:[&_dd]:[overflow-wrap:anywhere]">
    <p>PHP {p.amount} · {paymentStatusLabel(p.status)}{p.reconciliationStatus === "REQUIRED" && " · Salon review required"}</p>
    {p.reconciliationStatus === "REQUIRED" && <p>This payment was not applied to the booking fee. Contact the salon for reconciliation.</p>}
    {p.receipt?.receiptSnapshot && <ReceiptPreviewButton receipt={{ receiptNumber: p.receipt.receiptNumber, receiptSnapshot: p.receipt.receiptSnapshot }} label={`View receipt ${p.receipt.receiptNumber}`} />}
  </div>)}</section> : null;
}
