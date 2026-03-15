import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ContentImage } from '../../components/ContentImage.tsx';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    return React.createElement('img', {
      ...props,
      alt: typeof props.alt === 'string' ? props.alt : '',
    });
  },
}));

describe('ContentImage component policy integration', () => {
  it('does not render placeholder cards outside library', () => {
    const markup = renderToStaticMarkup(
      React.createElement(ContentImage, {
        alt: 'article',
        route: '/journal',
        component: 'ArticleCard',
      }),
    );

    expect(markup).toContain('обложка недоступна');
    expect(markup).not.toContain('data-placeholder-card');
  });

  it('allows placeholder cards in library route', () => {
    const markup = renderToStaticMarkup(
      React.createElement(ContentImage, {
        alt: 'book',
        route: '/library',
        component: 'LibraryCard',
      }),
    );

    expect(markup).toContain('data-placeholder-card="true"');
  });
});
