import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { Client } from "pg";

const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl) throw new Error("TEST_DATABASE_ADMIN_URL is required.");
const migration = await readFile(new URL("../../prisma/migrations/20261019100000_independent_staff_usernames/migration.sql", import.meta.url), "utf8");

async function fixture(run: (client: Client) => Promise<void>) {
  const name = `salon_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  let client: Client | undefined;
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
    const url = new URL(adminUrl!); url.pathname = `/${name}`;
    client = new Client({ connectionString: url.toString() }); await client.connect();
    await client.query('CREATE TABLE "User" (id UUID PRIMARY KEY, email TEXT UNIQUE NOT NULL, "passwordHash" TEXT NOT NULL)');
    await run(client);
  } finally {
    await client?.end();
    await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
    await admin.end();
  }
}

test("username migration preserves existing IDs, emails, password hashes and login names", async () => {
  await fixture(async client => {
    const id = randomUUID();
    await client.query('INSERT INTO "User" VALUES ($1, $2, $3)', [id, "Front_Desk%Check@example.test", "existing-hash"]);
    await client.query(migration);
    const row = (await client.query('SELECT * FROM "User"')).rows[0];
    assert.deepEqual(row, { id, email: "Front_Desk%Check@example.test", passwordHash: "existing-hash", username: "front_desk%check" });
    await assert.rejects(client.query('INSERT INTO "User" VALUES ($1, $2, $3, $4)', [randomUUID(), "other@example.test", "hash", row.username]), { code: "23505" });
  });
});

test("ambiguous legacy usernames abort migration without partial schema changes or data loss", async () => {
  await fixture(async client => {
    await client.query('INSERT INTO "User" VALUES ($1, $2, $3), ($4, $5, $6)', [randomUUID(), "Admin@first.test", "first-hash", randomUUID(), "admin@second.test", "second-hash"]);
    await assert.rejects(client.query(migration), /Duplicate legacy usernames: admin/);
    await client.query("ROLLBACK");
    assert.equal((await client.query('SELECT * FROM "User"')).rowCount, 2);
    assert.equal((await client.query("SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'username'")).rowCount, 0);
  });
});
