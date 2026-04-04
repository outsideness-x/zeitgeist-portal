"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminNotificationsPanel } from '@/components/admin/AdminNotificationsPanel';
import { backendRequest } from '@/services/backend/client';

type QueueFilter = 'all' | 'submitted' | 'in_review' | 'needs_changes' | 'resubmitted' | 'published' | 'rejected';
type ApprovalSection = 'journal' | 'research' | 'nova';

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
    requestedSection?: 'JOURNAL' | 'RESEARCH' | 'NOVA' | null;
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
      source?: 'LOCAL' | 'GHOST';
      canonicalUrl?: string | null;
    } | null;
  };
  auditLog: Array<{
    id: string;
    action: string;
    createdAt: string;
    metadata?: unknown;
  }>;
};

type AdminEditorialWorkspaceProps = {
  csrfToken: string | null;
};

const queueFilters: Array<{ value: QueueFilter; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'submitted', label: 'Новые' },
  { value: 'in_review', label: 'В работе' },
  { value: 'needs_changes', label: 'Доработка' },
  { value: 'resubmitted', label: 'Повторно' },
  { value: 'published', label: 'Опубликованы' },
  { value: 'rejected', label: 'Отклонены' },
];

const approvalSections: Array<{ value: ApprovalSection; label: string }> = [
  { value: 'journal', label: 'Журнал' },
  { value: 'research', label: 'Исследования' },
  { value: 'nova', label: 'Nova' },
];

const statusLabels: Record<string, string> = {
  DRAFT: 'черновик',
  SUBMITTED: 'отправлена',
  IN_REVIEW: 'на рассмотрении',
  NEEDS_CHANGES: 'ожидает правок',
  RESUBMITTED: 'повторная подача',
  APPROVED: 'одобрена',
  PUBLISHED: 'опубликована',
  REJECTED: 'отклонена',
};

const sectionFromSubmission = (value?: 'JOURNAL' | 'RESEARCH' | 'NOVA' | null): ApprovalSection => {
  if (value === 'RESEARCH') {
    return 'research';
  }
  if (value === 'NOVA') {
    return 'nova';
  }
  return 'journal';
};

const formatDateTime = (value: string) => {
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

const formatStatus = (status: string) => {
  return statusLabels[status] ?? status.toLowerCase();
};

const formatBytes = (value: number) => {
  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} КБ`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} МБ`;
};

