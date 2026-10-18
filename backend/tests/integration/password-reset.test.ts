import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { before, after, test } from "node:test";
import { Pool } from "pg";
import { createDatabasePool } from "../../src/database/pool.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import { PrismaClient } from "../../generated/prisma/client.js";
import { once } from "node:events";
import { createApp } from "../../src/app/app.js";
import { createAuthRouter } from "../../src/modules/auth/auth.routes.js";
import { parseEnv } from "../../src/config/env.schema.js";
import { createPasswordResetService, PASSWORD_RESET_NOTICE } from "../../src/modules/auth/password-reset.service.js";
import type { NotificationMessage } from "../../src/modules/notifications/notification-provider.js";

const messages = new Map<string, NotificationMessage>();
const provider = { async send(message: NotificationMessage) { messages.set(message.id, message); } };
const secret = "password-recovery-integration-secret-at-least-32";
const recovery = () => createPasswordResetService(prisma, secret, provider);
const codeFor = (id: string) => messages.get(id)!.text.match(/code is (\d{6})/)![1]!;
const newPassword = "replacement-password-123";
async function account(role: "ADMIN" | "CASHIER" = "CASHIER") {
  const username = `reset-${randomUUID()}`;
  const user = await prisma.user.create({ data: { username, email: `mail-${randomUUID()}@example.test`, firstName: "Reset", lastName: "Test", role, passwordHash: await bcrypt.hash("original-password", 4) } });
  return { ...user, username };
}
async function issue(username: string, ip = randomUUID()) {
  const service = recovery();
  const result = await service.request(username, ip);
  await service.deliver(result.delivery, true);
  return { id: result.challengeId, code: result.delivery ? codeFor(result.challengeId) : "000000" };
}

const run = promisify(execFile);
// Intentionally never load .env or fall back to DATABASE_URL.
const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl) throw new Error("TEST_DATABASE_ADMIN_URL is required; use a dedicated local/CI PostgreSQL server with CREATEDB permission.");
const databaseName = `salon_test_${randomUUID().replaceAll("-", "")}`;
const testUrl = new URL(adminUrl);
testUrl.pathname = `/${databaseName}`;
testUrl.searchParams.delete("schema");
const admin = new Pool({ connectionString: adminUrl });
const pool = createDatabasePool(testUrl.toString());
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
let created = false;
const fixtureEnv = {
  ...process.env, DATABASE_URL: testUrl.toString(), NODE_ENV: "test",
  SEED_ADMIN_USERNAME: "admin", SEED_ADMIN_EMAIL: "admin@example.test", SEED_ADMIN_PASSWORD: "test-admin-password",
  SEED_CASHIER_USERNAME: "cashier", SEED_CASHIER_EMAIL: "cashier@example.test", SEED_CASHIER_PASSWORD: "test-cashier-password",
};

async function cli(args: string[], env = fixtureEnv) {
  // Avoid leaking child-process environment or connection strings on failure.
  try {
    return await run(process.execPath, args, { env, timeout: 60_000 });
  } catch {
    throw new Error("Database fixture command failed. Run the documented migration/seed commands against a disposable database to diagnose.");
  }
}

before(async () => {
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  created = true;
  await cli(["node_modules/prisma/build/index.js", "migrate", "deploy", "--config", "prisma7.config.ts"]);
}, { timeout: 90_000 });

after(async () => {
  await prisma.$disconnect();
  await pool.end();
  try {
    // Only remove the uniquely named database created by this test invocation.
    if (created) await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
  } finally {
    await admin.end();
  }
});

