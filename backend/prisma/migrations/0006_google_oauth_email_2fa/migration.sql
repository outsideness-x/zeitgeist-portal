-- createenum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE');

-- createenum
CREATE TYPE "PreAuthPurpose" AS ENUM ('LOGIN_2FA', 'LINK_GOOGLE');

-- createenum
CREATE TYPE "OneTimeCodePurpose" AS ENUM ('LOGIN_2FA', 'LINK_GOOGLE', 'ENABLE_2FA', 'DISABLE_2FA');

-- altertable
ALTER TABLE "User"
ADD COLUMN "twoFactorEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "twoFactorEmailVerifiedAt" TIMESTAMP(3);

-- createtable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- createtable
CREATE TABLE "OAuthState" (
    "id" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "redirectPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "OAuthState_pkey" PRIMARY KEY ("id")
);

-- createtable
CREATE TABLE "PreAuthSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "PreAuthPurpose" NOT NULL,
    "redirectPath" TEXT,
    "provider" "AuthProvider",
    "providerAccountId" TEXT,
    "providerEmail" TEXT,
    "providerEmailVerified" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "PreAuthSession_pkey" PRIMARY KEY ("id")
);

-- createtable
CREATE TABLE "OneTimeCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preAuthSessionId" TEXT,
    "purpose" "OneTimeCodePurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "consumedAt" TIMESTAMP(3),
    "resendCount" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3) NOT NULL,
    "blockedUntil" TIMESTAMP(3),
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "OneTimeCode_pkey" PRIMARY KEY ("id")
);

-- createindex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- createindex
CREATE UNIQUE INDEX "Account_userId_provider_key" ON "Account"("userId", "provider");

-- createindex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- createindex
CREATE INDEX "Account_email_idx" ON "Account"("email");

-- createindex
CREATE UNIQUE INDEX "OAuthState_stateHash_key" ON "OAuthState"("stateHash");

-- createindex
CREATE INDEX "OAuthState_expiresAt_idx" ON "OAuthState"("expiresAt");

-- createindex
CREATE UNIQUE INDEX "PreAuthSession_tokenHash_key" ON "PreAuthSession"("tokenHash");

-- createindex
CREATE INDEX "PreAuthSession_userId_idx" ON "PreAuthSession"("userId");

-- createindex
CREATE INDEX "PreAuthSession_expiresAt_idx" ON "PreAuthSession"("expiresAt");

-- createindex
CREATE INDEX "OneTimeCode_userId_purpose_idx" ON "OneTimeCode"("userId", "purpose");

-- createindex
CREATE INDEX "OneTimeCode_preAuthSessionId_idx" ON "OneTimeCode"("preAuthSessionId");

-- createindex
CREATE INDEX "OneTimeCode_expiresAt_idx" ON "OneTimeCode"("expiresAt");

-- addforeignkey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- addforeignkey
ALTER TABLE "PreAuthSession" ADD CONSTRAINT "PreAuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- addforeignkey
ALTER TABLE "OneTimeCode" ADD CONSTRAINT "OneTimeCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- addforeignkey
ALTER TABLE "OneTimeCode" ADD CONSTRAINT "OneTimeCode_preAuthSessionId_fkey" FOREIGN KEY ("preAuthSessionId") REFERENCES "PreAuthSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
