export type Course = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  coverImageSrc?: string | null;
  coverImageAlt?: string;
  priceLabel: string;
  scheduleLabel: string;
  durationLabel: string;
  enrollmentContact: {
    telegram: string;
  };
  program: string[];
};

const IRRATIONAL_PROGRAM = [
  'Воображение и его понятие.',
  'Что такое реальность? Вопрос онтологии.',
  'Воображение в культуре.',
  'Чем воображение отличается от фантазии?',
  'Практики выхода в нереальное (от шаманов до сюрреалистов)',
  'Магия - что это такое?',
  'Синхрония и апофения.',
  'Семинар - Теория воображения.',
  'Метод нарезки Берроуза.',
  '"Изысканный труп".',
  'Практики воображения в древней Индии.',
  'Практики воображения в буддийском мире.',
  'Практики воображения на западе.',
  'Уход в фантазию.',
  'Техника безопасности.',
  'Семинар - Практика воображения.',
  'Почему для понимания воображения и нерационального нам нужно востоковедение?',
  'Сакральная география.',
  '1960е - последний рубеж победы воображения.',
  'Образ будущего.',
];

const COURSES: Course[] = [
  {
    id: 'irrealnoe-i-irratsionalnoe',
    slug: 'irrealnoe-i-irratsionalnoe-v-kulture-i-iskusstve',
    title: 'Ирреальное и иррациональное в культуре, искусстве и мире',
    shortDescription: 'Курс посвящен воображению, ИСС (измененные состояния сознания), иррациональному',
    coverImageSrc: '/course-cover.png',
    coverImageAlt: 'Обложка курса «Ирреальное и иррациональное в культуре, искусстве и мире»',
    priceLabel: '5000 рублей',
    scheduleLabel: 'Занятия каждое воскресение в 20:30',
    durationLabel: '20 занятий по часу каждое',
    enrollmentContact: {
      telegram: '@PsychedelicBaron',
    },
    program: IRRATIONAL_PROGRAM,
  },
];

export const getCourses = (): Course[] => COURSES;

export const getCourseBySlug = (slug: string): Course | undefined => {
  return COURSES.find((course) => course.slug === slug);
};

export const getCourseTelegramHref = (course: Course): string => {
  return `https://t.me/${course.enrollmentContact.telegram.replace(/^@/, '')}`;
};
