import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const CACHE_DIR = '/tmp/ghost-image-cache';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const defaultTimeoutMs = Number(process.env.GHOST_IMAGE_TIMEOUT_MS ?? 7000);
const IMAGE_FETCH_TIMEOUT_MS = Number.isFinite(defaultTimeoutMs) && defaultTimeoutMs >= 2000
  ? Math.floor(defaultTimeoutMs)
  : 7000;

const parseHostFromEnv = (rawValue?: string) => {
  const value = rawValue?.trim();
  if (!value) {
    return undefined;
  }

  const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(normalized).hostname;
  } catch {
    return undefined;
  }
};

const configuredGhostHosts = new Set(
  [process.env.GHOST_CONTENT_API_URL, process.env.GHOST_IMAGE_HOST]
    .map((entry) => parseHostFromEnv(entry))
    .filter((entry): entry is string => Boolean(entry)),
);
const ALLOWED_HOSTS = new Set([
  'zeitgeist.host',
  'www.zeitgeist.host',
  'api.zeitgeist.host',
  ...configuredGhostHosts,
]);
const CANDIDATE_HOSTS = [...ALLOWED_HOSTS];

type CachedImageMeta = {
  contentType: string;
  cachedAt: number;
};

type CachedImage = {
  body: Uint8Array;
  contentType: string;
};

type CachedImageResult = {
  image: CachedImage;
  isStale: boolean;
};

const toArrayBuffer = (value: Uint8Array): ArrayBuffer => {
  return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
};

const buildCachePaths = (src: string) => {
  const key = createHash('sha256').update(src).digest('hex');
  return {
    bodyPath: path.join(CACHE_DIR, `${key}.bin`),
    metaPath: path.join(CACHE_DIR, `${key}.json`),
  };
};

const readCachedImage = async (src: string): Promise<CachedImageResult | undefined> => {
  const { bodyPath, metaPath } = buildCachePaths(src);

  try {
    const [body, metaRaw] = await Promise.all([readFile(bodyPath), readFile(metaPath, 'utf8')]);
    const meta = JSON.parse(metaRaw) as CachedImageMeta;

    if (!meta.contentType || !meta.contentType.startsWith('image/')) {
      return undefined;
    }

    const isStale = !meta.cachedAt || Date.now() - meta.cachedAt > CACHE_TTL_MS;

    return {
      image: {
        body: new Uint8Array(body),
        contentType: meta.contentType,
      },
      isStale,
    };
  } catch {
    return undefined;
  }
};

const writeCachedImage = async (src: string, image: CachedImage) => {
  const { bodyPath, metaPath } = buildCachePaths(src);
  await mkdir(CACHE_DIR, { recursive: true });

  const meta: CachedImageMeta = {
    contentType: image.contentType,
    cachedAt: Date.now(),
  };

  await Promise.all([
    writeFile(bodyPath, image.body),
    writeFile(metaPath, JSON.stringify(meta)),
  ]);
};

const normalizeSourceUrl = (raw: string): URL | undefined => {
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return undefined;
    }

    if (!ALLOWED_HOSTS.has(parsed.hostname)) {
      return undefined;
    }

    if (!parsed.pathname.startsWith('/content/')) {
      return undefined;
    }

    return parsed;
  } catch {
    return undefined;
  }
};

const buildCandidateUrls = (source: URL): string[] => {
  const candidates: string[] = [];
  const pushCandidate = (value: string) => {
    if (!candidates.includes(value)) {
      candidates.push(value);
    }
  };

  pushCandidate(source.toString());

  for (const host of CANDIDATE_HOSTS) {
    const next = new URL(source.toString());
    next.hostname = host;
    pushCandidate(next.toString());
  }

  return candidates;
};

const fetchImageCandidate = async (url: string): Promise<CachedImage | undefined> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        accept: 'image/avif,image/webp,image/*,*/*',
      },
    });

    if (!response.ok) {
      return undefined;
    }

    const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!contentType.startsWith('image/')) {
      return undefined;
    }

    const body = new Uint8Array(await response.arrayBuffer());
    if (body.length === 0 || body.length > MAX_IMAGE_BYTES) {
      return undefined;
    }

    return { body, contentType };
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
};

const respondWithImage = (image: CachedImage, cacheStatus: 'hit' | 'stale' | 'miss') => {
  return new Response(toArrayBuffer(image.body), {
    status: 200,
    headers: {
      'Content-Type': image.contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800, stale-if-error=604800',
      'X-ZG-Image-Cache': cacheStatus,
    },
  });
};

export async function GET(request: NextRequest) {
  const rawSource = request.nextUrl.searchParams.get('src')?.trim();
  if (!rawSource) {
    return new Response('missing src', { status: 400 });
  }

  const source = normalizeSourceUrl(rawSource);
  if (!source) {
    return new Response('invalid src', { status: 400 });
  }

  const sourceKey = source.toString();
  const cached = await readCachedImage(sourceKey);
  if (cached && !cached.isStale) {
    return respondWithImage(cached.image, 'hit');
  }

  const staleCachedImage = cached?.isStale ? cached.image : undefined;

  for (const candidateUrl of buildCandidateUrls(source)) {
    const image = await fetchImageCandidate(candidateUrl);
    if (!image) {
      continue;
    }

    await writeCachedImage(sourceKey, image).catch(() => undefined);
    return respondWithImage(image, 'miss');
  }

  if (staleCachedImage) {
    return respondWithImage(staleCachedImage, 'stale');
  }

  return new Response('image unavailable', { status: 404 });
}
