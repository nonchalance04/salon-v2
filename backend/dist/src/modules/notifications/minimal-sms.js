import { smsRecipient } from "./notification-provider.js";
import { singleSegmentSms, smsSchedule } from "./sms-format.js";
// Decide which routine text messages to omit so SMS follows the configured notification approach.
export function suppressRoutineSms(row) {
    if (row.channel !== "SMS")
        return false;
    if (row.eventType === "APPOINTMENT_REMINDER" || row.eventType === "APPOINTMENT_COMPLETED")
        return true;
    // Financial exceptions still need a separate notice; they must never claim confirmation.
    return row.eventType === "PAYMENT_RECEIVED" && !(row.payload && typeof row.payload === "object" && !Array.isArray(row.payload) && row.payload.reconciliationRequired === true);
}
// Compose a short booking confirmation so the customer receives the key visit details by text.
export function confirmationSms(row, appointment, timeZone) {
    const details = `Confirmed; fee paid.\n${smsSchedule(appointment.startAt, timeZone, appointment.endAt)}`;
    const text = singleSegmentSms(appointment.bookingCode, `${details}\nArrive on time. T&C: contact salon.`, details);
    return { id: row.id, channel: "SMS", recipient: smsRecipient(row.recipient), subject: "Payment received and booking confirmed", text };
}
//# sourceMappingURL=minimal-sms.js.map