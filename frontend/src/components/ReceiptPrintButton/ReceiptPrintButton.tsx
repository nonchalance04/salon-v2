import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ReceiptContent } from "../ReceiptContent";
import type { Receipt } from "../../types/receipt";

export function ReceiptPrintButton({ receipt, label = "Print receipt", className }: { receipt: Receipt; label?: string; className?: string }) {
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    if (!printing) return;
    const originalTitle = document.title;
    document.title = receipt.receiptNumber;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done, { once: true });
    window.print();
    return () => { document.title = originalTitle; window.removeEventListener("afterprint", done); };
  }, [printing, receipt.receiptNumber]);
  return <><button type="button" className={className} onClick={() => setPrinting(true)} aria-label={`${label} ${receipt.receiptNumber}`}>{label}</button>{printing && createPortal(<div className="receipt-print-root"><article className="salon-receipt"><ReceiptContent receipt={receipt} /></article></div>, document.body)}</>;
}
