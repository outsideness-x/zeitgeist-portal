import { fetchArticleById } from '@/services/content';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import { LikeButton } from '@/components/LikeButton';
import { ImageCarousel } from '@/components/ImageCarousel';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const article = await fetchArticleById(id);

  if (!article) {
    return { title: 'Статья не найдена' };
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

  const authorName = article.authors[0]?.name ?? 'Редакция';
  const readingTime = article.reading_time ? `${article.reading_time} мин чтения` : 'короткое чтение';
  const formattedDate = new Date(article.published_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const galleryImages = article.gallery_images ?? [];
  const hasCarousel = galleryImages.length >= 2;

  return (
    <article className="pb-20 min-h-screen bg-paper dark:bg-black transition-colors duration-300">
      {/* Header */}
      <div className="bg-paper dark:bg-black py-20 px-4 text-center border-b border-sepia dark:border-gray-800">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center gap-2 mb-6">
            <span className={`px-3 py-1 text-xs font-sans uppercase tracking-widest text-white ${article.type === 'nova' ? 'bg-black border border-green-500 text-green-500' : 'bg-accent'}`}>
              {article.type === 'nova' ? 'Nova Express' : article.type === 'research' ? 'исследование' : 'журнал'}
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl mb-6 leading-tight dark:text-gray-100">{article.title}</h1>
          <div className="font-serif text-lg text-gray-500 italic">
            Автор: <span className="text-ink dark:text-gray-300 not-italic font-bold">{authorName}</span> &mdash; {formattedDate} &mdash; {readingTime}
          </div>
          <div className="mt-6 flex justify-center">
            <LikeButton articleId={article.id} />
          </div>
        </div>
      </div>

      {article.feature_image && (
        <div className="w-full h-[50vh] md:h-[70vh] relative overflow-hidden">
           <Image
             src={article.feature_image}
             alt={article.title}
             fill
             priority
             sizes="100vw"
             className="object-cover"
           />
           <div className="absolute inset-0 bg-gradient-to-t from-paper dark:from-black to-transparent h-20 bottom-0 top-auto"></div>
        </div>
      )}

      {hasCarousel && (
        <div className="max-w-4xl mx-auto px-4 mt-10">
          <ImageCarousel images={galleryImages} title={article.title} />
        </div>
      )}

      <div
        className={`max-w-4xl mx-auto px-4 relative z-10 bg-paper dark:bg-card-bg p-8 shadow-sm border border-transparent dark:border-gray-800 ${
          article.feature_image && !hasCarousel ? '-mt-10' : 'mt-10'
        }`}
      >
        <div className="prose prose-lg prose-stone dark:prose-invert font-serif mx-auto first-letter:text-5xl first-letter:font-display first-letter:float-left first-letter:mr-3 first-letter:mt-2">
           
           <p className="lead text-xl text-gray-700 dark:text-gray-300 mb-6">{article.excerpt}</p>
           
           {article.content ? (
             <div dangerouslySetInnerHTML={{ __html: article.content }} />
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
