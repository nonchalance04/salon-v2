// Keep the shared values for the appointment settings view together so later steps use the same definitions.
export const policyKeys = [
  "appointmentFeeAmount", "bookingHoldMinutes", "defaultBufferMinutes",
  "maxReschedules", "rescheduleCutoffHours", "cancellationCutoffHours",
  "noShowGraceHours", "advanceBookingDays", "minimumBookingLeadMinutes",
] as const;

// Describe the information used by the appointment settings view so different parts of the application agree on its contents.
export type PolicyKey = typeof policyKeys[number];
export type PolicyValues = Record<PolicyKey, string | number>;
export type PolicyRecord = PolicyValues & {
  id: string;
  version: number;
  effectiveFrom: string;
  [key: string]: unknown;
};

// Effective time, rather than version number or API ordering, controls activation.
export function policyTimeline(policies: PolicyRecord[], at: number) {
  const ordered = [...policies].sort((a, b) => Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom));
  const past = ordered.filter(policy => Date.parse(policy.effectiveFrom) <= at);
  return {
    current: past[0],
    scheduled: ordered.filter(policy => Date.parse(policy.effectiveFrom) > at).reverse(),
    history: past.slice(1),
  };
}

// Compare the booking rule values so unchanged settings can be recognized.
export function policyValuesEqual(left: PolicyValues, right: PolicyValues) {
  return policyKeys.every(key =>
    String(left[key]).trim() !== "" && String(right[key]).trim() !== "" &&
    Number.isFinite(Number(left[key])) && Number(left[key]) === Number(right[key]),
  );
}
