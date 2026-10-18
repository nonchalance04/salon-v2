import bcrypt from "bcrypt";
import { publicUserSelect } from "../auth/auth.service.js";
import { ApiError } from "../../shared/http.js";
async function requireAdmin(tx, id) {
    const user = await tx.user.findUnique({ where: { id } });
    if (!user?.isActive)
        throw new ApiError(401, "UNAUTHORIZED", "Please sign in again.");
    if (user.role !== "ADMIN")
        throw new ApiError(403, "FORBIDDEN", "Administrator access is required.");
}
export function createUsersService(prisma) {
    return {
        async list(actorId) {
            await requireAdmin(prisma, actorId);
            return prisma.user.findMany({ select: publicUserSelect, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
        },
        async save(actorId, input, id) {
            const { password, ...fields } = input;
            const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
            try {
                return await prisma.$transaction(async (tx) => {
                    // Lock actor and edited account in a stable order; recheck privileges
                    // after waiting so concurrent deactivation/demotion cannot authorize a write.
                    const ids = [...new Set([actorId, ...(id ? [id] : [])])].sort();
                    for (const userId of ids)
                        await tx.$queryRaw `SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
                    await requireAdmin(tx, actorId);
                    const before = id ? await tx.user.findUnique({ where: { id }, select: publicUserSelect }) : null;
                    if (id && !before)
                        throw new ApiError(404, "NOT_FOUND", "Account not found.");
                    const data = { ...fields, ...(passwordHash ? { passwordHash } : {}) };
                    const user = id
                        ? await tx.user.update({ where: { id }, data, select: publicUserSelect })
                        : await tx.user.create({ data: data, select: publicUserSelect });
                    return user;
                });
            }
            catch (error) {
                if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
                    // Prisma's PostgreSQL adapter may report the index instead of field names.
                    const meta = "meta" in error ? error.meta : undefined;
                    const constraint = meta?.driverAdapterError?.cause?.constraint;
                    const target = meta?.target ?? constraint?.fields ?? constraint?.index;
                    if ((Array.isArray(target) && target.includes("username")) || target === "User_username_key") {
                        throw new ApiError(409, "USERNAME_IN_USE", "An account already uses this username.");
                    }
                    throw new ApiError(409, "EMAIL_IN_USE", "An account already uses this email.");
                }
                throw error;
            }
        },
    };
}
//# sourceMappingURL=users.service.js.map