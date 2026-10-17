import { ReceiptContent } from "../ReceiptContent";
import { ReceiptPrintButton } from "../ReceiptPrintButton";
import type { Receipt } from "../../types/receipt";

export function ReceiptView({ receipt }: { receipt: Receipt }) {
  return <article className="salon-receipt" aria-label={`Receipt ${receipt.receiptNumber}`}><ReceiptContent receipt={receipt} /><div className="receipt-actions"><ReceiptPrintButton receipt={receipt} className="receipt-print" /></div></article>;
}
