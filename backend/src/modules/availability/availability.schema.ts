// Bring in the tools for available booking times so this file can work with the rest of the application.
import { z } from "zod";
// Define the accepted available booking times details so unexpected or incomplete input can be rejected.
export const availabilitySchema = z.object({
  date: z.iso.date(),
  services: z.array(z.discriminatedUnion("assignmentMode", [
    z.object({ serviceId: z.uuid(), assignmentMode: z.literal("ANY_AVAILABLE") }).strict(),
    z.object({ serviceId: z.uuid(), assignmentMode: z.literal("SPECIFIC"), staffId: z.uuid() }).strict(),
  ])).min(1).max(20),
  startAt: z.iso.datetime({ offset: true }).optional(),
}).strict();
// Describe the information used by available booking times so different parts of the application agree on its contents.
export type AvailabilityInput = z.infer<typeof availabilitySchema>;

// Define the accepted available booking times details so unexpected or incomplete input can be rejected.
export const calendarAvailabilitySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  services: availabilitySchema.shape.services,
}).strict();
// Describe the information used by available booking times so different parts of the application agree on its contents.
export type CalendarAvailabilityInput = z.infer<typeof calendarAvailabilitySchema>;
