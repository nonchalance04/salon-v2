import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import type { PrismaClient } from "../generated/prisma/client.js";
import { createApp } from "../src/app/app.js";
import { parseEnv } from "../src/config/env.schema.js";
import { createTokenService } from "../src/modules/auth/auth.token.js";
import { createConfigurationRouter } from "../src/modules/configuration/configuration.routes.js";
import { staffPublicProfileSchema } from "../src/modules/configuration/configuration.schema.js";
import { createPortfolioImagesService, imageExtension, MAX_PORTFOLIO_IMAGE_BYTES } from "../src/modules/configuration/portfolio-images.service.js";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX1sAAAAASUVORK5CYII=", "base64");
const actorId = "10000000-0000-4000-8000-000000000001";
const staffId = "10000000-0000-4000-8000-000000000002";

test("portfolio images reject mismatched, unsupported, empty and oversized uploads", () => {
  assert.equal(imageExtension(png, "image/png"), "png");
  for (const [body, type] of [[png, "image/jpeg"], [Buffer.from("<svg></svg>"), "image/svg+xml"], [Buffer.from("not an image"), "image/png"], [Buffer.alloc(0), "image/png"]] as const) {
    assert.throws(() => imageExtension(body, type));
  }
  assert.throws(() => imageExtension(Buffer.alloc(MAX_PORTFOLIO_IMAGE_BYTES + 1), "image/png"), { status: 413 });
  const profile = { title: "Stylist", bio: "", languages: [], photoUrl: null, reviews: [] };
  const imageUrl = `/api/media/staff-portfolio/${actorId}.png`;
  assert.equal(staffPublicProfileSchema.safeParse({ ...profile, portfolio: [{ title: "Work", imageUrl, caption: "" }] }).success, true);
  for (const bad of ["/api/media/staff-portfolio/../secret", "//evil.test/image.png", "data:image/png;base64,abc", "/api/media/staff-portfolio/test.svg"]) {
    assert.equal(staffPublicProfileSchema.safeParse({ ...profile, portfolio: [{ title: "Work", imageUrl: bad, caption: "" }] }).success, false);
  }
});

test("portfolio upload enforces admin, origin, size and image validation; saved images are public and immutable", async () => {
  const directory = await mkdtemp(join(tmpdir(), "salon-portfolio-test-"));
  let role = "ADMIN"; let active = true; let staffExists = true;
  const prisma = {
    user: { findUnique: async () => ({ id: actorId, isActive: active, role, sessionVersion: 0 }) },
    staff: { findUnique: async () => staffExists ? { id: staffId } : null },
  } as unknown as PrismaClient;
  const config = parseEnv({ NODE_ENV: "test", DATABASE_URL: "postgresql://localhost/test", JWT_SECRET: "p".repeat(32), STAFF_PORTFOLIO_UPLOAD_DIR: directory });
  const cookie = `salon_session=${await createTokenService(config.JWT_SECRET).sign({ userId: actorId, role: "ADMIN" })}`;
  const server = createApp(createConfigurationRouter(prisma, config)).listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const endpoint = `${base}/api/configuration/staff/${staffId}/portfolio-images`;
  const upload = (headers = {}, body: Buffer = png) => fetch(endpoint, { method: "POST", headers: { Origin: "http://localhost:5173", Cookie: cookie, "Content-Type": "image/png", ...headers }, body: new Uint8Array(body) });
  try {
    assert.equal((await upload({ Cookie: "" })).status, 401);
    assert.equal((await upload({ Origin: "https://evil.test" })).status, 403);
    role = "CASHIER"; assert.equal((await upload()).status, 403); role = "ADMIN";
    active = false; assert.equal((await upload()).status, 401); active = true;
    staffExists = false; assert.equal((await upload()).status, 404); staffExists = true;
    assert.equal((await upload({}, Buffer.from("<html>fake image</html>"))).status, 415);
    assert.equal((await upload({}, Buffer.alloc(MAX_PORTFOLIO_IMAGE_BYTES + 1))).status, 413);
    assert.equal((await upload({ "Content-Type": "image/svg+xml" })).status, 400);
    assert.deepEqual(await readdir(directory), []);
    const responses = await Promise.all([upload(), upload()]);
    assert.ok(responses.every(response => response.status === 201));
    const files = await Promise.all(responses.map(response => response.json() as Promise<{ imageUrl: string }>));
    assert.notEqual(files[0]!.imageUrl, files[1]!.imageUrl);
    const image = await fetch(`${base}${files[0]!.imageUrl}`);
    assert.equal(image.status, 200); assert.equal(image.headers.get("content-type"), "image/png");
    assert.equal(image.headers.get("x-content-type-options"), "nosniff");
    assert.match(image.headers.get("cache-control")!, /immutable/);
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
    const storage = createPortfolioImagesService(prisma, directory);
    await assert.rejects(storage.read("../secret.png"), { status: 404 });
    await assert.rejects(storage.read(`${staffId}.png`), { status: 404 });
  } finally {
    await new Promise<void>(done => server.close(() => done()));
    assert.ok(resolve(directory).startsWith(resolve(tmpdir(), "salon-portfolio-test-")));
    await rm(directory, { recursive: true, force: true });
  }
});
