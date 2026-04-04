"use client";

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { UserAvatar } from '@/components/UserAvatar';
import { AdminAnalyticsDashboard } from '@/components/account/AdminAnalyticsDashboard';
import { AdminEditorialWorkspace } from '@/components/account/AdminEditorialWorkspace';
import { backendRequest } from '@/services/backend/client';
import { prepareAvatarDataUrl } from '@/services/userAvatar';
import { formatDate } from '@/utils/formatDate';
import { AuthorAnalyticsCharts } from './AuthorAnalyticsCharts';

type AccountTab = 'overview' | 'editorial' | 'analytics';

type BookmarkItem = {
  id: string;
  article: {
    id: string;
    slug: string;
    title: string;
    section: 'JOURNAL' | 'RESEARCH' | 'NOVA';
    publishedAt: string;
  };
};

type BookmarksResponse = {
  items: BookmarkItem[];
};

type SubmissionItem = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  lastSubmittedAt?: string | null;
  reviewMessages: Array<{
    id: string;
    message: string;
    createdAt: string;
    admin?: { id: string; name: string };
  }>;
  publishedArticle?: {
    id: string;
    slug: string;
    title: string;
  } | null;
};

type SubmissionsResponse = {
  items: SubmissionItem[];
};

type AuthorStatsResponse = {
  periodDays: number;
  series: Array<{ date: string; views: number; uniqueViews: number }>;
  articles: Array<{
    articleId: string;
    slug: string;
    title: string;
    section: string;
    lastPeriodViews: number;
    lastPeriodUniqueViews: number;
    bookmarkCount: number;
    reactions: Record<string, number>;
  }>;
  topArticles: Array<{
    articleId: string;
    title: string;
    slug: string;
    views: number;
  }>;
};

const ARTICLE_SECTION_LABELS: Record<BookmarkItem['article']['section'], string> = {
  JOURNAL: 'журнал',
  RESEARCH: 'исследование',
  NOVA: 'Nova Express',
};

const ROLE_LABELS: Record<'READER' | 'AUTHOR' | 'ADMIN', string> = {
  READER: 'читатель',
  AUTHOR: 'автор',
  ADMIN: 'администратор',
};

const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'черновик',
  SUBMITTED: 'отправлена',
  IN_REVIEW: 'на рассмотрении',
  NEEDS_CHANGES: 'ожидает правок',
  RESUBMITTED: 'повторная подача',
  APPROVED: 'одобрена',
  PUBLISHED: 'опубликована',
  REJECTED: 'отклонена',
};

const accountTabs: Array<{ value: AccountTab; label: string }> = [
  { value: 'overview', label: 'Кабинет' },
  { value: 'editorial', label: 'Редактура' },
  { value: 'analytics', label: 'Аналитика' },
];

const resolveAccountTab = (requestedTab: string | null, isAdmin: boolean): AccountTab => {
  if (requestedTab === 'editorial' || requestedTab === 'analytics') {
    return isAdmin ? requestedTab : 'overview';
  }

  return 'overview';
};

const formatSubmissionStatus = (status: string) => {
  return SUBMISSION_STATUS_LABELS[status] ?? status.toLowerCase();
};

