"use client";

import { useRef, useState } from 'react';
import type { JSX, PointerEvent } from 'react';
import { ContentImage } from '@/components/ContentImage';
import type { ArticleCarouselImage } from '@/types';

type ImageCarouselProps = {
  images: ArticleCarouselImage[];
  alt: string;
  fit?: 'cover' | 'contain';
};

export const ImageCarousel = ({ images, alt, fit = 'cover' }: ImageCarouselProps): JSX.Element | null => {
  const [activeIndex, setActiveIndex] = useState(0);
  const pointerStartX = useRef<number | null>(null);
  const imageClassName = fit === 'contain' ? 'object-contain' : 'object-cover';

  if (images.length === 0) {
    return null;
  }

  const activeImage = images[activeIndex] ?? images[0];

  if (images.length === 1) {
    return (
      <section className="mt-8" aria-label="изображение статьи">
        <div className="relative h-[34vh] sm:h-[40vh] md:h-[48vh] overflow-hidden rounded-xl bg-sepia/30 dark:bg-card-bg/80">
          <ContentImage
            src={images[0].src}
            alt={images[0].alt || alt}
            route="/article"
            component="ImageCarousel"
            fill
            sizes="(max-width: 768px) 100vw, 900px"
            className={imageClassName}
            fallbackLabel="изображение недоступно"
          />
        </div>
        {images[0].captionHtml && (
          <div
            className="mt-3 text-center text-sm text-gray-600 dark:text-gray-400"
            dangerouslySetInnerHTML={{ __html: images[0].captionHtml }}
          />
        )}
      </section>
    );
  }

  const goPrev = (): void => {
    setActiveIndex((current) => (current - 1 + images.length) % images.length);
  };

  const goNext = (): void => {
    setActiveIndex((current) => (current + 1) % images.length);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    pointerStartX.current = event.clientX;
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    if (pointerStartX.current === null) {
      return;
    }

    // this keeps swipe navigation predictable on touch and mouse pointers
    const delta = event.clientX - pointerStartX.current;
    if (Math.abs(delta) > 40) {
      if (delta > 0) {
        goPrev();
      } else {
        goNext();
      }
    }

    pointerStartX.current = null;
  };

  return (
    <section
      className="mt-8"
      aria-label="галерея статьи"
    >
      <div
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            goPrev();
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            goNext();
          }
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className="relative overflow-hidden rounded-xl bg-sepia/30 dark:bg-card-bg/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
      >
        <div className="relative h-[34vh] sm:h-[40vh] md:h-[48vh]">
          <ContentImage
            src={activeImage.src}
            alt={activeImage.alt || `${alt} — изображение ${activeIndex + 1}`}
            route="/article"
            component="ImageCarousel"
            fill
            sizes="(max-width: 768px) 100vw, 900px"
            className={imageClassName}
            fallbackLabel="изображение недоступно"
          />
        </div>

        <button
          type="button"
          onClick={goPrev}
          aria-label="предыдущее изображение"
          className="absolute left-4 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 dark:bg-black/35"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <button
          type="button"
          onClick={goNext}
          aria-label="следующее изображение"
          className="absolute right-4 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 dark:bg-black/35"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
          </svg>
        </button>

        <div className="absolute right-4 top-4 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-sans text-white backdrop-blur-sm dark:bg-black/35">
          {activeIndex + 1} / {images.length}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2" aria-hidden="true">
        {images.map((image, index) => (
          <button
            key={`${image.src}-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`rounded-full transition-all ${
              index === activeIndex ? 'h-1.5 w-4 bg-ink/80 dark:bg-gray-200' : 'h-1.5 w-1.5 bg-gray-300 dark:bg-gray-600'
            }`}
            tabIndex={-1}
          />
        ))}
      </div>

      {activeImage.captionHtml && (
        <div
          className="mt-3 text-center text-sm text-gray-600 dark:text-gray-400"
          dangerouslySetInnerHTML={{ __html: activeImage.captionHtml }}
        />
      )}
    </section>
  );
};
