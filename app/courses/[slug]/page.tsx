import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ContentImage } from '@/components/ContentImage';
import { getCourseBySlug, getCourses, getCourseTelegramHref } from '@/services/courses';

type Props = {
  params: Promise<{ slug: string }>;
};

const formatProgramIndex = (value: number) => {
  return String(value).padStart(2, '0');
};

export function generateStaticParams() {
  return getCourses().map((course) => ({
    slug: course.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourseBySlug(slug);

  if (!course) {
    return {
      title: 'Курс не найден | Zeitgeist',
    };
  }

  return {
    title: `${course.title} | Zeitgeist`,
    description: course.shortDescription,
  };
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const course = getCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  const telegramHref = getCourseTelegramHref(course);

  return (
    <div className="pb-24 pt-10 dark:bg-[color:var(--color-canvas)]">
      <div className="page-shell">
        <div className="mx-auto max-w-[72rem]">
          <Link
            href="/courses"
            className="inline-flex items-center font-sans text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)] transition-colors hover:text-accent"
          >
            &larr; Назад к курсам
          </Link>

          <section className="mt-5 overflow-hidden rounded-[2rem] border border-[color:var(--line-soft)] bg-[linear-gradient(180deg,rgba(255,252,248,0.94),rgba(247,239,229,0.88))] shadow-[var(--shadow-card)] transition-colors dark:[background-image:none] dark:bg-[color:var(--color-surface)]">
            <div className="relative aspect-[16/10] min-h-[16rem] sm:aspect-[18/9] lg:aspect-[24/9]">
              <ContentImage
                src={course.coverImageSrc}
                alt={course.coverImageAlt ?? course.title}
                route="/courses"
                component="CourseHero"
                articleId={course.slug}
                fill
                fitMode="adaptive"
                priority
                sizes="100vw"
                className="object-cover"
                fallbackLabel="обложка курса недоступна"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,11,9,0.04),rgba(15,11,9,0.34))]" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                <span className="inline-flex items-center rounded-full border border-white/22 bg-black/24 px-3 py-1 font-sans text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/92 backdrop-blur">
                  Курс Zeitgeist
                </span>
              </div>
            </div>
          </section>

          <section className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-10">
            <div className="min-w-0">
              <p className="section-kicker">курс</p>
              <h1 className="mt-4 max-w-[18ch] font-display text-[clamp(2.3rem,5.2vw,4.75rem)] leading-[0.95] tracking-[-0.045em] text-ink dark:text-gray-100">
                {course.title}
              </h1>
              <p className="mt-6 max-w-[44rem] font-serif text-[clamp(1.02rem,1.6vw,1.18rem)] leading-relaxed text-[color:var(--muted)]">
                {course.shortDescription}
              </p>
            </div>

            <aside className="site-panel rounded-[1.7rem] p-6 sm:p-7 xl:sticky xl:top-[calc(var(--header-height)+1.5rem)]">
              <div className="space-y-5">
                <div className="border-b border-[color:var(--line-soft)] pb-5">
                  <p className="font-sans text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">
                    Стоимость
                  </p>
                  <p className="mt-3 font-display text-[2.15rem] leading-none tracking-[-0.04em] text-ink dark:text-gray-100">
                    {course.priceLabel}
                  </p>
                </div>

                <div className="border-b border-[color:var(--line-soft)] pb-5">
                  <p className="font-sans text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">
                    Расписание
                  </p>
                  <p className="mt-3 font-serif text-base leading-relaxed text-ink dark:text-gray-100">
                    {course.scheduleLabel}
                  </p>
                </div>

                <div>
                  <p className="font-sans text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">
                    Программа
                  </p>
                  <p className="mt-3 font-serif text-base leading-relaxed text-ink dark:text-gray-100">
                    {course.program.length} занятий
                  </p>
                </div>
              </div>
            </aside>
          </section>

          <section className="site-panel mt-14 rounded-[1.85rem] p-6 sm:p-8 lg:p-10">
            <div className="max-w-[42rem]">
              <p className="section-kicker">программа курса</p>
              <h2 className="mt-3 font-display text-[clamp(1.95rem,4vw,3rem)] leading-[0.98] tracking-[-0.04em] text-ink dark:text-gray-100">
                План занятий
              </h2>
              <p className="mt-4 font-serif text-[1rem] leading-relaxed text-[color:var(--muted)]">
                Двадцать встреч, выстроенных от теории воображения и онтологии к практикам, семинарам и разговору о будущем.
              </p>
            </div>

            <ol className="mt-8 grid gap-3.5 sm:gap-4 xl:grid-cols-2">
              {course.program.map((item, index) => (
                <li
                  key={item}
                  className="rounded-[1.35rem] border border-[color:var(--line-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.12))] p-4 transition-colors dark:[background-image:none] dark:bg-[color:var(--color-surface)] sm:p-5"
                >
                  <div className="flex min-w-0 items-start gap-3.5">
                    <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-[color:var(--accent-soft)] px-3 py-1 font-sans text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-accent">
                      {formatProgramIndex(index + 1)}
                    </span>
                    <p className="min-w-0 pt-0.5 font-serif text-[1rem] leading-relaxed text-ink dark:text-gray-100">
                      {item}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-12 overflow-hidden rounded-[1.85rem] border border-[color:var(--line-soft)] bg-[linear-gradient(180deg,rgba(141,67,57,0.08),rgba(255,255,255,0.24))] p-6 shadow-[var(--shadow-soft)] transition-colors dark:[background-image:none] dark:bg-[color:var(--color-surface)] sm:p-8 lg:p-10">
            <div className="max-w-[40rem]">
              <p className="section-kicker">запись</p>
              <h2 className="mt-3 font-display text-[clamp(1.9rem,4vw,2.7rem)] leading-[1] tracking-[-0.04em] text-ink dark:text-gray-100">
                Контакт для записи
              </h2>
              <p className="mt-4 font-serif text-[1rem] leading-relaxed text-[color:var(--muted)]">
                Для записи на курс и уточнения организационных деталей напишите напрямую в Telegram.
              </p>

              <a
                href={telegramHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex max-w-full items-center rounded-full border border-accent/25 bg-[color:var(--surface-raised)] px-5 py-3 font-sans text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-accent transition-all duration-300 hover:border-accent hover:text-ink dark:hover:text-white"
              >
                {course.enrollmentContact.telegram}
                <span className="ml-2 text-[color:var(--muted)]">(telegram)</span>
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
