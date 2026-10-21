// Bring in the tools for customer notifications so this file can work with the rest of the application.
import { renderEmailLayout } from "./email-layout.js";

/** Shared salon branding for booking updates and verification emails. */
export function renderSimpleEmailLayout(options: Parameters<typeof renderEmailLayout>[0]): string {
  return renderEmailLayout(options);
}
