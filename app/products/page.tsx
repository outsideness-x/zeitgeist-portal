import type { Metadata } from 'next';
import { EmptyState } from '@/components/EmptyState';
import { ProductCard } from '@/components/ProductCard';
import { getProducts } from '@/services/products';

export const metadata: Metadata = {
  title: 'Товары | Zeitgeist',
  description: 'Электронные издания и другие товары проекта Zeitgeist.',
};

export default function ProductsPage() {
  const products = getProducts();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="border-b border-sepia dark:border-gray-800 pb-8 mb-12">
        <h1 className="font-display text-5xl mb-2 text-ink dark:text-gray-100">Товары</h1>
        <p className="font-serif text-xl text-gray-500 dark:text-gray-400 italic">
          Электронные издания и материалы проекта.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {products.length > 0 ? (
          products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        ) : (
          <div className="sm:col-span-2 lg:col-span-3">
            <EmptyState
              title="раздел товаров готовится"
              description="новые позиции появятся здесь после публикации каталога."
            />
          </div>
        )}
      </div>
    </div>
  );
}
