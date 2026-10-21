// Describe the information used by receipt details so different parts of the application agree on its contents.
export type Receipt = { receiptNumber: string; receiptSnapshot: Record<string, unknown> };
