// Bring in the tools for staff sign-in so this file can work with the rest of the application.
import { createAuthMiddleware } from "./auth.middleware.js";
import { Router } from "express";
import { validateRequest } from "../../shared/http.js";
import { createTokenService } from "./auth.token.js";
import { createAuthService } from "./auth.service.js";
import { createPasswordResetService, PASSWORD_RESET_NOTICE } from "./password-reset.service.js";
import { createGmailProvider } from "../notifications/gmail-provider.js";
import { createUsersService } from "../users/users.service.js";
import { loginSchema, createAccountSchema, updateAccountSchema, forgotPasswordSchema, resetPasswordSchema, } from "./auth.schema.js";
import { browserSecurity, COOKIE_NAME, cookieOptions, } from "./auth.security.js";
// Connect sign-in, sign-out and recovery requests so staff can manage their access.
export function createAuthRouter(prisma, config, resetEmailProvider) {
    const router = Router();
    const service = createAuthService(prisma);
    const users = createUsersService(prisma);
    const tokens = createTokenService(config.JWT_SECRET);
    const cookie = cookieOptions(config);
    const recovery = createPasswordResetService(prisma, config.JWT_SECRET, resetEmailProvider ?? (config.PASSWORD_RESET_EMAIL_PROVIDER === "gmail"
        ? createGmailProvider(config.GMAIL_USER, config.GMAIL_APP_PASSWORD, config.NOTIFICATION_EMAIL_FROM, config.NOTIFICATION_TIMEOUT_MS)
        : undefined));
    // Scoped to browser-authenticated modules; future provider callbacks have a separate boundary.
    router.use(["/auth", "/users"], browserSecurity(config.TRUSTED_ORIGINS));
    const { authenticate, adminOnly } = createAuthMiddleware(prisma, config);
    router.post("/auth/login", validateRequest(loginSchema), async (_req, res) => {
        const { username, password } = res.locals.validated.body;
        const { sessionVersion, ...user } = await service.login(username, password);
        res.cookie(COOKIE_NAME, await tokens.sign({ userId: user.id, role: user.role, sessionVersion }), { ...cookie, maxAge: 8 * 60 * 60 * 1000 });
        res.json({ user });
    });
    router.post("/auth/forgot-password", validateRequest(forgotPasswordSchema), async (req, res) => {
        const result = await recovery.request(res.locals.validated.body.username, req.ip ?? "unknown");
        res.json({ challengeId: result.challengeId, message: PASSWORD_RESET_NOTICE, retryAfterSeconds: 60 });
        // Delivery begins after the identical public response for known/unknown accounts.
        // A process interruption can lose this send; staff can request a new code.
        void recovery.deliver(result.delivery, true).catch(() => console.error(JSON.stringify({ event: "password_reset_delivery_cleanup_failed" })));
    });
    router.post("/auth/reset-password", validateRequest(resetPasswordSchema), async (_req, res) => {
        const { challengeId, code, password } = res.locals.validated.body;
        const notice = await recovery.reset(challengeId, code, password);
        res.clearCookie(COOKIE_NAME, cookie);
        res.json({ message: "Password reset. Sign in with your new password." });
        void recovery.deliver(notice).catch(() => console.error(JSON.stringify({ event: "password_reset_notice_failed" })));
    });
    router.post("/auth/logout", (_req, res) => {
        res.clearCookie(COOKIE_NAME, cookie);
        res.status(204).end();
    });
    router.get("/auth/me", authenticate, (_req, res) => res.json({ user: res.locals.user }));
    router.get("/users", authenticate, adminOnly, async (_req, res) => res.json({ users: await users.list(res.locals.user.id) }));
    router.post("/users", authenticate, adminOnly, validateRequest(createAccountSchema), async (_req, res) => {
        res
            .status(201)
            .json({
            user: await users.save(res.locals.user.id, res.locals.validated.body),
        });
    });
    router.patch("/users/:id", authenticate, adminOnly, validateRequest(updateAccountSchema), async (_req, res) => {
        res.json({
            user: await users.save(res.locals.user.id, res.locals.validated.body, res.locals.validated.params.id),
        });
    });
    return router;
}
//# sourceMappingURL=auth.routes.js.map