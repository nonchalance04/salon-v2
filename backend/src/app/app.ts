// Bring in the tools for application setup so this file can work with the rest of the application.
import express from "express";
import { errorHandler, notFound, requestContext } from "../shared/http.js";

// Set up the web server and its shared request handling so every visit follows the same checks.
export function createApp(routes?: express.Router) {
  const app = express();
  // Set up shared request checks and reading submitted details so incoming requests follow the same preparation.
  app.disable("x-powered-by");
  app.use(requestContext);
  app.use(express.json({ limit: "100kb", verify: (req, _res, buffer) => {
    (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
  } }));
  // Offer a simple health check so hosting tools can confirm that the server is responding.
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", message: "Salon backend is running." });
  });
  // Attach the salon feature addresses so incoming requests reach their matching handlers.
  if (routes) app.use("/api", routes);
  // Handle unknown addresses and request failures last so every request has a clear response.
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

// Create the shared web application so other server files can use the same request setup.
export const app = createApp();
