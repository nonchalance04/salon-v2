// Bring in the tools for salon scheduling so this file can work with the rest of the application.
import type { Prisma } from "../../../generated/prisma/client.js";

// All future booking/confirmation/reschedule workflows must use this same key.
export const SALON_COORDINATION_KEY = 739_021;
// Coordinate access to salon scheduling so settings changes and bookings cannot interfere.
export async function lockSalon(tx: Prisma.TransactionClient, mode: "shared" | "exclusive") {
  if (mode === "exclusive") await tx.$queryRaw`SELECT pg_advisory_xact_lock(${SALON_COORDINATION_KEY})::text`;
  else await tx.$queryRaw`SELECT pg_advisory_xact_lock_shared(${SALON_COORDINATION_KEY})::text`;
}
// Reserve staff records in a consistent order so competing booking changes can be coordinated.
export async function lockStaff(tx: Prisma.TransactionClient, staffIds: string[]) {
  for (const id of [...new Set(staffIds)].sort()) {
    await tx.$queryRaw`SELECT id FROM "Staff" WHERE id = ${id}::uuid FOR UPDATE`;
  }
}
// Read the current database time so deadline checks use a fresh shared clock.
export async function freshTime(tx: Prisma.TransactionClient): Promise<Date> {
  // Read epoch milliseconds to avoid raw timestamptz deserialization depending
  // on the PostgreSQL session timezone in the Prisma pg adapter.
  const rows = await tx.$queryRaw<{ epochMs: number }[]>`
    SELECT (extract(epoch FROM clock_timestamp()) * 1000)::double precision AS "epochMs"
  `;
  return new Date(rows[0]!.epochMs);
}
