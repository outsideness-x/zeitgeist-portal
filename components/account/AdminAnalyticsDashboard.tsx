"use client";

import { useEffect, useId, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { backendRequest } from '@/services/backend/client';

type DashboardRange = 'day' | 'week' | 'month' | 'previousMonth';

type TrafficPoint = {
  bucketStart: string;
  pageViews: number;
  authenticatedPageViews: number;
  anonymousPageViews: number;
};

type AdminAnalyticsResponse = {
  generatedAt: string;
  onlineWindowMinutes: number;
  anonymousVisitorWindowDays: number;
  totals: {
    registeredUsers: number;
    anonymousVisitors: number;
    registeredOnline: number;
    anonymousOnline: number;
  };
  series: {
    day: TrafficPoint[];
    week: TrafficPoint[];
    month: TrafficPoint[];
    previousMonth: TrafficPoint[];
  };
};

type TooltipPayloadPoint = {
  payload: TrafficPoint & { label: string };
};

const refreshIntervalMs = 60_000;
const rangeOptions: DashboardRange[] = ['day', 'week', 'month', 'previousMonth'];

const rangeLabels: Record<DashboardRange, string> = {
  day: 'День',
  week: 'Неделя',
  month: '30 дней',
  previousMonth: 'Прошлый месяц',
};

const rangeSummaryLabels: Record<DashboardRange, string> = {
  day: 'последний день',
  week: 'последнюю неделю',
  month: 'последние 30 дней',
  previousMonth: 'прошлый календарный месяц',
};

const numberFormatter = new Intl.NumberFormat('ru-RU');

const formatBucketLabel = (bucketStart: string, range: DashboardRange) => {
  const date = new Date(bucketStart);

  if (range === 'day') {
    return new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  if (range === 'week') {
    return new Intl.DateTimeFormat('ru-RU', {
      weekday: 'short',
      day: 'numeric',
    }).format(date);
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
  }).format(date);
};

const formatGeneratedAt = (value: string) => {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return 'только что';
  }

  return new Date(parsed).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatChartAxis = (value: string) => value;

const ChartTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadPoint[];
}) => {
  if (!active || !payload?.[0]?.payload) {
    return null;
  }

  const point = payload[0].payload;

  return (
    <div className="rounded-[1.2rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur">
      <p className="font-sans text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
        {point.label}
      </p>
      <div className="mt-3 space-y-2 text-sm text-ink dark:text-gray-100">
        <div className="flex items-center justify-between gap-4">
          <span>Всего просмотров</span>
          <span className="font-sans font-semibold">{numberFormatter.format(point.pageViews)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Авторизованные</span>
          <span className="font-sans font-semibold">{numberFormatter.format(point.authenticatedPageViews)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Гостевые</span>
          <span className="font-sans font-semibold">{numberFormatter.format(point.anonymousPageViews)}</span>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) => {
  return (
    <div className="rounded-[1.6rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] p-5">
      <p className="font-sans text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">
        {label}
      </p>
      <p className="mt-4 font-display text-[clamp(2rem,4vw,3rem)] leading-none tracking-[-0.04em] text-ink dark:text-gray-100">
        {numberFormatter.format(value)}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted)]">
        {hint}
      </p>
    </div>
  );
};

export const AdminAnalyticsDashboard = () => {
  const [data, setData] = useState<AdminAnalyticsResponse | null>(null);
  const [range, setRange] = useState<DashboardRange>('day');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const areaId = useId().replace(/:/g, '');

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const response = await backendRequest<AdminAnalyticsResponse>({
          path: '/api/admin/analytics/dashboard',
        });

        if (cancelled) {
          return;
        }

        setData(response);
        setErrorMessage('');
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : 'Не удалось загрузить аналитику.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadDashboard();
      }
    }, refreshIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const chartData = useMemo(() => {
    const selectedSeries = data?.series[range] ?? [];
    return selectedSeries.map((point) => ({
      ...point,
      label: formatBucketLabel(point.bucketStart, range),
    }));
  }, [data, range]);

  const chartSummary = useMemo(() => {
    return chartData.reduce((summary, point) => {
      summary.pageViews += point.pageViews;
      summary.authenticatedPageViews += point.authenticatedPageViews;
      summary.anonymousPageViews += point.anonymousPageViews;
      return summary;
    }, {
      pageViews: 0,
      authenticatedPageViews: 0,
      anonymousPageViews: 0,
    });
  }, [chartData]);

  const hasTrafficData = chartData.some((point) => point.pageViews > 0);

  return (
    <section className="space-y-6">
      <div className="site-panel overflow-hidden rounded-[2rem] px-5 py-6 sm:px-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-accent">
              Site analytics
            </p>
            <h2 className="mt-3 font-display text-[clamp(1.9rem,4vw,3rem)] leading-[0.98] tracking-[-0.03em] text-ink dark:text-gray-100">
              Панорама посещаемости и активности
            </h2>
            <p className="mt-3 max-w-3xl font-serif text-sm leading-relaxed text-[color:var(--muted)]">
              Метрики строятся на серверном tracking layer: зарегистрированные пользователи считаются из базы аккаунтов, гости — как уникальные анонимные visitor IDs за операционное окно, online — как активность за последние минуты.
            </p>
          </div>
          {data && (
            <div className="rounded-full border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] px-4 py-2 font-sans text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-strong)]">
              Обновлено {formatGeneratedAt(data.generatedAt)}
            </div>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-[1.5rem] border border-red-300/50 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
          {errorMessage}
        </div>
      )}

      {loading && !data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-40 animate-pulse rounded-[1.6rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)]" />
          ))}
          <div className="h-[26rem] animate-pulse rounded-[1.8rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] md:col-span-2 xl:col-span-4" />
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Зарегистрированные пользователи"
              value={data.totals.registeredUsers}
              hint="Все аккаунты из текущей модели `User`. В проекте сейчас нет отдельного soft-delete или блокировки, поэтому счётчик отражает актуальный размер базы."
            />
            <MetricCard
              label={`Гостевые посетители · ${data.anonymousVisitorWindowDays} дней`}
              value={data.totals.anonymousVisitors}
              hint="Уникальные visitor IDs, у которых была хотя бы одна анонимная pageview за выбранное операционное окно."
            />
            <MetricCard
              label={`Онлайн зарегистрированные · ${data.onlineWindowMinutes} мин`}
              value={data.totals.registeredOnline}
              hint="Distinct user IDs с server-side last seen в пределах online-window. Счётчик не привязан к количеству вкладок."
            />
            <MetricCard
              label={`Онлайн гости · ${data.onlineWindowMinutes} мин`}
              value={data.totals.anonymousOnline}
              hint="Анонимные visitor IDs с недавней активностью. После входа такой visitor переходит в зарегистрированный online-контур."
            />
          </div>

          <div className="site-panel overflow-hidden rounded-[2rem] px-5 py-6 sm:px-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-sans text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">
                  Посещаемость сайта
                </p>
                <h3 className="mt-3 font-display text-[clamp(1.7rem,3vw,2.5rem)] leading-[0.98] tracking-[-0.03em] text-ink dark:text-gray-100">
                  Page views по времени
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--muted)]">
                  График строится по серверно агрегированным traffic buckets и показывает реальное распределение page views между авторизованным и гостевым трафиком.
                  Срез `30 дней` использует скользящее окно, а `Прошлый месяц` показывает предыдущий календарный месяц целиком.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {rangeOptions.map((value) => {
                    const active = range === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRange(value)}
                        className={`inline-flex min-h-10 items-center rounded-full border px-3 py-1.5 font-sans text-[0.64rem] font-semibold uppercase tracking-[0.14em] transition-colors ${
                          active
                            ? 'border-accent/35 bg-[color:var(--accent-soft)] text-accent'
                            : 'border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] text-[color:var(--muted-strong)] hover:border-accent/30 hover:text-accent'
                        }`}
                      >
                        {rangeLabels[value]}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2 text-[0.68rem]">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] px-3 py-1 font-sans font-semibold uppercase tracking-[0.12em] text-[color:var(--muted-strong)]">
                    <span className="h-2 w-2 rounded-full bg-accent" />
                    авторизованные
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] px-3 py-1 font-sans font-semibold uppercase tracking-[0.12em] text-[color:var(--muted-strong)]">
                    <span className="h-2 w-2 rounded-full bg-[color:var(--muted-strong)]" />
                    гости
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="rounded-[1.7rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] p-4 sm:p-5">
                {!hasTrafficData ? (
                  <div className="flex min-h-[20rem] flex-col items-center justify-center rounded-[1.3rem] border border-dashed border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] px-5 py-8 text-center">
                    <p className="font-display text-2xl text-ink dark:text-gray-100">
                      Трафик ещё накапливается
                    </p>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-[color:var(--muted)]">
                      Dashboard уже подключён к реальному tracking layer. Как только по сайту пройдут новые маршруты и просмотры, здесь появятся честные значения без декоративных заглушек.
                    </p>
                  </div>
                ) : (
                  <div className="h-[22rem] w-full sm:h-[25rem]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 12, right: 16, left: -12, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`${areaId}-auth`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
                            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id={`${areaId}-guest`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--muted-strong)" stopOpacity={0.18} />
                            <stop offset="100%" stopColor="var(--muted-strong)" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--line-soft)" strokeDasharray="4 6" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={12}
                          minTickGap={18}
                          tick={{ fill: 'var(--muted)', fontSize: 12 }}
                          tickFormatter={formatChartAxis}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={10}
                          allowDecimals={false}
                          width={36}
                          tick={{ fill: 'var(--muted)', fontSize: 12 }}
                        />
                        <Tooltip cursor={{ stroke: 'var(--line-strong)', strokeDasharray: '3 4' }} content={<ChartTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="anonymousPageViews"
                          stackId="traffic"
                          stroke="var(--muted-strong)"
                          strokeWidth={1.8}
                          fill={`url(#${areaId}-guest)`}
                        />
                        <Area
                          type="monotone"
                          dataKey="authenticatedPageViews"
                          stackId="traffic"
                          stroke="var(--accent)"
                          strokeWidth={2}
                          fill={`url(#${areaId}-auth)`}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-[1.6rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] p-5">
                  <p className="font-sans text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">
                    Итог за срез
                  </p>
                  <p className="mt-4 font-display text-[clamp(2rem,5vw,3rem)] leading-none tracking-[-0.04em] text-ink dark:text-gray-100">
                    {numberFormatter.format(chartSummary.pageViews)}
                  </p>
                  <p className="mt-3 text-sm text-[color:var(--muted)]">
                    суммарных page views за {rangeSummaryLabels[range]}
                  </p>
                </div>

                <div className="rounded-[1.6rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] p-5">
                  <p className="font-sans text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">
                    Расклад трафика
                  </p>
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-4 text-sm text-ink dark:text-gray-100">
                        <span>Авторизованные просмотры</span>
                        <span className="font-sans font-semibold">{numberFormatter.format(chartSummary.authenticatedPageViews)}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-[color:var(--surface-raised)]">
                        <div
                          className="h-2 rounded-full bg-accent"
                          style={{
                            width: `${chartSummary.pageViews > 0 ? (chartSummary.authenticatedPageViews / chartSummary.pageViews) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-4 text-sm text-ink dark:text-gray-100">
                        <span>Гостевые просмотры</span>
                        <span className="font-sans font-semibold">{numberFormatter.format(chartSummary.anonymousPageViews)}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-[color:var(--surface-raised)]">
                        <div
                          className="h-2 rounded-full bg-[color:var(--muted-strong)]"
                          style={{
                            width: `${chartSummary.pageViews > 0 ? (chartSummary.anonymousPageViews / chartSummary.pageViews) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.6rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-strong)] p-5 text-sm leading-relaxed text-[color:var(--muted)]">
                  <p>
                    Гости считаются как уникальные анонимные visitor IDs за последние {data.anonymousVisitorWindowDays} дней.
                  </p>
                  <p className="mt-3">
                    Online считается по server-side `lastSeen` в окне {data.onlineWindowMinutes} минут.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
};
