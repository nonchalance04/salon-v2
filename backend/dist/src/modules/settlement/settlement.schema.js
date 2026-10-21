// Bring in the tools for visit settlement so this file can work with the rest of the application.
import { z } from "zod";
import { money } from "../payments/payments.schema.js";
// Define the accepted visit settlement details so unexpected or incomplete input can be rejected.
export const booking = z.object({ bookingCode: z.string().trim().min(1).max(100) }).strict();
export const revision = booking.extend({ revision: z.string().regex(/^[a-f0-9]{64}$/) });
export const outcomesSchema = revision.extend({ services: z.array(z.object({
        id: z.uuid(), outcome: z.enum(["PERFORMED", "NOT_PERFORMED"]),
    }).strict()).min(1).max(100) }).strict();
export const settlementSchema = revision.extend({ idempotencyKey: z.uuid(), amount: money,
    currency: z.literal("PHP"), method: z.enum(["CASH", "GCASH", "OTHER"]), externalReference: z.string().trim().min(1).max(120).optional(),
}).strict();
export const performerSchema = revision.extend({
    appointmentServiceId: z.uuid(), staffId: z.uuid(),
    reason: z.string().trim().min(1).max(500), customerAgreed: z.literal(true),
}).strict();
//# sourceMappingURL=settlement.schema.js.map