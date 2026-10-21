// Bring in the tools for available booking times so this file can work with the rest of the application.
import { Router } from "express";
import { z } from "zod";
import type { PrismaClient } from "../../../generated/prisma/client.js";
import { validateRequest } from "../../shared/http.js";
import { availabilitySchema, calendarAvailabilitySchema } from "./availability.schema.js";
import { createAvailabilityService } from "./availability.service.js";
// Connect availability requests to validated searches so the booking screens can request suitable times.
export function createAvailabilityRouter(prisma: PrismaClient, timeZone: string) {
  const router = Router();
  const service = createAvailabilityService(prisma, timeZone);
  router.use("/availability", (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  router.get("/availability/staff", async (_req, res) => res.json(await service.catalog()));
  // Read-only search: POST carries the ordered service/staff plan; no writes.
  router.post("/availability/calendar", validateRequest(z.object({ body: calendarAvailabilitySchema })), async (_req, res) => {
    res.json(await service.calendar(res.locals.validated.body));
  });
  router.post("/availability", validateRequest(z.object({ body: availabilitySchema })), async (_req, res) => {
    res.json(await service.search(res.locals.validated.body));
  });
  return router;
}