export const AdminEditorialWorkspace = ({ csrfToken }: AdminEditorialWorkspaceProps) => {
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
  const [queue, setQueue] = useState<SubmissionQueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SubmissionDetailResponse | null>(null);
  const [reviewMessage, setReviewMessage] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [approvalSection, setApprovalSection] = useState<ApprovalSection>('journal');
  const [busy, setBusy] = useState(false);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const canApprove = useMemo(() => {
    const status = detail?.submission.status;
    return status === 'SUBMITTED' || status === 'IN_REVIEW' || status === 'RESUBMITTED';
  }, [detail?.submission.status]);

  const loadQueue = async (filter: QueueFilter, preferredSelectionId?: string | null) => {
    setLoadingQueue(true);
    setErrorMessage('');

    try {
      const query = new URLSearchParams({
        page: '1',
        pageSize: '50',
      });

      if (filter !== 'all') {
        query.set('status', filter);
      }

      const response = await backendRequest<QueueResponse>({
        path: `/api/admin/submissions?${query.toString()}`,
      });

      setQueue(response.items);

      if (response.items.length === 0) {
        setSelectedId(null);
        setDetail(null);
        return;
      }

      const nextSelectedId = preferredSelectionId && response.items.some((item) => item.id === preferredSelectionId)
        ? preferredSelectionId
        : response.items[0].id;

      setSelectedId(nextSelectedId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось загрузить редакторскую очередь.');
    } finally {
      setLoadingQueue(false);
    }
  };

  const loadDetail = async (id: string) => {
    setLoadingDetail(true);
    setErrorMessage('');

    try {
      const response = await backendRequest<SubmissionDetailResponse>({
        path: `/api/admin/submissions/${id}`,
      });

      setDetail(response);
      setApprovalSection(sectionFromSubmission(response.submission.requestedSection));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось открыть карточку заявки.');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    void loadQueue(queueFilter, selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueFilter]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    void loadDetail(selectedId);
  }, [selectedId]);

  const refreshAfterAction = async (preferredSelectionId?: string | null) => {
    await loadQueue(queueFilter, preferredSelectionId ?? selectedId);
    const targetId = preferredSelectionId ?? selectedId;
    if (targetId) {
      await loadDetail(targetId);
    }
  };

  const runAction = async (action: 'request-changes' | 'reject' | 'approve') => {
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
        setSuccessMessage('Запрос на правки отправлен.');
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
        setSuccessMessage('Заявка отклонена.');
      }

      if (action === 'approve') {
        await backendRequest({
          path: `/api/admin/submissions/${selectedId}/approve`,
          method: 'POST',
          csrfToken,
          body: {
            section: approvalSection,
          },
        });
        setSuccessMessage('Материал опубликован.');
      }

      await refreshAfterAction(selectedId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось выполнить действие.');
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

      setSuccessMessage('Заявка удалена навсегда.');
      await loadQueue(queueFilter, null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось удалить заявку.');
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
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось получить ссылку на PDF.');
    }
  };

  return (
    <section className="space-y-6">
      <div className="site-panel overflow-hidden rounded-[2rem] px-5 py-6 sm:px-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-accent">
              Редакторский контур
            </p>
            <h2 className="mt-3 font-display text-[clamp(1.9rem,4vw,3rem)] leading-[0.98] tracking-[-0.03em] text-ink dark:text-gray-100">
              Редактура и публикация материалов
            </h2>
            <p className="mt-3 max-w-3xl font-serif text-sm leading-relaxed text-[color:var(--muted)]">
              Очередь заявок, заметки редактора, уведомления обсуждений и выпуск материалов в разделы портала собраны в одном рабочем пространстве.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {queueFilters.map((filter) => {
              const active = queueFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setQueueFilter(filter.value)}
                  className={`inline-flex min-h-10 items-center rounded-full border px-3 py-1.5 font-sans text-[0.66rem] font-semibold uppercase tracking-[0.14em] transition-colors ${
                    active
                      ? 'border-accent/35 bg-[color:var(--accent-soft)] text-accent'
                      : 'border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] text-[color:var(--muted-strong)] hover:border-accent/30 hover:text-accent'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-[1.5rem] border border-red-300/50 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="rounded-[1.5rem] border border-accent/20 bg-[color:var(--accent-soft)] px-4 py-3 text-sm text-accent">
          {successMessage}
        </div>
      )}

      <AdminNotificationsPanel csrfToken={csrfToken} />

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="site-panel overflow-hidden rounded-[2rem]">
          <div className="border-b border-[color:var(--line-soft)] px-5 py-4">
            <p className="font-sans text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">
              Очередь заявок
            </p>
          </div>

          {loadingQueue ? (
            <div className="space-y-3 p-5" aria-busy="true">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="h-24 animate-pulse rounded-[1.25rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)]" />
              ))}
            </div>
          ) : queue.length === 0 ? (
            <div className="p-5">
              <div className="rounded-[1.4rem] border border-dashed border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] px-4 py-5 text-sm text-[color:var(--muted)]">
                В выбранном срезе пока нет заявок.
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-[color:var(--line-soft)]">
              {queue.map((item) => {
                const active = selectedId === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full px-5 py-4 text-left transition-colors ${
                        active
                          ? 'bg-[color:var(--accent-soft)]'
                          : 'bg-transparent hover:bg-[color:var(--surface-strong)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="line-clamp-2 font-serif text-base leading-snug text-ink dark:text-gray-100">
                            {item.title}
                          </p>
                          <p className="mt-2 text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">
                            {item.author.name} · {formatStatus(item.status)}
                          </p>
                          <p className="mt-2 text-xs text-[color:var(--muted)]">
                            {item.lastSubmittedAt ? `обновлена ${formatDateTime(item.lastSubmittedAt)}` : `создана ${formatDateTime(item.createdAt)}`}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-1 font-sans text-[0.58rem] font-semibold uppercase tracking-[0.14em] ${
                          active
                            ? 'border-accent/35 text-accent'
                            : 'border-[color:var(--line-soft)] text-[color:var(--muted-strong)]'
                        }`}>
                          {item.files[0] ? `v${item.files[0].version}` : 'без файла'}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <div className="site-panel overflow-hidden rounded-[2rem] px-5 py-6 sm:px-7">
          {!selectedId ? (
            <div className="rounded-[1.5rem] border border-dashed border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] px-5 py-8 text-sm text-[color:var(--muted)]">
              Выберите заявку слева, чтобы открыть материалы, историю аудита и редакторские действия.
            </div>
          ) : loadingDetail ? (
            <div className="space-y-4" aria-busy="true">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="h-20 animate-pulse rounded-[1.4rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)]" />
              ))}
            </div>
          ) : detail ? (
            <div className="space-y-8">
              <header className="border-b border-[color:var(--line-soft)] pb-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-accent">
                      Карточка материала
                    </p>
                    <h3 className="mt-3 font-display text-[clamp(1.8rem,3vw,2.8rem)] leading-[0.98] tracking-[-0.03em] text-ink dark:text-gray-100">
                      {detail.submission.title}
                    </h3>
                    <p className="mt-3 text-sm text-[color:var(--muted)]">
                      {detail.submission.author.name} · {detail.submission.author.email} · {formatStatus(detail.submission.status)}
                    </p>
                  </div>

                  {detail.submission.publishedArticle && (
                    <Link
                      href={`/article/${detail.submission.publishedArticle.slug}`}
                      className="inline-flex min-h-10 items-center rounded-full border border-accent/30 bg-[color:var(--accent-soft)] px-4 py-2 font-sans text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-accent transition-colors hover:border-accent"
                    >
                      Открыть публикацию
                    </Link>
                  )}
                </div>

                <p className="mt-5 whitespace-pre-wrap font-serif text-sm leading-relaxed text-ink/90 dark:text-gray-200">
                  {detail.submission.abstract}
                </p>
              </header>

              <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.5rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] p-4">
                  <p className="font-sans text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                    Ключевые слова
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-ink dark:text-gray-100">
                    {detail.submission.keywords.join(', ')}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] p-4">
                  <p className="font-sans text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                    Файлы
                  </p>
                  <p className="mt-3 text-sm text-ink dark:text-gray-100">
                    Версий: {detail.submission.files.length}
                  </p>
                  {detail.submission.files[0] && (
                    <button
                      type="button"
                      onClick={() => void downloadSubmissionPdf()}
                      className="mt-4 inline-flex min-h-10 items-center rounded-full border border-[color:var(--line-soft)] px-4 py-2 font-sans text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-strong)] transition-colors hover:border-accent hover:text-accent"
                    >
                      Скачать PDF
                    </button>
                  )}
                </div>
                <div className="rounded-[1.5rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] p-4">
                  <p className="font-sans text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                    Последняя версия
                  </p>
                  {detail.submission.files[0] ? (
                    <>
                      <p className="mt-3 text-sm text-ink dark:text-gray-100">
                        {detail.submission.files[0].originalName}
                      </p>
                      <p className="mt-2 text-xs text-[color:var(--muted)]">
                        {formatBytes(detail.submission.files[0].sizeBytes)} · {formatDateTime(detail.submission.files[0].uploadedAt)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-[color:var(--muted)]">Файл ещё не загружен.</p>
                  )}
                </div>
              </section>

              <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <div className="space-y-5">
                  <div className="rounded-[1.6rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] p-5">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="font-sans text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                          Публикация
                        </p>
                        <h4 className="mt-2 font-display text-2xl text-ink dark:text-gray-100">
                          Выпуск материала
                        </h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {approvalSections.map((section) => {
                          const active = approvalSection === section.value;
                          return (
                            <button
                              key={section.value}
                              type="button"
                              onClick={() => setApprovalSection(section.value)}
                              className={`inline-flex min-h-10 items-center rounded-full border px-3 py-1.5 font-sans text-[0.62rem] font-semibold uppercase tracking-[0.14em] transition-colors ${
                                active
                                  ? 'border-accent/35 bg-[color:var(--accent-soft)] text-accent'
                                  : 'border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] text-[color:var(--muted-strong)] hover:border-accent/25 hover:text-accent'
                              }`}
                            >
                              {section.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-[color:var(--muted)]">
                      Подтверждение переводит заявку в опубликованный материал и использует существующий backend publisher. Для читателя это выглядит как обычное развитие редакционного потока, без отдельной админ-панели.
                    </p>

                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={() => void runAction('approve')}
                        disabled={busy || !canApprove}
                        className="inline-flex min-h-11 items-center rounded-full border border-accent/35 bg-[color:var(--accent-soft)] px-5 py-2 font-sans text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-accent transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        Опубликовать в разделе
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[1.6rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] p-5">
                    <h4 className="font-display text-2xl text-ink dark:text-gray-100">
                      Редакторские действия
                    </h4>

                    <div className="mt-5 space-y-5">
                      <div>
                        <label htmlFor="review-message" className="font-sans text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                          Запросить правки
                        </label>
                        <textarea
                          id="review-message"
                          value={reviewMessage}
                          onChange={(event) => setReviewMessage(event.target.value)}
                          rows={4}
                          className="mt-2 w-full rounded-[1.1rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] px-4 py-3 text-sm text-ink placeholder:text-[color:var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:text-gray-100"
                          placeholder="Опишите, что нужно доработать до следующей подачи."
                        />
                        <button
                          type="button"
                          onClick={() => void runAction('request-changes')}
                          disabled={busy || reviewMessage.trim().length < 3}
                          className="mt-3 inline-flex min-h-10 items-center rounded-full border border-[color:var(--line-soft)] px-4 py-2 font-sans text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-strong)] transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          Отправить на доработку
                        </button>
                      </div>

                      <div>
                        <label htmlFor="reject-reason" className="font-sans text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                          Отклонение
                        </label>
                        <textarea
                          id="reject-reason"
                          value={rejectReason}
                          onChange={(event) => setRejectReason(event.target.value)}
                          rows={3}
                          className="mt-2 w-full rounded-[1.1rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] px-4 py-3 text-sm text-ink placeholder:text-[color:var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:text-gray-100"
                          placeholder="Причина необязательна, но помогает сохранить редакционный контекст."
                        />
                        <div className="mt-3 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => void runAction('reject')}
                            disabled={busy}
                            className="inline-flex min-h-10 items-center rounded-full border border-[color:var(--line-soft)] px-4 py-2 font-sans text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-strong)] transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-55"
                          >
                            Отклонить
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteSubmissionPermanently()}
                            disabled={busy}
                            className="inline-flex min-h-10 items-center rounded-full border border-red-400/50 px-4 py-2 font-sans text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-red-700 transition-colors hover:border-red-500 disabled:cursor-not-allowed disabled:opacity-55 dark:text-red-200"
                          >
                            Удалить навсегда
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="rounded-[1.6rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] p-5">
                    <h4 className="font-display text-2xl text-ink dark:text-gray-100">
                      История замечаний
                    </h4>

                    {detail.submission.reviewMessages.length === 0 ? (
                      <p className="mt-4 text-sm text-[color:var(--muted)]">
                        Для этой заявки пока нет редакторских сообщений.
                      </p>
                    ) : (
                      <ul className="mt-4 space-y-3">
                        {detail.submission.reviewMessages.map((message) => (
                          <li key={message.id} className="rounded-[1.2rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] px-4 py-3">
                            <p className="text-sm leading-relaxed text-ink dark:text-gray-100">
                              {message.message}
                            </p>
                            <p className="mt-2 text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">
                              {message.admin?.name ?? 'Редакция'} · {formatDateTime(message.createdAt)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-[1.6rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] p-5">
                    <h4 className="font-display text-2xl text-ink dark:text-gray-100">
                      Аудит
                    </h4>

                    <ul className="mt-4 space-y-3">
                      {detail.auditLog.map((entry) => (
                        <li key={entry.id} className="rounded-[1.2rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] px-4 py-3">
                          <p className="text-sm leading-relaxed text-ink dark:text-gray-100">
                            {entry.action}
                          </p>
                          <p className="mt-2 text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">
                            {formatDateTime(entry.createdAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};
