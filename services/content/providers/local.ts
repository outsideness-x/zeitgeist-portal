import { cache } from 'react';
import type { Article, LibraryBook, TeamMember } from '@/types';
import type { ArticleKind, ContentProvider, PaginatedResult, PaginationInput } from '../types';

const LOCAL_ARTICLES: Article[] = [
  {
    id: '1',
    title: 'шелковый путь: торговля и культурный обмен',
    excerpt: 'подробный взгляд на то, как шелковый путь сформировал цивилизации востока и запада через торговлю и искусство.',
    feature_image: 'https://picsum.photos/800/600?random=1',
    published_at: '2023-10-15T10:00:00Z',
    authors: [{ id: 'a1', name: 'dr. elena vance' }],
    tags: ['история', 'торговля', 'центральная азия'],
    reading_time: 8,
    type: 'journal',
    content: '<p>здесь будет размещен полный html-контент из ghost...</p>',
    gallery_images: [
      'https://picsum.photos/1280/720?random=11',
      'https://picsum.photos/1280/720?random=12',
      'https://picsum.photos/1280/720?random=13',
    ],
  },
  {
    id: '2',
    title: 'рукописи позднего османского периода',
    excerpt: 'оцифровка архивов: отчет о сохранении административных документов xix века.',
    feature_image: 'https://picsum.photos/800/600?random=2',
    published_at: '2023-11-02T14:30:00Z',
    authors: [{ id: 'a2', name: 'prof. a. k. demir' }],
    tags: ['архивоведение', 'османская империя'],
    reading_time: 12,
    type: 'research',
    content: `
      <p>исследование корпуса позднеосманских рукописей показывает, что канцелярские практики конца xix века развивались как гибрид централизованных реформ и локальных административных традиций. в документах из стамбульских и провинциальных архивов заметна единая логика регистрационных форм, но язык резолюций и структура полевых помет заметно различаются.</p>
      <p>в выборке материалов 1876-1908 годов выделяются повторяемые формулы, связанные с процедурой верификации распоряжений. сопоставление дат, печатей и подписей показывает, что многие правовые новации внедрялись через внутренние циркуляры, а не только через официальные опубликованные регламенты.</p>
      <p>отдельный пласт источников составляют маргиналии на полях. эти пометы фиксируют движение документов между департаментами и позволяют реконструировать реальные сроки принятия решений. таким образом, рукописи работают не только как носители текста, но и как след институциональной памяти поздней империи.</p>
    `,
  },
  {
    id: '3',
    title: 'суфизм и поэзия в персии xiii века',
    excerpt: 'исследование метафизических измерений руми и хафиза в сравнительно-литературной перспективе.',
    feature_image: 'https://picsum.photos/800/600?random=3',
    published_at: '2023-09-20T09:15:00Z',
    authors: [{ id: 'a3', name: 'sarah jenkins' }],
    tags: ['литература', 'философия', 'персия'],
    reading_time: 6,
    type: 'journal',
  },
  {
    id: '4',
    title: 'археологические находки в леванте',
    excerpt: 'новые раскопки выявляют ранее неизвестные модели расселения, восходящие к бронзовому веку.',
    feature_image: 'https://picsum.photos/800/600?random=4',
    published_at: '2023-12-05T11:00:00Z',
    authors: [{ id: 'a4', name: 'marcus thorn' }],
    tags: ['археология', 'левант'],
    reading_time: 15,
    type: 'research',
    content: `
      <p>археологические данные по нескольким участкам леванта указывают на более сложную модель расселения, чем предполагалось ранее. в слоях позднего бронзового века обнаружены комплексы керамики и органики, которые коррелируют с сезонной хозяйственной активностью и межпоселковым обменом.</p>
      <p>серия радиоуглеродных датировок подтвердила синхронность отдельных производственных зон, расположенных в разных экосистемах. это говорит о высокой координации между прибрежными и внутренними маршрутами. микроскопический анализ следов использования инструментов показывает устойчивые практики обработки древесины и зерновых.</p>
      <p>сопоставление новых находок с отчетами ранних экспедиций позволило уточнить атрибуцию ряда объектов, ранее датированных ошибочно. итогом стала обновленная региональная хронология, в которой локальные центры демонстрируют собственные траектории развития, а не зависимость от единственного политического ядра.</p>
    `,
  },
  {
    id: 'nova-1',
    title: 'электронная революция: кат-ап и кибернетика',
    excerpt: 'анализ вируса языка. «слово теперь вирус». как берроуз предсказал информационную эпоху.',
    feature_image: 'https://picsum.photos/800/600?random=6',
    published_at: '2024-01-10T23:23:00Z',
    authors: [{ id: 'wsb', name: 'w. lee' }],
    tags: ['кибернетика', 'кат-ап', 'контроль'],
    reading_time: 4,
    type: 'nova',
  },
  {
    id: 'nova-2',
    title: 'dreamachine: мерцание и измененные состояния',
    excerpt: 'стробоскопическое устройство брайона гайсина как портал в подсознание без химических веществ.',
    feature_image: 'https://picsum.photos/800/600?random=7',
    published_at: '2024-01-12T00:00:00Z',
    authors: [{ id: 'bg', name: 'b. gysin' }],
    tags: ['психоделика', 'устройства', 'сознание'],
    reading_time: 7,
    type: 'nova',
  },
];

const LOCAL_TEAM: TeamMember[] = [
  {
    id: 't1',
    name: 'Георгий Иванов',
    role: 'создатель',
    bio: 'востоковед, исследователь восточного мистицизма, переводчик и руководитель научно-популярного востоковедческого журнала «южная луна».',
    photoUrl: '/team/1.jpg',
  },
  {
    id: 't2',
    name: 'Йорн Найко',
    role: 'исследователь',
    bio: 'философ и поэт, исследователь имманентной онтологии актуализации форм жизни.',
    photoUrl: '/team/3.jpg',
  },
  {
    id: 't3',
    name: 'Константин Тросников',
    role: 'исследователь',
    bio: 'художник, музыкант и поэт, исследователь маргинальной философии и weird-культур.',
    photoUrl: '/team/2.jpg',
  },
];

