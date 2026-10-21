import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/Dialog";
import { ReceiptContent } from "../ReceiptContent";
import { ReceiptPrintButton } from "../ReceiptPrintButton";
import { ReceiptDownloadButton } from "../ReceiptDownloadButton/ReceiptDownloadButton";
import type { Receipt } from "../../types/receipt";

export function ReceiptPreviewButton({
  receipt,
  label = "View E-Receipt",
  className,
}: {
  receipt: Receipt;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" type="button" className={className}>
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="receipt-preview-dialog tw:m-0 tw:w-[min(740px,calc(100%_-_24px))] tw:max-h-[calc(100dvh_-_32px)] tw:p-5
          tw:[border:1px_solid_#ddddd7] tw:rounded-[22px] tw:[background:#f3f3f1] tw:text-[#292a28] tw:font-sans
          tw:[&_.salon-receipt]:[margin:20px_auto_0] tw:down-480:p-3"
        showCloseButton={false}
        aria-describedby={undefined}
      >
        <div className="receipt-preview-toolbar tw:flex tw:justify-between tw:items-center tw:gap-4 tw:text-[14px] tw:[&_button]:py-2
          tw:[&_button]:px-3 tw:[&_button]:[border:1px_solid_#ddddd7] tw:[&_button]:rounded-[99px]
          tw:[&_button]:[background:#fff] tw:[&_button]:text-[#292a28] tw:[&_button]:cursor-pointer">
          <DialogTitle>Your e-receipt</DialogTitle>
          <DialogClose asChild>
            <Button
              variant="outline"
              type="button"
              aria-label="Close receipt preview"
            >
              Close ×
            </Button>
          </DialogClose>
        </div>
        <article className="salon-receipt tw:box-border tw:w-full tw:max-w-[680px] tw:min-w-0 tw:my-6 tw:mx-0 tw:p-8
          tw:[border:1px_solid_#ddddd7] tw:[border-top:4px_solid_#d3ae30] tw:rounded-[20px] tw:[background:#fff]
          tw:text-[#292a28] tw:[font-family:Arial,Helvetica,sans-serif] tw:text-[14px] tw:[overflow-wrap:anywhere]
          tw:[&_*]:box-border tw:[&_.receipt-save-hint]:text-[#73756f] tw:[&_.receipt-save-hint]:text-center
          tw:[&_.receipt-save-hint]:text-[11px] tw:[&_.receipt-save-hint]:[margin:12px_0_0] tw:down-480:py-5.5
          tw:down-480:px-4.5 tw:down-480:rounded-[16px] tw:leading-[1.5]">
          <ReceiptContent receipt={receipt} />
          <div className="receipt-actions tw:receipt:mt-6">
            <ReceiptDownloadButton receipt={receipt} />
            <ReceiptPrintButton
              receipt={receipt}
              label="Print receipt"
              className="receipt-print tw:receipt:w-full tw:receipt:py-3 tw:receipt:px-5 tw:receipt:[border:1px_solid_#d3ae30]
          tw:receipt:rounded-[99px] tw:receipt:[background:#d3ae30] tw:receipt:text-[#292a28] tw:receipt:cursor-pointer
          tw:receipt:hover:[background:#c8a124] tw:receipt:focus-visible:[outline:3px_solid_#987b1f]
          tw:receipt:focus-visible:outline-offset-[3px]"
            />
          </div>
        </article>
      </DialogContent>
    </Dialog>
  );
}
