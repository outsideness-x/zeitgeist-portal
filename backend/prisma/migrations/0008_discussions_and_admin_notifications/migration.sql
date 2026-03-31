-- createenum
CREATE TYPE "DiscussionTargetType" AS ENUM ('ARTICLE', 'PRODUCT');

-- createenum
CREATE TYPE "AdminNotificationType" AS ENUM ('ARTICLE_COMMENT', 'PRODUCT_REVIEW');

-- createtable
CREATE TABLE "DiscussionEntry" (
    "id" TEXT NOT NULL,
    "targetType" "DiscussionTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "parentId" TEXT,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "authorUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscussionEntry_pkey" PRIMARY KEY ("id")
);

-- createtable
CREATE TABLE "DiscussionLike" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscussionLike_pkey" PRIMARY KEY ("id")
);

-- createtable
CREATE TABLE "AdminNotification" (
    "id" TEXT NOT NULL,
    "recipientAdminUserId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "discussionEntryId" TEXT NOT NULL,
    "type" "AdminNotificationType" NOT NULL,
    "targetType" "DiscussionTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "textPreview" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

-- createindex
CREATE INDEX "DiscussionEntry_targetType_targetId_createdAt_idx" ON "DiscussionEntry"("targetType", "targetId", "createdAt");

-- createindex
CREATE INDEX "DiscussionEntry_parentId_idx" ON "DiscussionEntry"("parentId");

-- createindex
CREATE INDEX "DiscussionEntry_authorUserId_idx" ON "DiscussionEntry"("authorUserId");

-- createindex
CREATE INDEX "DiscussionEntry_isDeleted_targetType_targetId_idx" ON "DiscussionEntry"("isDeleted", "targetType", "targetId");

-- createindex
CREATE UNIQUE INDEX "DiscussionLike_entryId_userId_key" ON "DiscussionLike"("entryId", "userId");

-- createindex
CREATE INDEX "DiscussionLike_userId_idx" ON "DiscussionLike"("userId");

-- createindex
CREATE INDEX "DiscussionLike_entryId_idx" ON "DiscussionLike"("entryId");

-- createindex
CREATE INDEX "AdminNotification_recipientAdminUserId_isRead_createdAt_idx" ON "AdminNotification"("recipientAdminUserId", "isRead", "createdAt");

-- createindex
CREATE INDEX "AdminNotification_discussionEntryId_idx" ON "AdminNotification"("discussionEntryId");

-- createindex
CREATE INDEX "AdminNotification_targetType_targetId_idx" ON "AdminNotification"("targetType", "targetId");

-- createindex
CREATE INDEX "AdminNotification_createdAt_idx" ON "AdminNotification"("createdAt");

-- addforeignkey
ALTER TABLE "DiscussionEntry" ADD CONSTRAINT "DiscussionEntry_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- addforeignkey
ALTER TABLE "DiscussionEntry" ADD CONSTRAINT "DiscussionEntry_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DiscussionEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- addforeignkey
ALTER TABLE "DiscussionLike" ADD CONSTRAINT "DiscussionLike_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "DiscussionEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- addforeignkey
ALTER TABLE "DiscussionLike" ADD CONSTRAINT "DiscussionLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- addforeignkey
ALTER TABLE "AdminNotification" ADD CONSTRAINT "AdminNotification_recipientAdminUserId_fkey" FOREIGN KEY ("recipientAdminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- addforeignkey
ALTER TABLE "AdminNotification" ADD CONSTRAINT "AdminNotification_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- addforeignkey
ALTER TABLE "AdminNotification" ADD CONSTRAINT "AdminNotification_discussionEntryId_fkey" FOREIGN KEY ("discussionEntryId") REFERENCES "DiscussionEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
