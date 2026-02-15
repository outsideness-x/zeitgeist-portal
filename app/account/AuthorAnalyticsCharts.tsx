"use client";

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
const tableContainerClass = 'rounded border border-sepia/40 bg-stone-50 p-3';

const compactDate = (isoDate: string) => {
  const value = new Date(isoDate);
  return `${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
};

const toDateKey = (date: Date) => {
  return date.toISOString().slice(0, 10);
};

const toPercent = (value: number, maxValue: number): number => {
  if (maxValue <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((value / maxValue) * 100));
};

const denseSeries = (days: number, points: SeriesPoint[]) => {
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

const SeriesPanel = ({
  title,
  points,
  valueKey,
}: {
  title: string;
  points: SeriesPoint[];
  valueKey: 'views' | 'uniqueViews';
}) => {
  const maxValue = Math.max(...points.map((point) => point[valueKey]), 0);

  return (
    <div className={chartContainerClass}>
      <p className="mb-3 text-xs uppercase tracking-wider text-gray-500">{title}</p>
      <div className="space-y-2">
        {points.map((point) => (
          <div key={`${title}-${point.date}`}>
            <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
              <span>{compactDate(point.date)}</span>
              <span>{point[valueKey]}</span>
            </div>
            <div className="h-2 w-full bg-sepia/30">
              <div className="h-2 bg-accent" style={{ width: `${toPercent(point[valueKey], maxValue)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ReactionPanel = ({ rows }: { rows: ArticlePoint[] }) => {
  const maxValue = Math.max(
    ...rows.map((row) => row.reactions.like + row.reactions.insightful + row.reactions.celebrate),
    0,
  );

  return (
    <div className={tableContainerClass}>
      <p className="mb-3 text-xs uppercase tracking-wider text-gray-500">reactions breakdown per article · last 30 days</p>
      <div className="space-y-3">
        {rows.map((row) => {
          const totalReactions = row.reactions.like + row.reactions.insightful + row.reactions.celebrate;
          return (
            <div key={row.articleId}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs text-gray-600">
                <span className="truncate">{row.title}</span>
                <span>
                  l {row.reactions.like} · i {row.reactions.insightful} · c {row.reactions.celebrate}
                </span>
              </div>
              <div className="h-2 w-full bg-sepia/30">
                <div className="h-2 bg-accent" style={{ width: `${toPercent(totalReactions, maxValue)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TopArticlesPanel = ({ rows }: { rows: Array<{ articleId: string; title: string; slug: string; views: number }> }) => {
  const maxValue = Math.max(...rows.map((row) => row.views), 0);

  return (
    <div className={tableContainerClass}>
      <p className="mb-3 text-xs uppercase tracking-wider text-gray-500">top articles by views · last 30 days</p>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.articleId}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs text-gray-600">
              <span className="truncate">{row.title}</span>
              <span>{row.views}</span>
            </div>
            <div className="h-2 w-full bg-sepia/30">
              <div className="h-2 bg-accent" style={{ width: `${toPercent(row.views, maxValue)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AuthorAnalyticsCharts = ({ stats7, stats30 }: Props) => {
  const views7 = denseSeries(7, stats7.series);
  const views30 = denseSeries(30, stats30.series);
  const reactionRows = toReactionRows(stats30).slice(0, 8);
  const topRows = stats30.topArticles.slice(0, 8);

  const hasTimeSeriesData = stats7.series.length > 0 || stats30.series.length > 0;
  const hasReactionData = stats30.articles.some((row) => {
    const reactions = row.reactions;
    return (reactions.like ?? 0) + (reactions.insightful ?? 0) + (reactions.celebrate ?? 0) > 0;
  });
  const hasTopArticles = stats30.topArticles.length > 0;

  return (
    <div className="space-y-6">
      {!hasTimeSeriesData && <EmptyState message="there is no traffic data yet for your published articles" />}

      <div className="grid gap-4 lg:grid-cols-2">
        <SeriesPanel title="views over time · last 7 days" points={views7} valueKey="views" />
        <SeriesPanel title="views over time · last 30 days" points={views30} valueKey="views" />
        <SeriesPanel title="unique visitors · last 7 days" points={views7} valueKey="uniqueViews" />
        <SeriesPanel title="unique visitors · last 30 days" points={views30} valueKey="uniqueViews" />
      </div>

      {!hasReactionData && <EmptyState message="there is no reaction data yet" />}
      <ReactionPanel rows={reactionRows} />

      {!hasTopArticles && <EmptyState message="there are no top articles yet" />}
      <TopArticlesPanel rows={topRows} />
    </div>
  );
};
