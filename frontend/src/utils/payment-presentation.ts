// Keep legacy transaction values intact; use customer-facing labels at display boundaries.
export function paymentStatusLabel(status: string): string {
  return status === "REFUNDED" ? "Returned payment" : status;
}

// Choose report fields suitable for display so internal payment details stay out of the table.
export function visibleReportEntries(row: Record<string, unknown>): [string, unknown][] {
  return Object.entries(row).filter(([key]) => !/^refund/i.test(key));
}
