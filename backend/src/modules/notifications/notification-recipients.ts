/** Queue each supplied contact independently; provider availability is handled by the worker. */
export function notificationRecipients(customer: { email?: string | null; phone?: string | null }) {
  // Prepare a destination for each supplied contact so email and phone messages can be queued separately.
  const recipients: { channel: "EMAIL" | "SMS"; recipient: string }[] = [];
  if (customer.email?.trim()) recipients.push({ channel: "EMAIL", recipient: customer.email.trim() });
  if (customer.phone?.trim()) recipients.push({ channel: "SMS", recipient: customer.phone.trim() });
  return recipients;
}
