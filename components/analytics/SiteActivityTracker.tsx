"use client";

import { useEffect, useEffectEvent, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { postAnalyticsActivity } from '@/services/backend/analytics';

const heartbeatIntervalMs = 4 * 60 * 1000;
const pageviewDedupWindowMs = 4_000;

const isArticleRoute = (pathname: string) => {
  return pathname === '/article' || pathname.startsWith('/article/');
};

export const SiteActivityTracker = () => {
  const pathname = usePathname();
  const lastPageviewRef = useRef<{ path: string; trackedAt: number } | null>(null);

  const sendActivity = useEffectEvent((kind: 'pageview' | 'heartbeat') => {
    const path = pathname?.trim() || '/';
    if (kind === 'pageview' && isArticleRoute(path)) {
      return;
    }

    if (typeof document !== 'undefined' && document.visibilityState !== 'visible' && kind === 'heartbeat') {
      return;
    }

    void postAnalyticsActivity({
      kind,
      path,
    });
  });

  useEffect(() => {
    const path = pathname?.trim() || '/';
    const now = Date.now();

    if (isArticleRoute(path)) {
      return;
    }

    const lastPageview = lastPageviewRef.current;
    if (lastPageview && lastPageview.path === path && (now - lastPageview.trackedAt) < pageviewDedupWindowMs) {
      return;
    }

    lastPageviewRef.current = {
      path,
      trackedAt: now,
    };

    sendActivity('pageview');
  }, [pathname]);

  useEffect(() => {
    const handleFocus = () => {
      sendActivity('heartbeat');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendActivity('heartbeat');
      }
    };

    const intervalId = window.setInterval(() => {
      sendActivity('heartbeat');
    }, heartbeatIntervalMs);

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return null;
};
