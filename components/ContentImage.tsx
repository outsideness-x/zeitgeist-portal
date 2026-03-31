"use client";

import Image from 'next/image';
import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { normalizeDisplayImageUrl } from '../services/content/imageUrl';
import { resolveCardVisualState } from '../services/content/renderPolicy';
import { trackImageLoadError } from '../services/content/observability';

type ContentImageFitMode = 'cover' | 'contain' | 'adaptive';
type ContentImageSurfaceTone = 'light' | 'dark';
type ContentImageShape = 'unknown' | 'portrait' | 'square' | 'landscape';

type ContentImageProps = {
  src?: string | null;
  alt: string;
  route: string;
  component: string;
  articleId?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
  width?: number;
  height?: number;
  loading?: 'eager' | 'lazy';
  requestPlaceholderOnFailure?: boolean;
  fallbackLabel?: string;
  fallbackClassName?: string;
  placeholderClassName?: string;
  fitMode?: ContentImageFitMode;
  surfaceTone?: ContentImageSurfaceTone;
};

const isDebugEnabled = () => {
  return process.env.NEXT_PUBLIC_CONTENT_DEBUG_LOGS === '1' || process.env.CONTENT_DEBUG_LOGS === '1';
};

const joinClassNames = (...values: Array<string | false | null | undefined>) => {
  return values.filter(Boolean).join(' ');
};

const resolveImageShape = (naturalWidth: number, naturalHeight: number): ContentImageShape => {
  if (!(naturalWidth > 0) || !(naturalHeight > 0)) {
    return 'unknown';
  }

  const ratio = naturalWidth / naturalHeight;

  if (ratio < 0.88) {
    return 'portrait';
  }

  if (ratio <= 1.15) {
    return 'square';
  }

  return 'landscape';
};

export const ContentImage = ({
  src,
  alt,
  route,
  component,
  articleId,
  className,
  sizes,
  priority = false,
  fill = true,
  width,
  height,
  loading = 'lazy',
  requestPlaceholderOnFailure = true,
  fallbackLabel = 'обложка недоступна',
  fallbackClassName,
  placeholderClassName,
  fitMode = 'cover',
  surfaceTone = 'light',
}: ContentImageProps) => {
  const normalizedSrc = useMemo(() => normalizeDisplayImageUrl(src), [src]);
  const [errorSrc, setErrorSrc] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageShape, setImageShape] = useState<ContentImageShape>('unknown');
  const hasError = Boolean(normalizedSrc) && errorSrc === normalizedSrc;

  const hasRenderableContent = Boolean(normalizedSrc) && !hasError;
  const visualState = resolveCardVisualState({
    route,
    component,
    articleId,
    hasRenderableContent,
    requestPlaceholder: requestPlaceholderOnFailure,
  });

  useEffect(() => {
    setErrorSrc(null);
    setIsLoaded(false);
    setImageShape('unknown');
  }, [normalizedSrc]);

  useEffect(() => {
    if (!isDebugEnabled()) {
      return;
    }

    console.info('[content-debug] card-image-state', {
      route,
      component,
      articleId,
      src,
      normalizedSrc,
      hasError,
      visualState,
    });
  }, [articleId, component, hasError, normalizedSrc, route, src, visualState]);

  if (visualState === 'placeholder') {
    return (
      <div
        data-placeholder-card="true"
        className={placeholderClassName ?? 'flex h-full items-center justify-center bg-stone-200/70 text-[11px] uppercase tracking-widest text-gray-500 animate-pulse'}
      >
        image loading
      </div>
    );
  }

  if (visualState === 'fallback' || !normalizedSrc) {
    return (
      <div className={fallbackClassName ?? 'flex h-full items-center justify-center px-6 text-center font-sans text-sm uppercase tracking-widest text-gray-500'}>
        {fallbackLabel}
      </div>
    );
  }

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const nextImageShape = resolveImageShape(
      event.currentTarget.naturalWidth,
      event.currentTarget.naturalHeight
    );

    setImageShape(nextImageShape);
    setIsLoaded(true);

    if (isDebugEnabled()) {
      console.info('[content-debug] image-loaded', {
        route,
        component,
        articleId,
        normalizedSrc,
        imageShape: nextImageShape,
      });
    }
  };

  const handleError = () => {
    setErrorSrc(normalizedSrc ?? '__missing__');
    setIsLoaded(false);
    setImageShape('unknown');
    trackImageLoadError({
      route,
      component,
      articleId,
      reason: normalizedSrc,
    });

    if (isDebugEnabled()) {
      console.warn('[content-debug] image-error', {
        route,
        component,
        articleId,
        normalizedSrc,
      });
    }
  };

  const shouldUseBackdrop = fitMode === 'contain' || (fitMode === 'adaptive' && imageShape !== 'landscape');
  const resolvedFitMode = fitMode === 'contain' || (fitMode === 'adaptive' && imageShape !== 'landscape')
    ? 'contain'
    : 'cover';

  if (fitMode !== 'cover') {
    return (
      <div
        className="content-image-shell"
        data-fit-mode={fitMode}
        data-surface-tone={surfaceTone}
        data-image-shape={imageShape}
        data-loaded={isLoaded ? 'true' : 'false'}
        data-has-backdrop={shouldUseBackdrop ? 'true' : 'false'}
      >
        {shouldUseBackdrop ? (
          <>
            <Image
              src={normalizedSrc}
              alt=""
              aria-hidden="true"
              sizes={sizes}
              priority={false}
              loading={priority ? undefined : loading}
              fill
              className="content-image-backdrop"
            />
            <div aria-hidden="true" className="content-image-backdrop-wash" />
            <div aria-hidden="true" className="content-image-backdrop-shade" />
          </>
        ) : null}

        <div className="content-image-main-frame">
          <Image
            src={normalizedSrc}
            alt={alt}
            sizes={sizes}
            priority={priority}
            loading={priority ? undefined : loading}
            fill
            className={joinClassNames(
              'content-image-main h-full w-full object-center',
              resolvedFitMode === 'contain' ? 'object-contain' : 'object-cover',
              className
            )}
            onLoad={handleLoad}
            onError={handleError}
          />
        </div>
      </div>
    );
  }

  return (
    <Image
      src={normalizedSrc}
      alt={alt}
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : loading}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
      {...(fill ? { fill: true } : { width: width ?? 1200, height: height ?? 630 })}
    />
  );
};
