/** Customer-approved notification wording, shared by email and SMS. */
export const notificationTerms = {
    heading: "Terms & Conditions (T&C)",
    items: [
        "Customers may cancel or reschedule their appointments at least one (1) day before the scheduled appointment.",
        "All appointment cancellations and rescheduling requests must be made through our official website",
        "The appointment fee is non-refundable for cancelled appointments. Once an appointment is cancelled, the fee will not be returned to the customer.",
        "Customers who reschedule their appointments are not required to pay an additional appointment fee. The original appointment fee will be carried over to the rescheduled booking and may only be used once.",
        "Customers are expected to arrive on time for their scheduled appointments. Late arrivals may affect the salon's schedule and the appointments of other customers. Depending on staff availability and the delay, the salon reserves the right to shorten the service, reschedule the appointment, or consider the booking a missed appointment.",
        'Customers are expected to arrive on time for their scheduled appointments. A grace period of fifteen (15) minutes will be provided from the scheduled appointment time. If a customer fails to arrive within the grace period, the appointment will automatically be marked as a "No Show." Late arrivals may affect the salon\'s schedule and the appointments of other customers. Depending on staff availability and the length of the delay, the salon reserves the right to shorten the service, reschedule the appointment, or consider the booking a missed appointment.',
    ],
};
export const notificationTermsText = `${notificationTerms.heading}\n\n${notificationTerms.items
    .map((item, index) => `${index + 1}. ${item}`)
    .join("\n\n")}`;
//# sourceMappingURL=terms-and-conditions.js.map