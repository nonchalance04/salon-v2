import { createGmailProvider } from "./gmail-provider.js";
import { createTextBeeProvider, createTestNotificationProvider } from "./notification-provider.js";
export function configuredNotificationProviders(env) {
    const providers = {};
    // Test delivery logs only the queue identity and channel, never message/contact data.
    const test = createTestNotificationProvider(message => console.info(JSON.stringify({ event: "notification_test_accepted", id: message.id, channel: message.channel })));
    if (env.NODE_ENV === "production" && (env.NOTIFICATION_EMAIL_PROVIDER === "test" || env.NOTIFICATION_SMS_PROVIDER === "test"))
        throw new Error("Test notifications are unavailable in production.");
    if (env.NOTIFICATION_EMAIL_PROVIDER === "test")
        providers.EMAIL = test;
    if (env.NOTIFICATION_SMS_PROVIDER === "test")
        providers.SMS = test;
    if (env.NOTIFICATION_EMAIL_PROVIDER === "gmail")
        providers.EMAIL = createGmailProvider(env.GMAIL_USER, env.GMAIL_APP_PASSWORD, env.NOTIFICATION_EMAIL_FROM, env.NOTIFICATION_TIMEOUT_MS);
    if (env.NOTIFICATION_SMS_PROVIDER === "textbee")
        providers.SMS = createTextBeeProvider(env.TEXTBEE_API_KEY, env.TEXTBEE_DEVICE_ID);
    return providers;
}
//# sourceMappingURL=provider-config.js.map