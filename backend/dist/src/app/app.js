import express from "express";
import { errorHandler, notFound, requestContext } from "../shared/http.js";
export function createApp(routes) {
    const app = express();
    app.disable("x-powered-by");
    app.use(requestContext);
    app.use(express.json({ limit: "100kb", verify: (req, _res, buffer) => {
            req.rawBody = Buffer.from(buffer);
        } }));
    app.get("/api/health", (_req, res) => {
        res.json({ status: "ok", message: "Salon backend is running." });
    });
    if (routes)
        app.use("/api", routes);
    app.use(notFound);
    app.use(errorHandler);
    return app;
}
export const app = createApp();
//# sourceMappingURL=app.js.map