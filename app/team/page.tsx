import type { Metadata } from 'next';
import Image from 'next/image';
import type { TeamMember } from '@/types';

export const metadata: Metadata = {
  title: 'Наша команда | Zeitgeist',
  description: 'Познакомьтесь с исследователями и архивистами проекта.',
};

const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 't1',
    name: 'Георгий Иванов',
    role: 'Создатель',
    bio: 'Востоковед, исследователь восточного мистицизма, переводчик, основатель и руководитель научно-популярного востоковедческого журнала «Южная Луна».',
    photoUrl: '/team/1.jpg',
  },
  {
    id: 't2',
    name: 'Йорн Найко',
    role: 'Исследователь',
    bio: 'Философ и поэт, исследователь имманентной онтологии актуализации, форм жизни, автор философского трактата «Железо и кровь», идейный вдохновитель проекта Zeitgeist.',
    photoUrl: '/team/3.jpg',
  },
  {
    id: 't3',
    name: 'Константин Тросников',
    role: 'Исследователь',
    bio: 'Художник, музыкант, поэт. Участник психоделического псевдо-блэк one-man band Solar Symbol и метал группы Агенты Гипохтона. В прошлом участник групп The Ringing Emptiness, Thelema Ahnerbe и многих других проектов. Маргинальный исследователь магии, философии и weird-культур.',
    photoUrl: '/team/2.jpg',
  },
];

export default function TeamPage() {
  const team = TEAM_MEMBERS;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="font-display text-5xl mb-4 text-ink dark:text-gray-100">Команда</h1>
        <p className="font-serif text-xl text-gray-500 dark:text-gray-400">
          Хранители архива.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {team.map((member) => (
          <div key={member.id} className="flex flex-col items-center text-center group">
            <div className="w-48 h-48 mb-6 relative overflow-hidden rounded-full border-2 border-sepia dark:border-gray-700 group-hover:border-accent transition-colors duration-300">
              {member.photoUrl ? (
                <Image
                  src={member.photoUrl}
                  alt={member.name}
                  fill
                  sizes="192px"
                  className="object-cover filter grayscale group-hover:grayscale-0 transition-all duration-500"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                  <span className="text-gray-400 text-2xl">?</span>
                </div>
              )}
            </div>

            <h3 className="font-display text-2xl mb-1 text-ink dark:text-gray-200">{member.name}</h3>
            <span className="font-sans text-xs uppercase tracking-widest text-accent mb-4 block">
              {member.role}
            </span>

            <p className="font-serif text-gray-600 dark:text-gray-400 max-w-xs leading-relaxed">
              {member.bio}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
