import { beforeEach, describe, expect, it } from 'vitest';
import {
  allowCardPlaceholder,
  isLibraryRoute,
  resolveCardVisualState,
  resolveCollectionVisualState,
} from '../../services/content/renderPolicy.ts';
import { getContentTelemetrySnapshot, resetContentTelemetry } from '../../services/content/observability.ts';

describe('content render policy', () => {
  beforeEach(() => {
    resetContentTelemetry();
  });

  it('allows card placeholders only for library routes', () => {
    expect(isLibraryRoute('/library')).toBe(true);
    expect(isLibraryRoute('/library/atlas')).toBe(true);
    expect(isLibraryRoute('/journal')).toBe(false);

    expect(allowCardPlaceholder('/library')).toBe(true);
    expect(allowCardPlaceholder('/research')).toBe(false);
  });

  it('blocks placeholder cards outside library and falls back to static card UI', () => {
    const state = resolveCardVisualState({
      route: '/journal',
      component: 'ArticleCard',
      articleId: 'a-1',
      hasRenderableContent: false,
      requestPlaceholder: true,
    });

    expect(state).toBe('fallback');

    const telemetry = getContentTelemetrySnapshot();
    expect(telemetry['placeholder-blocked|/journal|ArticleCard']).toBe(1);
  });

  it('allows placeholder cards in library route', () => {
    const state = resolveCardVisualState({
      route: '/library',
      component: 'LibraryCard',
      articleId: 'book-1',
      hasRenderableContent: false,
      requestPlaceholder: true,
    });

    expect(state).toBe('placeholder');
  });

  it('keeps content visible when data already exists during stale/error updates', () => {
    expect(resolveCollectionVisualState({
      itemsCount: 5,
      fetchMeta: {
        status: 'stale',
        fromFallback: true,
      },
    })).toBe('content');

    expect(resolveCollectionVisualState({
      itemsCount: 5,
      fetchMeta: {
        status: 'error',
        fromFallback: false,
        reason: 'ghost response 503',
      },
    })).toBe('content');
  });

  it('separates empty and error states when no items are available', () => {
    expect(resolveCollectionVisualState({
      itemsCount: 0,
      fetchMeta: {
        status: 'success',
        fromFallback: false,
      },
    })).toBe('empty');

    expect(resolveCollectionVisualState({
      itemsCount: 0,
      fetchMeta: {
        status: 'error',
        fromFallback: false,
        reason: 'ghost response 500',
      },
    })).toBe('error');

    expect(resolveCollectionVisualState({
      itemsCount: 0,
      fetchMeta: {
        status: 'stale',
        fromFallback: true,
        reason: 'ghost response 503',
      },
    })).toBe('error');
  });
});
