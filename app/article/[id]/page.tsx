import { fetchArticleById } from '@/services/content';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { LikeButton } from '@/components/LikeButton';
import { BookmarkButton } from '@/components/BookmarkButton';
import { ImageCarousel } from '@/components/ImageCarousel';
import { ContentImage } from '@/components/ContentImage';
import { buildArticleContentBlocks } from '@/services/content/articleHtmlBlocks';
import type { ArticleCarouselImage } from '@/types';

type Props = {
  params: Promise<{ id: string }>;
};

const FOOTNOTE_REFERENCE_PATTERN = /<a>([\s\S]*?<sup>\[(\d+)\]<\/sup>[\s\S]*?)<\/a>/gi;
const FOOTNOTE_SECTION_PATTERN = /(<hr\s*\/?>[\s\S]*?<ol>)([\s\S]*?)(<\/ol>)/i;
const FOOTNOTE_ITEM_PATTERN = /<li>([\s\S]*?)<\/li>/gi;
const FOOTNOTE_BACKLINK_PATTERN = /<a>\s*↩(?:︎)?\s*<\/a>/i;

const sanitizeArticleHtml = (value: string): string => {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<(iframe|object|embed|link|meta)[\s\S]*?>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, ' $1="#"')
    .replace(/\s(href|src)\s*=\s*javascript:[^\s>]+/gi, ' $1="#"');
};

const enhanceFootnoteLinks = (value: string): string => {
  const firstReferenceIdByNumber = new Map<number, string>();
  const referenceCountByNumber = new Map<number, number>();

  const withReferenceAnchors = value.replace(
    FOOTNOTE_REFERENCE_PATTERN,
    (match: string, innerHtml: string, footnoteNumberRaw: string) => {
      const footnoteNumber = Number.parseInt(footnoteNumberRaw, 10);
      if (!Number.isFinite(footnoteNumber)) {
        return match;
      }

      const nextRefCount = (referenceCountByNumber.get(footnoteNumber) ?? 0) + 1;
      referenceCountByNumber.set(footnoteNumber, nextRefCount);

      const referenceId = `fnref-${footnoteNumber}-${nextRefCount}`;
      if (!firstReferenceIdByNumber.has(footnoteNumber)) {
        firstReferenceIdByNumber.set(footnoteNumber, referenceId);
      }

      return `<a href="#fn-${footnoteNumber}" id="${referenceId}" class="footnote-ref" aria-label="Перейти к примечанию ${footnoteNumber}">${innerHtml}</a>`;
    },
  );

  return withReferenceAnchors.replace(
    FOOTNOTE_SECTION_PATTERN,
    (_match: string, sectionOpen: string, sectionBody: string, sectionClose: string) => {
      let footnoteIndex = 0;
      const updatedSectionBody = sectionBody.replace(FOOTNOTE_ITEM_PATTERN, (_itemMatch: string, itemBody: string) => {
        footnoteIndex += 1;

        const referenceId = firstReferenceIdByNumber.get(footnoteIndex) ?? `fnref-${footnoteIndex}-1`;
        const backrefAnchor = `<a href="#${referenceId}" class="footnote-backref" aria-label="Вернуться к месту в тексте для сноски ${footnoteIndex}">↩︎</a>`;
        const itemBodyWithBackref = FOOTNOTE_BACKLINK_PATTERN.test(itemBody)
          ? itemBody.replace(FOOTNOTE_BACKLINK_PATTERN, backrefAnchor)
          : `${itemBody} ${backrefAnchor}`;

        return `<li id="fn-${footnoteIndex}" class="footnote-item">${itemBodyWithBackref}</li>`;
      });

      return `${sectionOpen}${updatedSectionBody}${sectionClose}`;
    },
  );
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const article = await fetchArticleById(id);

  if (!article) {
    notFound();
  }

  return {
    title: `${article.title} | Zeitgeist`,
    description: article.excerpt,
  };
}

