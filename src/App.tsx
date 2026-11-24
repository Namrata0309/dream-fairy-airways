import { Suspense, lazy, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { TopNav } from './components/TopNav';
import { HeroFlightScene } from './components/HeroFlightScene';
import { BoardingPassSection } from './components/BoardingPassSection';
import { SyncTheorySection } from './components/SyncTheorySection';
import { DREAM_FAIRY_CONFIG } from './config/dreamFairyConfig';

const UniverseSection = lazy(() =>
  import('./components/UniverseSection').then((m) => ({ default: m.UniverseSection })),
);
const PilotDreamScene = lazy(() =>
  import('./components/PilotDreamScene').then((m) => ({ default: m.PilotDreamScene })),
);
const LetterSection = lazy(() =>
  import('./components/LetterSection').then((m) => ({ default: m.LetterSection })),
);
const FinaleScene = lazy(() =>
  import('./components/FinaleScene').then((m) => ({ default: m.FinaleScene })),
);

function SectionPlaceholder({ heightClass = 'min-h-[460px]' }: { heightClass?: string }) {
  return (
    <div
      className={`${heightClass} w-full bg-gradient-to-b from-[#F4F1FC] to-[#F3F8FD] flex items-center justify-center`}
      aria-hidden="true"
    >
      <div className="text-xs font-mono tracking-[0.2em] uppercase text-[#4C5574]">
        Preparing Flight View…
      </div>
    </div>
  );
}

export default function App() {
  const [resetSignal, setResetSignal] = useState(0);

  const handleBoardFlight = () => {
    const el = document.getElementById('boarding-pass');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleReplayAdventure = () => {
    setResetSignal((n) => n + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex flex-col bg-[#F6FAFE] text-[#1B2138]">
        <TopNav />

        <main className="flex-1">
          {/* Section 1: Your Flight Is Ready */}
          <HeroFlightScene onBoardFlight={handleBoardFlight} />

          {/* Section 2: Your Personal Boarding Pass */}
          <BoardingPassSection />

          {/* Section 3: Our Little Universe */}
          <Suspense fallback={<SectionPlaceholder />}>
            <UniverseSection />
          </Suspense>

          {/* Section 4: The Sync Theory */}
          <SyncTheorySection />

          {/* Section 5: The Pilot Dream (Sunset Runway & Takeoff) */}
          <Suspense fallback={<SectionPlaceholder heightClass="min-h-[760px]" />}>
            <PilotDreamScene resetSignal={resetSignal} />
          </Suspense>

          {/* Section 6: A Letter From Your Dream Fairy */}
          <Suspense fallback={<SectionPlaceholder />}>
            <LetterSection />
          </Suspense>

          {/* Section 7: The Grand Birthday Finale */}
          <Suspense fallback={<SectionPlaceholder heightClass="min-h-[760px]" />}>
            <FinaleScene onReplay={handleReplayAdventure} />
          </Suspense>
        </main>

        <footer className="py-8 px-6 bg-[#1D1934] text-[#DFD5FA]/80 border-t border-white/10">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <span className="font-serif text-base text-[#FCFDFE]">
              {DREAM_FAIRY_CONFIG.airlineName}
            </span>
            <span>{DREAM_FAIRY_CONFIG.birthdayDate}</span>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
