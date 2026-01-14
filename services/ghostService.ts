import { Article } from '@/types';

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
  // nova items
  {
    id: 'nova-1',
    title: 'The Electronic Revolution: Cut-ups & Cybernetics',
    excerpt: 'Analyzing the virus of language. "The word is now a virus." How Burroughs predicted the information age.',
    feature_image: 'https://picsum.photos/800/600?random=6', 
    published_at: '2024-01-10T23:23:00Z',
    authors: [{ id: 'wsb', name: 'W. Lee' }],
    tags: ['Cybernetics', 'Cut-up', 'Control'],
    reading_time: 4,
    type: 'nova'
  },
  {
    id: 'nova-2',
    title: 'Dreamachine: Flicker and Altered States',
    excerpt: 'Brion Gysin’s stroboscopic device as a portal to the subconscious without chemicals.',
    feature_image: 'https://picsum.photos/800/600?random=7',
    published_at: '2024-01-12T00:00:00Z',
    authors: [{ id: 'bg', name: 'B. Gysin' }],
    tags: ['Psychedelia', 'Hardware', 'Consciousness'],
    reading_time: 7,
    type: 'nova'
  }
];

export const fetchArticles = async (type?: 'journal' | 'research' | 'nova'): Promise<Article[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (type) {
    return MOCK_ARTICLES.filter(a => a.type === type);
  }
  return MOCK_ARTICLES;
};

export const fetchArticleById = async (id: string): Promise<Article | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return MOCK_ARTICLES.find(a => a.id === id);
};