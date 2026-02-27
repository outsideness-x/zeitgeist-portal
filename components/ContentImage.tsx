"use client";

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { normalizeDisplayImageUrl } from '../services/content/imageUrl';
import { resolveCardVisualState } from '../services/content/renderPolicy';
import { trackImageLoadError } from '../services/content/observability';

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
};

const isDebugEnabled = () => {
  return process.env.NEXT_PUBLIC_CONTENT_DEBUG_LOGS === '1' || process.env.CONTENT_DEBUG_LOGS === '1';
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
}: ContentImageProps) => {
  const normalizedSrc = useMemo(() => normalizeDisplayImageUrl(src), [src]);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [normalizedSrc]);

  const hasRenderableContent = Boolean(normalizedSrc) && !hasError;
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

  return (
    <Image
      src={normalizedSrc}
      alt={alt}
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : loading}
      className={className}
      onLoad={() => {
        if (isDebugEnabled()) {
          console.info('[content-debug] image-loaded', {
            route,
            component,
            articleId,
            normalizedSrc,
          });
        }
      }}
      onError={() => {
        setHasError(true);
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
      }}
      {...(fill ? { fill: true } : { width: width ?? 1200, height: height ?? 630 })}
    />
  );
};
