"use client";

import { useEffect } from 'react';

const HOVER_TARGETS = 'a, button, [role="button"], label, input, textarea, select, .card, .article-card, [data-cursor-hover]';
const DARK_TARGETS = '[data-cursor-dark]';

const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

export const CustomCursor = () => {
  useEffect(() => {
    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');

    if (!dot || !ring) {
      return;
    }

    const canUseCustomCursor = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const root = document.documentElement;
    const { body } = document;

    if (!canUseCustomCursor) {
      root.classList.remove('has-custom-cursor');
      body.classList.remove('cursor-hover', 'cursor-dark');
      dot.style.display = 'none';
      ring.style.display = 'none';
      return;
    }

    root.classList.add('has-custom-cursor');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let frameId = 0;
    let isVisible = false;

    const syncContext = (element: Element | null) => {
      body.classList.toggle('cursor-hover', Boolean(element?.closest(HOVER_TARGETS)));
      body.classList.toggle('cursor-dark', Boolean(element?.closest(DARK_TARGETS)));
    };

    const setVisibility = (visible: boolean) => {
      const nextOpacity = visible ? '1' : '0';
      dot.style.opacity = nextOpacity;
      ring.style.opacity = nextOpacity;
    };

    const updateContextFromPoint = () => {
      syncContext(document.elementFromPoint(mouseX, mouseY));
    };

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      dot.style.left = `${mouseX}px`;
      dot.style.top = `${mouseY}px`;

      if (!isVisible) {
        isVisible = true;
        setVisibility(true);
      }

      syncContext(event.target instanceof Element ? event.target : null);
    };

    const handleMouseEnter = () => {
      isVisible = true;
      setVisibility(true);
      updateContextFromPoint();
    };

    const handleMouseLeave = () => {
      isVisible = false;
      setVisibility(false);
      body.classList.remove('cursor-hover', 'cursor-dark');
    };

    const animateRing = () => {
      ringX = lerp(ringX, mouseX, 0.12);
      ringY = lerp(ringY, mouseY, 0.12);
      ring.style.left = `${ringX}px`;
      ring.style.top = `${ringY}px`;
      frameId = window.requestAnimationFrame(animateRing);
    };

    const handleScroll = () => {
      if (isVisible) {
        updateContextFromPoint();
      }
    };

    frameId = window.requestAnimationFrame(animateRing);
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('blur', handleMouseLeave);

    return () => {
      window.cancelAnimationFrame(frameId);
      root.classList.remove('has-custom-cursor');
      body.classList.remove('cursor-hover', 'cursor-dark');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('blur', handleMouseLeave);
    };
  }, []);

  return (
    <>
      <div id="cursor-dot" aria-hidden="true" />
      <div id="cursor-ring" aria-hidden="true" />
    </>
  );
};
