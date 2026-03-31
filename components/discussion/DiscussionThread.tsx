"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { UserAvatar } from '@/components/UserAvatar';
import { backendRequest } from '@/services/backend/client';

type DiscussionTargetType = 'article' | 'product';
type DiscussionSort = 'newest' | 'oldest';

type DiscussionItem = {
  id: string;
  targetType: DiscussionTargetType;
  targetId: string;
  parentId: string | null;
  depth: number;
  content: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    avatarDataUrl?: string | null;
  };
  viewer: {
    liked: boolean;
    canDelete: boolean;
    canReply: boolean;
    canLike: boolean;
  };
  replies: DiscussionItem[];
};

type DiscussionListResponse = {
  items: DiscussionItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sort: DiscussionSort;
  maxDepth: number;
};

type EnsureArticlePayload = {
  source: 'local' | 'ghost';
  externalId?: string;
  slug: string;
  title: string;
  excerpt: string;
  section: 'journal' | 'research' | 'nova';
  canonicalPath: string;
  featureImage?: string;
};

type EnsureArticleResponse = {
  articleId: string;
};

type ToggleLikeResponse = {
  likeCount: number;
  viewer: {
    liked: boolean;
  };
};

type ArticleCommentsSectionProps = {
  article: {
    id: string;
    source?: 'local' | 'ghost';
    externalId?: string;
    slug?: string;
    canonicalPath?: string;
    title: string;
    excerpt: string;
    type: 'journal' | 'research' | 'nova';
    feature_image?: string;
    internalArticleId?: string;
  };
};

type ProductReviewsSectionProps = {
  productSlug: string;
};

type DiscussionThreadProps = {
  targetType: DiscussionTargetType;
  targetId?: string;
  ensureArticlePayload?: EnsureArticlePayload;
  heading: string;
  subheading: string;
  inputPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
  submitLabel: string;
};

const MAX_DISCUSSION_LENGTH = 4000;
const MIN_DISCUSSION_LENGTH = 2;

const openAuthModal = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent('zg:open-auth-modal'));
};

const formatDateTime = (value: string): string => {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return 'только что';
  }

  return new Date(parsed).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const autoResizeTextarea = (element: HTMLTextAreaElement) => {
  element.style.height = '0px';
  element.style.height = `${Math.min(element.scrollHeight, 320)}px`;
};

const normalizeDiscussionContent = (value: string): string => {
  return value.replace(/\r\n?/g, '\n').trim();
};

const mergeDiscussionPages = (previous: DiscussionItem[], next: DiscussionItem[]) => {
  const seen = new Set(previous.map((item) => item.id));
  const merged = [...previous];

  for (const item of next) {
    if (seen.has(item.id)) {
      continue;
    }
    merged.push(item);
  }

  return merged;
};

const updateDiscussionNode = (
  items: DiscussionItem[],
  entryId: string,
  updater: (entry: DiscussionItem) => DiscussionItem,
): DiscussionItem[] => {
  return items.map((item) => {
    if (item.id === entryId) {
      return updater(item);
    }

    if (item.replies.length === 0) {
      return item;
    }

    return {
      ...item,
      replies: updateDiscussionNode(item.replies, entryId, updater),
    };
  });
};

const normalizeTargetIdByType = (targetType: DiscussionTargetType, rawTargetId: string): string => {
  if (targetType === 'product') {
    return rawTargetId.trim().toLowerCase();
  }

  return rawTargetId.trim();
};

