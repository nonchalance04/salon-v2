// Bring in the tools for the salon server so this file can work with the rest of the application.
import { createApp } from "./app/app.js";
import { createApiRouter } from "./app/routes.js";
import { prisma, disconnectDatabase } from "./database/prisma.js";
import { env } from "./config/env.js";
// Build the salon application and start listening so browsers can send requests to the server.
const app = createApp(createApiRouter(prisma, env));
const server = app.listen(env.PORT, env.HOST, () => {
    console.info(JSON.stringify({ level: "info", event: "server_started", port: env.PORT }));
});
// Report startup failures so the hosting process can recognize that the server did not start.
server.on("error", () => {
    console.error(JSON.stringify({ level: "error", event: "server_start_failed" }));
    process.exitCode = 1;
});
// Stop accepting requests and close the database so the server can shut down safely.
function shutdown() {
    const timeout = setTimeout(() => process.exit(1), 10_000);
    timeout.unref();
    server.close(async (error) => {
        try {
            await disconnectDatabase();
            process.exitCode = error ? 1 : 0;
        }
        catch {
            process.exitCode = 1;
        }
        finally {
            clearTimeout(timeout);
        }
    });
}
// Listen for shutdown requests so the server can close through its cleanup routine.
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
//# sourceMappingURL=server.js.map