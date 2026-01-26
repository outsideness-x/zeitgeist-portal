import { Article, TeamMember, LibraryBook } from '@/types';

// mock data simulating ghost api response
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

// mock data for team members
const MOCK_TEAM: TeamMember[] = [
  {
    id: 't1',
    name: 'Dr. Alistair P.',
    role: 'Chief Archivist',
    bio: 'aaaaaaaaaaaaaaaaaa',
    photoUrl: 'https://picsum.photos/400/400?random=10'
  },
  {
    id: 't2',
    name: 'Elena V.',
    role: 'Lead Researcher',
    bio: 'aaaaaaaaaaaaaaaaaa',
    photoUrl: 'https://picsum.photos/400/400?random=11'
  },
  {
    id: 't3',
    name: 'K. H. Chen',
    role: 'Digital Preservation',
    bio: 'aaaaaaaaaaaaaaaaaa',
    photoUrl: 'https://picsum.photos/400/400?random=12'
  }
];

// mock data for library books
const MOCK_LIBRARY: LibraryBook[] = [
  {
    id: 'b1',
    title: 'The Seven Pillars of Wisdom',
    author: 'T. E. Lawrence',
    coverImage: 'https://picsum.photos/300/450?random=20',
    description: 'A biographical account of his service during the Arab Revolt.',
    longDescription: 'Seven Pillars of Wisdom is the autobiographical account of the experiences of British Army Colonel T. E. Lawrence ("Lawrence of Arabia") while serving as a military advisor to Bedouin forces during the Arab Revolt against the Ottoman Empire of 1916 to 1918.',
    pdfUrl: '#', // replace with real path like /library/book1.pdf
    publishedYear: '1926',
    language: 'English'
  },
  {
    id: 'b2',
    title: 'The Conference of the Birds',
    author: 'Attar of Nishapur',
    coverImage: 'https://picsum.photos/300/450?random=21',
    description: 'A celebrated literary masterpiece of Persian literature by poet Farid ud-Din Attar.',
    longDescription: 'The Conference of the Birds or Speech of the Birds is a celebrated literary masterpiece of Persian literature by poet Farid ud-Din Attar, commonly known as Attar of Nishapur. It is a poem of approximately 4500 lines written in Persian.',
    pdfUrl: '#',
    publishedYear: '1177',
    language: 'Persian / English Translation'
  },
  {
    id: 'b3',
    title: 'Orientalism',
    author: 'Edward W. Said',
    coverImage: 'https://picsum.photos/300/450?random=22',
    description: 'A critique of the cultural representations that are the bases of Orientalism.',
    longDescription: 'Orientalism is a 1978 book by Edward W. Said, in which the author discusses Orientalism, defined as the West\'s patronizing representations of "The East"—the societies and peoples who inhabit the places of Asia, North Africa, and the Middle East.',
    pdfUrl: '#',
    publishedYear: '1978',
    language: 'English'
  }
];

export const fetchArticles = async (type?: 'journal' | 'research' | 'nova'): Promise<Article[]> => {
  // simulate network delay
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

// fetch team members
export const fetchTeamMembers = async (): Promise<TeamMember[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return MOCK_TEAM;
};

// fetch library books
export const fetchLibraryBooks = async (): Promise<LibraryBook[]> => {
  await new Promise(resolve => setTimeout(resolve, 400));
  return MOCK_LIBRARY;
};

// fetch single book
export const fetchBookById = async (id: string): Promise<LibraryBook | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  return MOCK_LIBRARY.find(b => b.id === id);
};