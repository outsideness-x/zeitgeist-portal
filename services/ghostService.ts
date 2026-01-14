import { Article } from '../types';

// Mock data simulating Ghost API response
const MOCK_ARTICLES: Article[] = [
  {
    id: '1',
    title: 'The Silk Road: Trade and Cultural Exchange',
    excerpt: 'An in-depth look at how the Silk Road shaped the civilizations of the East and West through commerce and art.',
    feature_image: 'https://picsum.photos/800/600?random=1',
    published_at: '2023-10-15T10:00:00Z',
    authors: [{ id: 'a1', name: 'Dr. Elena Vance' }],
    tags: ['History', 'Trade', 'Central Asia'],
    reading_time: 8,
    type: 'journal',
    content: '<p>Full HTML content from Ghost would go here...</p>'
  },
  {
    id: '2',
    title: 'Manuscripts of the Late Ottoman Period',
    excerpt: 'Digitizing the archives: A report on the preservation efforts of 19th-century administrative documents.',
    feature_image: 'https://picsum.photos/800/600?random=2',
    published_at: '2023-11-02T14:30:00Z',
    authors: [{ id: 'a2', name: 'Prof. A. K. Demir' }],
    tags: ['Archival Studies', 'Ottoman Empire'],
    reading_time: 12,
    type: 'research',
    pdfUrl: '/files/paper.pdf'
  },
  {
    id: '3',
    title: 'Sufism and Poetry in 13th Century Persia',
    excerpt: 'Exploring the metaphysical dimensions of Rumi and Hafiz through a comparative literary lens.',
    feature_image: 'https://picsum.photos/800/600?random=3',
    published_at: '2023-09-20T09:15:00Z',
    authors: [{ id: 'a3', name: 'Sarah Jenkins' }],
    tags: ['Literature', 'Philosophy', 'Persia'],
    reading_time: 6,
    type: 'journal'
  },
  {
    id: '4',
    title: 'Archaeological Findings in the Levant',
    excerpt: 'New excavations reveal previously unknown settlement patterns dating back to the Bronze Age.',
    feature_image: 'https://picsum.photos/800/600?random=4',
    published_at: '2023-12-05T11:00:00Z',
    authors: [{ id: 'a4', name: 'Marcus Thorn' }],
    tags: ['Archaeology', 'Levant'],
    reading_time: 15,
    type: 'research',
    pdfUrl: '/files/digs.pdf'
  },
  {
    id: '5',
    title: 'The Influence of Buddhism on Tang Dynasty Art',
    excerpt: 'A visual analysis of sculpture and painting evolution during the golden age of Chinese cosmopolitanism.',
    feature_image: 'https://picsum.photos/800/600?random=5',
    published_at: '2023-10-28T16:45:00Z',
    authors: [{ id: 'a5', name: 'Li Wei' }],
    tags: ['Art History', 'China', 'Buddhism'],
    reading_time: 10,
    type: 'journal'
  }
];

export const fetchArticles = async (type?: 'journal' | 'research'): Promise<Article[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  if (type) {
    return MOCK_ARTICLES.filter(a => a.type === type);
  }
  return MOCK_ARTICLES;
};

export const fetchArticleById = async (id: string): Promise<Article | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return MOCK_ARTICLES.find(a => a.id === id);
};
