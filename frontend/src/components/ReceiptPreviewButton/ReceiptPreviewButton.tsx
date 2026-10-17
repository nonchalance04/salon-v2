import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ReceiptContent } from "../ReceiptContent";
import { ReceiptPrintButton } from "../ReceiptPrintButton";
import type { Receipt } from "../../types/receipt";

export function ReceiptPreviewButton({ receipt, label = "View E-Receipt", className }: { receipt: Receipt; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [open]);
  return <><button type="button" className={className} onClick={() => setOpen(true)}>{label}</button>{open && createPortal(
    <dialog ref={dialog} className="receipt-preview-dialog" aria-label="Your e-receipt" onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="receipt-preview-toolbar"><span>Your e-receipt</span><button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label="Close receipt preview">Close ×</button></div>
      <article className="salon-receipt"><ReceiptContent receipt={receipt} /><div className="receipt-actions"><ReceiptPrintButton receipt={receipt} label="Print / Save as PDF" className="receipt-print" /><p className="receipt-save-hint">Choose Save as PDF in the print dialog to download your e-receipt.</p></div></article>
    </dialog>, document.body)}</>;
}
