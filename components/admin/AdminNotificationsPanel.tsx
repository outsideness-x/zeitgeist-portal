"use client";

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { UserAvatar } from '@/components/UserAvatar';
import { backendRequest } from '@/services/backend/client';

type AdminNotificationItem = {
  id: string;
  type: 'article_comment' | 'product_review';
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  preview: string;
  discussionEntryId: string;
  actor: {
    id: string;
    name: string;
    avatarDataUrl?: string | null;
  } | null;
  target: {
    type: 'article' | 'product';
    id: string;
    title: string;
    path: string;
  };
};

type AdminNotificationsResponse = {
  items: AdminNotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type AdminNotificationsPanelProps = {
  csrfToken: string | null;
};

const formatTimestamp = (value: string) => {
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

const getTypeLabel = (type: AdminNotificationItem['type']) => {
  if (type === 'product_review') {
    return 'Отзыв к товару';
  }

  return 'Комментарий к статье';
};

export const AdminNotificationsPanel = ({ csrfToken }: AdminNotificationsPanelProps) => {
  const [items, setItems] = useState<AdminNotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await backendRequest<AdminNotificationsResponse>({
        path: '/api/admin/notifications?page=1&pageSize=30&unread=true',
      });

      setItems(response.items);
      setTotal(response.total);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось загрузить уведомления.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const markAsRead = async (notificationId: string) => {
    if (!csrfToken || busy) {
      return;
    }

    setBusy(true);
    setErrorMessage('');

    try {
      await backendRequest({
        path: `/api/admin/notifications/${notificationId}/read`,
        method: 'POST',
        csrfToken,
      });

      setItems((previousItems) => previousItems.filter((item) => item.id !== notificationId));
      setTotal((count) => Math.max(0, count - 1));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось обновить уведомление.');
    } finally {
      setBusy(false);
    }
  };

  const markAllAsRead = async () => {
    if (!csrfToken || busy || unreadCount === 0) {
      return;
    }

    setBusy(true);
    setErrorMessage('');

    try {
      await backendRequest({
        path: '/api/admin/notifications/read-all',
        method: 'POST',
        csrfToken,
      });

      setItems([]);
      setTotal(0);
      setUnreadCount(0);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось отметить уведомления.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-6 overflow-hidden border border-sepia bg-card-bg p-5 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-ink dark:text-gray-100">Уведомления обсуждений</h2>
          <p className="mt-1 font-serif text-sm text-ink/70 dark:text-gray-300">
            Новые комментарии к статьям и отзывы к товарам.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-9 items-center rounded-full border border-sepia/80 bg-sepia/35 px-3 py-1 font-sans text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-ink">
            Непрочитано: {unreadCount}
          </span>
          <button
            type="button"
            onClick={() => void markAllAsRead()}
            disabled={busy || !csrfToken || unreadCount === 0}
            className="inline-flex min-h-9 items-center rounded-full border border-sepia px-3 py-1 font-sans text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-55"
          >
            Прочитать все
          </button>
        </div>
      </header>

      {errorMessage && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="mt-4">
        {loading ? (
          <div className="space-y-2" aria-busy="true" aria-live="polite">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-16 animate-pulse rounded-xl border border-sepia/60 bg-sepia/20" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-sepia/70 bg-sepia/15 px-4 py-5 text-sm text-ink/70">
            Пока нет уведомлений.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className={`rounded-xl border px-3 py-3 transition-colors sm:px-4 ${
                  item.isRead
                    ? 'border-sepia/60 bg-sepia/10'
                    : 'border-accent/25 bg-[color:var(--accent-soft)]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full border border-sepia/70 px-2 py-1 font-sans text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink">
                        {getTypeLabel(item.type)}
                      </span>
                      <span className="font-sans text-[0.64rem] uppercase tracking-[0.12em] text-ink/60">
                        {formatTimestamp(item.createdAt)}
                      </span>
                    </div>

                    <div className="flex min-w-0 items-center gap-2">
                      <UserAvatar
                        name={item.actor?.name ?? 'Пользователь'}
                        avatarUrl={item.actor?.avatarDataUrl ?? null}
                        sizeClassName="h-8 w-8"
                        textClassName="text-xs"
                      />
                      <p className="font-sans text-xs uppercase tracking-[0.12em] text-ink/70">
                        {item.actor?.name ?? 'Пользователь удален'}
                      </p>
                    </div>

                    <p className="mt-2 max-h-12 overflow-hidden break-words font-serif text-sm leading-relaxed text-ink/85 [overflow-wrap:anywhere]">
                      {item.preview}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Link
                        href={item.target.path}
                        className="inline-flex min-h-9 items-center rounded-full border border-sepia px-3 py-1 font-sans text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-ink transition-colors hover:border-accent hover:text-accent"
                      >
                        Перейти к объекту
                      </Link>

                      {!item.isRead && (
                        <button
                          type="button"
                          onClick={() => void markAsRead(item.id)}
                          disabled={busy || !csrfToken}
                          className="inline-flex min-h-9 items-center rounded-full border border-sepia px-3 py-1 font-sans text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          Отметить прочитанным
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 font-sans text-[0.62rem] uppercase tracking-[0.12em] text-ink/55">
                    {item.isRead ? 'Прочитано' : 'Новое'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!loading && items.length > 0 && (
        <p className="mt-3 font-sans text-[0.62rem] uppercase tracking-[0.12em] text-ink/55">
          Показано: {items.length} из {total}
        </p>
      )}
    </section>
  );
};
