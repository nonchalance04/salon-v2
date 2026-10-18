/** Queue each supplied contact independently; provider availability is handled by the worker. */
export function notificationRecipients(customer) {
    const recipients = [];
    if (customer.email?.trim())
        recipients.push({ channel: "EMAIL", recipient: customer.email.trim() });
    if (customer.phone?.trim())
        recipients.push({ channel: "SMS", recipient: customer.phone.trim() });
    return recipients;
}
//# sourceMappingURL=notification-recipients.js.map