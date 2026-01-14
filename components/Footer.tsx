import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-ink text-paper pt-16 pb-8 border-t-4 border-accent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          <div className="col-span-1 md:col-span-2">
            <h3 className="font-display text-2xl mb-4 tracking-widest text-white">ZEITGEIST</h3>
            <p className="font-serif text-gray-400 max-w-md text-lg leading-relaxed">
              Dedicated to the exploration and preservation of Oriental studies. 
              We bridge the gap between academic archives and the public curiosity, 
              bringing to light the hidden manuscripts of history.
            </p>
          </div>

          <div>
            <h4 className="font-sans font-bold uppercase tracking-widest text-sm text-accent mb-6">Explore</h4>
            <ul className="space-y-3 font-serif text-gray-300">
              <li><Link href="/research" className="hover:text-white transition-colors">Research Catalog</Link></li>
              <li><Link href="/journal" className="hover:text-white transition-colors">The Journal</Link></li>
              <li><Link href="/nova-express" className="hover:text-white transition-colors">Nova Express</Link></li>
              <li><Link href="/upload" className="hover:text-white transition-colors">Submit Manuscript</Link></li>
              <li><Link href="/donate" className="hover:text-white transition-colors">Support Us</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-sans font-bold uppercase tracking-widest text-sm text-accent mb-6">Connect</h4>
            <ul className="space-y-3 font-serif text-gray-300">
              <li><a href="#" className="hover:text-white transition-colors">Newsletter</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Twitter / X</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Instagram</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>

        </div>

        <div className="border-t border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center text-sm font-sans text-gray-500">
          <p>&copy; {new Date().getFullYear()} Zeitgeist Project. All rights reserved.</p>
          <div className="mt-4 md:mt-0 space-x-4">
            <a href="#" className="hover:text-gray-300">Privacy Policy</a>
            <a href="#" className="hover:text-gray-300">Terms of Use</a>
          </div>
        </div>
      </div>
    </footer>
  );
};