const DiscussionNode = (props: {
  item: DiscussionItem;
  maxDepth: number;
  canInteract: boolean;
  csrfToken: string | null;
  isLikePending: (entryId: string) => boolean;
  isDeletePending: (entryId: string) => boolean;
  onRequireAuth: () => void;
  onToggleLike: (entry: DiscussionItem) => Promise<void>;
  onSubmitReply: (args: { parentId: string; content: string }) => Promise<void>;
  onDelete: (entry: DiscussionItem) => Promise<void>;
}) => {
  const [isReplyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyError, setReplyError] = useState('');
  const likePending = props.isLikePending(props.item.id);
  const deletePending = props.isDeletePending(props.item.id);

  const replyLength = replyText.trim().length;
  const canSubmitReply = replyLength >= MIN_DISCUSSION_LENGTH && replyLength <= MAX_DISCUSSION_LENGTH && !replyBusy;
  const replyAllowed = props.item.viewer.canReply && props.item.depth < props.maxDepth && !props.item.isDeleted;
  const likeAllowed = props.item.viewer.canLike && !props.item.isDeleted;
  const showDeleteButton = props.item.viewer.canDelete && !props.item.isDeleted;

  const handleLikeClick = async () => {
    if (!props.canInteract || !props.csrfToken) {
      props.onRequireAuth();
      return;
    }

    await props.onToggleLike(props.item);
  };

  const handleReplyToggle = () => {
    if (!props.canInteract || !props.csrfToken) {
      props.onRequireAuth();
      return;
    }

    setReplyError('');
    setReplyOpen((current) => !current);
  };

  const handleReplySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!props.canInteract || !props.csrfToken) {
      props.onRequireAuth();
      return;
    }

    if (!canSubmitReply) {
      return;
    }

    setReplyBusy(true);
    setReplyError('');

    try {
      await props.onSubmitReply({
        parentId: props.item.id,
        content: normalizeDiscussionContent(replyText),
      });
      setReplyText('');
      setReplyOpen(false);
    } catch (error) {
      setReplyError(error instanceof Error ? error.message : 'Не удалось отправить ответ.');
    } finally {
      setReplyBusy(false);
    }
  };

  const indentationClass = props.item.depth > 0
    ? 'ml-3 border-l border-[color:var(--line-soft)] pl-3 sm:ml-5 sm:pl-4'
    : '';

  return (
    <article className={`rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] p-4 shadow-[var(--shadow-soft)] sm:p-5 ${indentationClass}`.trim()}>
      <header className="flex flex-wrap items-start gap-3">
        <UserAvatar
          name={props.item.author.name}
          avatarUrl={props.item.author.avatarDataUrl ?? null}
          sizeClassName="h-9 w-9"
          textClassName="text-sm"
        />
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-strong)]">
            {props.item.author.name}
          </p>
          <p className="mt-1 font-sans text-[0.67rem] uppercase tracking-[0.12em] text-[color:var(--muted)]">
            {formatDateTime(props.item.createdAt)}
          </p>
        </div>
      </header>

      <div className="mt-3">
        {props.item.isDeleted ? (
          <p className="rounded-xl border border-dashed border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] px-3 py-2 font-serif text-sm italic text-[color:var(--muted)]">
            Комментарий удален модератором.
          </p>
        ) : (
          <p className="whitespace-pre-wrap break-words font-serif text-[1rem] leading-relaxed text-ink [overflow-wrap:anywhere] dark:text-gray-100">
            {props.item.content}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleLikeClick()}
          disabled={likePending || !likeAllowed}
          aria-label={props.item.viewer.liked ? 'Убрать лайк' : 'Поставить лайк'}
          aria-pressed={props.item.viewer.liked}
          className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-1.5 font-sans text-[0.66rem] font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-55 ${
            props.item.viewer.liked
              ? 'border-accent/40 bg-[color:var(--accent-soft)] text-accent'
              : 'border-[color:var(--line-soft)] bg-transparent text-[color:var(--muted-strong)] hover:border-accent/35 hover:text-accent'
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill={props.item.viewer.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12.62 20.2a1 1 0 0 1-1.24 0C7.43 17.1 4 14.37 4 10.47A4.47 4.47 0 0 1 8.47 6c1.38 0 2.7.64 3.53 1.73A4.45 4.45 0 0 1 15.53 6 4.47 4.47 0 0 1 20 10.47c0 3.9-3.43 6.63-7.38 9.73Z" />
          </svg>
          <span>{props.item.likeCount}</span>
        </button>

        {replyAllowed && (
          <button
            type="button"
            onClick={handleReplyToggle}
            className="inline-flex min-h-10 items-center rounded-full border border-[color:var(--line-soft)] px-3 py-1.5 font-sans text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-strong)] transition-colors hover:border-accent/35 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Ответить
          </button>
        )}

        {showDeleteButton && (
          <button
            type="button"
            onClick={() => void props.onDelete(props.item)}
            disabled={deletePending}
            className="inline-flex min-h-10 items-center rounded-full border border-red-300/80 px-3 py-1.5 font-sans text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-red-700 transition-colors hover:border-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-55"
          >
            Удалить
          </button>
        )}
      </div>

      {isReplyOpen && (
        <form onSubmit={handleReplySubmit} className="mt-3 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] p-3">
          <label htmlFor={`reply-${props.item.id}`} className="sr-only">Текст ответа</label>
          <textarea
            id={`reply-${props.item.id}`}
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
            onInput={(event) => autoResizeTextarea(event.currentTarget)}
            rows={2}
            maxLength={MAX_DISCUSSION_LENGTH}
            placeholder="Напишите ответ..."
            className="w-full resize-none overflow-hidden rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-[color:var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:text-gray-100"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="font-sans text-[0.64rem] uppercase tracking-[0.12em] text-[color:var(--muted)]">
              {replyLength}/{MAX_DISCUSSION_LENGTH}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReplyOpen(false)}
                className="inline-flex min-h-9 items-center rounded-full border border-[color:var(--line-soft)] px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--muted-strong)]"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={!canSubmitReply}
                className="inline-flex min-h-9 items-center rounded-full border border-accent/35 bg-[color:var(--accent-soft)] px-3 py-1 font-sans text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-accent disabled:cursor-not-allowed disabled:opacity-55"
              >
                {replyBusy ? 'Отправка...' : 'Ответить'}
              </button>
            </div>
          </div>
          {replyError && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {replyError}
            </p>
          )}
        </form>
      )}

      {props.item.replies.length > 0 && (
        <div className="mt-4 space-y-3">
          {props.item.replies.map((replyItem) => (
            <DiscussionNode
              key={replyItem.id}
              item={replyItem}
              maxDepth={props.maxDepth}
              canInteract={props.canInteract}
              csrfToken={props.csrfToken}
              isLikePending={props.isLikePending}
              isDeletePending={props.isDeletePending}
              onRequireAuth={props.onRequireAuth}
              onToggleLike={props.onToggleLike}
              onSubmitReply={props.onSubmitReply}
              onDelete={props.onDelete}
            />
          ))}
        </div>
      )}
    </article>
  );
};