test("both workspace roles recover through HTTP and existing sessions are revoked", async () => {
  const origin = "http://localhost:5173";
  const config = parseEnv({ DATABASE_URL: testUrl.toString(), JWT_SECRET: secret, NODE_ENV: "test", TRUSTED_ORIGINS: origin });
  const server = createApp(createAuthRouter(prisma, config, provider)).listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const request = (path: string, body?: unknown, cookie?: string, source = origin) => fetch(`http://127.0.0.1:${address.port}/api/auth/${path}`, {
    method: body ? "POST" : "GET", headers: { Origin: source, "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  try {
    for (const role of ["ADMIN", "CASHIER"] as const) {
      const user = await account(role);
      const login = await request("login", { username: user.username, password: "original-password" });
      assert.equal(login.status, 200);
      const oldCookie = login.headers.get("set-cookie")!.split(";")[0]!;
      const outgoing = await request("forgot-password", { username: user.username.toUpperCase() });
      assert.equal(outgoing.status, 200);
      const result = await outgoing.json();
      assert.equal(result.message, PASSWORD_RESET_NOTICE);
      assert.equal(result.code, undefined);
      assert.equal(result.delivery, undefined);
      assert.equal(messages.get(result.challengeId)!.recipient, user.email);
      const row = await prisma.passwordResetChallenge.findUniqueOrThrow({ where: { id: result.challengeId } });
      assert.notEqual(row.codeHash, codeFor(result.challengeId));
      const reset = { challengeId: result.challengeId, code: codeFor(result.challengeId), password: newPassword, confirmPassword: newPassword };
      assert.equal((await request("reset-password", reset, oldCookie, "https://evil.test")).status, 403);
      assert.equal((await request("reset-password", { ...reset, confirmPassword: "different-password" })).status, 400);
      const changed = await request("reset-password", reset, oldCookie);
      assert.equal(changed.status, 200);
      assert.match(changed.headers.get("set-cookie")!, /salon_session=;/);
      assert.equal((await request("me", undefined, oldCookie)).status, 401);
      assert.equal((await request("login", { username: user.username, password: "original-password" })).status, 401);
      const fresh = await request("login", { username: user.username, password: newPassword });
      assert.equal(fresh.status, 200);
      assert.equal((await fresh.json()).user.sessionVersion, undefined);
      const freshCookie = fresh.headers.get("set-cookie")!.split(";")[0]!;
      assert.equal((await request("me", undefined, freshCookie)).status, 200);
      assert.equal((await request("reset-password", reset)).status, 400);
    }
    const unknown = await request("forgot-password", { username: "unknown-account" });
    const result = await unknown.json();
    assert.equal(unknown.status, 200);
    assert.equal(result.message, PASSWORD_RESET_NOTICE);
    assert.equal(messages.has(result.challengeId), false);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test("codes expire, lock after five failures, and cannot reset changed or inactive accounts", async () => {
  for (const scenario of ["expired", "attempts", "deactivated", "password-change", "email-change", "username-change"] as const) {
    const user = await account(); const challenge = await issue(user.username);
    if (scenario === "expired") await prisma.passwordResetChallenge.update({ where: { id: challenge.id }, data: { expiresAt: new Date(0) } });
    if (scenario === "deactivated") await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    if (scenario === "password-change") await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash("admin-replaced-password", 4) } });
    if (scenario === "username-change") await prisma.user.update({ where: { id: user.id }, data: { username: `renamed-${randomUUID()}` } });
    if (scenario === "email-change") await prisma.user.update({ where: { id: user.id }, data: { email: `${randomUUID()}@example.test` } });
    if (scenario === "attempts") {
      const wrong = challenge.code === "000000" ? "111111" : "000000";
      for (let i = 0; i < 5; i++) await assert.rejects(recovery().reset(challenge.id, wrong, newPassword), { code: "INVALID_RESET_CODE" });
      assert.equal((await prisma.passwordResetChallenge.findUniqueOrThrow({ where: { id: challenge.id } })).attempts, 5);
    }
    await assert.rejects(recovery().reset(challenge.id, challenge.code, newPassword), { code: "INVALID_RESET_CODE" });
  }
});

test("resends replace earlier codes, concurrency permits only one reset, and cooldown is durable", async () => {
  const user = await account(); const first = await issue(user.username);
  await assert.rejects(recovery().request(user.username, randomUUID()), { code: "PASSWORD_RESET_LIMIT" });
  await prisma.passwordResetChallenge.update({ where: { id: first.id }, data: { createdAt: new Date(Date.now() - 61_000) } });
  const second = await issue(user.username);
  await assert.rejects(recovery().reset(first.id, first.code, newPassword), { code: "INVALID_RESET_CODE" });
  const outcomes = await Promise.allSettled([recovery().reset(second.id, second.code, newPassword), recovery().reset(second.id, second.code, "another-password-123")]);
  assert.equal(outcomes.filter(outcome => outcome.status === "fulfilled").length, 1);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).sessionVersion, 1);
});

test("unknown and inactive usernames receive no codes; provider failures invalidate codes", async () => {
  const inactive = await account();
  await prisma.user.update({ where: { id: inactive.id }, data: { isActive: false } });
  for (const name of ["missing-account", inactive.username]) {
    const result = await recovery().request(name, randomUUID());
    assert.equal(result.delivery, null);
  }
  const user = await account();
  const service = createPasswordResetService(prisma, secret, { async send() { throw new Error("private provider detail"); } });
  const result = await service.request(user.username, randomUUID());
  await service.deliver(result.delivery, true);
  assert.ok((await prisma.passwordResetChallenge.findUniqueOrThrow({ where: { id: result.challengeId } })).consumedAt);
  await assert.rejects(createPasswordResetService(prisma, secret).request(user.username, "test-ip"), { code: "PASSWORD_RESET_DISABLED" });
});

test("request limits are enforced for unknown usernames per identity and IP", async () => {
  const username = `missing-${randomUUID()}`;
  for (let i = 0; i < 3; i++) {
    const result = await recovery().request(username, randomUUID());
    await prisma.passwordResetChallenge.update({ where: { id: result.challengeId }, data: { createdAt: new Date(Date.now() - 61_000) } });
  }
  await assert.rejects(recovery().request(username, randomUUID()), { code: "PASSWORD_RESET_LIMIT" });
  const ip = randomUUID();
  for (let i = 0; i < 10; i++) await recovery().request(`missing-${randomUUID()}`, ip);
  await assert.rejects(recovery().request(`missing-${randomUUID()}`, ip), { code: "PASSWORD_RESET_LIMIT" });
});

