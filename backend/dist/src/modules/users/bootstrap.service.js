// Bring in the tools for staff accounts so this file can work with the rest of the application.
import bcrypt from "bcrypt";
import { accountFields } from "../auth/auth.schema.js";
// Keep the shared values for staff accounts together so later steps use the same definitions.
export const bootstrapAdminSchema = accountFields.pick({ username: true, email: true, password: true, firstName: true, lastName: true });
// Local operator command only; never exposed as an HTTP route.
export async function bootstrapAdmin(prisma, input) {
    const { password, ...fields } = bootstrapAdminSchema.parse(input);
    const passwordHash = await bcrypt.hash(password, 12);
    // Keep the related database changes together so a failure leaves the earlier records intact.
    return prisma.$transaction(async (tx) => {
        // Serialize even when User is empty, and against ordinary account creation.
        await tx.$executeRaw `LOCK TABLE "User" IN EXCLUSIVE MODE`;
        if (await tx.user.count() !== 0)
            throw new Error("Bootstrap requires an empty User table.");
        // Save the new staff account record so account access reflects the approved update.
        const user = await tx.user.create({ data: { ...fields, passwordHash, role: "ADMIN", isActive: true } });
        return { id: user.id };
    });
}
//# sourceMappingURL=bootstrap.service.js.map