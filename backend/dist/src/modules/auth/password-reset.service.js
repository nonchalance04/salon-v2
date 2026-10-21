// Bring in the tools for staff sign-in so this file can work with the rest of the application.
import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import bcrypt from "bcrypt";
import { ApiError } from "../../shared/http.js";
import { renderSimpleEmailLayout } from "../notifications/simple-email-layout.js";
// Keep the shared values for staff sign-in together so later steps use the same definitions.
export const PASSWORD_RESET_NOTICE = "If your username matches an active account, a code will be sent to its email. The code expires in 10 minutes.";
// Prepare the rejection for invalid details so the caller receives a consistent explanation.
const invalid = () => new ApiError(400, "INVALID_RESET_CODE", "The code is incorrect or expired. Request a new code if needed.");
// Prepare the request-limit response so repeated attempts receive a consistent explanation.
const limited = () => new ApiError(429, "PASSWORD_RESET_LIMIT", "Please wait before requesting another code.");
// Manage password recovery limits, codes and updates so staff can securely regain account access.
export function createPasswordResetService(prisma, secret, provider) {
    // Bind the recovery code to the account details so changes to the account invalidate an older code.
    const digest = (...parts) => createHmac("sha256", secret).update(JSON.stringify(["staff-password-reset", ...parts])).digest("hex");
    return {
        // Check recovery limits and send a code when eligible so staff can regain access without revealing account existence.
        async request(username, ip) {
            if (!provider)
                throw new ApiError(503, "PASSWORD_RESET_DISABLED", "Password recovery is unavailable. Contact your salon administrator.");
            const normalized = username.trim().toLowerCase();
            const identityKey = digest("identity", normalized), ipKey = digest("ip", ip);
            const id = randomUUID(), code = String(randomInt(0, 1_000_000)).padStart(6, "0");
            const result = await prisma.$transaction(async (tx) => {
                // Serialize request limits across processes, including unknown usernames.
                for (const key of [ipKey, identityKey].sort()) {
                    await tx.$queryRaw `SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`;
                }
                const now = new Date(), since = new Date(+now - 15 * 60_000);
                const byIp = await tx.passwordResetChallenge.count({ where: { ipKey, createdAt: { gt: since } } });
                const byName = await tx.passwordResetChallenge.count({ where: { identityKey, createdAt: { gt: since } } });
                const recent = await tx.passwordResetChallenge.findFirst({ where: { identityKey, createdAt: { gt: new Date(+now - 60_000) } } });
                if (byIp >= 10 || byName >= 3 || recent)
                    return null;
                const candidate = await tx.user.findUnique({ where: { username: normalized } });
                if (candidate)
                    await tx.$queryRaw `SELECT id FROM "User" WHERE id = ${candidate.id}::uuid FOR UPDATE`;
                const current = candidate ? await tx.user.findUnique({ where: { id: candidate.id } }) : null;
                const user = current?.isActive && current.email === candidate?.email && current.username === normalized ? current : null;
                await tx.passwordResetChallenge.updateMany({ where: { identityKey, consumedAt: null }, data: { consumedAt: now } });
                await tx.passwordResetChallenge.create({ data: {
                        id, identityKey, ipKey, userId: user?.id,
                        codeHash: digest(id, code, user?.passwordHash ?? "", user?.email ?? "", user?.username ?? ""),
                        expiresAt: new Date(+now + 10 * 60_000),
                    } });
                // Bound ephemeral storage; these rows contain no transactional history.
                await tx.passwordResetChallenge.deleteMany({ where: { expiresAt: { lt: new Date(+now - 24 * 60 * 60_000) } } });
                return { recipient: user?.email };
            });
            if (!result)
                throw limited();
            return {
                challengeId: id,
                delivery: result.recipient ? {
                    id, channel: "EMAIL", recipient: result.recipient, subject: "Reset your Clique workspace password",
                    text: `Your workspace password reset code is ${code}. It expires in 10 minutes.\n\nIf you did not request this, ignore this email. Do not share the code.`,
                    html: renderSimpleEmailLayout({ title: "Reset your workspace password", verificationCode: code,
                        text: "Use this code on the workspace password recovery screen. It expires in 10 minutes.\n\nIf you did not request this, ignore this email. Do not share the code." }),
                } : null,
            };
        },
        // Deliver the recovery email so the staff member can use the code to reset their password.
        async deliver(message, invalidateOnFailure = false) {
            if (!message || !provider)
                return;
            try {
                await provider.send(message, AbortSignal.timeout(10_000));
            }
            catch {
                if (invalidateOnFailure) {
                    await prisma.passwordResetChallenge.updateMany({ where: { id: message.id, consumedAt: null }, data: { consumedAt: new Date() } });
                }
                // Never log recipient, code, message body or provider response.
                console.error(JSON.stringify({ event: "password_reset_email_failed" }));
            }
        },
        // Replace the password after checking recovery proof so the account can be accessed with the new password.
        async reset(challengeId, code, password) {
            if (!provider)
                throw new ApiError(503, "PASSWORD_RESET_DISABLED", "Password recovery is unavailable. Contact your salon administrator.");
            const passwordHash = await bcrypt.hash(password, 12);
            const initial = await prisma.passwordResetChallenge.findUnique({ where: { id: challengeId } });
            const recipient = await prisma.$transaction(async (tx) => {
                // Same order as issuance/account editing: User before challenge rows.
                if (initial?.userId)
                    await tx.$queryRaw `SELECT id FROM "User" WHERE id = ${initial.userId}::uuid FOR UPDATE`;
                await tx.$queryRaw `SELECT id FROM "PasswordResetChallenge" WHERE id = ${challengeId}::uuid FOR UPDATE`;
                const challenge = await tx.passwordResetChallenge.findUnique({ where: { id: challengeId } });
                const now = new Date();
                if (!challenge || challenge.consumedAt || challenge.expiresAt <= now || challenge.attempts >= 5)
                    return null;
                const user = challenge.userId ? await tx.user.findUnique({ where: { id: challenge.userId } }) : null;
                const actual = Buffer.from(digest(challengeId, code, user?.passwordHash ?? "", user?.email ?? "", user?.username ?? ""), "hex");
                const expected = Buffer.from(challenge.codeHash, "hex");
                const valid = expected.length === actual.length && timingSafeEqual(expected, actual) && user?.isActive;
                await tx.passwordResetChallenge.update({ where: { id: challengeId }, data: {
                        attempts: { increment: 1 }, ...(valid || challenge.attempts === 4 ? { consumedAt: now } : {}),
                    } });
                if (!valid || !user)
                    return null;
                // Update the saved staff account record so account access reflects the approved update.
                await tx.user.update({ where: { id: user.id }, data: { passwordHash, sessionVersion: { increment: 1 } } });
                await tx.passwordResetChallenge.updateMany({ where: { userId: user.id, consumedAt: null }, data: { consumedAt: now } });
                return user.email;
            });
            // Throw after commit so unsuccessful attempts cannot roll back their counter.
            if (!recipient)
                throw invalid();
            return { id: randomUUID(), channel: "EMAIL", recipient, subject: "Your Clique workspace password was changed",
                text: "Your workspace password was reset. Existing sessions have been signed out.\n\nIf you did not make this change, contact your salon administrator immediately." };
        },
    };
}
//# sourceMappingURL=password-reset.service.js.map