import Link from 'next/link';
import { ContentImage } from '@/components/ContentImage';
import type { Course } from '@/services/courses';

type CourseCardProps = {
  course: Course;
};

export const CourseCard = ({ course }: CourseCardProps) => {
  const courseHref = `/courses/${course.slug}`;

  return (
    <article className="site-panel group overflow-hidden rounded-[1.85rem]">
      <div className="grid h-full min-h-[22rem] md:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
        <Link
          href={courseHref}
          className="relative block min-h-[17rem] overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label={`Открыть страницу курса ${course.title}`}
        >
          <ContentImage
            src={course.coverImageSrc}
            alt={course.coverImageAlt ?? course.title}
            route="/courses"
            component="CourseCard"
            articleId={course.slug}
            fill
            fitMode="adaptive"
            sizes="(max-width: 767px) 100vw, (max-width: 1280px) 42vw, 34vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            fallbackLabel="обложка курса недоступна"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,11,9,0.06),rgba(15,11,9,0.32))]" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-black/25 px-3 py-1 font-sans text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/90 backdrop-blur">
              Курс Zeitgeist
            </span>
          </div>
        </Link>

        <div className="flex min-w-0 flex-col p-6 sm:p-7 lg:p-8">
          <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-accent">
            Курсы Zeitgeist
          </p>

          <h2 className="mt-4 font-display text-[clamp(1.9rem,3vw,2.7rem)] leading-[0.98] tracking-[-0.04em] text-ink transition-colors group-hover:text-accent dark:text-gray-100">
            <Link href={courseHref} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              {course.title}
            </Link>
          </h2>

          <p className="mt-4 max-w-[34rem] font-serif text-[1rem] leading-relaxed text-[color:var(--muted)] dark:text-[color:var(--muted)]">
            {course.shortDescription}
          </p>

          <dl className="mt-7 grid gap-4 border-t border-[color:var(--line-soft)] pt-5 sm:grid-cols-2">
            <div>
              <dt className="font-sans text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                Стоимость
              </dt>
              <dd className="mt-2 font-serif text-base text-ink dark:text-gray-100">
                {course.priceLabel}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                Расписание
              </dt>
              <dd className="mt-2 font-serif text-base leading-relaxed text-ink dark:text-gray-100">
                {course.scheduleLabel}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-sans text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                Длительность
              </dt>
              <dd className="mt-2 font-serif text-base leading-relaxed text-ink dark:text-gray-100">
                {course.durationLabel}
              </dd>
            </div>
          </dl>

          <div className="mt-auto pt-8">
            <Link
              href={courseHref}
              className="inline-flex w-full items-center justify-center rounded-full border border-accent/30 bg-[color:var(--accent-soft)] px-5 py-3 font-sans text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-accent transition-all duration-300 hover:border-accent hover:bg-accent hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-auto"
            >
              Подробнее
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};