const DiscussionThread = ({
  targetType,
  targetId,
  ensureArticlePayload,
  heading,
  subheading,
  inputPlaceholder,
  emptyTitle,
  emptyDescription,
  submitLabel,
}: DiscussionThreadProps) => {
  const { user, csrfToken } = useAuth();
  const [resolvedTargetId, setResolvedTargetId] = useState<string | null>(() => {
    if (!targetId) {
      return null;
    }

    return normalizeTargetIdByType(targetType, targetId);
  });
  const [resolveLoading, setResolveLoading] = useState(Boolean(ensureArticlePayload));
  const [resolveError, setResolveError] = useState('');

  const [items, setItems] = useState<DiscussionItem[]>([]);
  const [sort, setSort] = useState<DiscussionSort>('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [maxDepth, setMaxDepth] = useState(2);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const [pendingLikeIds, setPendingLikeIds] = useState<Record<string, boolean>>({});
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Record<string, boolean>>({});

  const canInteract = Boolean(user && csrfToken);

  const discussionTargetId = useMemo(() => {
    if (!resolvedTargetId) {
      return null;
    }

    return normalizeTargetIdByType(targetType, resolvedTargetId);
  }, [resolvedTargetId, targetType]);

  useEffect(() => {
    let active = true;

    const resolveTarget = async () => {
      if (!ensureArticlePayload) {
        if (targetId) {
          setResolvedTargetId(normalizeTargetIdByType(targetType, targetId));
        }
        setResolveLoading(false);
        setResolveError('');
        return;
      }

      setResolveLoading(true);
      setResolveError('');

      try {
        const ensured = await backendRequest<EnsureArticleResponse>({
          path: '/api/articles/ensure',
          method: 'POST',
          body: ensureArticlePayload,
        });

        if (!active) {
          return;
        }

        setResolvedTargetId(ensured.articleId);
      } catch (error) {
        if (!active) {
          return;
        }

        setResolvedTargetId(targetId ? normalizeTargetIdByType(targetType, targetId) : null);
        setResolveError(error instanceof Error ? error.message : 'Не удалось подготовить комментарии.');
      } finally {
        if (active) {
          setResolveLoading(false);
        }
      }
    };

    void resolveTarget();

    return () => {
      active = false;
    };
  }, [ensureArticlePayload, targetId, targetType]);

  const loadDiscussion = useCallback(async (args: { pageToLoad: number; append: boolean }) => {
    if (!discussionTargetId) {
      setItems([]);
      setTotalItems(0);
      setTotalPages(1);
      setPage(1);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    if (args.append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setErrorMessage('');
    }

    try {
      const query = new URLSearchParams();
      query.set('targetType', targetType);
      query.set('targetId', discussionTargetId);
      query.set('sort', sort);
      query.set('page', `${args.pageToLoad}`);
      query.set('pageSize', '12');

      const response = await backendRequest<DiscussionListResponse>({
        path: `/api/discussions?${query.toString()}`,
      });

      setItems((previousItems) => (
        args.append ? mergeDiscussionPages(previousItems, response.items) : response.items
      ));
      setTotalItems(response.total);
      setTotalPages(response.totalPages);
      setPage(response.page);
      setMaxDepth(response.maxDepth);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось загрузить обсуждение.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [discussionTargetId, sort, targetType]);

  useEffect(() => {
    if (resolveLoading) {
      return;
    }

    if (!discussionTargetId) {
      setLoading(false);
      return;
    }

    void loadDiscussion({
      pageToLoad: 1,
      append: false,
    });
  }, [discussionTargetId, loadDiscussion, resolveLoading, sort]);

  const refreshDiscussion = useCallback(async () => {
    await loadDiscussion({
      pageToLoad: 1,
      append: false,
    });
  }, [loadDiscussion]);

  const handleCreateEntry = async (args: { parentId?: string; content: string }) => {
    if (!discussionTargetId || !csrfToken || !user) {
      throw new Error('Войдите, чтобы публиковать комментарии.');
    }

    await backendRequest({
      path: '/api/discussions',
      method: 'POST',
      csrfToken,
      body: {
        targetType,
        targetId: discussionTargetId,
        parentId: args.parentId,
        content: args.content,
      },
    });

    await refreshDiscussion();
  };

  const handleSubmitTopLevel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canInteract || !csrfToken || !user) {
      openAuthModal();
      return;
    }

    const normalized = normalizeDiscussionContent(draft);
    if (normalized.length < MIN_DISCUSSION_LENGTH || normalized.length > MAX_DISCUSSION_LENGTH) {
      setSubmitError(`Текст должен быть от ${MIN_DISCUSSION_LENGTH} до ${MAX_DISCUSSION_LENGTH} символов.`);
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      await handleCreateEntry({
        content: normalized,
      });
      setDraft('');
      setSubmitSuccess('Комментарий опубликован.');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Не удалось опубликовать комментарий.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (args: { parentId: string; content: string }) => {
    await handleCreateEntry({
      parentId: args.parentId,
      content: args.content,
    });
  };

  const setLikePending = (entryId: string, value: boolean) => {
    setPendingLikeIds((previous) => ({
      ...previous,
      [entryId]: value,
    }));
  };

  const setDeletePending = (entryId: string, value: boolean) => {
    setPendingDeleteIds((previous) => ({
      ...previous,
      [entryId]: value,
    }));
  };

  const handleToggleLike = async (entry: DiscussionItem) => {
    if (!canInteract || !csrfToken || !user) {
      openAuthModal();
      return;
    }

    if (pendingLikeIds[entry.id]) {
      return;
    }

    setLikePending(entry.id, true);
    setErrorMessage('');

    const previousLiked = entry.viewer.liked;
    const previousLikeCount = entry.likeCount;
    const nextLiked = !previousLiked;
    const nextCount = Math.max(0, previousLikeCount + (nextLiked ? 1 : -1));

    setItems((previousItems) => updateDiscussionNode(previousItems, entry.id, (currentEntry) => ({
      ...currentEntry,
      likeCount: nextCount,
      viewer: {
        ...currentEntry.viewer,
        liked: nextLiked,
      },
    })));

    try {
      const response = await backendRequest<ToggleLikeResponse>({
        path: `/api/discussions/${entry.id}/like`,
        method: nextLiked ? 'POST' : 'DELETE',
        csrfToken,
      });

      setItems((previousItems) => updateDiscussionNode(previousItems, entry.id, (currentEntry) => ({
        ...currentEntry,
        likeCount: Math.max(0, response.likeCount),
        viewer: {
          ...currentEntry.viewer,
          liked: response.viewer.liked,
        },
      })));
    } catch (error) {
      setItems((previousItems) => updateDiscussionNode(previousItems, entry.id, (currentEntry) => ({
        ...currentEntry,
        likeCount: previousLikeCount,
        viewer: {
          ...currentEntry.viewer,
          liked: previousLiked,
        },
      })));
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось обновить лайк.');
    } finally {
      setLikePending(entry.id, false);
    }
  };

  const handleDelete = async (entry: DiscussionItem) => {
    if (!canInteract || !csrfToken || !user || user.role !== 'ADMIN') {
      return;
    }

    const confirmed = window.confirm('Удалить этот комментарий? Текст будет скрыт, а ветка обсуждения сохранится.');
    if (!confirmed) {
      return;
    }

    if (pendingDeleteIds[entry.id]) {
      return;
    }

    setDeletePending(entry.id, true);
    setErrorMessage('');

    try {
      await backendRequest({
        path: `/api/admin/discussions/${entry.id}`,
        method: 'DELETE',
        csrfToken,
      });
      await refreshDiscussion();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось удалить комментарий.');
    } finally {
      setDeletePending(entry.id, false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || loading || page >= totalPages) {
      return;
    }

    await loadDiscussion({
      pageToLoad: page + 1,
      append: true,
    });
  };

  const draftLength = draft.trim().length;
  const canSubmitTopLevel = draftLength >= MIN_DISCUSSION_LENGTH && draftLength <= MAX_DISCUSSION_LENGTH && !submitting;
  const showAuthCta = !user;
  const getLikePending = useCallback((entryId: string) => Boolean(pendingLikeIds[entryId]), [pendingLikeIds]);
  const getDeletePending = useCallback((entryId: string) => Boolean(pendingDeleteIds[entryId]), [pendingDeleteIds]);

  return (
    <section className="reading-shell mt-14">
      <div className="site-panel rounded-[1.8rem] px-5 py-6 sm:px-7 sm:py-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-[clamp(1.6rem,3.6vw,2.5rem)] leading-[1.05] text-ink dark:text-gray-100">
              {heading}
            </h2>
            <p className="mt-2 max-w-3xl font-serif text-sm leading-relaxed text-[color:var(--muted)] dark:text-gray-300">
              {subheading}
            </p>
          </div>
          <div className="inline-flex items-center gap-2">
            <label htmlFor={`${targetType}-discussion-sort`} className="font-sans text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
              Сортировка
            </label>
            <select
              id={`${targetType}-discussion-sort`}
              value={sort}
              onChange={(event) => setSort(event.target.value as DiscussionSort)}
              className="rounded-full border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] px-3 py-1.5 font-sans text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[color:var(--muted-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="newest">Сначала новые</option>
              <option value="oldest">Сначала старые</option>
            </select>
          </div>
        </header>

        <div className="mt-6 space-y-4">
          {showAuthCta ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--line-strong)] bg-[color:var(--surface-strong)] p-4 sm:p-5">
              <p className="font-serif text-sm leading-relaxed text-[color:var(--muted-strong)]">
                Чтобы писать комментарии, ставить лайки и отвечать в обсуждении, выполните вход в аккаунт.
              </p>
              <button
                type="button"
                onClick={openAuthModal}
                className="mt-3 inline-flex min-h-10 items-center rounded-full border border-accent/35 bg-[color:var(--accent-soft)] px-4 py-2 font-sans text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-accent transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Войти или зарегистрироваться
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitTopLevel} className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] p-4 sm:p-5">
              <label htmlFor={`${targetType}-discussion-input`} className="sr-only">Новый комментарий</label>
              <textarea
                id={`${targetType}-discussion-input`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onInput={(event) => autoResizeTextarea(event.currentTarget)}
                rows={3}
                maxLength={MAX_DISCUSSION_LENGTH}
                placeholder={inputPlaceholder}
                disabled={submitting || resolveLoading || !discussionTargetId}
                className="w-full resize-none overflow-hidden rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] px-3 py-3 text-[1rem] leading-relaxed text-ink placeholder:text-[color:var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-70 dark:text-gray-100"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="font-sans text-[0.64rem] uppercase tracking-[0.12em] text-[color:var(--muted)]">
                  {draftLength}/{MAX_DISCUSSION_LENGTH}
                </p>
                <button
                  type="submit"
                  disabled={!canSubmitTopLevel || resolveLoading || !discussionTargetId}
                  className="inline-flex min-h-10 items-center rounded-full border border-accent/35 bg-[color:var(--accent-soft)] px-4 py-2 font-sans text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-accent transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {submitting ? 'Публикация...' : submitLabel}
                </button>
              </div>
              {submitError && (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  {submitError}
                </p>
              )}
              {submitSuccess && (
                <p className="mt-2 text-sm text-green-700" role="status">
                  {submitSuccess}
                </p>
              )}
            </form>
          )}

          {resolveError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
              {resolveError}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="mt-6">
          {(loading || resolveLoading) ? (
            <div className="space-y-3" aria-busy="true" aria-live="polite">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-28 animate-pulse rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)]"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--line-strong)] bg-[color:var(--surface-strong)] px-5 py-6 text-center">
              <p className="font-display text-xl text-ink dark:text-gray-100">{emptyTitle}</p>
              <p className="mt-2 font-serif text-sm text-[color:var(--muted)] dark:text-gray-300">
                {emptyDescription}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {items.map((item) => (
                  <DiscussionNode
                    key={item.id}
                    item={item}
                    maxDepth={maxDepth}
                    canInteract={canInteract}
                    csrfToken={csrfToken}
                    isLikePending={getLikePending}
                    isDeletePending={getDeletePending}
                    onRequireAuth={openAuthModal}
                    onToggleLike={handleToggleLike}
                    onSubmitReply={handleReplySubmit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="font-sans text-[0.64rem] uppercase tracking-[0.14em] text-[color:var(--muted)]">
                  Всего: {totalItems}
                </p>
                {page < totalPages && (
                  <button
                    type="button"
                    onClick={() => void handleLoadMore()}
                    disabled={loadingMore}
                    className="inline-flex min-h-10 items-center rounded-full border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] px-4 py-2 font-sans text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-strong)] transition-colors hover:border-accent/35 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingMore ? 'Загрузка...' : 'Показать ещё'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export const ArticleCommentsSection = ({ article }: ArticleCommentsSectionProps) => {
  const source = article.source === 'local' ? 'local' : 'ghost';
  const resolvedSlug = article.slug?.trim() || article.id;
  const resolvedCanonicalPath = article.canonicalPath?.trim() || `/article/${resolvedSlug}`;
  const ensureArticlePayload = useMemo<EnsureArticlePayload>(() => ({
    source,
    externalId: article.externalId?.trim() || undefined,
    slug: resolvedSlug,
    title: article.title,
    excerpt: article.excerpt,
    section: article.type,
    canonicalPath: resolvedCanonicalPath,
    featureImage: article.feature_image?.trim() || undefined,
  }), [article.excerpt, article.externalId, article.feature_image, article.title, article.type, resolvedCanonicalPath, resolvedSlug, source]);

  return (
    <DiscussionThread
      targetType="article"
      targetId={article.internalArticleId ?? undefined}
      ensureArticlePayload={ensureArticlePayload}
      heading="Комментарии"
      subheading="Обсуждайте материал, задавайте вопросы и делитесь наблюдениями в аккуратной ветке обсуждения."
      inputPlaceholder="Напишите комментарий к статье..."
      emptyTitle="Пока нет комментариев"
      emptyDescription="Станьте первым участником обсуждения этой статьи."
      submitLabel="Опубликовать комментарий"
    />
  );
};

export const ProductReviewsSection = ({ productSlug }: ProductReviewsSectionProps) => {
  return (
    <DiscussionThread
      targetType="product"
      targetId={productSlug}
      heading="Отзывы"
      subheading="Оставьте честный отзыв о товаре, чтобы помочь другим читателям с выбором."
      inputPlaceholder="Поделитесь вашим отзывом о товаре..."
      emptyTitle="Пока нет отзывов"
      emptyDescription="Здесь появятся отзывы покупателей и ответы на них."
      submitLabel="Опубликовать отзыв"
    />
  );
};
