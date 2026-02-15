CREATE TABLE "ArticleLike" (
  "id" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArticleLike_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArticleApplause" (
  "id" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArticleApplause_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArticleReactionAggregate" (
  "id" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "likeCount" INTEGER NOT NULL DEFAULT 0,
  "applauseCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArticleReactionAggregate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArticleLike_articleId_userId_key" ON "ArticleLike"("articleId", "userId");
CREATE INDEX "ArticleLike_articleId_idx" ON "ArticleLike"("articleId");

CREATE UNIQUE INDEX "ArticleApplause_articleId_userId_key" ON "ArticleApplause"("articleId", "userId");
CREATE INDEX "ArticleApplause_articleId_idx" ON "ArticleApplause"("articleId");

CREATE UNIQUE INDEX "ArticleReactionAggregate_articleId_key" ON "ArticleReactionAggregate"("articleId");

ALTER TABLE "ArticleLike" ADD CONSTRAINT "ArticleLike_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArticleLike" ADD CONSTRAINT "ArticleLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArticleApplause" ADD CONSTRAINT "ArticleApplause_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArticleApplause" ADD CONSTRAINT "ArticleApplause_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArticleReactionAggregate" ADD CONSTRAINT "ArticleReactionAggregate_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
