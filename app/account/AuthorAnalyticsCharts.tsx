"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type SeriesPoint = {
  date: string;
  views: number;
  uniqueViews: number;
};

type ArticlePoint = {
  articleId: string;
  title: string;
  slug: string;
  views: number;
  reactions: {
    like: number;
    insightful: number;
    celebrate: number;
  };
};

type AuthorStatsPayload = {
  periodDays: number;
  series: SeriesPoint[];
  articles: Array<{
    articleId: string;
    slug: string;
    title: string;
    lastPeriodViews: number;
    reactions: Record<string, number>;
  }>;
  topArticles: Array<{
    articleId: string;
    title: string;
    slug: string;
    views: number;
  }>;
};

type Props = {
  stats7: AuthorStatsPayload;
  stats30: AuthorStatsPayload;
};

const chartContainerClass = 'h-72 w-full rounded border border-sepia/40 bg-stone-50 p-2';

const compactDate = (isoDate: string) => {
  const value = new Date(isoDate);
  return `${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
};

const toDateKey = (date: Date) => {
  return date.toISOString().slice(0, 10);
};

const denseSeries = (days: number, points: SeriesPoint[]) => {
  // this fills missing days with zero values so charts stay readable for sparse activity
  const byDate = new Map(points.map((point) => [point.date, point]));
  const output: SeriesPoint[] = [];
  const now = new Date();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset));
    const key = toDateKey(day);
    const existing = byDate.get(key);
    output.push({
      date: key,
      views: existing?.views ?? 0,
      uniqueViews: existing?.uniqueViews ?? 0,
    });
  }

  return output;
};

const toReactionRows = (stats: AuthorStatsPayload): ArticlePoint[] => {
  return stats.articles.map((article) => ({
    articleId: article.articleId,
    title: article.title,
    slug: article.slug,
    views: article.lastPeriodViews,
    reactions: {
      like: article.reactions.like ?? 0,
      insightful: article.reactions.insightful ?? 0,
      celebrate: article.reactions.celebrate ?? 0,
    },
  }));
};

const EmptyState = ({ message }: { message: string }) => {
  return (
    <div className="rounded border border-sepia/40 bg-stone-50 px-4 py-10 text-center text-sm text-gray-500">
      {message}
    </div>
  );
};

export const AuthorAnalyticsCharts = ({ stats7, stats30 }: Props) => {
  const views7 = denseSeries(7, stats7.series);
  const views30 = denseSeries(30, stats30.series);
  const reactionRows = toReactionRows(stats30);
  const topRows = stats30.topArticles.slice(0, 8);

  const hasTimeSeriesData = stats7.series.length > 0 || stats30.series.length > 0;
  const hasReactionData = reactionRows.some((row) => row.reactions.like + row.reactions.insightful + row.reactions.celebrate > 0);
  const hasTopArticles = topRows.length > 0;

  return (
    <div className="space-y-6">
      {!hasTimeSeriesData ? (
        <EmptyState message="there is no traffic data yet for your published articles" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className={chartContainerClass}>
            <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">views over time · last 7 days</p>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={views7} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7ccc1" />
                <XAxis dataKey="date" tickFormatter={compactDate} stroke="#7a6f66" tick={{ fontSize: 11 }} />
                <YAxis stroke="#7a6f66" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip labelFormatter={(value) => `date: ${value}`} />
                <Line type="monotone" dataKey="views" stroke="#b7410e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className={chartContainerClass}>
            <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">views over time · last 30 days</p>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={views30} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7ccc1" />
                <XAxis dataKey="date" tickFormatter={compactDate} stroke="#7a6f66" tick={{ fontSize: 11 }} />
                <YAxis stroke="#7a6f66" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip labelFormatter={(value) => `date: ${value}`} />
                <Line type="monotone" dataKey="views" stroke="#8b1e3f" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className={chartContainerClass}>
            <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">unique visitors · last 7 days</p>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={views7} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7ccc1" />
                <XAxis dataKey="date" tickFormatter={compactDate} stroke="#7a6f66" tick={{ fontSize: 11 }} />
                <YAxis stroke="#7a6f66" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip labelFormatter={(value) => `date: ${value}`} />
                <Line type="monotone" dataKey="uniqueViews" stroke="#2f6f44" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className={chartContainerClass}>
            <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">unique visitors · last 30 days</p>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={views30} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7ccc1" />
                <XAxis dataKey="date" tickFormatter={compactDate} stroke="#7a6f66" tick={{ fontSize: 11 }} />
                <YAxis stroke="#7a6f66" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip labelFormatter={(value) => `date: ${value}`} />
                <Line type="monotone" dataKey="uniqueViews" stroke="#1b4d75" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!hasReactionData ? (
        <EmptyState message="there is no reaction data yet" />
      ) : (
        <div className={chartContainerClass}>
          <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">reactions breakdown per article · last 30 days</p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reactionRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d7ccc1" />
              <XAxis dataKey="title" stroke="#7a6f66" tick={{ fontSize: 10 }} interval={0} angle={-20} height={64} textAnchor="end" />
              <YAxis stroke="#7a6f66" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="reactions.like" stackId="a" fill="#b7410e" name="like" />
              <Bar dataKey="reactions.insightful" stackId="a" fill="#2f6f44" name="insightful" />
              <Bar dataKey="reactions.celebrate" stackId="a" fill="#1b4d75" name="celebrate" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {!hasTopArticles ? (
        <EmptyState message="there are no top articles yet" />
      ) : (
        <div className={chartContainerClass}>
          <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">top articles by views · last 30 days</p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d7ccc1" />
              <XAxis dataKey="title" stroke="#7a6f66" tick={{ fontSize: 10 }} interval={0} angle={-20} height={64} textAnchor="end" />
              <YAxis stroke="#7a6f66" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="views" fill="#8b1e3f" name="views" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
