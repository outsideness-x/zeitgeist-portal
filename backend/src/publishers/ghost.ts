import { createHmac } from 'node:crypto';
import type { Publisher } from './types.js';
import type { PublishSubmissionInput, PublishSubmissionResult } from './types.js';
import type { BackendEnv } from '../config/env.js';
import { escapeHtml, slugify } from '../lib/text.js';

type GhostPost = {
  id: string;
  slug: string;
  url?: string;
};

type GhostPostsResponse = {
  posts: GhostPost[];
};

const base64UrlEncode = (value: Buffer | string) => {
  const raw = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return raw.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const createGhostAdminJwt = (adminApiKey: string) => {
  const [keyId, hexSecret] = adminApiKey.split(':');

  if (!keyId || !hexSecret) {
    throw new Error('ghost admin api key must use id:secret format');
  }

  const header = {
    alg: 'HS256',
    kid: keyId,
    typ: 'JWT',
  };

  const iat = Math.floor(Date.now() / 1000);
  const payload = {
    iat,
    exp: iat + 5 * 60,
    aud: '/admin/',
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const body = `${encodedHeader}.${encodedPayload}`;

  const secret = Buffer.from(hexSecret, 'hex');
  const signature = createHmac('sha256', secret).update(body).digest();
  const encodedSignature = base64UrlEncode(signature);

  return `${body}.${encodedSignature}`;
};

export class GhostPublisher implements Publisher {
  constructor(
    private readonly env: BackendEnv,
  ) {
    if (!this.env.GHOST_ADMIN_API_URL || !this.env.GHOST_ADMIN_API_KEY) {
      throw new Error('ghost publisher requires ghost admin api env values');
    }
  }

  // this publisher creates a ghost post and then stores its identity in the internal article registry
  async publishSubmission(input: PublishSubmissionInput): Promise<PublishSubmissionResult> {
    if (!this.env.GHOST_ADMIN_API_URL || !this.env.GHOST_ADMIN_API_KEY) {
      throw new Error('ghost publisher is not configured');
    }

    const jwt = createGhostAdminJwt(this.env.GHOST_ADMIN_API_KEY);
    const slug = `${slugify(input.submission.title)}-${input.submission.id.slice(0, 8)}`;
    const safeAbstractHtml = `<p>${escapeHtml(input.submission.abstract)}</p>`;
    const adminUrl = new URL('/ghost/api/admin/posts/?source=html', this.env.GHOST_ADMIN_API_URL);

    const response = await fetch(adminUrl, {
      method: 'POST',
      headers: {
        authorization: `Ghost ${jwt}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        posts: [
          {
            title: input.submission.title,
            slug,
            html: safeAbstractHtml,
            status: 'published',
            published_at: new Date().toISOString(),
            tags: [input.section.toLowerCase()],
          },
        ],
      }),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => 'unknown error');
      throw new Error(`ghost publish failed with status ${response.status}: ${details}`);
    }

    const payload = (await response.json()) as GhostPostsResponse;
    const post = payload.posts[0];
    if (!post) {
      throw new Error('ghost publish did not return a post payload');
    }

    const article = await input.db.article.upsert({
      where: {
        source_externalId: {
          source: 'GHOST',
          externalId: post.id,
        },
      },
      create: {
        source: 'GHOST',
        externalId: post.id,
        slug: post.slug || slug,
        canonicalPath: `/article/${post.slug || slug}`,
        title: input.submission.title,
        excerpt: input.submission.abstract.slice(0, 320),
        htmlContent: safeAbstractHtml,
        section: input.section,
        authorUserId: input.author.id,
        publishedAt: new Date(),
        pdfStorageKey: input.latestFile?.storageKey ?? null,
        canonicalUrl: post.url ?? null,
      },
      update: {
        slug: post.slug || slug,
        canonicalPath: `/article/${post.slug || slug}`,
        title: input.submission.title,
        excerpt: input.submission.abstract.slice(0, 320),
        htmlContent: safeAbstractHtml,
        section: input.section,
        authorUserId: input.author.id,
        publishedAt: new Date(),
        pdfStorageKey: input.latestFile?.storageKey ?? null,
        canonicalUrl: post.url ?? null,
      },
      select: {
        id: true,
        externalId: true,
        canonicalUrl: true,
      },
    });

    return {
      articleId: article.id,
      source: 'GHOST',
      externalId: article.externalId ?? null,
      canonicalUrl: article.canonicalUrl ?? null,
    };
  }
}
