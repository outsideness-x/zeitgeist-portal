export type LikeState = {
  liked: boolean;
};

const STORAGE_PREFIX = 'zeitgeist:likes';

const getStorageKey = (articleId: string) => `${STORAGE_PREFIX}:${articleId}`;

const fallbackLikeState: LikeState = { liked: false };

const readState = (articleId: string): LikeState => {
  if (typeof window === 'undefined') {
    return fallbackLikeState;
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(articleId));
    if (!raw) {
      return fallbackLikeState;
    }

    const parsed = JSON.parse(raw) as Partial<LikeState>;
    return { liked: Boolean(parsed.liked) };
  } catch {
    return fallbackLikeState;
  }
};

const writeState = (articleId: string, state: LikeState) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(getStorageKey(articleId), JSON.stringify(state));
  } catch {
    return;
  }
};

const getDeterministicBaseCount = (articleId: string): number => {
  let hash = 0;
  for (let index = 0; index < articleId.length; index += 1) {
    hash = (hash * 31 + articleId.charCodeAt(index)) >>> 0;
  }
  return 12 + (hash % 37);
};

export const getLikeState = (articleId: string): LikeState => {
  return readState(articleId);
};

export const toggleLike = (articleId: string): LikeState => {
  const current = readState(articleId);
  const next = { liked: !current.liked };
  writeState(articleId, next);
  return next;
};

export const getDisplayLikeCount = (articleId: string, baseCount?: number): number => {
  const base = typeof baseCount === 'number' ? baseCount : getDeterministicBaseCount(articleId);
  const state = readState(articleId);
  return base + (state.liked ? 1 : 0);
};
