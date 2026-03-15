ALTER TABLE "Submission"
ADD COLUMN "clientRequestId" TEXT;

CREATE UNIQUE INDEX "Submission_authorUserId_clientRequestId_key"
ON "Submission"("authorUserId", "clientRequestId");
