"use client";

import Image from 'next/image';
import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { normalizeDisplayImageUrl } from '../services/content/imageUrl';
import { resolveCardVisualState } from '../services/content/renderPolicy';
import { trackImageLoadError } from '../services/content/observability';

type ContentImageFitMode = 'cover' | 'contain' | 'adaptive';
type ContentImageSurfaceTone = 'light' | 'dark';
type ContentImageShape = 'unknown' | 'portrait' | 'square' | 'landscape';

const MAX_IMAGE_RETRY_ATTEMPTS = 1;

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

type ResolvedContentImageProps = Omit<ContentImageProps, 'src'> & {
  normalizedSrc?: string;
  rawSrc?: string | null;
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

const withRetryAttempt = (imageSrc: string, retryAttempt: number) => {
  if (retryAttempt <= 0) {
    return imageSrc;
  }

  return `${imageSrc}${imageSrc.includes('?') ? '&' : '?'}retry=${retryAttempt}`;
};

const ResolvedContentImage = ({
  rawSrc,
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
  normalizedSrc,
}: ResolvedContentImageProps) => {
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [hasPermanentError, setHasPermanentError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageShape, setImageShape] = useState<ContentImageShape>('unknown');
  const resolvedSrc = useMemo(() => {
    if (!normalizedSrc) {
      return undefined;
    }

    return withRetryAttempt(normalizedSrc, retryAttempt);
  }, [normalizedSrc, retryAttempt]);

  const hasRenderableContent = Boolean(normalizedSrc) && !hasPermanentError;
  const visualState = resolveCardVisualState({
    route,
    component,
    articleId,
    hasRenderableContent,
    requestPlaceholder: requestPlaceholderOnFailure,
  });

  useEffect(() => {
    if (!isDebugEnabled()) {
      return;
    }

    console.info('[content-debug] card-image-state', {
      route,
      component,
      articleId,
      src: rawSrc,
      normalizedSrc,
      resolvedSrc,
      retryAttempt,
      hasPermanentError,
      visualState,
    });
  }, [articleId, component, hasPermanentError, normalizedSrc, rawSrc, resolvedSrc, retryAttempt, route, visualState]);

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

  if (visualState === 'fallback' || !resolvedSrc) {
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
    setHasPermanentError(false);

    if (isDebugEnabled()) {
      console.info('[content-debug] image-loaded', {
        route,
        component,
        articleId,
        resolvedSrc,
        imageShape: nextImageShape,
      });
    }
  };

  const handleError = () => {
    setIsLoaded(false);
    setImageShape('unknown');

    if (normalizedSrc && retryAttempt < MAX_IMAGE_RETRY_ATTEMPTS) {
      setRetryAttempt((currentAttempt) => currentAttempt + 1);

      if (isDebugEnabled()) {
        console.warn('[content-debug] image-retry', {
          route,
          component,
          articleId,
          normalizedSrc,
          nextRetryAttempt: retryAttempt + 1,
        });
      }

      return;
    }

    setHasPermanentError(true);
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
        resolvedSrc,
        retryAttempt,
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
              key={`backdrop:${resolvedSrc}`}
              src={resolvedSrc}
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
            key={`main:${resolvedSrc}`}
            src={resolvedSrc}
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
      key={`cover:${resolvedSrc}`}
      src={resolvedSrc}
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

export const ContentImage = ({
  src,
  ...props
}: ContentImageProps) => {
  const normalizedSrc = useMemo(() => normalizeDisplayImageUrl(src), [src]);

  return (
    <ResolvedContentImage
      key={normalizedSrc ?? '__missing__'}
      rawSrc={src}
      normalizedSrc={normalizedSrc}
      {...props}
    />
  );
};
