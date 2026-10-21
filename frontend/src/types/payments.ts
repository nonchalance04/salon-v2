// Describe the information used by payments details so different parts of the application agree on its contents.
export type FeePayment = { id: string; amount: string; status: string; method?: string; provider?: string; satisfiesObligation?: boolean; reconciliationStatus: string; receipt: { receiptNumber: string; receiptSnapshot?: Record<string, unknown> } | null };
