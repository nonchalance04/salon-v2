// Bring in the tools for server settings so this file can work with the rest of the application.
import "dotenv/config";
import { parseEnv } from "./env.schema.js";

// Read and check the server settings so startup uses a validated configuration.
export const env = parseEnv(process.env);
