import { ApiError } from "../../shared/http.js";
import { createAuthService } from "./auth.service.js";
import { createTokenService } from "./auth.token.js";
import { COOKIE_NAME, cookieOptions, sessionCookie } from "./auth.security.js";
// Prepare the shared sign-in and role checks so protected requests are handled consistently.
export function createAuthMiddleware(prisma, config) {
    const service = createAuthService(prisma);
    const tokens = createTokenService(config.JWT_SECRET);
    const cookie = cookieOptions(config);
    // Verify the signed-in staff member so protected actions have a current, active account.
    const authenticate = async (req, res, next) => {
        const raw = sessionCookie(req.headers.cookie);
        let id;
        let sessionVersion;
        try {
            if (!raw)
                throw new Error("Missing token");
            const claims = await tokens.verify(raw);
            id = claims.userId;
            sessionVersion = claims.sessionVersion ?? 0;
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
                throw new Error("Invalid subject");
        }
        catch {
            res.clearCookie(COOKIE_NAME, cookie);
            throw new ApiError(401, "UNAUTHORIZED", "Please sign in again.");
        }
        res.locals.user = await service.currentUser(id, sessionVersion);
        next();
    };
    // Require an administrator account so restricted settings cannot be changed by other staff.
    const adminOnly = (_req, res, next) => {
        if (res.locals.user.role !== "ADMIN")
            throw new ApiError(403, "FORBIDDEN", "Administrator access is required.");
        next();
    };
    return { authenticate, adminOnly };
}
//# sourceMappingURL=auth.middleware.js.map