const LOCAL_LIBRARY: LibraryBook[] = [
  {
    id: 'b1',
    title: 'клопосфера и ее обитатели',
    author: 'георгий иванов',
    coverImage: '/library/covers/sfera.png',
    description: 'архивный сборник о границах восприятия и языка.',
    longDescription: 'критическое исследование языка, формы и метафизики повседневности на материале авторских заметок и архивных текстов.',
    pdfUrl: '#',
    publishedYear: '2026',
    language: 'русский',
  },
];

const LOCAL_DELAY_MS = Number(process.env.SIMULATED_API_DELAY_MS ?? 0);
const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

const maybeWait = async () => {
  if (LOCAL_DELAY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, LOCAL_DELAY_MS));
  }
};

const normalizePagination = (input?: PaginationInput) => {
  const page = Math.max(1, input?.page ?? 1);
  const pageSize = Math.max(1, Math.min(50, input?.pageSize ?? 10));
  return { page, pageSize };
};

const toPaginatedResult = <T,>(items: T[], pagination?: PaginationInput): PaginatedResult<T> => {
  const { page, pageSize } = normalizePagination(pagination);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;

  return {
    items: items.slice(start, end),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
};

type PublishedArticle = {
  id: string;
  internalArticleId: string;
  slug: string;
  canonicalPath: string;
  source: string;
  title: string;
  excerpt: string;
  htmlContent?: string | null;
  featureImage?: string | null;
  galleryImages?: string[] | null;
  section: 'journal' | 'research' | 'nova';
  publishedAt: string;
  author?: { id: string; name: string } | null;
  pdfAvailable: boolean;
};

type PublishedArticleListResponse = {
  items: PublishedArticle[];
};

type PublishedArticleResponse = {
  article: PublishedArticle;
};

const toLocalArticle = (article: Article): Article => {
  return {
    ...article,
    source: 'local',
    slug: article.id,
    canonicalPath: article.canonicalPath ?? `/article/${article.id}`,
  };
};

const fromPublishedArticle = (item: PublishedArticle): Article => {
  const authorName = item.author?.name ?? 'редакция';
  return {
    id: item.slug,
    internalArticleId: item.internalArticleId,
    source: 'local',
    slug: item.slug,
    canonicalPath: item.canonicalPath,
    title: item.title,
    excerpt: item.excerpt,
    content: item.htmlContent ?? undefined,
    feature_image: item.featureImage ?? undefined,
    gallery_images: item.galleryImages ?? undefined,
    published_at: item.publishedAt,
    authors: [{ id: item.author?.id ?? `author-${item.internalArticleId}`, name: authorName }],
    tags: [item.section],
    type: item.section,
    reading_time: undefined,
  };
};

const fetchPublishedArticles = cache(async (type?: ArticleKind): Promise<Article[]> => {
  const search = new URLSearchParams();
  search.set('page', '1');
  search.set('pageSize', '100');
  if (type) {
    search.set('section', type);
  }

  const url = `${backendBaseUrl}/api/content/articles?${search.toString()}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 15 },
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as PublishedArticleListResponse;
    return payload.items.map(fromPublishedArticle);
  } catch {
    return [];
  }
});

const fetchPublishedArticleBySlug = cache(async (slug: string): Promise<Article | undefined> => {
  try {
    const response = await fetch(`${backendBaseUrl}/api/content/articles/${encodeURIComponent(slug)}`, {
      next: { revalidate: 15 },
    });

    if (!response.ok) {
      return undefined;
    }

    const payload = (await response.json()) as PublishedArticleResponse;
    return fromPublishedArticle(payload.article);
  } catch {
    return undefined;
  }
});

export class LocalContentProvider implements ContentProvider {
  // cache keeps local reads stable across metadata and page render in the same request graph
  fetchArticles = cache(async (type?: ArticleKind, pagination?: PaginationInput): Promise<PaginatedResult<Article>> => {
    await maybeWait();
    const staticFiltered = type ? LOCAL_ARTICLES.filter((article) => article.type === type) : LOCAL_ARTICLES;
    const localSeedArticles = staticFiltered.map(toLocalArticle);
    const publishedArticles = await fetchPublishedArticles(type);

    const deduped = new Map<string, Article>();
    [...localSeedArticles, ...publishedArticles].forEach((article) => {
      deduped.set(article.id, article);
    });

    const sorted = [...deduped.values()].sort((a, b) => +new Date(b.published_at) - +new Date(a.published_at));
    return toPaginatedResult(sorted, pagination);
  });

  fetchArticleById = cache(async (id: string): Promise<Article | undefined> => {
    await maybeWait();
    const published = await fetchPublishedArticleBySlug(id);
    if (published) {
      return published;
    }
    const localSeed = LOCAL_ARTICLES.find((article) => article.id === id);
    if (!localSeed) {
      return undefined;
    }
    return toLocalArticle(localSeed);
  });

  fetchTeamMembers = cache(async (): Promise<TeamMember[]> => {
    await maybeWait();
    return LOCAL_TEAM;
  });

  fetchLibraryBooks = cache(async (): Promise<LibraryBook[]> => {
    await maybeWait();
    return LOCAL_LIBRARY;
  });

  fetchBookById = cache(async (id: string): Promise<LibraryBook | undefined> => {
    await maybeWait();
    return LOCAL_LIBRARY.find((book) => book.id === id);
  });
}
