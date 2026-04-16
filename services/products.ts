import type { Product } from '@/types';

export const BOOK_TITLE = 'Молитвенник джайна: неизвестная религия Индии.';
export const BOOK_SHORT_DESCRIPTION = 'Эта книга — первый в России сборник, объединяющий священные тексты, молитвы и медитативные практики джайнизма, одной из древнейших, но малоизвестных в нашей стране религиозных традиций Индии. В отличие от сугубо академических трудов, данное издание призвано стать практическим введением в философию и этику джайнов, делая сложные метафизические концепции доступными для самого широкого круга читателей.';
export const BOOK_FULL_DESCRIPTION = `Эта книга — первый в России сборник, объединяющий священные тексты, молитвы и медитативные практики джайнизма, одной из древнейших, но малоизвестных в нашей стране религиозных традиций Индии. В отличие от сугубо академических трудов, данное издание призвано стать практическим введением в философию и этику джайнов, делая сложные метафизические концепции доступными для самого широкого круга читателей.

Внутри вы найдете ключевые принципы учения Джинов (духовных победителей): ненасилие (ахимса), неабсолютизм (анекантвада) и нестяжательство (апариграха). Центральное место занимает главная джайнская молитва — Навкар Мантра, а также покаянные молитвы, тексты о всеобщем мире, сострадании и освобождении от кармических уз. Издание дополнено комментариями переводчика, глоссарием и редкими материалами, включая переписку Махатмы Ганди с джайнским мудрецом.

«Молитвенник джайна» станет надежным проводником для тех, кто хочет прикоснуться к живой традиции ненасилия, понять природу кармы и перерождения, а также найти вдохновение в древних истинах о гармонии человека и вселенной. Читайте с открытым сердцем, и пусть этот путь приведет вас к новому пониманию жизни и счастья.`;
export const BOOK_IMAGE_SRC = '/sales/book1.png';
export const PAYMENT_METHODS_LIST = ['Карта Озон: 2204 3206 3369 2324'];
export const PAYMENT_TELEGRAM = '@PsychedelicBaron';
export const PAYMENT_EMAIL = 'goshamain@protonmail.com';
export const BOOK_PRICE_LABEL = '300 рублей';

const PRODUCTS: Product[] = [
  {
    id: 'ebook-jain-prayer-book',
    slug: 'ebook',
    title: BOOK_TITLE,
    categoryLabel: 'Электронная книга',
    shortDescription: BOOK_SHORT_DESCRIPTION,
    fullDescription: BOOK_FULL_DESCRIPTION,
    imageSrc: BOOK_IMAGE_SRC,
    imageAlt: `Обложка книги «${BOOK_TITLE}»`,
    paymentMethods: PAYMENT_METHODS_LIST,
    contacts: {
      telegram: PAYMENT_TELEGRAM,
      email: PAYMENT_EMAIL,
    },
    priceLabel: BOOK_PRICE_LABEL,
    ctaLabel: 'Приобрести',
  },
];

export const getProducts = (): Product[] => PRODUCTS;

export const getProductBySlug = (slug: string): Product | undefined => {
  return PRODUCTS.find((product) => product.slug === slug);
};

export const getProductDescriptionParagraphs = (product: Product): string[] => {
  return product.fullDescription
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
};
