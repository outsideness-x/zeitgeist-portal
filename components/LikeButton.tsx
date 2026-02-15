"use client";

import { useState } from 'react';
import { getDisplayLikeCount, getLikeState, toggleLike } from '@/services/likesService';

type LikeButtonProps = {
  articleId: string;
  baseCount?: number;
};

export const LikeButton = ({ articleId, baseCount }: LikeButtonProps) => {
  const [, setRenderTick] = useState(0);
  const state = getLikeState(articleId);
  const count = getDisplayLikeCount(articleId, baseCount);

  const handleToggle = () => {
    toggleLike(articleId);
    setRenderTick((current) => current + 1);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={state.liked ? 'убрать отметку нравится' : 'поставить нравится'}
      aria-pressed={state.liked}
      className={`inline-flex min-h-11 items-center gap-2 rounded-md border border-sepia px-3 py-2 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        state.liked
          ? 'text-accent hover:border-accent dark:text-accent'
          : 'text-ink hover:border-accent dark:text-gray-300'
      }`}
    >
      <span className="inline-flex h-11 w-11 items-center justify-center" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill={state.liked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12.62 20.2a1 1 0 0 1-1.24 0C7.43 17.1 4 14.37 4 10.47A4.47 4.47 0 0 1 8.47 6c1.38 0 2.7.64 3.53 1.73A4.45 4.45 0 0 1 15.53 6 4.47 4.47 0 0 1 20 10.47c0 3.9-3.43 6.63-7.38 9.73Z"
          />
        </svg>
      </span>
      <span className="font-sans text-xs uppercase tracking-wider">{count}</span>
    </button>
  );
};
