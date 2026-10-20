import { email, username } from "../src/modules/auth/auth.schema.js";
import type { ZodType } from "zod";

export function parseSeedCredentials(env: NodeJS.ProcessEnv) {
  function read(name: string, schema: ZodType<string>) {
    const value = env[name];
    if (!value?.trim()) throw new Error(`${name} is required for database seeding.`);
    const result = schema.safeParse(value);
    if (!result.success) {
      throw new Error(`${name} is invalid: ${result.error.issues.map(issue => issue.message).join("; ")}`);
    }
    return result.data;
  }

  const adminUsername = read("SEED_ADMIN_USERNAME", username);
  const cashierUsername = read("SEED_CASHIER_USERNAME", username);
  const adminEmail = read("SEED_ADMIN_EMAIL", email);
  const cashierEmail = read("SEED_CASHIER_EMAIL", email);
  function readPassword(name: string) {
    const value = env[name]?.trim();
    if (!value) throw new Error(`${name} is required for database seeding.`);
    return value;
  }
  const adminPassword = readPassword("SEED_ADMIN_PASSWORD");
  const cashierPassword = readPassword("SEED_CASHIER_PASSWORD");
  if (adminUsername === cashierUsername) throw new Error("Seed usernames must be distinct.");
  if (adminEmail === cashierEmail) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_CASHIER_EMAIL must be different. User emails are unique.");
  }
  return { adminUsername, cashierUsername, adminEmail, cashierEmail, adminPassword, cashierPassword };
}
