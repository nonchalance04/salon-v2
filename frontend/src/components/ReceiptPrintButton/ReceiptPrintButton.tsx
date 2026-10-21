import { Button } from "@/components/ui/Button";
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
  return <><Button variant="outline" type="button" className={className} onClick={() => setPrinting(true)} aria-label={`${label} ${receipt.receiptNumber}`}>{label}</Button>{printing && createPortal(<div className="receipt-print-root tw:hidden"><article className="salon-receipt tw:box-border tw:w-full tw:max-w-[680px] tw:min-w-0 tw:my-6 tw:mx-0 tw:p-8
          tw:[border:1px_solid_#ddddd7] tw:[border-top:4px_solid_#d3ae30] tw:rounded-[20px] tw:[background:#fff]
          tw:text-[#292a28] tw:[font-family:Arial,Helvetica,sans-serif] tw:text-[14px] tw:[overflow-wrap:anywhere]
          tw:[&_*]:box-border tw:[&_.receipt-save-hint]:text-[#73756f] tw:[&_.receipt-save-hint]:text-center
          tw:[&_.receipt-save-hint]:text-[11px] tw:[&_.receipt-save-hint]:[margin:12px_0_0] tw:down-480:py-5.5
          tw:down-480:px-4.5 tw:down-480:rounded-[16px] tw:leading-[1.5]"><ReceiptContent receipt={receipt} /></article></div>, document.body)}</>;
}
