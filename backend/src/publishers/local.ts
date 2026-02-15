import type { Publisher } from './types.js';
import type { PublishSubmissionInput, PublishSubmissionResult } from './types.js';
import { slugify } from '../lib/text.js';

export class LocalPublisher implements Publisher {
  // this publisher writes a local article record so localhost can serve approved content without ghost
  async publishSubmission(input: PublishSubmissionInput): Promise<PublishSubmissionResult> {
    const baseSlug = slugify(input.submission.title);
    const slug = `${baseSlug}-${input.submission.id.slice(0, 8)}`;

    const article = await input.db.article.upsert({
      where: {
        source_slug: {
          source: 'LOCAL',
          slug,
        },
      },
      create: {
        source: 'LOCAL',
        slug,
        canonicalPath: `/article/${slug}`,
        title: input.submission.title,
        excerpt: input.submission.abstract.slice(0, 320),
        htmlContent: `<p>${input.submission.abstract}</p>`,
        section: input.section,
        authorUserId: input.author.id,
        publishedAt: new Date(),
        pdfStorageKey: input.latestFile?.storageKey ?? null,
      },
      update: {
        title: input.submission.title,
        excerpt: input.submission.abstract.slice(0, 320),
        htmlContent: `<p>${input.submission.abstract}</p>`,
        section: input.section,
        authorUserId: input.author.id,
        publishedAt: new Date(),
        pdfStorageKey: input.latestFile?.storageKey ?? null,
      },
      select: {
        id: true,
      },
    });

    return {
      articleId: article.id,
      source: 'LOCAL',
      externalId: null,
      canonicalUrl: null,
    };
  }
}
