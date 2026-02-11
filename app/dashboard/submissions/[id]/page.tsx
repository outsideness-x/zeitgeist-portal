"use client";

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { backendRequest } from '@/services/backend/client';

type SubmissionFile = {
  id: string;
  storageKey: string;
  sizeBytes: number;
  mime: string;
  originalName: string;
  uploadedAt: string;
};

type SubmissionDetail = {
  id: string;
  title: string;
  keywords: string[];
  abstract: string;
  status: string;
  createdAt: string;
  author?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  files: SubmissionFile[];
};

const reviewRoles = new Set(['EDITOR', 'REVIEWER', 'ADMIN']);

export default function SubmissionDetailPage() {
  const params = useParams<{ id: string }>();
  const submissionId = params?.id;
  const { user, csrfToken, loading } = useAuth();
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [statusDraft, setStatusDraft] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const canReview = useMemo(() => {
    if (!user) {
      return false;
    }
    return reviewRoles.has(user.role);
  }, [user]);

  const fetchSubmission = useCallback(async () => {
    if (!submissionId || !user) {
      return;
    }

    setIsFetching(true);
    setErrorMessage('');

    try {
      const response = await backendRequest<{ submission: SubmissionDetail }>({
        path: `/api/submissions/${submissionId}`,
      });
      setSubmission(response.submission);
      setStatusDraft(response.submission.status);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'не удалось загрузить заявку');
    } finally {
      setIsFetching(false);
    }
  }, [submissionId, user]);

  useEffect(() => {
    void fetchSubmission();
  }, [fetchSubmission]);

  const handleStatusSave = async () => {
    if (!submissionId || !csrfToken) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await backendRequest<{ submission: SubmissionDetail }>({
        path: `/api/submissions/${submissionId}/status`,
        method: 'POST',
        csrfToken,
        body: { status: statusDraft },
      });
      setSubmission(response.submission);
      setSuccessMessage('статус обновлен');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'не удалось обновить статус');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!submissionId) {
      return;
    }

    setErrorMessage('');

    try {
      const response = await backendRequest<{ url: string }>({
        path: `/api/submissions/${submissionId}/download`,
      });

      window.location.href = response.url;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'не удалось подготовить загрузку');
    }
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-16">загрузка...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <p className="text-gray-600">для доступа к заявкам выполните вход.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="font-display text-4xl">заявка {submissionId?.slice(0, 8)}...</h1>
        <Link href="/dashboard/submissions" className="text-accent underline">к списку заявок</Link>
      </div>

      {errorMessage && <p className="mb-4 text-red-600">{errorMessage}</p>}
      {successMessage && <p className="mb-4 text-green-700">{successMessage}</p>}
      {isFetching && <p className="mb-4 text-gray-500">загрузка данных...</p>}

      {submission && (
        <div className="space-y-8">
          <section className="border border-sepia p-6 bg-white">
            <h2 className="font-display text-2xl mb-2">{submission.title}</h2>
            <p className="text-sm text-gray-500 mb-4">создано: {new Date(submission.createdAt).toLocaleString()}</p>
            <p className="mb-4 whitespace-pre-wrap">{submission.abstract}</p>
            <p className="text-sm text-gray-500">ключевые слова: {submission.keywords.join(', ')}</p>
          </section>

          <section className="border border-sepia p-6 bg-white">
            <h3 className="font-display text-xl mb-4">файл</h3>
            {submission.files[0] ? (
              <div>
                <p className="text-sm text-gray-600">имя: {submission.files[0].originalName}</p>
                <p className="text-sm text-gray-600">тип: {submission.files[0].mime}</p>
                <p className="text-sm text-gray-600">размер: {Math.round(submission.files[0].sizeBytes / 1024)} kb</p>
                <button
                  type="button"
                  onClick={() => void handleDownload()}
                  className="mt-4 px-4 py-2 border border-accent text-accent hover:bg-accent hover:text-white transition-colors"
                >
                  скачать файл
                </button>
              </div>
            ) : (
              <p className="text-gray-500">файл еще не загружен</p>
            )}
          </section>

          <section className="border border-sepia p-6 bg-white">
            <h3 className="font-display text-xl mb-4">статус</h3>
            <p className="mb-4 text-gray-600">текущий статус: {submission.status.toLowerCase()}</p>

            {canReview ? (
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <select
                  value={statusDraft}
                  onChange={(event) => setStatusDraft(event.target.value)}
                  className="border border-sepia px-3 py-2"
                >
                  <option value="UPLOADED">uploaded</option>
                  <option value="IN_REVIEW">in_review</option>
                  <option value="NEEDS_CHANGES">needs_changes</option>
                  <option value="ACCEPTED">accepted</option>
                  <option value="REJECTED">rejected</option>
                </select>
                <button
                  type="button"
                  onClick={() => void handleStatusSave()}
                  disabled={isSaving}
                  className="px-4 py-2 bg-accent text-white disabled:opacity-50"
                >
                  {isSaving ? 'сохраняем...' : 'обновить статус'}
                </button>
              </div>
            ) : (
              <p className="text-gray-500">изменение статуса доступно только reviewer/editor ролям.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
