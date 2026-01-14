export interface Author {
  id: string;
  name: string;
  avatar?: string;
}

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content?: string; // HTML string from Ghost
  feature_image?: string;
  published_at: string;
  authors: Author[];
  tags: string[];
  reading_time?: number;
  // add nova
  type: 'journal' | 'research' | 'nova';
  pdfUrl?: string; // Specific for research papers
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
