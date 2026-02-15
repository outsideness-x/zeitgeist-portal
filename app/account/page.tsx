"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { backendRequest } from '@/services/backend/client';
import { AuthorAnalyticsCharts } from './AuthorAnalyticsCharts';

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

export default function AccountPage() {
  const { user, loading, csrfToken } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [authorStats7, setAuthorStats7] = useState<AuthorStatsResponse | null>(null);
  const [authorStats30, setAuthorStats30] = useState<AuthorStatsResponse | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const canSeeAuthorStats = useMemo(() => {
    if (!user) {
      return false;
    }
    return user.role === 'AUTHOR' || user.role === 'ADMIN';
  }, [user]);

  const loadData = async () => {
    if (!user) {
      return;
    }

    setIsFetching(true);
    setErrorMessage('');

    try {
      const [bookmarkResponse, submissionResponse] = await Promise.all([
        backendRequest<BookmarksResponse>({
          path: '/api/me/bookmarks?page=1&pageSize=100',
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
      setErrorMessage(error instanceof Error ? error.message : 'не удалось загрузить кабинет');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, canSeeAuthorStats]);

  const removeBookmark = async (articleId: string) => {
    if (!csrfToken) {
      return;
    }

    try {
      await backendRequest({
        path: '/api/me/bookmarks/toggle',
        method: 'POST',
        csrfToken,
        body: {
          articleId,
        },
      });

      setBookmarks((current) => current.filter((bookmark) => bookmark.article.id !== articleId));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'не удалось обновить закладки');
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-16">загрузка профиля...</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="mb-4 font-display text-4xl">кабинет</h1>
        <p className="text-gray-600">выполните вход, чтобы открыть личный кабинет.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">кабинет</h1>
          <p className="text-sm text-gray-500">роль: {user.role.toLowerCase()}</p>
        </div>
        <Link href="/upload" className="border border-accent px-4 py-2 text-xs uppercase tracking-widest text-accent hover:bg-accent hover:text-white">
          отправить рукопись
        </Link>
      </div>

      {errorMessage && <p className="mb-6 text-sm text-red-600">{errorMessage}</p>}
      {isFetching && <p className="mb-6 text-sm text-gray-500">обновляем данные...</p>}

      <section className="mb-10 border border-sepia bg-white p-6">
        <h2 className="mb-4 font-display text-2xl">закладки</h2>
        {bookmarks.length === 0 ? (
          <p className="text-sm text-gray-500">вы пока не добавляли статьи в закладки.</p>
        ) : (
          <ul className="space-y-3">
            {bookmarks.map((bookmark) => (
              <li key={bookmark.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-sepia/40 pb-3">
                <div>
                  <Link href={`/article/${bookmark.article.slug}`} className="font-serif text-lg hover:text-accent">
                    {bookmark.article.title}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {bookmark.article.section.toLowerCase()} · {new Date(bookmark.article.publishedAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void removeBookmark(bookmark.article.id)}
                  className="border border-sepia px-3 py-2 text-xs uppercase tracking-wider hover:border-accent"
                >
                  убрать
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-10 border border-sepia bg-white p-6">
        <h2 className="mb-4 font-display text-2xl">заявки</h2>
        {submissions.length === 0 ? (
          <p className="text-sm text-gray-500">у вас еще нет заявок.</p>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <article key={submission.id} className="border border-sepia/60 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-serif text-lg">{submission.title}</h3>
                  <span className="text-xs uppercase tracking-widest text-gray-500">{submission.status.toLowerCase()}</span>
                </div>
                <p className="text-xs text-gray-500">
                  создано: {new Date(submission.createdAt).toLocaleString()}
                  {submission.lastSubmittedAt ? ` · отправлено: ${new Date(submission.lastSubmittedAt).toLocaleString()}` : ''}
                </p>

                {submission.publishedArticle && (
                  <p className="mt-2 text-sm text-green-700">
                    опубликовано: <Link href={`/article/${submission.publishedArticle.slug}`} className="underline">{submission.publishedArticle.title}</Link>
                  </p>
                )}

                {submission.reviewMessages.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-sepia/40 pt-3">
                    {submission.reviewMessages.slice(0, 2).map((message) => (
                      <div key={message.id} className="text-sm">
                        <p className="text-gray-700">{message.message}</p>
                        <p className="text-xs text-gray-500">
                          {message.admin?.name ?? 'редакция'} · {new Date(message.createdAt).toLocaleString()}
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
        <section className="border border-sepia bg-white p-6">
          <h2 className="mb-4 font-display text-2xl">аналитика автора</h2>

          <AuthorAnalyticsCharts stats7={authorStats7} stats30={authorStats30} />

          <div className="mb-6 mt-8 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-sepia/60 text-xs uppercase tracking-wider text-gray-500">
                  <th className="py-2">дата</th>
                  <th className="py-2">просмотры</th>
                  <th className="py-2">уникальные</th>
                </tr>
              </thead>
              <tbody>
                {authorStats30.series.map((point) => (
                  <tr key={point.date} className="border-b border-sepia/20">
                    <td className="py-2">{point.date}</td>
                    <td className="py-2">{point.views}</td>
                    <td className="py-2">{point.uniqueViews}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-sepia/60 text-xs uppercase tracking-wider text-gray-500">
                  <th className="py-2">статья</th>
                  <th className="py-2">просмотры за период</th>
                  <th className="py-2">уникальные за период</th>
                  <th className="py-2">закладки</th>
                  <th className="py-2">реакции</th>
                </tr>
              </thead>
              <tbody>
                {authorStats30.articles.map((item) => (
                  <tr key={item.articleId} className="border-b border-sepia/20">
                    <td className="py-2">
                      <Link href={`/article/${item.slug}`} className="underline">
                        {item.title}
                      </Link>
                    </td>
                    <td className="py-2">{item.lastPeriodViews}</td>
                    <td className="py-2">{item.lastPeriodUniqueViews}</td>
                    <td className="py-2">{item.bookmarkCount}</td>
                    <td className="py-2">
                      like {item.reactions.like ?? 0}, insightful {item.reactions.insightful ?? 0}, celebrate {item.reactions.celebrate ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="mb-2 text-sm uppercase tracking-wider text-gray-500">топ статьи за последние {authorStats30.periodDays} дней</h3>
            <ul className="space-y-2 text-sm">
              {authorStats30.topArticles.map((article) => (
                <li key={article.articleId} className="flex items-center justify-between border-b border-sepia/20 pb-2">
                  <Link href={`/article/${article.slug}`} className="underline">{article.title}</Link>
                  <span>{article.views}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
