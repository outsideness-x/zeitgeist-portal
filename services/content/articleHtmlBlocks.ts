import type { ArticleCarouselImage } from '@/types';

export type ArticleContentBlock =
  | {
    type: 'html';
    html: string;
  }
  | {
    type: 'carousel';
    images: ArticleCarouselImage[];
  };

type ImageFigureMatch = {
  start: number;
  end: number;
  image?: ArticleCarouselImage;
};

const IMAGE_FIGURE_PATTERN = /<figure\b[^>]*class=(["'])[^"']*\bkg-image-card\b[^"']*\1[^>]*>[\s\S]*?<\/figure>/gi;
const FIGCAPTION_PATTERN = /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i;
const SKIPPABLE_GAP_PATTERN = /^(?:\s|<!--[\s\S]*?-->|<br\s*\/?>|<p>\s*(?:&nbsp;|&#160;|\s)*<\/p>)*$/i;

const extractAttribute = (value: string, attributeName: string): string | undefined => {
  const pattern = new RegExp(`\\b${attributeName}\\s*=\\s*(['"])([\\s\\S]*?)\\1`, 'i');
  const match = value.match(pattern);
  return match?.[2];
};

const decodeHtmlEntities = (value: string): string => {
  return value
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;/gi, '\'')
    .replace(/&#39;/gi, '\'')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ');
};

const extractImageFigureData = (html: string, fallbackAlt: string): ArticleCarouselImage | undefined => {
  const imageTagMatch = html.match(/<img\b[^>]*>/i);
  if (!imageTagMatch) {
    return undefined;
  }

  const src = extractAttribute(imageTagMatch[0], 'src')?.trim();
  if (!src) {
    return undefined;
  }

  const alt = decodeHtmlEntities(extractAttribute(imageTagMatch[0], 'alt')?.trim() || fallbackAlt);
  const captionMatch = html.match(FIGCAPTION_PATTERN);
  const captionHtml = captionMatch?.[1]?.trim() || undefined;

  return {
    src,
    alt,
    captionHtml,
  };
};

const extractImageFigureMatches = (html: string, fallbackAlt: string): ImageFigureMatch[] => {
  const matches: ImageFigureMatch[] = [];

  for (const match of html.matchAll(IMAGE_FIGURE_PATTERN)) {
    const figureHtml = match[0];
    const start = match.index;
    if (typeof start !== 'number') {
      continue;
    }

    matches.push({
      start,
      end: start + figureHtml.length,
      image: extractImageFigureData(figureHtml, fallbackAlt),
    });
  }

  return matches;
};

const isSkippableGap = (value: string): boolean => {
  return SKIPPABLE_GAP_PATTERN.test(value);
};

const pushHtmlBlock = (blocks: ArticleContentBlock[], html: string): void => {
  if (!html.trim()) {
    return;
  }

  blocks.push({
    type: 'html',
    html,
  });
};

export const buildArticleContentBlocks = (html: string, fallbackAlt: string): ArticleContentBlock[] => {
  const figureMatches = extractImageFigureMatches(html, fallbackAlt);
  if (figureMatches.length < 2) {
    return [{ type: 'html', html }];
  }

  const carouselRanges: Array<{ start: number; end: number; images: ArticleCarouselImage[] }> = [];
  let clusterStart = 0;

  const flushCluster = (endIndex: number) => {
    const cluster = figureMatches.slice(clusterStart, endIndex);
    clusterStart = endIndex;

    if (cluster.length < 2) {
      return;
    }

    const images = cluster
      .map((item) => item.image)
      .filter((item): item is ArticleCarouselImage => Boolean(item));

    if (images.length !== cluster.length) {
      return;
    }

    carouselRanges.push({
      start: cluster[0].start,
      end: cluster[cluster.length - 1].end,
      images,
    });
  };

  for (let index = 1; index < figureMatches.length; index += 1) {
    const previous = figureMatches[index - 1];
    const current = figureMatches[index];
    const gap = html.slice(previous.end, current.start);

    if (!isSkippableGap(gap)) {
      flushCluster(index);
    }
  }

  flushCluster(figureMatches.length);

  if (carouselRanges.length === 0) {
    return [{ type: 'html', html }];
  }

  const blocks: ArticleContentBlock[] = [];
  let lastIndex = 0;

  for (const range of carouselRanges) {
    pushHtmlBlock(blocks, html.slice(lastIndex, range.start));
    blocks.push({
      type: 'carousel',
      images: range.images,
    });
    lastIndex = range.end;
  }

  pushHtmlBlock(blocks, html.slice(lastIndex));

  return blocks;
};
