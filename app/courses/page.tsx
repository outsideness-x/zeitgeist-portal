import type { Metadata } from 'next';
import { EmptyState } from '@/components/EmptyState';
import { CourseCard } from '@/components/CourseCard';
import { getCourses } from '@/services/courses';

export const metadata: Metadata = {
  title: 'Курсы | Zeitgeist',
  description: 'Редакционные курсы Zeitgeist о культуре, воображении и дисциплинах знания.',
};

export default function CoursesPage() {
  const courses = getCourses();

  return (
    <div className="pb-24 dark:bg-[color:var(--color-canvas)]">
      <section className="border-b border-[color:var(--line-soft)] bg-[radial-gradient(circle_at_top_left,var(--paper-glow),transparent_34%),linear-gradient(180deg,var(--background-elevated)_0%,var(--background)_100%)] transition-colors duration-300 dark:bg-[color:var(--color-canvas)]">
        <div className="page-shell pt-[clamp(2rem,4vw,3rem)] pb-[clamp(2.2rem,4.5vw,3.6rem)]">
          <div className="max-w-[48rem]">
            <p className="section-kicker">курсы zeitgeist</p>
            <h1 className="section-title">Курсы</h1>
            <p className="section-lead max-w-[44rem]">
              Редакционные курсы продолжают исследовательскую логику портала в формате совместного чтения,
              разговора и последовательной интеллектуальной практики.
            </p>
          </div>
        </div>
      </section>

      <section className="page-shell pt-10 md:pt-12">
        {courses.length > 0 ? (
          <div className="space-y-8">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="курсы готовятся"
            description="первый набор появится здесь после публикации программы."
          />
        )}
      </section>
    </div>
  );
}
