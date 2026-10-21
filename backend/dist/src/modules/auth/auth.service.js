// Bring in the tools for staff sign-in so this file can work with the rest of the application.
import bcrypt from "bcrypt";
import { ApiError } from "../../shared/http.js";
// Choose the staff account fields safe to return so password details stay private.
export const publicUserSelect = {
    id: true, username: true, email: true, firstName: true, lastName: true, role: true,
    isActive: true, lastLoginAt: true, createdAt: true,
};
// Manage staff sign-in checks so only active accounts with matching passwords receive access.
export function createAuthService(prisma) {
    let dummyHash;
    return {
        // Compare the supplied password and active account so only matching staff credentials receive access.
        async login(username, password) {
            // Normalize the username before finding the account so differences in letter case do not affect sign-in.
            const normalized = username.trim().toLowerCase();
            const user = await prisma.user.findUnique({ where: { username: normalized } });
            // Compare against a protected password value even for missing accounts so failed sign-in checks behave consistently.
            const matches = await bcrypt.compare(password, user?.passwordHash ?? await (dummyHash ??= bcrypt.hash("unused-login-comparison-value", 12)));
            if (!user || !matches || !user.isActive) {
                throw new ApiError(401, "INVALID_CREDENTIALS", "Username or password is incorrect.");
            }
            // Recheck active status and password after hashing work, before issuing a token.
            const result = await prisma.user.updateMany({
                where: { id: user.id, username: normalized, isActive: true, passwordHash: user.passwordHash },
                data: { lastLoginAt: new Date() },
            });
            if (result.count !== 1)
                throw new ApiError(401, "INVALID_CREDENTIALS", "Username or password is incorrect.");
            return { ...await this.currentUser(user.id), sessionVersion: user.sessionVersion };
        },
        // Reload the account and check its session version so revoked or inactive access is rejected.
        async currentUser(id, expectedVersion) {
            const user = await prisma.user.findUnique({ where: { id }, select: { ...publicUserSelect, sessionVersion: true } });
            if (!user?.isActive || (expectedVersion !== undefined && user.sessionVersion !== expectedVersion)) {
                throw new ApiError(401, "UNAUTHORIZED", "Please sign in again.");
            }
            // Leave the internal session counter out of the returned account so the caller receives only public staff details.
            const { sessionVersion: _version, ...publicUser } = user;
            return publicUser;
        },
    };
}
//# sourceMappingURL=auth.service.js.map