import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Receipt } from "../../types/receipt";

export function ReceiptDownloadButton({ receipt }: { receipt: Receipt }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { createReceiptPdf, receiptPdfFilename } = await import("../../utils/receipt-pdf");
      await createReceiptPdf(receipt).save(receiptPdfFilename(receipt), { returnPromise: true });
    } catch {
      setError("Couldn’t download the receipt. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return <>
    <Button type="button" variant="outline" className="receipt-print tw:receipt:w-full tw:receipt:py-3 tw:receipt:px-5 tw:receipt:[border:1px_solid_#d3ae30]
          tw:receipt:rounded-[99px] tw:receipt:[background:#d3ae30] tw:receipt:text-[#292a28] tw:receipt:cursor-pointer
          tw:receipt:hover:[background:#c8a124] tw:receipt:focus-visible:[outline:3px_solid_#987b1f]
          tw:receipt:focus-visible:outline-offset-[3px]" disabled={busy} onClick={() => void download()} aria-label={`Download PDF ${receipt.receiptNumber}`}>
      {busy ? "Preparing PDF…" : "Download PDF"}
    </Button>
    {error && <p role="alert">{error}</p>}
  </>;
}
