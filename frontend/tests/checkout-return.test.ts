import assert from "node:assert/strict";
import { test } from "node:test";
import { checkCheckoutReturn } from "../src/components/CheckoutReturn/check-checkout-return.ts";
import type { Appointment } from "../src/types/booking.ts";

const appointment = (status = "PENDING_PAYMENT", paymentStatus = "PENDING") => ({
  bookingCode: "RETURN-TEST", status,
  payments: [{ id: "payment-1", provider: "paymongo", status: paymentStatus }],
}) as Appointment;

function transport(paymentStatus: string, booking: Appointment) {
  const calls: { path: string; body: Record<string, string> }[] = [];
  const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
    calls.push({ path, body: JSON.parse(String(options?.body)) });
    return (path === "/payments/status" ? { payment: { status: paymentStatus } } : { appointment: booking }) as T;
  };
  return { request, calls };
}

test("checkout return verifies payment then reloads the authoritative booking using the guest session", async () => {
  const confirmed = appointment("CONFIRMED", "SUCCEEDED");
  const { request, calls } = transport("SUCCEEDED", confirmed);
  const result = await checkCheckoutReturn(appointment(), "", request);
  assert.equal(result.appointment, confirmed);
  assert.equal(result.settled, true);
  assert.deepEqual(calls, [
    { path: "/payments/status", body: { bookingCode: "RETURN-TEST", token: "", paymentId: "payment-1" } },
    { path: "/appointments/access", body: { bookingCode: "RETURN-TEST", token: "" } },
  ]);
});

test("delayed verification keeps checking and never fabricates a confirmed booking", async () => {
  const pending = appointment();
  const { request } = transport("PENDING", pending);
  const result = await checkCheckoutReturn(pending, "private-token", request);
  assert.equal(result.appointment.status, "PENDING_PAYMENT");
  assert.equal(result.settled, false);
});

test("successful payment requiring reconciliation retains the backend's actual appointment status", async () => {
  const pending = appointment("PENDING_PAYMENT", "SUCCEEDED");
  const { request } = transport("SUCCEEDED", pending);
  const result = await checkCheckoutReturn(appointment(), "", request);
  assert.equal(result.settled, true);
  assert.equal(result.appointment.status, "PENDING_PAYMENT");
});

test("failed or cancelled checkout resolves to the actual booking without claiming confirmation", async () => {
  for (const status of ["FAILED", "CANCELLED", "EXPIRED"]) {
    const actual = appointment("PENDING_PAYMENT", status);
    const { request } = transport(status, actual);
    const result = await checkCheckoutReturn(appointment(), "", request);
    assert.equal(result.settled, true);
    assert.equal(result.appointment, actual);
  }
});

test("terminal bookings and bookings without a pending PayMongo payment need no provider check", async () => {
  for (const actual of [appointment("CONFIRMED"), appointment("EXPIRED"), { ...appointment(), payments: [] },
    { ...appointment(), payments: [{ ...appointment().payments[0]!, provider: "test" }] }]) {
    const { request, calls } = transport("PENDING", actual);
    const result = await checkCheckoutReturn(actual, "", request);
    assert.equal(result.settled, true);
    assert.equal(result.appointment, actual);
    assert.deepEqual(calls, []);
  }
});

test("checkout retries use the latest pending PayMongo payment and preserve private authorization", async () => {
  const booking = appointment();
  booking.payments.push({ ...booking.payments[0]!, id: "payment-2" });
  const { request, calls } = transport("PENDING", booking);
  await checkCheckoutReturn(booking, "private-token", request);
  assert.equal(calls[0]!.body.paymentId, "payment-2");
  assert.equal(calls[0]!.body.token, "private-token");
  assert.equal(calls[1]!.body.token, "private-token");
});

test("provider errors remain retryable and do not load or confirm a stale booking", async () => {
  const paths: string[] = [];
  await assert.rejects(checkCheckoutReturn(appointment(), "", async path => {
    paths.push(path);
    throw new Error("Network unavailable");
  }), /Network unavailable/);
  assert.deepEqual(paths, ["/payments/status"]);
});

test("leaving checkout verification aborts before a follow-up booking request", async () => {
  const controller = new AbortController();
  const paths: string[] = [];
  await assert.rejects(checkCheckoutReturn(appointment(), "", async <T>(path: string) => {
    paths.push(path);
    controller.abort();
    return { payment: { status: "SUCCEEDED" } } as T;
  }, controller.signal), { name: "AbortError" });
  assert.deepEqual(paths, ["/payments/status"]);
});
