import assert from "node:assert/strict";
import { test } from "node:test";
import { renderEmailLayout } from "../src/modules/notifications/email-layout.js";
import { renderSimpleEmailLayout } from "../src/modules/notifications/simple-email-layout.js";
import { renderNotification } from "../src/modules/notifications/templates.js";
import { notificationTermsText } from "../src/modules/notifications/terms-and-conditions.js";

test("confirmation emails link to appointment management in HTML and plain text", () => {
  const row = { id: "id", recipient: "guest@example.test", channel: "EMAIL" as const,
    eventType: "BOOKING_CONFIRMED" as const, payload: { schemaVersion: 1, bookingCode: "BOOK-123", appointmentFeePaid: true } };
  const message = renderNotification(row, "Asia/Manila", "https://salon.example.com/");
  assert.match(message.html!, /href="https:\/\/salon.example.com\/appointment"[^>]*>Your Appointment<\/a>/);
  assert.match(message.html!, /View and manage your appointment details/);
  assert.match(message.text, /Your Appointment: https:\/\/salon.example.com\/appointment/);
  assert.match(message.text, /Verify your email or phone number/);
  assert.match(message.text, /appointment fee has been received/);
  const generic = renderNotification({ ...row, payload: { schemaVersion: 1, bookingCode: "BOOK-123" } }, "Asia/Manila", "https://salon.example.com");
  assert.match(generic.html!, />Your Appointment<\/a>/);
  assert.ok(!renderNotification(row, "Asia/Manila").html!.includes('href='));
  const cancelled = renderNotification({ ...row, eventType: "BOOKING_CANCELLED" }, "Asia/Manila", "https://salon.example.com");
  assert.ok(!cancelled.html!.includes('href='));
  const sms = renderNotification({ ...row, channel: "SMS", recipient: "09171234567" }, "Asia/Manila", "https://salon.example.com");
  assert.ok(!sms.text.includes("https://"));
});

test("email layout escapes dynamic content including titles, details and codes", () => {
  const unsafe = '<script>alert("test")</script>&';
  for (const render of [renderEmailLayout, renderSimpleEmailLayout]) {
    const html = render({ title: unsafe, text: unsafe, bookingCode: unsafe, when: unsafe, verificationCode: unsafe });
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;&amp;"));
  }
});

test("all notification events receive HTML without exposing private payload fields", () => {
  const base = { id: "id", recipient: "guest@example.test", channel: "EMAIL" as const,
    payload: { schemaVersion: 1, bookingCode: "BOOK-123", startAt: "2026-10-12T01:00:00.000Z", rescheduleCount: 0, guestAccessToken: "private-token", paymentId: "private-payment" } };
  for (const eventType of ["BOOKING_CONFIRMED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED", "NO_SHOW_RECOVERY_CREATED", "PAYMENT_RECEIVED", "APPOINTMENT_COMPLETED", "APPOINTMENT_REMINDER"] as const) {
    const message = renderNotification({ ...base, eventType }, "Asia/Manila");
    assert.ok(message.html?.includes("BOOK-123"));
    assert.ok(message.html?.includes("9:00 AM (Asia/Manila)"));
    assert.ok(!message.html?.includes("private-"));
    assert.ok(message.text.endsWith(notificationTermsText));
    assert.match(message.html!, /Terms &amp; Conditions \(T&amp;C\)/);
    assert.equal((message.html!.match(/<li /g) ?? []).length, 6);
    assert.match(message.html!, /one \(1\) day before/);
    assert.match(message.html!, /All appointment cancellations and rescheduling requests must be made through our official website/);
    assert.match(message.html!, /fee is non-refundable/);
    assert.match(message.html!, /may only be used once/);
    assert.match(message.html!, /grace period of fifteen \(15\) minutes/);
    assert.match(message.html!, /&quot;No Show\.&quot;/);
    const sms = renderNotification({ ...base, channel: "SMS", recipient: "09171234567", eventType }, "Asia/Manila");
    assert.equal(sms.html, undefined);
    assert.ok(!sms.text.includes(notificationTermsText));
    assert.ok(sms.text.length <= 160);
    assert.match(sms.text, /^[\x20-\x7e\n]+$/);
    assert.doesNotMatch(sms.text, /https?:|salonappointment\.com/);
    const longest = renderNotification({ ...base, channel: "SMS", recipient: "09171234567", eventType,
      payload: { ...base.payload, bookingCode: "B".repeat(100), appointmentStatus: "PENDING_PAYMENT", reconciliationRequired: true, completionType: "NO_SERVICE_CLOSURE" },
    }, "Asia/Manila", "https://salon.example.com");
    assert.ok(longest.text.length <= 160, eventType);
    assert.ok(longest.text.includes("B".repeat(100)));
    if (eventType === "PAYMENT_RECEIVED") assert.match(longest.text, /Booking not confirmed/);
    if (eventType === "NO_SHOW_RECOVERY_CREATED") assert.match(longest.text, /Fee payment required/);
  }
});

test("terms are escaped in HTML and excluded from verification emails", () => {
  const html = renderSimpleEmailLayout({ title: "Appointment update", text: "Details", terms: {
    heading: "T&C <script>", items: ['<img src=x onerror="alert(1)">'],
  } });
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"));
  const verification = renderSimpleEmailLayout({ title: "Verification", text: "Your code", verificationCode: "123456" });
  assert.ok(!verification.includes("Terms &amp; Conditions"));
});

test("payment review and no-service closure notices remain visible in HTML", () => {
  const base = { id: "id", recipient: "guest@example.test", channel: "EMAIL" as const };
  const payment = renderNotification({ ...base, eventType: "PAYMENT_RECEIVED", payload: {
    schemaVersion: 1, bookingCode: "BOOK-123", reconciliationRequired: true,
  } }, "Asia/Manila");
  assert.match(payment.html!, /does not confirm a reservation/);
  const completed = renderNotification({ ...base, eventType: "APPOINTMENT_COMPLETED", payload: {
    schemaVersion: 1, bookingCode: "BOOK-123", completionType: "NO_SERVICE_CLOSURE",
  } }, "Asia/Manila");
  assert.match(completed.html!, /No service payment was collected/);
});
