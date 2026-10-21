// Bring in the tools for booking payments so this file can work with the rest of the application.
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ApiError } from "../../shared/http.js";
import { money } from "./payments.schema.js";
// Define the accepted booking payments details so unexpected or incomplete input can be rejected.
export const verifiedEventSchema = z.object({
    paymentId: z.uuid(), appointmentId: z.uuid(), reference: z.string().min(1).max(200),
    amount: money, currency: z.literal("PHP"), status: z.enum(["PENDING", "SUCCEEDED", "FAILED", "EXPIRED"]),
    paidAt: z.iso.datetime({ offset: true }).nullable(),
    checkoutReference: z.string().optional(),
    checkoutUrl: z.string().optional(),
    providerMethod: z.enum(["gcash", "qrph"]).optional(),
}).strict().refine(event => event.status !== "SUCCEEDED" || event.paidAt !== null);
// Provide signed test-payment results so the payment flow can be checked without a live checkout.
export class TestPaymentProvider {
    secret;
    name = "test";
    // function Object() { [native code] }
    constructor(secret, environment) {
        this.secret = secret;
        if (environment === "production" || secret.length < 32)
            throw new Error("Test payments are disabled in production and require a secret.");
    }
    // Create a test payment reference so development bookings can follow the payment flow.
    async createPayment(request) {
        return { reference: `test_${request.paymentId}`, checkoutUrl: null };
    }
    // Check the test-event signature and details so only an authenticated simulated result is accepted.
    async verifyPayment(rawBody, signature) {
        const expected = createHmac("sha256", this.secret).update(rawBody).digest();
        if (!signature || !/^[a-f0-9]{64}$/.test(signature) || !timingSafeEqual(expected, Buffer.from(signature, "hex"))) {
            throw new ApiError(401, "INVALID_PAYMENT_EVENT", "Payment event authentication failed.");
        }
        let data;
        try {
            data = JSON.parse(rawBody.toString("utf8"));
        }
        catch {
            throw new ApiError(400, "INVALID_PAYMENT_EVENT", "Invalid payment event.");
        }
        const result = verifiedEventSchema.safeParse(data);
        if (!result.success)
            throw new ApiError(400, "INVALID_PAYMENT_EVENT", "Invalid payment event.");
        return result.data;
    }
    // Require a signed test event so a test payment cannot be treated as verified from a lookup alone.
    async getPaymentStatus(_reference) {
        throw new ApiError(503, "TEST_EVENT_REQUIRED", "Use a signed test event or the development payment simulator.");
    }
    // Run the supported test-payment path so payment behavior can be exercised in the test setup.
    async simulate(request, outcome) {
        const event = { paymentId: request.paymentId, appointmentId: request.appointmentId,
            reference: `test_${request.paymentId}`, amount: request.amount, currency: "PHP", status: outcome,
            paidAt: outcome === "SUCCEEDED" ? new Date().toISOString() : null };
        const raw = Buffer.from(JSON.stringify(event));
        return this.verifyPayment(raw, createHmac("sha256", this.secret).update(raw).digest("hex"));
    }
}
//# sourceMappingURL=payment-provider.js.map