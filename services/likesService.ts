export type LikeState = {
  liked: boolean;
};

const STORAGE_KEY = 'zeitgeist_likes';

const fallbackLikeState: LikeState = { liked: false };

const readAllLikes = (): Record<string, LikeState> => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, Partial<LikeState>>;
    return Object.entries(parsed).reduce<Record<string, LikeState>>((acc, [articleId, state]) => {
      acc[articleId] = { liked: Boolean(state.liked) };
      return acc;
    }, {});
  } catch {
    return {};
  }
};

const writeAllLikes = (likes: Record<string, LikeState>): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(likes));
  } catch {
    return;
  }
};

export const getLikeState = (articleId: string): LikeState => {
  const likes = readAllLikes();
  return likes[articleId] ?? fallbackLikeState;
};

export const setLikeState = (articleId: string, liked: boolean): LikeState => {
  const likes = readAllLikes();
  const next = { liked };
  likes[articleId] = next;
  writeAllLikes(likes);
  return next;
};

export const toggleLike = (articleId: string): LikeState => {
  const current = getLikeState(articleId);
  return setLikeState(articleId, !current.liked);
};

export const getDisplayLikeCount = (articleId: string, baseCount: number): number => {
  const state = getLikeState(articleId);
  const base = Number.isFinite(baseCount) ? baseCount : 0;
  return base + (state.liked ? 1 : 0);
};
