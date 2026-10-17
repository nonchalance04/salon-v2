// All future booking/confirmation/reschedule workflows must use this same key.
export const SALON_COORDINATION_KEY = 739_021;
export async function lockSalon(tx, mode) {
    if (mode === "exclusive")
        await tx.$queryRaw `SELECT pg_advisory_xact_lock(${SALON_COORDINATION_KEY})::text`;
    else
        await tx.$queryRaw `SELECT pg_advisory_xact_lock_shared(${SALON_COORDINATION_KEY})::text`;
}
export async function lockStaff(tx, staffIds) {
    for (const id of [...new Set(staffIds)].sort()) {
        await tx.$queryRaw `SELECT id FROM "Staff" WHERE id = ${id}::uuid FOR UPDATE`;
    }
}
export async function freshTime(tx) {
    // Read epoch milliseconds to avoid raw timestamptz deserialization depending
    // on the PostgreSQL session timezone in the Prisma pg adapter.
    const rows = await tx.$queryRaw `
    SELECT (extract(epoch FROM clock_timestamp()) * 1000)::double precision AS "epochMs"
  `;
    return new Date(rows[0].epochMs);
}
//# sourceMappingURL=coordination.js.map