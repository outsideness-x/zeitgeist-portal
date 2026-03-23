import Link from 'next/link';
import type { Product } from '@/types';
import { ContentImage } from '@/components/ContentImage';

type ProductCardProps = {
  product: Product;
};

export const ProductCard = ({ product }: ProductCardProps) => {
  const productHref = `/products/${product.slug}`;

  return (
    <article className="group flex h-full flex-col bg-white dark:bg-card-bg border border-sepia dark:border-gray-800 p-4 transition-all duration-300 hover:shadow-lg hover:border-accent dark:hover:border-gray-600">
      <Link
        href={productHref}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={`Открыть страницу товара ${product.title}`}
      >
        <div className="aspect-[2/3] w-full bg-gray-100 dark:bg-card-bg mb-4 overflow-hidden relative">
          <ContentImage
            src={product.imageSrc}
            alt={product.imageAlt ?? product.title}
            route="/products"
            component="ProductCard"
            articleId={product.slug}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            fallbackLabel="обложка недоступна"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="bg-white text-ink dark:text-black px-3 py-1 text-xs font-sans uppercase tracking-widest shadow-sm">
              Подробнее
            </span>
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col">
        <p className="font-sans text-xs uppercase tracking-widest text-accent mb-2">
          {product.categoryLabel}
        </p>

        <Link
          href={productHref}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <h2 className="font-display text-2xl leading-tight mb-3 text-ink dark:text-gray-200 transition-colors group-hover:text-accent">
            {product.title}
          </h2>
        </Link>

        {product.priceLabel ? (
          <p className="mb-3 font-sans text-sm uppercase tracking-wider text-accent">
            {product.priceLabel}
          </p>
        ) : null}

        <p className="font-sans text-base leading-7 text-gray-600 dark:text-gray-400 line-clamp-4">
          {product.shortDescription}
        </p>

        <div className="mt-6">
          <Link
            href={productHref}
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-accent text-white font-sans uppercase text-sm tracking-widest hover:bg-black dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper dark:focus-visible:ring-offset-card-bg"
            aria-label={`Перейти к покупке товара ${product.title}`}
          >
            {product.ctaLabel ?? 'Приобрести'}
          </Link>
        </div>
      </div>
    </article>
  );
};
