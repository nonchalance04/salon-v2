import assert from "node:assert/strict";
import { test } from "node:test";
import { SignJWT } from "jose";
import { createTokenService } from "../src/modules/auth/auth.token.js";
import { cookieOptions, sessionCookie } from "../src/modules/auth/auth.security.js";
import { createAccountSchema, updateAccountSchema, loginSchema } from "../src/modules/auth/auth.schema.js";
import bcrypt from "bcrypt";
import type { PrismaClient } from "../generated/prisma/client.js";
import { createAuthService } from "../src/modules/auth/auth.service.js";
import { parseEnv } from "../src/config/env.schema.js";

const secret = "test-secret-for-phase-two-at-least-32-characters";
const id = "10000000-0000-4000-8000-000000000001";
test("login accepts normalized usernames and rejects emails and empty credentials", () => {
  assert.deepEqual(loginSchema.parse({ body: { username: " Admin ", password: "secret" } }).body,
    { username: "admin", password: "secret" });
  for (const body of [
    { username: "admin@example.test", password: "secret" },
    { email: "admin@example.test", password: "secret" },
    { username: " ", password: "secret" },
    { username: "admin user", password: "secret" },
    { username: "admin", password: "" },
  ]) assert.equal(loginSchema.safeParse({ body }).success, false);
});

test("username login authenticates both roles and rejects missing, inactive, ambiguous or changed accounts", async () => {
  const passwordHash = await bcrypt.hash("test-password", 4);
  let candidates: unknown[] = [];
  let updates = 1;
  let expectedPrefix = "admin@";
  const prisma = { user: {
    findMany: async (args: unknown) => {
      assert.deepEqual(args, { where: { email: { startsWith: expectedPrefix, mode: "insensitive" } }, take: 2 });
      return candidates;
    },
    updateMany: async () => ({ count: updates }),
    findUnique: async () => candidates[0],
  } } as unknown as PrismaClient;
  const service = createAuthService(prisma);
  for (const role of ["ADMIN", "CASHIER"]) {
    candidates = [{ id, email: "admin@example.test", role, passwordHash, isActive: true }];
    assert.equal((await service.login(" Admin ", "test-password")).role, role);
    await assert.rejects(service.login("admin", "wrong"), { status: 401 });
  }
  candidates = [];
  await assert.rejects(service.login("admin", "test-password"), { status: 401 });
  candidates = [{ id, email: "admin@example.test", passwordHash, isActive: false }];
  await assert.rejects(service.login("admin", "test-password"), { status: 401 });
  candidates = [candidates[0], { email: "admin@another.test", passwordHash, isActive: true }];
  await assert.rejects(service.login("admin", "test-password"), { status: 401 });
  candidates = [{ id, email: "admin@example.test", passwordHash, isActive: true }];
  updates = 0;
  await assert.rejects(service.login("admin", "test-password"), { status: 401 });
  candidates = [];
  expectedPrefix = "front\\_desk\\%@";
  await assert.rejects(service.login("front_desk%", "test-password"), { status: 401 });
});
test("JWT validates signature, expiration, and all required claims", async () => {
  const tokens = createTokenService(secret);
  assert.deepEqual(await tokens.verify(await tokens.sign({ userId: id, role: "ADMIN" })), { userId: id, role: "ADMIN" });
  await assert.rejects(tokens.verify(await createTokenService("wrong-secret-that-is-also-32-characters").sign({ userId: id, role: "ADMIN" })));
  const key = new TextEncoder().encode(secret);
  for (const token of [
    await new SignJWT({ role: "ADMIN" }).setProtectedHeader({ alg: "HS256" }).setSubject(id).setIssuedAt().setExpirationTime("0s").sign(key),
    await new SignJWT({ role: "ADMIN" }).setProtectedHeader({ alg: "HS256" }).setSubject(id).setIssuedAt().sign(key),
    await new SignJWT({ role: "STYLIST" }).setProtectedHeader({ alg: "HS256" }).setSubject(id).setIssuedAt().setExpirationTime("8h").sign(key),
    await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(id).setIssuedAt().setExpirationTime("8h").sign(key),
  ]) await assert.rejects(tokens.verify(token));
});
test("production cookies and origin configuration fail closed", () => {
  const env = { DATABASE_URL: "postgresql://localhost/test", JWT_SECRET: secret };
  assert.throws(() => parseEnv({ ...env, NODE_ENV: "production" }));
  for (const origin of ["*", "null", "https://salon.example/path", "https://salon.example/"]) {
    assert.throws(() => parseEnv({ ...env, TRUSTED_ORIGINS: origin }));
  }
  const config = parseEnv({ ...env, NODE_ENV: "production", TRUSTED_ORIGINS: "https://salon.example", COOKIE_SAME_SITE: "none" });
  assert.deepEqual(cookieOptions(config), { httpOnly: true, secure: true, sameSite: "none", path: "/api" });
  assert.throws(() => parseEnv({ ...env, COOKIE_SAME_SITE: "none" }));
  assert.equal(sessionCookie("other=value; salon_session=abc.def"), "abc.def");
  assert.equal(sessionCookie("salon_session=a; salon_session=b"), undefined);
  assert.equal(sessionCookie("salon_session=%broken"), undefined);
});
test("account validation limits roles and bcrypt byte length, and PATCH has no implicit activation", () => {
  const body = { firstName: "Test", lastName: "Person", email: " TEST@EXAMPLE.COM ", password: "safe-test-password", role: "CASHIER" };
  assert.equal(createAccountSchema.parse({ body }).body.email, "test@example.com");
  assert.equal(createAccountSchema.parse({ body }).body.isActive, true);
  assert.equal(createAccountSchema.safeParse({ body: { ...body, role: "STYLIST" } }).success, false);
  assert.equal(createAccountSchema.safeParse({ body: { ...body, password: "é".repeat(37) } }).success, false);
  assert.deepEqual(updateAccountSchema.parse({ params: { id }, body: { firstName: "Edited" } }).body, { firstName: "Edited" });
  assert.equal(updateAccountSchema.safeParse({ params: { id }, body: { passwordHash: "injected" } }).success, false);
});
