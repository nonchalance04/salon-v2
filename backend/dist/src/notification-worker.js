// Bring in the tools for the salon server so this file can work with the rest of the application.
import { notificationWorkerError } from "./modules/notifications/worker-error.js";
import { prisma, disconnectDatabase } from "./database/prisma.js";
import { env } from "./config/env.js";
import { configuredNotificationProviders } from "./modules/notifications/provider-config.js";
import { createNotificationsService } from "./modules/notifications/notifications.service.js";
// Prepare the background services and their running state so pending work can be processed and stopped cleanly.
const providers = configuredNotificationProviders(env);
const service = createNotificationsService(prisma, {
    smsPolicy: env.NOTIFICATION_SMS_POLICY, publicSiteUrl: env.PUBLIC_SITE_URL, bookingLinkSecret: env.JWT_SECRET,
    providers, timeZone: env.SALON_TIMEZONE, leaseMs: env.NOTIFICATION_LEASE_MS,
    timeoutMs: env.NOTIFICATION_TIMEOUT_MS, maxAttempts: env.NOTIFICATION_MAX_ATTEMPTS,
    retryBaseMs: env.NOTIFICATION_RETRY_BASE_MS, reminderHours: env.NOTIFICATION_REMINDER_HOURS,
});
let stopping = false;
let timer;
let running;
// Run the next batch of background work so pending tasks keep moving without a customer request.
async function tick() {
    try {
        await service.enqueueReminders();
    }
    catch (error) {
        console.error(JSON.stringify({ level: "error", event: "notification_reminder_scan_failed", ...notificationWorkerError(error) }));
    }
    try {
        for (let i = 0; i < 100 && !stopping; i++)
            if (!await service.processNext())
                break;
    }
    catch (error) {
        console.error(JSON.stringify({ level: "error", event: "notification_worker_failed", ...notificationWorkerError(error) }));
    }
    if (!stopping)
        timer = setTimeout(startTick, env.NOTIFICATION_POLL_MS);
}
// Schedule background work and track its progress so the worker can finish cleanly when stopped.
function startTick() { running = tick(); }
// Stop scheduling more work and wait for the current batch so shutdown does not interrupt it.
async function stop() {
    if (stopping)
        return;
    stopping = true;
    clearTimeout(timer);
    const timeout = setTimeout(() => process.exit(1), 25_000);
    timeout.unref();
    try {
        await running;
        await disconnectDatabase();
    }
    catch {
        process.exitCode = 1;
    }
    finally {
        clearTimeout(timeout);
    }
}
// Connect shutdown signals to cleanup so message delivery can finish before the process exits.
process.once("SIGTERM", () => { void stop(); });
process.once("SIGINT", () => { void stop(); });
console.info(JSON.stringify({ event: "notification_worker_started", enabledChannels: Object.keys(providers) }));
// Start the notification worker so queued customer messages can begin processing.
startTick();
//# sourceMappingURL=notification-worker.js.map