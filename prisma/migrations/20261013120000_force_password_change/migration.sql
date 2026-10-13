ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "User" ALTER COLUMN "mustChangePassword" SET DEFAULT false;

UPDATE "User" SET "mustChangePassword" = false;

UPDATE "RefreshTokenFamily"
SET "isRevoked" = false,
    "revokedReason" = NULL
WHERE "revokedReason" = 'PASSWORD_RESET_REQUIRED';
