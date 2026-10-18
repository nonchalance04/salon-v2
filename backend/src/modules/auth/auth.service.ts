import bcrypt from "bcrypt";
import type { PrismaClient } from "../../../generated/prisma/client.js";
import { ApiError } from "../../shared/http.js";

export const publicUserSelect = {
  id: true, username: true, email: true, firstName: true, lastName: true, role: true,
  isActive: true, lastLoginAt: true, createdAt: true,
} as const;

export function createAuthService(prisma: PrismaClient) {
  let dummyHash: Promise<string> | undefined;
  return {
    async login(username: string, password: string) {
      const normalized = username.trim().toLowerCase();
      const user = await prisma.user.findUnique({ where: { username: normalized } });
      const matches = await bcrypt.compare(password, user?.passwordHash ?? await (dummyHash ??= bcrypt.hash("unused-login-comparison-value", 12)));
      if (!user || !matches || !user.isActive) {
        throw new ApiError(401, "INVALID_CREDENTIALS", "Username or password is incorrect.");
      }
      // Recheck active status and password after hashing work, before issuing a token.
      const result = await prisma.user.updateMany({
        where: { id: user.id, username: normalized, isActive: true, passwordHash: user.passwordHash },
        data: { lastLoginAt: new Date() },
      });
      if (result.count !== 1) throw new ApiError(401, "INVALID_CREDENTIALS", "Username or password is incorrect.");
      return { ...await this.currentUser(user.id), sessionVersion: user.sessionVersion };
    },
    async currentUser(id: string, expectedVersion?: number) {
      const user = await prisma.user.findUnique({ where: { id }, select: { ...publicUserSelect, sessionVersion: true } });
      if (!user?.isActive || (expectedVersion !== undefined && user.sessionVersion !== expectedVersion)) {
        throw new ApiError(401, "UNAUTHORIZED", "Please sign in again.");
      }
      const { sessionVersion: _version, ...publicUser } = user;
      return publicUser;
    },
  };
}
