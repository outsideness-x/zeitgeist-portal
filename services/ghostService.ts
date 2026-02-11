import { Article, TeamMember, LibraryBook } from '@/types';
import { cache } from 'react';

// mock data simulating ghost api response
const MOCK_ARTICLES: Article[] = [
  {
    id: '1',
    title: 'Шелковый путь: торговля и культурный обмен',
    excerpt: 'Подробный взгляд на то, как Шелковый путь сформировал цивилизации Востока и Запада через торговлю и искусство.',
    feature_image: 'https://picsum.photos/800/600?random=1',
    published_at: '2023-10-15T10:00:00Z',
    authors: [{ id: 'a1', name: 'Dr. Elena Vance' }],
    tags: ['История', 'Торговля', 'Центральная Азия'],
    reading_time: 8,
    type: 'journal',
    content: '<p>Здесь будет размещен полный HTML-контент из Ghost...</p>'
  },
  {
    id: '2',
    title: 'Рукописи позднего османского периода',
    excerpt: 'Оцифровка архивов: отчет о сохранении административных документов XIX века.',
    feature_image: 'https://picsum.photos/800/600?random=2',
    published_at: '2023-11-02T14:30:00Z',
    authors: [{ id: 'a2', name: 'Prof. A. K. Demir' }],
    tags: ['Архивоведение', 'Османская империя'],
    reading_time: 12,
    type: 'research',
    pdfUrl: '/files/paper.pdf'
  },
  {
    id: '3',
    title: 'Суфизм и поэзия в Персии XIII века',
    excerpt: 'Исследование метафизических измерений Руми и Хафиза в сравнительно-литературной перспективе.',
    feature_image: 'https://picsum.photos/800/600?random=3',
    published_at: '2023-09-20T09:15:00Z',
    authors: [{ id: 'a3', name: 'Sarah Jenkins' }],
    tags: ['Литература', 'Философия', 'Персия'],
    reading_time: 6,
    type: 'journal'
  },
  {
    id: '4',
    title: 'Археологические находки в Леванте',
    excerpt: 'Новые раскопки выявляют ранее неизвестные модели расселения, восходящие к бронзовому веку.',
    feature_image: 'https://picsum.photos/800/600?random=4',
    published_at: '2023-12-05T11:00:00Z',
    authors: [{ id: 'a4', name: 'Marcus Thorn' }],
    tags: ['Археология', 'Левант'],
    reading_time: 15,
    type: 'research',
    pdfUrl: '/files/digs.pdf'
  },
  // nova items
  {
    id: 'nova-1',
    title: 'Электронная революция: кат-ап и кибернетика',
    excerpt: 'Анализ вируса языка. «Слово теперь вирус». Как Берроуз предсказал информационную эпоху.',
    feature_image: 'https://picsum.photos/800/600?random=6', 
    published_at: '2024-01-10T23:23:00Z',
    authors: [{ id: 'wsb', name: 'W. Lee' }],
    tags: ['Кибернетика', 'Кат-ап', 'Контроль'],
    reading_time: 4,
    type: 'nova'
  },
  {
    id: 'nova-2',
    title: 'Dreamachine: мерцание и измененные состояния',
    excerpt: 'Стробоскопическое устройство Брайона Гайсина как портал в подсознание без химических веществ.',
    feature_image: 'https://picsum.photos/800/600?random=7',
    published_at: '2024-01-12T00:00:00Z',
    authors: [{ id: 'bg', name: 'B. Gysin' }],
    tags: ['Психоделика', 'Устройства', 'Сознание'],
    reading_time: 7,
    type: 'nova'
  }
];

// mock data for team members
const MOCK_TEAM: TeamMember[] = [
  {
    id: 't1',
    name: 'Георгий Иванов',
    role: 'Создатель',
    bio: 'Востоковед, исследователь восточного мистицизма, переводчик, основатель и руководитель научно-популярного востоковедческого журнала «Южная Луна»',
    photoUrl: '/team/1.jpg'
  },
  {
    id: 't2',
    name: 'Йорн Найко',
    role: 'Исследователь',
    bio: 'Философ и поэт, исследователь имманентной онтологии актуализации, форм жизни, автор философского трактата «Железо и кровь», идейный вдохновитель проекта Zeitgeist.',
    photoUrl: '/team/3.jpg'
  },
  {
    id: 't3',
    name: 'Константин Тросников',
    role: 'Исследователь',
    bio: 'Художник, музыкант, поэт. Участник психоделического псевдо-блэк one-man band Solar Symbol и метал группы Агенты Гипохтона. В прошлом участник групп The Ringing Emptiness, Thelema Ahnerbe и многих других проектов. Маргинальный исследователь магии, философии и weird-культур.',
    photoUrl: '/team/2.jpg'
  }
];

// mock data for library books
const MOCK_LIBRARY: LibraryBook[] = [
  {
    id: 'b1',
    title: 'Клопосфера и ее обитатели',
    author: 'Георгий Иванов',
    coverImage: '/library/covers/sfera.png',
    description: 'aaaaaaaaaaaaaaaaaaaaa',
    longDescription: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    pdfUrl: '#', // replace with real path like /library/book1.pdf
    publishedYear: '2026',
    language: 'Русский'
  }
];

const SIMULATED_API_DELAY_MS = Number(process.env.SIMULATED_API_DELAY_MS ?? 0);

const maybeWait = async () => {
  if (SIMULATED_API_DELAY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, SIMULATED_API_DELAY_MS));
  }
};

export const fetchArticles = cache(async (type?: 'journal' | 'research' | 'nova'): Promise<Article[]> => {
  await maybeWait();
  if (!type) return MOCK_ARTICLES;
  return MOCK_ARTICLES.filter((article) => article.type === type);
});

export const fetchArticleById = cache(async (id: string): Promise<Article | undefined> => {
  await maybeWait();
  return MOCK_ARTICLES.find((article) => article.id === id);
});

// fetch team members
export const fetchTeamMembers = cache(async (): Promise<TeamMember[]> => {
  await maybeWait();
  return MOCK_TEAM;
});

// fetch library books
export const fetchLibraryBooks = cache(async (): Promise<LibraryBook[]> => {
  await maybeWait();
  return MOCK_LIBRARY;
});

// fetch single book
export const fetchBookById = cache(async (id: string): Promise<LibraryBook | undefined> => {
  await maybeWait();
  return MOCK_LIBRARY.find((book) => book.id === id);
});
