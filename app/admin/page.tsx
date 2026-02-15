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

const statusOptions = [
  '',
  'submitted',
  'in_review',
  'needs_changes',
  'resubmitted',
  'approved',
  'published',
  'rejected',
] as const;

const sectionOptions = ['journal', 'research', 'nova'] as const;

export default function AdminPage() {
  const { user, loading, csrfToken } = useAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const [queue, setQueue] = useState<SubmissionQueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SubmissionDetailResponse | null>(null);
  const [reviewMessage, setReviewMessage] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [approveSection, setApproveSection] = useState<(typeof sectionOptions)[number]>('journal');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isAdmin = useMemo(() => user?.role === 'ADMIN', [user?.role]);

  const loadQueue = async () => {
    const query = new URLSearchParams();
    query.set('page', '1');
    query.set('pageSize', '50');
    if (statusFilter) {
      query.set('status', statusFilter);
    }

    const response = await backendRequest<QueueResponse>({
      path: `/api/admin/submissions?${query.toString()}`,
    });

    setQueue(response.items);
    if (!selectedId && response.items[0]) {
      setSelectedId(response.items[0].id);
    }
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
  }, [isAdmin, statusFilter]);

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

  const runAction = async (action: 'request-changes' | 'approve' | 'reject') => {
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

      if (action === 'approve') {
        await backendRequest({
          path: `/api/admin/submissions/${selectedId}/approve`,
          method: 'POST',
          csrfToken,
          body: {
            section: approveSection,
          },
        });
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
      await loadQueue();
      if (selectedId) {
        await loadDetail(selectedId);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'не удалось выполнить действие');
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
    <div className="mx-auto max-w-7xl px-4 py-16">
      <div className="mb-8 flex items-end justify-between">
        <h1 className="font-display text-4xl">admin cabinet</h1>
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="status-filter" className="text-gray-600">статус</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="border border-sepia px-3 py-2"
          >
            <option value="">все</option>
            {statusOptions.filter(Boolean).map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {errorMessage && <p className="mb-4 text-sm text-red-600">{errorMessage}</p>}
      {successMessage && <p className="mb-4 text-sm text-green-700">{successMessage}</p>}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="border border-sepia bg-white">
          <ul>
            {queue.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full border-b border-sepia/50 px-4 py-3 text-left ${selectedId === item.id ? 'bg-sepia/40' : 'hover:bg-sepia/20'}`}
                >
                  <p className="font-serif text-sm">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.author.name} · {item.status.toLowerCase()}</p>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="border border-sepia bg-white p-6">
          {!detail && <p className="text-sm text-gray-500">выберите заявку из очереди.</p>}

          {detail && (
            <div className="space-y-6">
              <header>
                <h2 className="font-display text-3xl">{detail.submission.title}</h2>
                <p className="text-sm text-gray-600">
                  {detail.submission.author.name} ({detail.submission.author.email}) · {detail.submission.status.toLowerCase()}
                </p>
                <p className="mt-2 text-sm text-gray-700">{detail.submission.abstract}</p>
              </header>

              <section>
                <h3 className="mb-2 text-sm uppercase tracking-wider text-gray-500">метаданные</h3>
                <p className="text-sm">ключевые слова: {detail.submission.keywords.join(', ')}</p>
                <p className="text-sm">версий файла: {detail.submission.files.length}</p>
                {detail.submission.files[0] && (
                  <button
                    type="button"
                    onClick={() => void downloadSubmissionPdf()}
                    className="mt-3 border border-sepia px-3 py-2 text-xs uppercase tracking-wider hover:border-accent"
                  >
                    скачать pdf
                  </button>
                )}
              </section>

              <section className="space-y-3 border-t border-sepia/50 pt-4">
                <h3 className="text-sm uppercase tracking-wider text-gray-500">действия редактора</h3>

                <div>
                  <label htmlFor="review-message" className="mb-1 block text-xs text-gray-500">запросить правки</label>
                  <textarea
                    id="review-message"
                    value={reviewMessage}
                    onChange={(event) => setReviewMessage(event.target.value)}
                    rows={3}
                    className="w-full border border-sepia p-2 text-sm"
                    placeholder="опишите, что нужно исправить"
                  />
                  <button
                    type="button"
                    onClick={() => void runAction('request-changes')}
                    disabled={busy || reviewMessage.trim().length < 3}
                    className="mt-2 border border-sepia px-3 py-2 text-xs uppercase tracking-wider hover:border-accent disabled:opacity-50"
                  >
                    отправить правки
                  </button>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <label htmlFor="approve-section" className="mb-1 block text-xs text-gray-500">раздел публикации</label>
                    <select
                      id="approve-section"
                      value={approveSection}
                      onChange={(event) => setApproveSection(event.target.value as (typeof sectionOptions)[number])}
                      className="border border-sepia px-3 py-2 text-sm"
                    >
                      {sectionOptions.map((section) => (
                        <option key={section} value={section}>{section}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => void runAction('approve')}
                    disabled={busy}
                    className="border border-green-700 bg-green-700 px-3 py-2 text-xs uppercase tracking-wider text-white disabled:opacity-50"
                  >
                    approve and publish
                  </button>
                </div>

                <div>
                  <label htmlFor="reject-reason" className="mb-1 block text-xs text-gray-500">причина отклонения</label>
                  <textarea
                    id="reject-reason"
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    rows={2}
                    className="w-full border border-sepia p-2 text-sm"
                    placeholder="опционально"
                  />
                  <button
                    type="button"
                    onClick={() => void runAction('reject')}
                    disabled={busy}
                    className="mt-2 border border-red-700 px-3 py-2 text-xs uppercase tracking-wider text-red-700 disabled:opacity-50"
                  >
                    reject
                  </button>
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm uppercase tracking-wider text-gray-500">история аудита</h3>
                <ul className="space-y-2 text-sm">
                  {detail.auditLog.map((entry) => (
                    <li key={entry.id} className="border-b border-sepia/20 pb-2">
                      <p>{entry.action}</p>
                      <p className="text-xs text-gray-500">{new Date(entry.createdAt).toLocaleString()}</p>
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
