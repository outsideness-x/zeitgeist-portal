"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (user?.role === 'ADMIN') {
      router.replace('/account?tab=editorial');
      return;
    }

    router.replace('/account');
  }, [loading, router, user?.role]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 text-[color:var(--muted)]">
      переносим рабочее пространство в кабинет...
    </div>
  );
}
