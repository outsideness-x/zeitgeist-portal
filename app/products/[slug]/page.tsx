import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ContentImage } from '@/components/ContentImage';
import { getProductBySlug, getProductDescriptionParagraphs, getProducts } from '@/services/products';

type Props = {
  params: Promise<{ slug: string }>;
};

const getTelegramHref = (handle?: string): string | undefined => {
  if (!handle) {
    return undefined;
  }

  return `https://t.me/${handle.replace(/^@/, '')}`;
};

export function generateStaticParams() {
  return getProducts().map((product) => ({
    slug: product.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    return {
      title: 'Товар не найден | Zeitgeist',
    };
  }

  return {
    title: `${product.title} | Zeitgeist`,
    description: product.shortDescription,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const descriptionParagraphs = getProductDescriptionParagraphs(product);
  const telegramHref = getTelegramHref(product.contacts.telegram);
  const hasContacts = Boolean(product.contacts.telegram || product.contacts.email);

  return (
    <div className="min-h-screen bg-paper dark:bg-card-bg py-20 px-4 transition-colors duration-300">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/products" className="text-xs font-sans font-bold uppercase tracking-widest text-gray-500 hover:text-accent transition-colors">
            &larr; Назад к товарам
          </Link>
        </div>

        <div className="bg-white dark:bg-card-bg border border-sepia dark:border-gray-800 p-8 md:p-12 shadow-sm">
          <div className="flex flex-col md:flex-row gap-12">
            <div className="w-full md:w-1/3 flex-shrink-0">
              <div className="aspect-[2/3] w-full bg-gray-100 dark:bg-card-bg shadow-md border border-gray-200 dark:border-gray-700 p-2">
                <ContentImage
                  src={product.imageSrc}
                  alt={product.imageAlt ?? product.title}
                  route="/products"
                  component="ProductDetail"
                  articleId={product.slug}
                  width={500}
                  height={750}
                  fill={false}
                  className="h-full w-full object-cover"
                  fallbackLabel="обложка товара недоступна"
                />
              </div>
            </div>

            <div className="flex-grow">
              <div className="mb-6 border-b border-gray-100 dark:border-gray-700 pb-6">
                <p className="font-sans text-xs uppercase tracking-widest text-accent mb-3">
                  {product.categoryLabel}
                </p>
                <h1 className="font-display text-4xl md:text-5xl mb-4 text-ink dark:text-gray-100 leading-tight">
                  {product.title}
                </h1>
                {product.priceLabel ? (
                  <p className="font-sans text-sm uppercase tracking-wider text-gray-600 dark:text-gray-300">
                    {product.priceLabel}
                  </p>
                ) : null}
              </div>

              <div className="prose prose-stone dark:prose-invert font-serif mb-10 text-gray-700 dark:text-gray-300 leading-relaxed">
                {descriptionParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              <div className="space-y-6">
                <div className="bg-stone-50 dark:bg-card-bg p-6 border border-sepia dark:border-gray-700">
                  <h2 className="font-sans font-bold uppercase text-sm mb-2 text-ink dark:text-gray-200">
                    Приобретение
                  </h2>
                  <p className="font-serif text-base text-gray-700 dark:text-gray-300">
                    Используйте указанные ниже реквизиты, а затем отправьте подтверждение оплаты.
                  </p>
                </div>

                <section
                  id="payment-methods"
                  className="scroll-mt-28 border border-sepia bg-paper/80 p-6 transition-colors dark:border-gray-700 dark:bg-[#121212]/40"
                  aria-labelledby="payment-methods-title"
                >
                  <h2 id="payment-methods-title" className="font-display text-2xl text-ink dark:text-gray-100">
                    Способы оплаты
                  </h2>

                  {product.paymentMethods.length > 0 ? (
                    <ul className="mt-5 space-y-3">
                      {product.paymentMethods.map((paymentMethod) => (
                        <li
                          key={paymentMethod}
                          className="rounded-lg border border-sepia bg-white/80 px-4 py-4 text-gray-700 transition-colors dark:border-gray-700 dark:bg-card-bg dark:text-gray-200"
                        >
                          <p className="font-sans text-sm leading-relaxed select-all break-words">
                            {paymentMethod}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 font-serif text-base text-gray-600 dark:text-gray-400">
                      Способы оплаты будут добавлены позже.
                    </p>
                  )}
                </section>

                <section className="border border-sepia bg-sepia/40 p-6 transition-colors dark:border-gray-700 dark:bg-[#121212]/40">
                  <p className="font-sans text-xs uppercase tracking-widest text-accent">
                    Как получить книгу после оплаты
                  </p>

                  {hasContacts ? (
                    <p className="mt-3 font-serif text-base leading-relaxed text-gray-700 dark:text-gray-300">
                      После оплаты пришлите скриншот оплаты
                      {telegramHref ? (
                        <>
                          {' '}в Telegram{' '}
                          <a
                            href={telegramHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline decoration-accent underline-offset-4 hover:text-accent transition-colors"
                          >
                            {product.contacts.telegram}
                          </a>
                        </>
                      ) : null}
                      {telegramHref && product.contacts.email ? ' или ' : ' '}
                      {product.contacts.email ? (
                        <>
                          на почту{' '}
                          <a
                            href={`mailto:${product.contacts.email}`}
                            className="underline decoration-accent underline-offset-4 hover:text-accent transition-colors"
                          >
                            {product.contacts.email}
                          </a>
                        </>
                      ) : null}
                      . После подтверждения вы получите экземпляр электронной книги.
                    </p>
                  ) : (
                    <p className="mt-3 font-serif text-base leading-relaxed text-gray-700 dark:text-gray-300">
                      После оплаты пришлите подтверждение оплаты. Контакты для отправки будут добавлены позже.
                    </p>
                  )}
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
