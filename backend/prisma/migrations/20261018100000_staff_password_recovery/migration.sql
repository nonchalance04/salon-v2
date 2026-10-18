ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "PasswordResetChallenge" (
  "id" UUID NOT NULL,
  "identityKey" TEXT NOT NULL,
  "ipKey" TEXT NOT NULL,
  "userId" UUID,
  "codeHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "consumedAt" TIMESTAMPTZ(3),
  CONSTRAINT "PasswordResetChallenge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PasswordResetChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PasswordResetChallenge_attempts_check" CHECK ("attempts" >= 0 AND "attempts" <= 5)
);
CREATE INDEX "PasswordResetChallenge_identityKey_createdAt_idx" ON "PasswordResetChallenge"("identityKey", "createdAt");
CREATE INDEX "PasswordResetChallenge_ipKey_createdAt_idx" ON "PasswordResetChallenge"("ipKey", "createdAt");
CREATE INDEX "PasswordResetChallenge_expiresAt_idx" ON "PasswordResetChallenge"("expiresAt");
