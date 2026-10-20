import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSeedCredentials } from "../prisma/seed-credentials.js";

const valid = {
  SEED_ADMIN_USERNAME: "admin", SEED_CASHIER_USERNAME: "cashier",
  SEED_ADMIN_EMAIL: "admin@example.test", SEED_CASHIER_EMAIL: "cashier@example.test",
  SEED_ADMIN_PASSWORD: "test-admin-password", SEED_CASHIER_PASSWORD: "test-cashier-password",
};

test("seed rejects duplicate normalized emails before database writes", () => {
  assert.throws(() => parseSeedCredentials({ ...valid, SEED_CASHIER_EMAIL: " ADMIN@example.test " }),
    /SEED_ADMIN_EMAIL and SEED_CASHIER_EMAIL must be different/);
});

test("seed validates identities and required credentials without exposing passwords", () => {
  for (const [key, value] of [
    ["SEED_ADMIN_EMAIL", "invalid"], ["SEED_CASHIER_EMAIL", ""],
    ["SEED_ADMIN_PASSWORD", ""], ["SEED_CASHIER_PASSWORD", " "],
    ["SEED_ADMIN_USERNAME", "invalid@name"],
  ]) {
    assert.throws(() => parseSeedCredentials({ ...valid, [key!]: value }), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.ok(error.message.startsWith(key!));
      assert.ok(!error.message.includes(valid.SEED_ADMIN_PASSWORD));
      assert.ok(!error.message.includes(valid.SEED_CASHIER_PASSWORD));
      return true;
    });
  }
  assert.throws(() => parseSeedCredentials({ ...valid, SEED_CASHIER_USERNAME: " ADMIN " }), /usernames must be distinct/);
});

test("seed normalizes identities and preserves existing seed password handling", () => {
  const parsed = parseSeedCredentials({ ...valid, SEED_ADMIN_USERNAME: " ADMIN ",
    SEED_ADMIN_EMAIL: " ADMIN@example.test ", SEED_ADMIN_PASSWORD: " password with spaces " });
  assert.equal(parsed.adminUsername, "admin");
  assert.equal(parsed.adminEmail, "admin@example.test");
  assert.equal(parsed.adminPassword, "password with spaces");
});
