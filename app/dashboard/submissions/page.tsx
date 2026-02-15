"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardSubmissionsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/account');
  }, [router]);

  return <div className="mx-auto max-w-4xl px-4 py-16">перенаправление в кабинет...</div>;
}
