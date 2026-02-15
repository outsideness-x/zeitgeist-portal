import type { ArticleSection, Prisma, PrismaClient, Submission, SubmissionFile, User } from '@prisma/client';

export type PublisherDb = PrismaClient | Prisma.TransactionClient;

export type PublishSubmissionInput = {
  submission: Submission;
  latestFile: SubmissionFile | null;
  author: Pick<User, 'id' | 'name' | 'email' | 'role'>;
  section: ArticleSection;
  db: PublisherDb;
};

export type PublishSubmissionResult = {
  articleId: string;
  source: 'LOCAL' | 'GHOST';
  externalId: string | null;
  canonicalUrl: string | null;
};

export interface Publisher {
  publishSubmission(input: PublishSubmissionInput): Promise<PublishSubmissionResult>;
}
