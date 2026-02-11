"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { backendRequest } from '@/services/backend/client';

type SubmissionListItem = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  files: Array<{ sizeBytes: number }>;
};

type SubmissionListResponse = {
  items: SubmissionListItem[];
  page: number;
  totalPages: number;
  total: number;
};

export default function DashboardSubmissionsPage() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<SubmissionListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!user) {
      return;
    }

    const run = async () => {
      setIsFetching(true);
      setErrorMessage('');

      try {
        const response = await backendRequest<SubmissionListResponse>({
          path: `/api/submissions?page=${page}&pageSize=20`,
        });

        setItems(response.items);
        setTotalPages(response.totalPages);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'не удалось загрузить список заявок');
      } finally {
        setIsFetching(false);
      }
    };

    void run();
  }, [page, user]);

  const roleLabel = useMemo(() => {
    if (!user) {
      return '';
    }
    return user.role.toLowerCase();
  }, [user]);

  if (loading) {
    return <div className="max-w-6xl mx-auto px-4 py-16">загрузка...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h1 className="font-display text-4xl mb-4">кабинет заявок</h1>
        <p className="text-gray-600">для доступа к кабинету выполните вход.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl mb-2">кабинет заявок</h1>
          <p className="text-gray-500">роль: {roleLabel}</p>
        </div>
        <Link href="/upload" className="text-sm uppercase tracking-widest border border-accent px-4 py-2 text-accent hover:bg-accent hover:text-white transition-colors">
          новая заявка
        </Link>
      </div>

      {errorMessage && (
        <p className="mb-6 text-red-600">{errorMessage}</p>
      )}

      <div className="border border-sepia overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-sepia/50 text-left">
            <tr>
              <th className="p-3">id</th>
              <th className="p-3">название</th>
              <th className="p-3">статус</th>
              <th className="p-3">файл</th>
              <th className="p-3">дата</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-sepia/60 hover:bg-sepia/20">
                <td className="p-3 font-mono text-xs">
                  <Link href={`/dashboard/submissions/${item.id}`} className="text-accent underline">
                    {item.id.slice(0, 8)}...
                  </Link>
                </td>
                <td className="p-3">{item.title}</td>
                <td className="p-3">{item.status.toLowerCase()}</td>
                <td className="p-3">{item.files[0] ? `${Math.round(item.files[0].sizeBytes / 1024)} kb` : 'нет файла'}</td>
                <td className="p-3">{new Date(item.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isFetching && <p className="mt-4 text-gray-500">обновляем данные...</p>}

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={page <= 1}
          className="px-4 py-2 border border-sepia disabled:opacity-40"
        >
          назад
        </button>
        <span className="text-gray-600">страница {page} из {totalPages}</span>
        <button
          type="button"
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          disabled={page >= totalPages}
          className="px-4 py-2 border border-sepia disabled:opacity-40"
        >
          вперед
        </button>
      </div>
    </div>
  );
}
