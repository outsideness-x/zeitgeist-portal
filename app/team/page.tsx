import { fetchTeamMembers } from '@/services/ghostService';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Our Team | Zeitgeist',
  description: 'Meet the researchers and archivists behind the project.',
};

export default async function TeamPage() {
  const team = await fetchTeamMembers();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="font-display text-5xl mb-4 text-ink dark:text-gray-100">The Team</h1>
        <p className="font-serif text-xl text-gray-500 dark:text-gray-400">
          Custodians of the archives.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {team.map((member) => (
          <div key={member.id} className="flex flex-col items-center text-center group">
            {/* photo container */}
            <div className="w-48 h-48 mb-6 relative overflow-hidden rounded-full border-2 border-sepia dark:border-gray-700 group-hover:border-accent transition-colors duration-300">
              {member.photoUrl ? (
                <img 
                  src={member.photoUrl} 
                  alt={member.name} 
                  className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-500"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                  <span className="text-gray-400 text-2xl">?</span>
                </div>
              )}
            </div>

            {/* info */}
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