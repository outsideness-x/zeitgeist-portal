import { describe, expect, it } from 'vitest';
import { normalizeDisplayImageUrl, normalizeGhostAssetUrl } from '../../services/content/imageUrl.ts';

describe('ghost image url normalization', () => {
  it('normalizes relative ghost uploads to proxy URL', () => {
    const normalized = normalizeGhostAssetUrl('/content/images/2026/02/cover image.jpg', {
      ghostContentOrigin: 'https://api.zeitgeist.host/ghost/api/content/',
    });

    expect(normalized).toBe(
      '/api/ghost-image?src=https%3A%2F%2Fapi.zeitgeist.host%2Fcontent%2Fimages%2F2026%2F02%2Fcover%2520image.jpg',
    );
  });

  it('normalizes protocol-relative and http URLs to https', () => {
    expect(normalizeDisplayImageUrl('//api.zeitgeist.host/content/images/cover.jpg')).toBe(
      'https://api.zeitgeist.host/content/images/cover.jpg',
    );

    expect(normalizeDisplayImageUrl('http://api.zeitgeist.host/content/images/cover.jpg')).toBe(
      'https://api.zeitgeist.host/content/images/cover.jpg',
    );
  });

  it('returns undefined for invalid URL values', () => {
    expect(normalizeDisplayImageUrl('not a url')).toBeUndefined();
    expect(normalizeGhostAssetUrl('')).toBeUndefined();
    expect(normalizeGhostAssetUrl('   ')).toBeUndefined();
  });

  it('keeps already proxied urls intact', () => {
    expect(normalizeGhostAssetUrl('/api/ghost-image?src=https%3A%2F%2Fapi.zeitgeist.host%2Fcontent%2Fimages%2Fa.jpg')).toBe(
      '/api/ghost-image?src=https%3A%2F%2Fapi.zeitgeist.host%2Fcontent%2Fimages%2Fa.jpg',
    );
  });
});
