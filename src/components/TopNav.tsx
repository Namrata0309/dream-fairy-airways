import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { dreamPiano } from '../audio/dreamPiano';

export function TopNav() {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return dreamPiano.subscribe(setIsPlaying);
  }, []);

  const handleToggleMusic = () => {
    void dreamPiano.toggle();
  };

  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-[#FCFDFE]/92 border-b border-[#1B2138]/8">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#flight-ready"
          className="font-serif font-semibold text-lg sm:text-xl tracking-wide text-[#1B2138] whitespace-nowrap shrink-0"
        >
          Dream Fairy Airways
        </a>

        {/* Zone 2: 5 concise single-line text nav links */}
        <nav
          aria-label="Flight itinerary"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#4C5574]"
        >
          <a
            href="#boarding-pass"
            className="hover:text-[#1B2138] transition-colors whitespace-nowrap shrink-0"
          >
            Boarding Pass
          </a>
          <a
            href="#universe"
            className="hover:text-[#1B2138] transition-colors whitespace-nowrap shrink-0"
          >
            Universe
          </a>
          <a
            href="#sync-theory"
            className="hover:text-[#1B2138] transition-colors whitespace-nowrap shrink-0"
          >
            Sync Theory
          </a>
          <a
            href="#pilot-dream"
            className="hover:text-[#1B2138] transition-colors whitespace-nowrap shrink-0"
          >
            Runway
          </a>
          <a
            href="#letter"
            className="hover:text-[#1B2138] transition-colors whitespace-nowrap shrink-0"
          >
            Letter
          </a>
        </nav>

        {/* Zone 3: 1 primary action (Dreamy Piano Toggle) */}
        <button
          type="button"
          onClick={handleToggleMusic}
          aria-pressed={isPlaying}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#1B2138] text-[#FCFDFE] text-xs font-medium tracking-wide hover:bg-[#2A3254] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B2138] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {isPlaying ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-[#E6C98F]" aria-hidden="true" />
              <span>Pause Piano</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 text-[#DFD5FA]" aria-hidden="true" />
              <span>Play Piano</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
