export interface Author {
  id: string;
  name: string;
  avatar?: string;
}

export interface ArticleCarouselImage {
  src: string;
  alt?: string;
  captionHtml?: string;
}

export interface Article {
  id: string;
  internalArticleId?: string;
  source?: 'local' | 'ghost';
  externalId?: string;
  slug?: string;
  canonicalPath?: string;
  title: string;
  excerpt: string;
  html?: string;
  feature_image?: string;
  published_at: string;
  authors: Author[];
  tags: string[];
  reading_time?: number;
  baseLikeCount?: number;
  type: 'journal' | 'research' | 'nova';
  gallery_images?: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'reader' | 'author' | 'admin';
}

export enum AuthMode {
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER'
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  photoUrl?: string;
  bio: string;
}

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  coverImage: string;
  description: string;
  longDescription: string;
  pdfUrl: string;
  publishedYear: string;
  language: string;
}

export interface ProductContactInfo {
  telegram?: string;
  email?: string;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  categoryLabel: string;
  shortDescription: string;
  fullDescription: string;
  imageSrc?: string | null;
  imageAlt?: string;
  priceLabel?: string;
  paymentMethods: string[];
  contacts: ProductContactInfo;
  ctaLabel?: string;
}
