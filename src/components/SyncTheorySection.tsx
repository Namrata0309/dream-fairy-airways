import { useState, type MouseEvent } from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { DREAM_FAIRY_CONFIG, type SyncTheoryCardConfig } from '../config/dreamFairyConfig';
import { dreamPiano } from '../audio/dreamPiano';

interface SyncCardProps {
  card: SyncTheoryCardConfig;
  index: number;
}

function SyncCard({ card, index }: SyncCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({
      rx: (0.5 - y) * 9,
      ry: (x - 0.5) * 11,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0 });
  };

  const handleToggle = () => {
    setRevealed((prev) => !prev);
    dreamPiano.playChime('envelope');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      style={{ perspective: '1000px' }}
    >
      <button
        type="button"
        onClick={handleToggle}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        aria-expanded={revealed}
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="w-full h-full text-left rounded-3xl p-7 sm:p-8 bg-[#FCFDFE] border border-[#1B2138]/10 shadow-lg shadow-[#7D6AB8]/10 hover:shadow-xl hover:border-[#7D6AB8]/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B2138] transition-shadow flex flex-col justify-between min-h-[225px] cursor-pointer relative overflow-hidden"
      >
        {/* Soft corner pastel tint */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full opacity-60 blur-2xl"
          style={{ backgroundColor: card.accentHex }}
        />

        <div className="relative z-10">
          <div className="flex items-center justify-between gap-4 mb-5">
            <span className="font-mono text-xs font-medium tracking-[0.2em] text-[#4C5574] tabular-nums">
              {card.index}
            </span>
            <Sparkles
              className={`w-4 h-4 transition-colors duration-200 ${
                revealed ? 'text-[#B48A3E]' : 'text-[#8E7CC3]/60'
              }`}
              aria-hidden="true"
            />
          </div>

          <h3 className="font-serif font-semibold text-2xl sm:text-[1.65rem] leading-snug text-[#1B2138] tracking-tight mb-2">
            {card.index} — {card.title}
          </h3>

          <p className="text-sm font-medium text-[#5D5482]">{card.subtitle}</p>
        </div>

        <div className="relative z-10 mt-5 pt-4 border-t border-[#1B2138]/8">
          {revealed ? (
            <p className="text-sm leading-relaxed text-[#2C3352]">{card.note}</p>
          ) : (
            <p className="text-xs tracking-wider uppercase font-medium text-[#6B628E]">
              Tap to inspect coincidence
            </p>
          )}
        </div>
      </button>
    </motion.div>
  );
}

export function SyncTheorySection() {
  const { heading, closingMessage, cards } = DREAM_FAIRY_CONFIG.syncTheory;

  return (
    <section
      id="sync-theory"
      className="py-24 sm:py-32 px-5 sm:px-8 bg-gradient-to-b from-[#FDF6F9] via-[#FAF6FD] to-[#F3F8FD]"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto mb-14 sm:mb-16"
        >
          <p className="text-xs tracking-[0.22em] uppercase text-[#4C5574] font-medium mb-3">
            The Sync Theory
          </p>
          <h2 className="font-serif font-semibold text-3xl sm:text-5xl text-[#1B2138] tracking-tight">
            {heading}
          </h2>
        </motion.div>

        {/* 5 interactive 3D cards: 3 on top row, 2 centered below on large screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          {cards.map((card, idx) => {
            const spanClass =
              idx < 3
                ? 'lg:col-span-2'
                : idx === 3
                  ? 'lg:col-span-2 lg:col-start-2'
                  : 'lg:col-span-2';
            return (
              <div key={card.id} className={spanClass}>
                <SyncCard card={card} index={idx} />
              </div>
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.65, delay: 0.15 }}
          className="font-serif italic text-xl sm:text-2xl text-center text-[#2D3452] max-w-2xl mx-auto mt-14"
        >
          “{closingMessage}”
        </motion.p>
      </div>
    </section>
  );
}
