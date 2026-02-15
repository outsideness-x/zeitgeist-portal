-- this mapping table guarantees a submission can be published at most once
CREATE TABLE "SubmissionPublication" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubmissionPublication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubmissionPublication_submissionId_key" ON "SubmissionPublication"("submissionId");
CREATE INDEX "SubmissionPublication_articleId_idx" ON "SubmissionPublication"("articleId");

ALTER TABLE "SubmissionPublication" ADD CONSTRAINT "SubmissionPublication_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubmissionPublication" ADD CONSTRAINT "SubmissionPublication_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
