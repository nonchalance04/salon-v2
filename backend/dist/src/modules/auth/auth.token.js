// Bring in the tools for staff sign-in so this file can work with the rest of the application.
import { SignJWT, jwtVerify } from "jose";
import { UserRole } from "../../../generated/prisma/client.js";
// Keep the shared values for staff sign-in together so later steps use the same definitions.
const JWT_ALGORITHM = "HS256";
const JWT_LIFETIME = "8h";
// Recognize the supported staff roles so unexpected role values are rejected.
function isUserRole(value) {
    return (typeof value === "string" &&
        Object.values(UserRole).includes(value));
}
// Prepare the signing and checking of staff access tokens so session identity can be verified.
export function createTokenService(secret) {
    const jwtSecret = new TextEncoder().encode(secret);
    // Create a signed staff access token so later requests can prove who signed in.
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
    // Check the staff access token so altered or expired session details are rejected.
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