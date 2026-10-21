import assert from "node:assert/strict";
import { test } from "node:test";
import { confirmationSms, suppressRoutineSms } from "../src/modules/notifications/minimal-sms.js";
import { parseEnv } from "../src/config/env.schema.js";
import { singleSegmentSms } from "../src/modules/notifications/sms-format.js";
test("confirmation fits one GSM-7 segment with local time range and reference", () => {
  const message = confirmationSms({ id: "queue-id", recipient: "09171234567" }, {
    startAt: new Date("2026-10-21T23:00:00Z"), endAt: new Date("2026-10-22T01:00:00Z"),
    bookingCode: "BOOK-123", customer: { firstName: "María", lastName: "Santos" },
  }, "Asia/Manila");
  assert.equal(message.text, "Clique Salon BOOK-123\nConfirmed; fee paid.\n2026-10-22 07:00-09:00\nArrive on time. T&C: contact salon.");
  assert.ok(message.text.length <= 160);
  assert.match(message.text, /^[\x20-\x7e\n]+$/);
  assert.equal(message.recipient, "+639171234567");
  assert.doesNotMatch(message.text, /https?:|Private link|#/);
});
test("long references retain the entire reference and schedule within one segment", () => {
  const bookingCode = "B".repeat(100);
  const message = confirmationSms({ id: "id", recipient: "09171234567" }, {
    startAt: new Date("2026-10-21T16:00:00Z"), endAt: new Date("2026-10-21T17:00:00Z"),
    bookingCode, customer: { firstName: "長い名前", lastName: "Santos" },
  }, "Asia/Manila");
  assert.ok(message.text.includes(bookingCode));
  assert.ok(message.text.includes("2026-10-22 00:00-01:00"));
  assert.ok(message.text.includes("Confirmed; fee paid."));
  assert.ok(message.text.length <= 160);
  assert.match(message.text, /^[\x20-\x7e\n]+$/);
});
test("SMS guard rejects Unicode, GSM extension characters, and oversized bodies without truncation", () => {
  for (const body of ["Time – now", "Hello 😀", "^".repeat(81), "a".repeat(161)]) {
    assert.throws(() => singleSegmentSms("BOOK-123", body), /SMS_SEGMENT_LIMIT/);
  }
});
test("minimal policy suppresses routine SMS while keeping changes, exceptions and email", () => {
  for (const eventType of ["PAYMENT_RECEIVED", "APPOINTMENT_COMPLETED", "APPOINTMENT_REMINDER"] as const) {
    assert.equal(suppressRoutineSms({ channel: "SMS", eventType, payload: {} }), true);
    assert.equal(suppressRoutineSms({ channel: "EMAIL", eventType, payload: {} }), false);
  }
  for (const eventType of ["BOOKING_CONFIRMED", "BOOKING_CANCELLED", "BOOKING_RESCHEDULED"] as const) assert.equal(suppressRoutineSms({ channel: "SMS", eventType, payload: {} }), false);
  assert.equal(suppressRoutineSms({ channel: "SMS", eventType: "PAYMENT_RECEIVED", payload: { reconciliationRequired: true } }), false);
});
test("public link origins must be trusted, without credentials, paths or query parameters", () => {
  const base = { DATABASE_URL: "postgresql://localhost/test", JWT_SECRET: "s".repeat(32), TRUSTED_ORIGINS: "https://salon.example.com" };
  assert.equal(parseEnv(base).NOTIFICATION_SMS_POLICY, "minimal");
  assert.equal(parseEnv({ ...base, PUBLIC_SITE_URL: "https://salon.example.com" }).PUBLIC_SITE_URL, "https://salon.example.com");
  for (const url of ["https://attacker.test", "https://secret@salon.example.com", "https://salon.example.com/path", "https://salon.example.com?key=value"]) assert.throws(() => parseEnv({ ...base, PUBLIC_SITE_URL: url }));
});