function AccountPageContent() {
  const { user, loading, csrfToken, refreshMe } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [authorStats7, setAuthorStats7] = useState<AuthorStatsResponse | null>(null);
  const [authorStats30, setAuthorStats30] = useState<AuthorStatsResponse | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarErrorMessage, setAvatarErrorMessage] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === 'ADMIN';
  const canSeeAuthorStats = useMemo(() => user?.role === 'AUTHOR', [user?.role]);
  const activeTab = resolveAccountTab(searchParams.get('tab'), isAdmin);

  const setTab = (nextTab: AccountTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === 'overview') {
      params.delete('tab');
    } else {
      params.set('tab', nextTab);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const loadData = async () => {
    if (!user) {
      return;
    }

    setIsFetching(true);
    setErrorMessage('');

    try {
      const [bookmarkResponse, submissionResponse] = await Promise.all([
        backendRequest<BookmarksResponse>({
          path: '/api/me/bookmarks?page=1&pageSize=50',
        }),
        backendRequest<SubmissionsResponse>({
          path: '/api/submissions/me?page=1&pageSize=50',
        }),
      ]);

      setBookmarks(bookmarkResponse.items);
      setSubmissions(submissionResponse.items);

      if (canSeeAuthorStats) {
        const [stats7, stats30] = await Promise.all([
          backendRequest<AuthorStatsResponse>({
            path: '/api/authors/me/stats?days=7',
          }),
          backendRequest<AuthorStatsResponse>({
            path: '/api/authors/me/stats?days=30',
          }),
        ]);

        setAuthorStats7(stats7);
        setAuthorStats30(stats30);
      } else {
        setAuthorStats7(null);
        setAuthorStats30(null);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось загрузить кабинет.');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, canSeeAuthorStats]);

  useEffect(() => {
    setAvatarUrl(user?.avatarDataUrl ?? null);
  }, [user?.id, user?.avatarDataUrl]);

  const removeBookmark = async (articleId: string) => {
    if (!csrfToken) {
      return;
    }

    try {
      await backendRequest({
        path: `/api/me/bookmarks/${encodeURIComponent(articleId)}`,
        method: 'DELETE',
        csrfToken,
      });

      setBookmarks((current) => current.filter((bookmark) => bookmark.article.id !== articleId));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось обновить закладки.');
    }
  };

  const saveAvatar = async (nextAvatarDataUrl: string | null) => {
    if (!csrfToken) {
      throw new Error('Сессия истекла. Обновите страницу и попробуйте снова.');
    }

    const response = await backendRequest<{ user: { avatarDataUrl?: string | null } }>({
      path: '/api/auth/avatar',
      method: 'PUT',
      csrfToken,
      body: {
        avatarDataUrl: nextAvatarDataUrl,
      },
    });

    setAvatarUrl(response.user.avatarDataUrl ?? null);
    await refreshMe();
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setAvatarBusy(true);
    setAvatarErrorMessage('');

    try {
      const avatarDataUrl = await prepareAvatarDataUrl(file);
      await saveAvatar(avatarDataUrl);
    } catch (error) {
      setAvatarErrorMessage(error instanceof Error ? error.message : 'Не удалось обновить фото профиля.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleAvatarRemove = async () => {
    setAvatarBusy(true);
    setAvatarErrorMessage('');

    try {
      await saveAvatar(null);
    } catch (error) {
      setAvatarErrorMessage(error instanceof Error ? error.message : 'Не удалось удалить фото профиля.');
    } finally {
      setAvatarBusy(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-16">загрузка профиля...</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="mb-4 font-display text-4xl">Кабинет</h1>
        <p className="text-[color:var(--muted)]">Выполните вход, чтобы открыть личный кабинет.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
      <section className="site-panel overflow-hidden rounded-[2.2rem] px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex min-w-0 items-start gap-4 sm:gap-5">
            <UserAvatar
              name={user.name}
              avatarUrl={avatarUrl}
              sizeClassName="h-20 w-20 sm:h-24 sm:w-24"
              textClassName="text-3xl"
              className="shrink-0"
            />

            <div className="min-w-0">
              <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-accent">
                Личный кабинет
              </p>
              <h1 className="mt-3 font-display text-[clamp(2.2rem,5vw,4rem)] leading-[0.96] tracking-[-0.04em] text-ink dark:text-gray-100">
                {user.name}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex min-h-9 items-center rounded-full border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] px-3 py-1 font-sans text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-strong)]">
                  Роль: {ROLE_LABELS[user.role]}
                </span>
                {isAdmin && (
                  <span className="inline-flex min-h-9 items-center rounded-full border border-accent/30 bg-[color:var(--accent-soft)] px-3 py-1 font-sans text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-accent">
                    Единое рабочее пространство администратора
                  </span>
                )}
              </div>
              <p className="mt-4 max-w-3xl font-serif text-sm leading-relaxed text-[color:var(--muted)]">
                Здесь собраны профиль, закладки, статус материалов и, для администратора, редакторский контур с аналитикой сайта.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <Link
              href="/upload"
              className="inline-flex min-h-11 items-center rounded-full border border-accent/35 bg-[color:var(--accent-soft)] px-5 py-2 font-sans text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-accent transition-colors hover:border-accent"
            >
              Отправить рукопись
            </Link>

            <div className="flex flex-wrap gap-2 sm:justify-end">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => void handleAvatarUpload(event)}
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarBusy}
                className="inline-flex min-h-10 items-center rounded-full border border-[color:var(--line-soft)] px-4 py-2 font-sans text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-strong)] transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-55"
              >
                {avatarBusy ? 'Сохраняем...' : avatarUrl ? 'Сменить фото' : 'Загрузить фото'}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => void handleAvatarRemove()}
                  disabled={avatarBusy}
                  className="inline-flex min-h-10 items-center rounded-full border border-[color:var(--line-soft)] px-4 py-2 font-sans text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-strong)] transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Удалить фото
                </button>
              )}
            </div>

            {avatarErrorMessage && (
              <p className="max-w-sm text-sm text-red-600">
                {avatarErrorMessage}
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.5rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] px-4 py-4">
            <p className="font-sans text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
              Закладки
            </p>
            <p className="mt-3 font-display text-3xl leading-none tracking-[-0.04em] text-ink dark:text-gray-100">
              {bookmarks.length}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] px-4 py-4">
            <p className="font-sans text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
              Заявки
            </p>
            <p className="mt-3 font-display text-3xl leading-none tracking-[-0.04em] text-ink dark:text-gray-100">
              {submissions.length}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] px-4 py-4">
            <p className="font-sans text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
              Статус профиля
            </p>
            <p className="mt-3 font-display text-3xl leading-none tracking-[-0.04em] text-ink dark:text-gray-100">
              Активен
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] px-4 py-4">
            <p className="font-sans text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
              Режим
            </p>
            <p className="mt-3 font-display text-3xl leading-none tracking-[-0.04em] text-ink dark:text-gray-100">
              {isAdmin ? 'Admin' : 'User'}
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="mt-8 flex flex-wrap gap-2 border-t border-[color:var(--line-soft)] pt-6">
            {accountTabs.map((tab) => {
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setTab(tab.value)}
                  className={`inline-flex min-h-10 items-center rounded-full border px-4 py-2 font-sans text-[0.66rem] font-semibold uppercase tracking-[0.14em] transition-colors ${
                    isActive
                      ? 'border-accent/35 bg-[color:var(--accent-soft)] text-accent'
                      : 'border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] text-[color:var(--muted-strong)] hover:border-accent/30 hover:text-accent'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {errorMessage && (
        <div className="mt-6 rounded-[1.5rem] border border-red-300/50 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
          {errorMessage}
        </div>
      )}
      {isFetching && (
        <p className="mt-6 text-sm text-[color:var(--muted)]">
          обновляем данные...
        </p>
      )}

      <div className="mt-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {isAdmin && (
              <section className="site-panel overflow-hidden rounded-[2rem] px-5 py-6 sm:px-7">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-accent">
                      Администратор внутри кабинета
                    </p>
                    <h2 className="mt-3 font-display text-[clamp(1.8rem,4vw,2.8rem)] leading-[0.98] tracking-[-0.03em] text-ink dark:text-gray-100">
                      Редактура и аналитика встроены в ваш профиль
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setTab('editorial')}
                      className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--line-soft)] px-5 py-2 font-sans text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-strong)] transition-colors hover:border-accent hover:text-accent"
                    >
                      Открыть редактуру
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab('analytics')}
                      className="inline-flex min-h-11 items-center rounded-full border border-accent/35 bg-[color:var(--accent-soft)] px-5 py-2 font-sans text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-accent transition-colors hover:border-accent"
                    >
                      Открыть аналитику
                    </button>
                  </div>
                </div>
              </section>
            )}

            <section className="site-panel overflow-hidden rounded-[2rem] px-5 py-6 sm:px-7">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-accent">
                    Моя библиотека
                  </p>
                  <h2 className="mt-3 font-display text-[clamp(1.8rem,4vw,2.6rem)] leading-[0.98] tracking-[-0.03em] text-ink dark:text-gray-100">
                    Закладки
                  </h2>
                </div>
              </div>

              {bookmarks.length === 0 ? (
                <p className="mt-5 rounded-[1.4rem] border border-dashed border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] px-4 py-5 text-sm text-[color:var(--muted)]">
                  Вы пока не добавляли статьи в закладки.
                </p>
              ) : (
                <ul className="mt-5 space-y-3">
                  {bookmarks.map((bookmark) => (
                    <li
                      key={bookmark.id}
                      className="rounded-[1.5rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] px-4 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <Link href={`/article/${bookmark.article.slug}`} className="font-serif text-lg leading-snug text-ink transition-colors hover:text-accent dark:text-gray-100">
                            {bookmark.article.title}
                          </Link>
                          <p className="mt-2 text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">
                            {ARTICLE_SECTION_LABELS[bookmark.article.section]} · {formatDate(bookmark.article.publishedAt)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void removeBookmark(bookmark.article.id)}
                          className="inline-flex min-h-10 items-center rounded-full border border-[color:var(--line-soft)] px-4 py-2 font-sans text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-strong)] transition-colors hover:border-accent hover:text-accent"
                        >
                          Убрать
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="site-panel overflow-hidden rounded-[2rem] px-5 py-6 sm:px-7">
              <div>
                <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-accent">
                  Мои материалы
                </p>
                <h2 className="mt-3 font-display text-[clamp(1.8rem,4vw,2.6rem)] leading-[0.98] tracking-[-0.03em] text-ink dark:text-gray-100">
                  Заявки
                </h2>
              </div>

              {submissions.length === 0 ? (
                <p className="mt-5 rounded-[1.4rem] border border-dashed border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] px-4 py-5 text-sm text-[color:var(--muted)]">
                  У вас ещё нет заявок.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  {submissions.map((submission) => (
                    <article
                      key={submission.id}
                      className="rounded-[1.6rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] px-4 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-serif text-lg leading-snug text-ink dark:text-gray-100">
                            {submission.title}
                          </h3>
                          <p className="mt-2 text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">
                            {formatSubmissionStatus(submission.status)}
                          </p>
                        </div>
                        <p className="text-xs text-[color:var(--muted)]">
                          создано {new Date(submission.createdAt).toLocaleString()}
                          {submission.lastSubmittedAt ? ` · отправлено ${new Date(submission.lastSubmittedAt).toLocaleString()}` : ''}
                        </p>
                      </div>

                      {submission.publishedArticle && (
                        <p className="mt-4 text-sm text-accent">
                          опубликовано:{' '}
                          <Link href={`/article/${submission.publishedArticle.slug}`} className="underline decoration-accent/40 underline-offset-4">
                            {submission.publishedArticle.title}
                          </Link>
                        </p>
                      )}

                      {submission.reviewMessages.length > 0 && (
                        <div className="mt-4 space-y-3 border-t border-[color:var(--line-soft)] pt-4">
                          {submission.reviewMessages.slice(0, 2).map((message) => (
                            <div key={message.id} className="rounded-[1.2rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] px-4 py-3">
                              <p className="text-sm leading-relaxed text-ink dark:text-gray-100">
                                {message.message}
                              </p>
                              <p className="mt-2 text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">
                                {message.admin?.name ?? 'Редакция'} · {new Date(message.createdAt).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            {canSeeAuthorStats && authorStats7 && authorStats30 && (
              <section className="site-panel overflow-hidden rounded-[2rem] px-5 py-6 sm:px-7">
                <div>
                  <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-accent">
                    Авторская аналитика
                  </p>
                  <h2 className="mt-3 font-display text-[clamp(1.8rem,4vw,2.6rem)] leading-[0.98] tracking-[-0.03em] text-ink dark:text-gray-100">
                    Как читают ваши материалы
                  </h2>
                </div>

                <div className="mt-6">
                  <AuthorAnalyticsCharts stats7={authorStats7} stats30={authorStats30} />
                </div>

                <div className="mt-8 overflow-x-auto">
                  <table className="w-full min-w-[38rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[color:var(--line-soft)] text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">
                        <th className="py-3">Дата</th>
                        <th className="py-3">Просмотры</th>
                        <th className="py-3">Уникальные</th>
                      </tr>
                    </thead>
                    <tbody>
                      {authorStats30.series.map((point) => (
                        <tr key={point.date} className="border-b border-[color:var(--line-soft)]/70">
                          <td className="py-3">{point.date}</td>
                          <td className="py-3">{point.views}</td>
                          <td className="py-3">{point.uniqueViews}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-8 overflow-x-auto">
                  <table className="w-full min-w-[48rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[color:var(--line-soft)] text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">
                        <th className="py-3">Статья</th>
                        <th className="py-3">Просмотры за период</th>
                        <th className="py-3">Уникальные за период</th>
                        <th className="py-3">Закладки</th>
                        <th className="py-3">Реакции</th>
                      </tr>
                    </thead>
                    <tbody>
                      {authorStats30.articles.map((item) => (
                        <tr key={item.articleId} className="border-b border-[color:var(--line-soft)]/70">
                          <td className="py-3">
                            <Link href={`/article/${item.slug}`} className="underline decoration-accent/35 underline-offset-4">
                              {item.title}
                            </Link>
                          </td>
                          <td className="py-3">{item.lastPeriodViews}</td>
                          <td className="py-3">{item.lastPeriodUniqueViews}</td>
                          <td className="py-3">{item.bookmarkCount}</td>
                          <td className="py-3">
                            like {item.reactions.like ?? 0}, insightful {item.reactions.insightful ?? 0}, celebrate {item.reactions.celebrate ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-8">
                  <h3 className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    Топ статьи за последние {authorStats30.periodDays} дней
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {authorStats30.topArticles.map((article) => (
                      <li
                        key={article.articleId}
                        className="flex items-center justify-between gap-4 rounded-[1.3rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] px-4 py-3"
                      >
                        <Link href={`/article/${article.slug}`} className="underline decoration-accent/35 underline-offset-4">
                          {article.title}
                        </Link>
                        <span className="font-sans text-sm font-semibold">{article.views}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'editorial' && isAdmin && (
          <AdminEditorialWorkspace csrfToken={csrfToken} />
        )}

        {activeTab === 'analytics' && isAdmin && (
          <AdminAnalyticsDashboard />
        )}
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-16">загрузка профиля...</div>}>
      <AccountPageContent />
    </Suspense>
  );
}
