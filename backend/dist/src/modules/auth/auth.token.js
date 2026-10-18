import { SignJWT, jwtVerify } from "jose";
import { UserRole } from "../../../generated/prisma/client.js";
const JWT_ALGORITHM = "HS256";
const JWT_LIFETIME = "8h";
function isUserRole(value) {
    return (typeof value === "string" &&
        Object.values(UserRole).includes(value));
}
export function createTokenService(secret) {
    const jwtSecret = new TextEncoder().encode(secret);
    async function signStaffToken(claims) {
        return new SignJWT({
            role: claims.role,
            sessionVersion: claims.sessionVersion ?? 0,
        })
            .setProtectedHeader({
            alg: JWT_ALGORITHM,
        })
            .setSubject(claims.userId)
            .setIssuedAt()
            .setExpirationTime(JWT_LIFETIME)
            .sign(jwtSecret);
    }
    async function verifyStaffToken(token) {
        const { payload } = await jwtVerify(token, jwtSecret, {
            algorithms: [JWT_ALGORITHM],
            requiredClaims: ["sub", "role", "iat", "exp"],
        });
        if (typeof payload.sub !== "string" ||
            payload.sub.length === 0 ||
            !isUserRole(payload.role) ||
            (payload.sessionVersion !== undefined && (!Number.isSafeInteger(payload.sessionVersion) || payload.sessionVersion < 0))) {
            throw new Error("Invalid staff token claims.");
        }
        return {
            userId: payload.sub,
            role: payload.role,
            sessionVersion: payload.sessionVersion ?? 0,
        };
    }
    return { sign: signStaffToken, verify: verifyStaffToken };
}
//# sourceMappingURL=auth.token.js.map