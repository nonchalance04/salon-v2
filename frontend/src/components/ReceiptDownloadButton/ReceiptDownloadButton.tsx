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
    <Button type="button" variant="outline" className="receipt-print" disabled={busy} onClick={() => void download()} aria-label={`Download PDF ${receipt.receiptNumber}`}>
      {busy ? "Preparing PDF…" : "Download PDF"}
    </Button>
    {error && <p role="alert">{error}</p>}
  </>;
}
