import { ReceiptContent } from "../ReceiptContent";
import { ReceiptPrintButton } from "../ReceiptPrintButton";
import type { Receipt } from "../../types/receipt";

export function ReceiptView({ receipt }: { receipt: Receipt }) {
  return <article className="salon-receipt tw:box-border tw:w-full tw:max-w-[680px] tw:min-w-0 tw:my-6 tw:mx-0 tw:p-8
          tw:[border:1px_solid_#ddddd7] tw:[border-top:4px_solid_#d3ae30] tw:rounded-[20px] tw:[background:#fff]
          tw:text-[#292a28] tw:[font-family:Arial,Helvetica,sans-serif] tw:text-[14px] tw:[overflow-wrap:anywhere]
          tw:[&_*]:box-border tw:[&_.receipt-save-hint]:text-[#73756f] tw:[&_.receipt-save-hint]:text-center
          tw:[&_.receipt-save-hint]:text-[11px] tw:[&_.receipt-save-hint]:[margin:12px_0_0] tw:down-480:py-5.5
          tw:down-480:px-4.5 tw:down-480:rounded-[16px] tw:leading-[1.5]" aria-label={`Receipt ${receipt.receiptNumber}`}><ReceiptContent receipt={receipt} /><div className="receipt-actions tw:receipt:mt-6"><ReceiptPrintButton receipt={receipt} className="receipt-print tw:receipt:w-full tw:receipt:py-3 tw:receipt:px-5 tw:receipt:[border:1px_solid_#d3ae30]
          tw:receipt:rounded-[99px] tw:receipt:[background:#d3ae30] tw:receipt:text-[#292a28] tw:receipt:cursor-pointer
          tw:receipt:hover:[background:#c8a124] tw:receipt:focus-visible:[outline:3px_solid_#987b1f]
          tw:receipt:focus-visible:outline-offset-[3px]" /></div></article>;
}
