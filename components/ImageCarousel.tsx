"use client";

import { useRef, useState } from 'react';
import type { JSX, PointerEvent } from 'react';
import { ContentImage } from '@/components/ContentImage';

type ImageCarouselProps = {
  images: string[];
  alt: string;
};

export const ImageCarousel = ({ images, alt }: ImageCarouselProps): JSX.Element | null => {
  const [activeIndex, setActiveIndex] = useState(0);
  const pointerStartX = useRef<number | null>(null);

  if (images.length === 0) {
    return null;
  }

  if (images.length === 1) {
    return (
      <section className="mt-8" aria-label="изображение статьи">
        <div className="relative h-[34vh] sm:h-[40vh] md:h-[48vh] overflow-hidden rounded-lg border border-sepia bg-paper dark:border-gray-800 dark:bg-card-bg">
          <ContentImage
            src={images[0]}
            alt={alt}
            route="/article"
            component="ImageCarousel"
            fill
            sizes="(max-width: 768px) 100vw, 900px"
            className="object-cover"
            fallbackLabel="изображение недоступно"
          />
        </div>
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
        className="relative overflow-hidden border border-sepia bg-paper dark:border-gray-800 dark:bg-card-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <div className="relative h-[34vh] sm:h-[40vh] md:h-[48vh]">
          <ContentImage
            src={images[activeIndex]}
            alt={`${alt} — изображение ${activeIndex + 1}`}
            route="/article"
            component="ImageCarousel"
            fill
            sizes="(max-width: 768px) 100vw, 900px"
            className="object-cover"
            fallbackLabel="изображение недоступно"
          />
        </div>

        <button
          type="button"
          onClick={goPrev}
          aria-label="предыдущее изображение"
          className="absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-sepia bg-paper/80 text-ink transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:border-gray-700 dark:bg-[#121212]/70 dark:text-gray-200"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <button
          type="button"
          onClick={goNext}
          aria-label="следующее изображение"
          className="absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-sepia bg-paper/80 text-ink transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:border-gray-700 dark:bg-[#121212]/70 dark:text-gray-200"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
          </svg>
        </button>

        <div className="absolute right-3 top-3 rounded border border-sepia bg-paper/80 px-2 py-1 text-xs font-sans dark:border-gray-700 dark:bg-[#121212]/70">
          {activeIndex + 1} / {images.length}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2" aria-hidden="true">
        {images.map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`h-2 w-2 rounded-full border border-sepia dark:border-gray-700 ${index === activeIndex ? 'bg-ink dark:bg-gray-300' : 'bg-transparent'}`}
            tabIndex={-1}
          />
        ))}
      </div>
    </section>
  );
};
