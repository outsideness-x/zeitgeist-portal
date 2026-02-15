-- this migration rebuilds domain tables to align with the cabinet and analytics model
DROP TABLE IF EXISTS "ArticleDailyVisitor" CASCADE;
DROP TABLE IF EXISTS "ArticleDailyStats" CASCADE;
DROP TABLE IF EXISTS "Reaction" CASCADE;
DROP TABLE IF EXISTS "Bookmark" CASCADE;
DROP TABLE IF EXISTS "ReviewMessage" CASCADE;
DROP TABLE IF EXISTS "SubmissionFile" CASCADE;
DROP TABLE IF EXISTS "Submission" CASCADE;
DROP TABLE IF EXISTS "Session" CASCADE;
DROP TABLE IF EXISTS "Article" CASCADE;
DROP TABLE IF EXISTS "LibraryItem" CASCADE;
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

DROP TYPE IF EXISTS "ReactionType" CASCADE;
DROP TYPE IF EXISTS "ArticleSection" CASCADE;
DROP TYPE IF EXISTS "ArticleSource" CASCADE;
DROP TYPE IF EXISTS "SubmissionStatus" CASCADE;
DROP TYPE IF EXISTS "Role" CASCADE;

CREATE TYPE "Role" AS ENUM ('READER', 'AUTHOR', 'ADMIN');
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'NEEDS_CHANGES', 'RESUBMITTED', 'APPROVED', 'PUBLISHED', 'REJECTED');
CREATE TYPE "ArticleSource" AS ENUM ('LOCAL', 'GHOST');
CREATE TYPE "ArticleSection" AS ENUM ('JOURNAL', 'RESEARCH', 'NOVA');
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'INSIGHTFUL', 'CELEBRATE');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'READER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "csrfToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Article" (
  "id" TEXT NOT NULL,
  "source" "ArticleSource" NOT NULL,
  "externalId" TEXT,
  "slug" TEXT NOT NULL,
  "canonicalPath" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL,
  "htmlContent" TEXT,
  "featureImage" TEXT,
  "section" "ArticleSection" NOT NULL,
  "authorUserId" TEXT,
  "publishedAt" TIMESTAMP(3) NOT NULL,
  "pdfStorageKey" TEXT,
  "canonicalUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Submission" (
  "id" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "abstract" TEXT NOT NULL,
  "requestedSection" "ArticleSection",
  "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastSubmittedAt" TIMESTAMP(3),
  "publishedArticleId" TEXT,
  CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubmissionFile" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "mime" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL,
  CONSTRAINT "SubmissionFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReviewMessage" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReviewMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Bookmark" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Reaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "type" "ReactionType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArticleDailyStats" (
  "id" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "views" INTEGER NOT NULL DEFAULT 0,
  "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ArticleDailyStats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArticleDailyVisitor" (
  "id" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "visitorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArticleDailyVisitor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

CREATE UNIQUE INDEX "Article_source_slug_key" ON "Article"("source", "slug");
CREATE UNIQUE INDEX "Article_source_externalId_key" ON "Article"("source", "externalId");
CREATE INDEX "Article_authorUserId_idx" ON "Article"("authorUserId");
CREATE INDEX "Article_publishedAt_idx" ON "Article"("publishedAt");

CREATE INDEX "Submission_authorUserId_idx" ON "Submission"("authorUserId");
CREATE INDEX "Submission_status_idx" ON "Submission"("status");
CREATE INDEX "Submission_lastSubmittedAt_idx" ON "Submission"("lastSubmittedAt");

CREATE UNIQUE INDEX "SubmissionFile_storageKey_key" ON "SubmissionFile"("storageKey");
CREATE UNIQUE INDEX "SubmissionFile_submissionId_version_key" ON "SubmissionFile"("submissionId", "version");
CREATE INDEX "SubmissionFile_submissionId_idx" ON "SubmissionFile"("submissionId");

CREATE INDEX "ReviewMessage_submissionId_idx" ON "ReviewMessage"("submissionId");
CREATE INDEX "ReviewMessage_adminUserId_idx" ON "ReviewMessage"("adminUserId");

CREATE UNIQUE INDEX "Bookmark_userId_articleId_key" ON "Bookmark"("userId", "articleId");
CREATE INDEX "Bookmark_articleId_idx" ON "Bookmark"("articleId");

CREATE UNIQUE INDEX "Reaction_userId_articleId_key" ON "Reaction"("userId", "articleId");
CREATE INDEX "Reaction_articleId_idx" ON "Reaction"("articleId");

CREATE UNIQUE INDEX "ArticleDailyStats_articleId_date_key" ON "ArticleDailyStats"("articleId", "date");
CREATE INDEX "ArticleDailyStats_date_idx" ON "ArticleDailyStats"("date");

CREATE UNIQUE INDEX "ArticleDailyVisitor_articleId_date_visitorId_key" ON "ArticleDailyVisitor"("articleId", "date", "visitorId");
CREATE INDEX "ArticleDailyVisitor_date_idx" ON "ArticleDailyVisitor"("date");

CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Article" ADD CONSTRAINT "Article_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_publishedArticleId_fkey" FOREIGN KEY ("publishedArticleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubmissionFile" ADD CONSTRAINT "SubmissionFile_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewMessage" ADD CONSTRAINT "ReviewMessage_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewMessage" ADD CONSTRAINT "ReviewMessage_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArticleDailyStats" ADD CONSTRAINT "ArticleDailyStats_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArticleDailyVisitor" ADD CONSTRAINT "ArticleDailyVisitor_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
