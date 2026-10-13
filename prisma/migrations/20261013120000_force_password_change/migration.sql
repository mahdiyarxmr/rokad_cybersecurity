ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;

UPDATE "RefreshTokenFamily"
SET "isRevoked" = true,
    "revokedReason" = 'PASSWORD_RESET_REQUIRED'
WHERE "isRevoked" = false;
