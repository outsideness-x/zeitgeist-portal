CREATE TYPE "TrafficBucketGranularity" AS ENUM ('HOUR', 'DAY');

CREATE TABLE "SiteVisitor" (
  "id" TEXT NOT NULL,
  "visitorId" TEXT NOT NULL,
  "userId" TEXT,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastPath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiteVisitor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteTrafficBucket" (
  "id" TEXT NOT NULL,
  "granularity" "TrafficBucketGranularity" NOT NULL,
  "bucketStart" TIMESTAMP(3) NOT NULL,
  "pageViews" INTEGER NOT NULL DEFAULT 0,
  "authenticatedPageViews" INTEGER NOT NULL DEFAULT 0,
  "anonymousPageViews" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiteTrafficBucket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteDailyVisitor" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "visitorId" TEXT NOT NULL,
  "userId" TEXT,
  "isAuthenticated" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiteDailyVisitor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SiteVisitor_visitorId_key" ON "SiteVisitor"("visitorId");
CREATE INDEX "SiteVisitor_lastSeenAt_idx" ON "SiteVisitor"("lastSeenAt");
CREATE INDEX "SiteVisitor_userId_lastSeenAt_idx" ON "SiteVisitor"("userId", "lastSeenAt");

CREATE UNIQUE INDEX "SiteTrafficBucket_granularity_bucketStart_key" ON "SiteTrafficBucket"("granularity", "bucketStart");
CREATE INDEX "SiteTrafficBucket_bucketStart_idx" ON "SiteTrafficBucket"("bucketStart");

CREATE UNIQUE INDEX "SiteDailyVisitor_date_visitorId_isAuthenticated_key" ON "SiteDailyVisitor"("date", "visitorId", "isAuthenticated");
CREATE INDEX "SiteDailyVisitor_isAuthenticated_date_visitorId_idx" ON "SiteDailyVisitor"("isAuthenticated", "date", "visitorId");
CREATE INDEX "SiteDailyVisitor_userId_idx" ON "SiteDailyVisitor"("userId");

ALTER TABLE "SiteVisitor"
  ADD CONSTRAINT "SiteVisitor_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SiteDailyVisitor"
  ADD CONSTRAINT "SiteDailyVisitor_visitorId_fkey"
  FOREIGN KEY ("visitorId") REFERENCES "SiteVisitor"("visitorId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SiteDailyVisitor"
  ADD CONSTRAINT "SiteDailyVisitor_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
