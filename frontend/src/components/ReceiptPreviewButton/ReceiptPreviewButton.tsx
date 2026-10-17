import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/Dialog";
import { ReceiptContent } from "../ReceiptContent";
import { ReceiptPrintButton } from "../ReceiptPrintButton";
import type { Receipt } from "../../types/receipt";

export function ReceiptPreviewButton({ receipt, label = "View E-Receipt", className }: { receipt: Receipt; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="outline" type="button" className={className}>{label}</Button></DialogTrigger>
    <DialogContent className="receipt-preview-dialog" showCloseButton={false} aria-describedby={undefined}>
      <div className="receipt-preview-toolbar"><DialogTitle>Your e-receipt</DialogTitle><DialogClose asChild><Button variant="outline" type="button" aria-label="Close receipt preview">Close ×</Button></DialogClose></div>
      <article className="salon-receipt"><ReceiptContent receipt={receipt} /><div className="receipt-actions"><ReceiptPrintButton receipt={receipt} label="Print / Save as PDF" className="receipt-print" /><p className="receipt-save-hint">Choose Save as PDF in the print dialog to download your e-receipt.</p></div></article>
    </DialogContent>
  </Dialog>;
}
