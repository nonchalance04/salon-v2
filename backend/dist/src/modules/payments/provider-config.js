import { TestPaymentProvider } from "./payment-provider.js";
import { PayMongoProvider } from "./paymongo-provider.js";
export function configuredPaymentProvider(config) {
    if (config.PAYMENT_PROVIDER === "test")
        return new TestPaymentProvider(config.PAYMENT_TEST_SECRET ?? "", config.NODE_ENV);
    if (config.PAYMENT_PROVIDER === "paymongo")
        return new PayMongoProvider({ secretKey: config.PAYMONGO_SECRET_KEY, webhookSecret: config.PAYMONGO_WEBHOOK_SECRET, returnUrl: config.PAYMONGO_RETURN_URL, trustedOrigins: config.TRUSTED_ORIGINS });
    return undefined;
}
//# sourceMappingURL=provider-config.js.map