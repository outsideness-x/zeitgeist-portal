export interface Author {
  id: string;
  name: string;
  avatar?: string;
}

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content?: string; // html string from ghost
  feature_image?: string;
  published_at: string;
  authors: Author[];
  tags: string[];
  reading_time?: number;
  // add nova
  type: 'journal' | 'research' | 'nova';
  pdfUrl?: string; // specific for research papers
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'researcher' | 'reader';
}

export enum AuthMode {
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER'
}

// team member interface
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  photoUrl?: string;
  bio: string;
}

// library book interface
export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  coverImage: string;
  description: string; // short description for card
  longDescription: string; // full description for detail page
  pdfUrl: string;
  publishedYear: string;
  language: string;
}
