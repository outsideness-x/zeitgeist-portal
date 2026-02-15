"use client";

import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { getLikeState, setLikeState } from '@/services/likesService';

type LikeButtonProps = {
  articleId: string;
  baseCount?: number;
};

export const LikeButton = ({ articleId, baseCount = 0 }: LikeButtonProps): JSX.Element => {
  const [liked, setLiked] = useState<boolean>(() => getLikeState(articleId).liked);
  const displayCount = baseCount + (liked ? 1 : 0);

  useEffect(() => {
    setLiked(getLikeState(articleId).liked);
  }, [articleId]);

  const handleToggle = (): void => {
    const nextLiked = !liked;
    setLiked((prevLiked) => !prevLiked);
    setLikeState(articleId, nextLiked);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={liked ? 'убрать лайк' : 'поставить лайк'}
      aria-pressed={liked}
      className={`inline-flex min-h-11 min-w-11 items-center gap-2 rounded-md p-2 text-sm transition-opacity duration-200 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        liked
          ? 'text-accent dark:text-accent'
          : 'text-ink dark:text-gray-300'
      }`}
    >
      <span className="inline-flex h-11 w-11 items-center justify-center" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill={liked ? 'currentColor' : 'none'}
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
      <span className="font-sans text-xs uppercase tracking-wider">{displayCount}</span>
    </button>
  );
};
