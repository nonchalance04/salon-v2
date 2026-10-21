// Bring in the tools for database access so this file can work with the rest of the application.
import { PrismaPg } from "@prisma/adapter-pg";
import { createDatabasePool } from "./pool.js";

import { PrismaClient } from "../../generated/prisma/client.js"
import { env } from "../config/env.js";

// Connect the database tools to the shared connection pool so server features can read and save salon records.
const pool = createDatabasePool(env.DATABASE_URL);

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
    adapter,
});

// Close database connections so the application can stop cleanly.
export async function disconnectDatabase() {
  await prisma.$disconnect();
  await pool.end();
}
