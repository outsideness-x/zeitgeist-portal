const DEFAULT_GHOST_CONTENT_ORIGIN = 'https://api.zeitgeist.host';
const DEFAULT_PROXY_PATH = '/api/ghost-image';
const INTERNAL_BASE = 'https://internal.zeitgeist.local';

type NormalizeDisplayOptions = {
  forceHttps?: boolean;
};

type NormalizeGhostAssetOptions = NormalizeDisplayOptions & {
  ghostContentOrigin?: string;
  proxyPath?: string;
};

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const shouldForceHttps = (url: URL, forceHttps: boolean) => {
  return forceHttps && url.protocol === 'http:' && !LOCAL_HOSTS.has(url.hostname);
};

const maybeForceHttps = (url: URL, forceHttps: boolean) => {
  if (!shouldForceHttps(url, forceHttps)) {
    return url;
  }

  const next = new URL(url.toString());
  next.protocol = 'https:';
  return next;
};

const normalizeOrigin = (rawOrigin?: string) => {
  const value = rawOrigin?.trim();
  if (!value) {
    return DEFAULT_GHOST_CONTENT_ORIGIN;
  }

  try {
    return new URL(value).origin;
  } catch {
    return DEFAULT_GHOST_CONTENT_ORIGIN;
  }
};

const normalizeRelativeUrl = (value: string) => {
  const parsed = new URL(value.startsWith('/') ? value : `/${value}`, INTERNAL_BASE);
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
};

const toAbsoluteUrl = (value: string): URL | undefined => {
  const normalized = value.startsWith('//') ? `https:${value}` : value;

  try {
    return new URL(normalized);
  } catch {
    return undefined;
  }
};

export const normalizeDisplayImageUrl = (rawValue?: string | null, options?: NormalizeDisplayOptions): string | undefined => {
  if (!rawValue) {
    return undefined;
  }

  const value = rawValue.trim();
  if (!value) {
    return undefined;
  }

  if (value.startsWith('/')) {
    return normalizeRelativeUrl(value);
  }

  const absolute = toAbsoluteUrl(value);
  if (!absolute) {
    return undefined;
  }

  return maybeForceHttps(absolute, options?.forceHttps ?? true).toString();
};

export const normalizeGhostAssetUrl = (rawValue?: string | null, options?: NormalizeGhostAssetOptions): string | undefined => {
  if (!rawValue) {
    return undefined;
  }

  const value = rawValue.trim();
  if (!value) {
    return undefined;
  }

  if (value.startsWith(`${DEFAULT_PROXY_PATH}?`) || value.startsWith('/api/ghost-image?')) {
    return normalizeRelativeUrl(value);
  }

  const ghostOrigin = normalizeOrigin(options?.ghostContentOrigin);
  const proxyPath = options?.proxyPath?.trim() || DEFAULT_PROXY_PATH;
  const forceHttps = options?.forceHttps ?? true;
  const toProxyUrl = (sourceUrl: string) => `${proxyPath}?src=${encodeURIComponent(sourceUrl)}`;

  if (value.startsWith('/content/') || value.startsWith('content/')) {
    const sourceUrl = new URL(value.startsWith('/') ? value : `/${value}`, ghostOrigin);
    const normalizedSource = maybeForceHttps(sourceUrl, forceHttps).toString();
    return toProxyUrl(normalizedSource);
  }

  if (value.startsWith('/')) {
    return normalizeRelativeUrl(value);
  }

  const absolute = toAbsoluteUrl(value);
  if (!absolute) {
    return undefined;
  }

  const normalizedAbsolute = maybeForceHttps(absolute, forceHttps);
  if (normalizedAbsolute.pathname.startsWith('/content/')) {
    return toProxyUrl(normalizedAbsolute.toString());
  }

  return normalizedAbsolute.toString();
};
