// Bring in the tools for booking payments so this file can work with the rest of the application.
import type { AuthConfig } from "../auth/auth.security.js";
import { TestPaymentProvider } from "./payment-provider.js";
import { PayMongoProvider } from "./paymongo-provider.js";
// Choose the configured payment provider so checkout follows the server setup.
export function configuredPaymentProvider(config: AuthConfig) {
  if (config.PAYMENT_PROVIDER === "test") return new TestPaymentProvider(config.PAYMENT_TEST_SECRET ?? "", config.NODE_ENV);
  if (config.PAYMENT_PROVIDER === "paymongo") return new PayMongoProvider({ secretKey: config.PAYMONGO_SECRET_KEY!, webhookSecret: config.PAYMONGO_WEBHOOK_SECRET!, returnUrl: config.PAYMONGO_RETURN_URL!, trustedOrigins: config.TRUSTED_ORIGINS });
  return undefined;
}
