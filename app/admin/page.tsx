"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { backendRequest } from '@/services/backend/client';

type SubmissionQueueItem = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  lastSubmittedAt?: string | null;
  author: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  files: Array<{
    id: string;
    originalName: string;
    sizeBytes: number;
    version: number;
  }>;
  reviewMessages: Array<{
    id: string;
    message: string;
    createdAt: string;
    admin?: { id: string; name: string };
  }>;
};

type QueueResponse = {
  items: SubmissionQueueItem[];
  totalPages: number;
};

type SubmissionDetailResponse = {
  submission: SubmissionQueueItem & {
    abstract: string;
    keywords: string[];
    files: Array<{
      id: string;
      originalName: string;
      sizeBytes: number;
      version: number;
      uploadedAt: string;
      mime: string;
    }>;
    publishedArticle?: {
      id: string;
      title: string;
      slug: string;
    } | null;
  };
  auditLog: Array<{
    id: string;
    action: string;
    createdAt: string;
    metadata?: unknown;
  }>;
};

export default function AdminPage() {
  const { user, loading, csrfToken } = useAuth();
  const [queue, setQueue] = useState<SubmissionQueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SubmissionDetailResponse | null>(null);
  const [reviewMessage, setReviewMessage] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isAdmin = useMemo(() => user?.role === 'ADMIN', [user?.role]);

  const loadQueue = async () => {
    const query = new URLSearchParams();
    query.set('page', '1');
    query.set('pageSize', '50');

    const response = await backendRequest<QueueResponse>({
      path: `/api/admin/submissions?${query.toString()}`,
    });

    const items = response.items;
    setQueue(items);

    if (items.length === 0) {
      setSelectedId(null);
      setDetail(null);
      return items;
    }

    const hasSelectedInQueue = selectedId ? items.some((item) => item.id === selectedId) : false;
    if (!hasSelectedInQueue && items[0]) {
      setSelectedId(items[0].id);
      setDetail(null);
    }

    return items;
  };

  const loadDetail = async (id: string) => {
    const response = await backendRequest<SubmissionDetailResponse>({
      path: `/api/admin/submissions/${id}`,
    });
    setDetail(response);
  };

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const run = async () => {
      setErrorMessage('');
      try {
        await loadQueue();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'не удалось загрузить очередь заявок');
      }
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !selectedId) {
      return;
    }

    const run = async () => {
      setErrorMessage('');
      try {
        await loadDetail(selectedId);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'не удалось загрузить карточку заявки');
      }
    };

    void run();
  }, [isAdmin, selectedId]);

  const runAction = async (action: 'request-changes' | 'reject') => {
    if (!selectedId || !csrfToken) {
      return;
    }

    setBusy(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (action === 'request-changes') {
        await backendRequest({
          path: `/api/admin/submissions/${selectedId}/request-changes`,
          method: 'POST',
          csrfToken,
          body: {
            message: reviewMessage,
          },
        });
        setReviewMessage('');
      }

      if (action === 'reject') {
        await backendRequest({
          path: `/api/admin/submissions/${selectedId}/reject`,
          method: 'POST',
          csrfToken,
          body: {
            reason: rejectReason || undefined,
          },
        });
        setRejectReason('');
      }

      setSuccessMessage('действие выполнено');
      const items = await loadQueue();
      const canUseCurrentSelection = selectedId ? items.some((item) => item.id === selectedId) : false;
      if (selectedId && canUseCurrentSelection) {
        await loadDetail(selectedId);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'не удалось выполнить действие');
    } finally {
      setBusy(false);
    }
  };

  const deleteSubmissionPermanently = async () => {
    if (!selectedId || !csrfToken) {
      return;
    }

    const submissionTitle = detail?.submission.title ?? 'эту заявку';
    const confirmed = window.confirm(`Удалить "${submissionTitle}" навсегда? Это действие необратимо.`);
    if (!confirmed) {
      return;
    }

    setBusy(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await backendRequest({
        path: `/api/admin/submissions/${selectedId}`,
        method: 'DELETE',
        csrfToken,
      });

      const queueResponse = await backendRequest<QueueResponse>({
        path: '/api/admin/submissions?page=1&pageSize=50',
      });

      setQueue(queueResponse.items);
      const nextId = queueResponse.items[0]?.id ?? null;
      setSelectedId(nextId);

      if (nextId) {
        await loadDetail(nextId);
      } else {
        setDetail(null);
      }

      setSuccessMessage('заявка удалена навсегда');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'не удалось удалить заявку');
    } finally {
      setBusy(false);
    }
  };

  const downloadSubmissionPdf = async () => {
    if (!selectedId) {
      return;
    }

    try {
      const response = await backendRequest<{ url: string }>({
        path: `/api/submissions/${selectedId}/download`,
      });
      window.open(response.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'не удалось получить ссылку на файл');
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-16">загрузка профиля...</div>;
  }

  if (!user) {
    return <div className="mx-auto max-w-4xl px-4 py-16">выполните вход для доступа к админ-панели.</div>;
  }

  if (!isAdmin) {
    return <div className="mx-auto max-w-4xl px-4 py-16">доступ разрешен только администраторам.</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 text-ink">
      <div className="mb-8">
        <h1 className="font-display text-4xl">Кабинет админа</h1>
      </div>

      {errorMessage && <p className="mb-4 text-sm text-red-600">{errorMessage}</p>}
      {successMessage && <p className="mb-4 text-sm text-green-700">{successMessage}</p>}

      <div className="grid items-start gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="min-w-0 overflow-hidden border border-sepia bg-card-bg">
          <ul>
            {queue.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`min-w-0 w-full border-b border-sepia/50 px-4 py-3 text-left ${selectedId === item.id ? 'bg-sepia/40' : 'hover:bg-sepia/20'}`}
                >
                  <p className="font-serif text-sm [overflow-wrap:anywhere]">{item.title}</p>
                  <p className="text-xs text-ink/70 [overflow-wrap:anywhere]">{item.author.name} · {item.status.toLowerCase()}</p>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="min-w-0 overflow-hidden border border-sepia bg-card-bg p-6">
          {queue.length === 0 && <p className="text-sm text-ink/70">Заявок нет</p>}

          {queue.length > 0 && detail && (
            <div className="space-y-6">
              <header>
                <h2 className="font-display text-3xl [overflow-wrap:anywhere]">{detail.submission.title}</h2>
                <p className="text-sm text-ink/70 [overflow-wrap:anywhere]">
                  {detail.submission.author.name} ({detail.submission.author.email}) · {detail.submission.status.toLowerCase()}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink/85 [overflow-wrap:anywhere]">{detail.submission.abstract}</p>
              </header>

              <section>
                <h3 className="mb-2 text-sm uppercase tracking-wider text-ink/70">метаданные</h3>
                <p className="text-sm [overflow-wrap:anywhere]">ключевые слова: {detail.submission.keywords.join(', ')}</p>
                <p className="text-sm">версий файла: {detail.submission.files.length}</p>
                {detail.submission.files[0] && (
                  <button
                    type="button"
                    onClick={() => void downloadSubmissionPdf()}
                    className="mt-3 border border-sepia bg-card-bg px-3 py-2 text-xs uppercase tracking-wider hover:border-accent"
                  >
                    скачать pdf
                  </button>
                )}
              </section>

              <section className="space-y-3 border-t border-sepia/50 pt-4">
                <h3 className="text-sm uppercase tracking-wider text-ink/70">действия редактора</h3>

                <div>
                  <label htmlFor="review-message" className="mb-1 block text-xs text-ink/70">запросить правки</label>
                  <textarea
                    id="review-message"
                    value={reviewMessage}
                    onChange={(event) => setReviewMessage(event.target.value)}
                    rows={3}
                    className="w-full border border-sepia bg-card-bg p-2 text-sm text-ink placeholder:text-ink/45"
                    placeholder="опишите, что нужно исправить"
                  />
                  <button
                    type="button"
                    onClick={() => void runAction('request-changes')}
                    disabled={busy || reviewMessage.trim().length < 3}
                    className="mt-2 border border-sepia bg-card-bg px-3 py-2 text-xs uppercase tracking-wider hover:border-accent disabled:opacity-50"
                  >
                    отправить правки
                  </button>
                </div>

                <div>
                  <label htmlFor="reject-reason" className="mb-1 block text-xs text-ink/70">причина отклонения</label>
                  <textarea
                    id="reject-reason"
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    rows={2}
                    className="w-full border border-sepia bg-card-bg p-2 text-sm text-ink placeholder:text-ink/45"
                    placeholder="опционально"
                  />
                  <button
                    type="button"
                    onClick={() => void runAction('reject')}
                    disabled={busy}
                    className="mt-2 border border-sepia bg-sepia/30 px-3 py-2 text-xs uppercase tracking-wider text-ink disabled:opacity-50"
                  >
                    reject
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => void deleteSubmissionPermanently()}
                    disabled={busy}
                    className="border border-red-300 bg-red-50 px-3 py-2 text-xs uppercase tracking-wider text-red-700 hover:border-red-500 disabled:opacity-50"
                  >
                    удалить навсегда
                  </button>
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm uppercase tracking-wider text-ink/70">история аудита</h3>
                <ul className="space-y-2 text-sm">
                  {detail.auditLog.map((entry) => (
                    <li key={entry.id} className="border-b border-sepia/20 pb-2">
                      <p className="[overflow-wrap:anywhere]">{entry.action}</p>
                      <p className="text-xs text-ink/70">{new Date(entry.createdAt).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
