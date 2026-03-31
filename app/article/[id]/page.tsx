import { fetchArticleById } from '@/services/content';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { LikeButton } from '@/components/LikeButton';
import { BookmarkButton } from '@/components/BookmarkButton';
import { ImageCarousel } from '@/components/ImageCarousel';
import { ContentImage } from '@/components/ContentImage';
import { ArticleCommentsSection } from '@/components/discussion/DiscussionThread';
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
  const isNovaArticle = article.type === 'nova';
  const articleBadgeClass = isNovaArticle
    ? 'border border-[#58f29d]/28 bg-black text-[#97ffbf]'
    : article.type === 'research'
      ? 'bg-[#232048]/86 text-white'
      : 'bg-accent text-white';

  return (
    <article className="min-h-screen bg-paper pb-24 transition-colors duration-300 dark:bg-card-bg">
      <div
        className={`border-b border-[color:var(--line-soft)] px-4 py-16 sm:py-20 ${
          isNovaArticle
            ? 'bg-[radial-gradient(circle_at_top,rgba(88,242,157,0.09),transparent_34%)]'
            : 'bg-[radial-gradient(circle_at_top,rgba(141,67,57,0.08),transparent_36%)]'
        }`}
      >
        <div className="page-shell-narrow">
          <div className="site-panel rounded-[2rem] px-5 py-8 text-center sm:px-8 sm:py-12 lg:px-10 lg:py-14">
            <div className="flex justify-center gap-2">
              <span className={`inline-flex rounded-full px-3 py-1 font-sans text-[0.68rem] font-semibold uppercase tracking-[0.22em] ${articleBadgeClass}`}>
              {article.type === 'nova' ? 'Nova Express' : article.type === 'research' ? 'исследование' : 'журнал'}
              </span>
            </div>
            <h1 className="mx-auto mt-6 max-w-4xl font-display text-[clamp(2.25rem,7vw,4.75rem)] leading-[0.98] tracking-[-0.035em] text-ink dark:text-gray-100">
              {article.title}
            </h1>
            <p className="mx-auto mt-5 max-w-3xl font-serif text-[clamp(1rem,2vw,1.18rem)] leading-relaxed text-[color:var(--muted)] dark:text-gray-300">
              {article.excerpt}
            </p>

            <div className="mt-8 flex flex-col gap-6 border-t border-[color:var(--line-soft)] pt-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3 text-left">
                <p className="font-sans text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  Автор
                </p>
                <p className="font-serif text-[1.08rem] leading-relaxed text-ink dark:text-gray-100">
                  {authorName}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="meta-pill">{formattedDate}</span>
                  <span className="meta-pill">{readingTime}</span>
                </div>
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
      </div>

      {heroImage && (
        <div className="page-shell-narrow mt-10">
          <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] shadow-[var(--shadow-card)] dark:bg-[color:var(--surface-strong)] lg:aspect-[16/9]">
            <ContentImage
              src={heroImage}
              alt={article.title}
              route="/article"
              component="ArticleHero"
              articleId={article.id}
              fill
              priority
              sizes="100vw"
              fitMode="adaptive"
              surfaceTone="light"
              fallbackClassName="flex h-full items-center justify-center bg-sepia px-6 text-center font-sans text-sm uppercase tracking-widest text-gray-600"
              fallbackLabel="обложка статьи недоступна"
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-paper dark:from-[#121212] to-transparent"></div>
          </div>
        </div>
      )}

      {hasCarousel && (
        <div className="page-shell-narrow mt-10">
          <ImageCarousel images={carouselItems} alt={article.title} />
        </div>
      )}

      <div className="reading-shell mt-12">
        <div className="prose prose-lg md:prose-xl prose-stone dark:prose-invert mx-auto max-w-none font-serif first-letter:float-left first-letter:mr-3 first-letter:mt-2 first-letter:font-display first-letter:text-5xl">
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
              <h3>Исторический контекст</h3>
              <p>
                Публикация будет дополнена проверенными фрагментами и комментариями редакции сразу
                после финальной научной вычитки.
              </p>
              <blockquote>
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

      <ArticleCommentsSection
        article={{
          id: article.id,
          internalArticleId: article.internalArticleId,
          source: article.source,
          externalId: article.externalId,
          slug: article.slug,
          canonicalPath: article.canonicalPath,
          title: article.title,
          excerpt: article.excerpt,
          type: article.type,
          feature_image: article.feature_image,
        }}
      />
    </article>
  );
}
