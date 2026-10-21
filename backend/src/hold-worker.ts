// Bring in the tools for the salon server so this file can work with the rest of the application.
import { createAppointmentChangesService } from "./modules/appointments/appointment-changes.service.js";
import { pruneAppointmentAccess } from "./modules/appointments/appointment-otp.service.js";
import { prisma, disconnectDatabase } from "./database/prisma.js";
import { env } from "./config/env.js";
import { createAppointmentsService } from "./modules/appointments/appointments.service.js";
import { createPaymentsService } from "./modules/payments/payments.service.js";
import { configuredPaymentProvider } from "./modules/payments/provider-config.js";
// Prepare the background services and their running state so pending work can be processed and stopped cleanly.
const service = createAppointmentsService(prisma, env.SALON_TIMEZONE);
const payments = createPaymentsService(prisma, configuredPaymentProvider(env), env.SALON_TIMEZONE);
const changes = createAppointmentChangesService(prisma, env.SALON_TIMEZONE);
let stopping = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let running: Promise<void> | undefined;
let nextAccessCleanup = 0;
// Run the next batch of background work so pending tasks keep moving without a customer request.
async function tick() {
  // Periodically remove expired customer access records so old codes and sessions do not accumulate.
  if (Date.now() >= nextAccessCleanup) {
    nextAccessCleanup = Date.now() + 3600000;
    try { await pruneAppointmentAccess(prisma); }
    catch { console.error(JSON.stringify({ level: "error", event: "appointment_access_cleanup_failed" })); }
  }
  // Release overdue unpaid reservations so unused appointment time can become available again.
  try { await service.expireHolds(); }
  catch { console.error(JSON.stringify({ level: "error", event: "hold_expiration_failed" })); }
  // Mark overdue arrivals under the booking rules so staff see an up-to-date visit status.
  try { await changes.markOverdueNoShows(); }
  catch { console.error(JSON.stringify({ level: "error", event: "automatic_no_show_failed" })); }
  // Check a pending provider payment so delayed payment results can be reconciled.
  try { await payments.synchronizeExpired(1); }
  catch { console.error(JSON.stringify({ level: "error", event: "payment_cleanup_failed" })); }
  // Schedule the next pass unless shutdown has started so the worker keeps checking regularly.
  if (!stopping) timer = setTimeout(startTick, 5000);
}
// Schedule background work and track its progress so the worker can finish cleanly when stopped.
function startTick() { running = tick(); }
// Stop scheduling more work and wait for the current batch so shutdown does not interrupt it.
async function stop() {
  if (stopping) return;
  stopping = true; clearTimeout(timer);
  const timeout = setTimeout(() => process.exit(1), 25_000); timeout.unref();
  try { await running; await disconnectDatabase(); }
  catch { process.exitCode = 1; }
  finally { clearTimeout(timeout); }
}
// Connect shutdown signals to cleanup so background work can finish before the process exits.
process.once("SIGTERM", () => { void stop(); });
process.once("SIGINT", () => { void stop(); });
// Start the first background pass so pending salon work begins immediately.
startTick();