export default async function ArticlePage({ params }: Props) {
  const { id } = await params;
  const article = await fetchArticleById(id);

  if (!article) {
    notFound();
  }

  const authorName = article.authors.length > 0
    ? article.authors.map((author) => author.name).join(', ')
    : 'Редакция';
  const readingTime = article.reading_time ? `${article.reading_time} мин чтения` : 'короткое чтение';
  const formattedDate = new Date(article.published_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const galleryImages = article.gallery_images ?? [];
  const hasCarousel = galleryImages.length >= 2;
  const hasSingleGalleryImage = galleryImages.length === 1;
  const heroImage = hasSingleGalleryImage ? galleryImages[0] : !hasCarousel ? article.feature_image : undefined;
  const safeHtml = article.html ? enhanceFootnoteLinks(sanitizeArticleHtml(article.html)) : '';
  const carouselItems: ArticleCarouselImage[] = galleryImages.map((src) => ({
    src,
    alt: article.title,
  }));
  const articleContentBlocks = safeHtml
    ? article.source === 'ghost'
      ? buildArticleContentBlocks(safeHtml, article.title)
      : [{ type: 'html' as const, html: safeHtml }]
    : [];

  return (
    <article className="pb-20 min-h-screen bg-paper dark:bg-card-bg transition-colors duration-300">
      <div
        className={`bg-paper dark:bg-card-bg py-20 px-4 text-center ${
          heroImage ? '' : 'border-b border-sepia dark:border-gray-800'
        }`}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center gap-2 mb-6">
            <span className={`px-3 py-1 text-xs font-sans uppercase tracking-widest text-white ${article.type === 'nova' ? 'bg-black border border-green-500 text-green-500' : 'bg-accent'}`}>
              {article.type === 'nova' ? 'Nova Express' : article.type === 'research' ? 'исследование' : 'журнал'}
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl mb-6 leading-tight dark:text-gray-100">{article.title}</h1>
          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="font-serif text-lg text-gray-500 italic">
              Автор: <span className="text-ink dark:text-gray-300 not-italic font-bold">{authorName}</span> &mdash; {formattedDate} &mdash; {readingTime}
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <BookmarkButton
                article={{
                  id: article.id,
                  source: article.source,
                  externalId: article.externalId,
                  slug: article.slug,
                  canonicalPath: article.canonicalPath,
                  title: article.title,
                  excerpt: article.excerpt,
                  feature_image: article.feature_image,
                  type: article.type,
                }}
              />
              <LikeButton
                article={{
                  id: article.id,
                  source: article.source,
                  externalId: article.externalId,
                  slug: article.slug,
                  canonicalPath: article.canonicalPath,
                  title: article.title,
                  excerpt: article.excerpt,
                  feature_image: article.feature_image,
                  type: article.type,
                }}
                baseCount={article.baseLikeCount ?? 0}
              />
            </div>
          </div>
        </div>
      </div>

      {heroImage && (
        <div className="relative h-[50vh] w-full overflow-hidden md:h-[70vh]">
           <ContentImage
             src={heroImage}
             alt={article.title}
             route="/article"
             component="ArticleHero"
             articleId={article.id}
             fill
             priority
             sizes="100vw"
             className="object-cover object-center md:object-contain"
             fallbackClassName="flex h-full items-center justify-center bg-sepia px-6 text-center font-sans text-sm uppercase tracking-widest text-gray-600"
             fallbackLabel="обложка статьи недоступна"
           />
           <div className="absolute inset-0 bg-gradient-to-t from-paper dark:from-[#121212] to-transparent h-20 bottom-0 top-auto"></div>
        </div>
      )}

      {hasCarousel && (
        <div className="max-w-4xl mx-auto px-4 mt-10">
          <ImageCarousel images={carouselItems} alt={article.title} />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 mt-10">
        <div className="prose prose-xl prose-stone dark:prose-invert font-serif mx-auto first-letter:text-5xl first-letter:font-display first-letter:float-left first-letter:mr-3 first-letter:mt-2">
           
           <p className="lead text-xl text-gray-700 dark:text-gray-300 mb-6">{article.excerpt}</p>
           
           {article.html ? (
             articleContentBlocks.map((block, index) => (
               block.type === 'html'
                 ? <div key={`html-${index}`} dangerouslySetInnerHTML={{ __html: block.html }} />
                 : (
                   <div key={`carousel-${index}`} className="not-prose">
                     <ImageCarousel images={block.images} alt={article.title} fit="contain" />
                   </div>
                 )
             ))
           ) : (
             <>
               <p>
                 Этот материал находится в процессе подготовки. Мы обновляем архивные записи, чтобы
                 вы получали корректные источники, примечания и контекст исследования.
               </p>
               <h3 className="font-display text-2xl mt-8 mb-4">Исторический контекст</h3>
               <p>
                 Публикация будет дополнена проверенными фрагментами и комментариями редакции сразу
                 после финальной научной вычитки.
               </p>
               <blockquote className="border-l-4 border-accent pl-6 italic text-gray-600 dark:text-gray-400 my-8">
                 &quot;Архивы говорят с теми, кто умеет слушать.&quot;
               </blockquote>
               <p>
                 Если вам нужен ранний доступ к источникам, свяжитесь с редакцией через раздел
                 контактов.
               </p>
             </>
           )}
        </div>

      </div>
    </article>
  );
}
