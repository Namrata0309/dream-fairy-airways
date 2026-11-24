import { useState, type MouseEvent } from 'react';
import { motion } from 'motion/react';
import { Check, Plane, Stamp } from 'lucide-react';
import { DREAM_FAIRY_CONFIG } from '../config/dreamFairyConfig';
import { dreamPiano } from '../audio/dreamPiano';

const QR_MATRIX = [
  [1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1],
  [1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1],
  [1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1],
  [0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0],
  [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
  [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  [1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0],
  [0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1],
  [1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0],
  [1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
];

export function BoardingPassSection() {
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  const [stamped, setStamped] = useState(false);

  const { boardingPass } = DREAM_FAIRY_CONFIG;

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({
      rotateX: (0.5 - y) * 10,
      rotateY: (x - 0.5) * 12,
      glareX: x * 100,
      glareY: y * 100,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  };

  const handleStamp = () => {
    setStamped((prev) => !prev);
    dreamPiano.playChime('envelope');
  };

  return (
    <section
      id="boarding-pass"
      className="relative py-24 sm:py-32 px-5 sm:px-8 bg-gradient-to-b from-[#F4F1FC] via-[#F9F5FC] to-[#F3F8FD] overflow-hidden"
    >
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12 sm:mb-14"
        >
          <p className="text-xs tracking-[0.22em] uppercase text-[#4C5574] font-medium mb-3">
            Priority Boarding Document · {boardingPass.flightCode}
          </p>
          <h2 className="font-serif font-semibold text-3xl sm:text-5xl text-[#1B2138] tracking-tight">
            Your Personal Boarding Pass
          </h2>
        </motion.div>

        {/* 3D Perspective Ticket Wrapper */}
        <div style={{ perspective: '1400px' }} className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
              transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
              transformStyle: 'preserve-3d',
            }}
            className="relative rounded-3xl bg-[#FCFDFE] border border-[#1B2138]/10 shadow-2xl shadow-[#7D6AB8]/15 overflow-hidden"
          >
            {/* Subtle champagne-gold pointer foil sheen */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-40 transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle 340px at ${tilt.glareX}% ${tilt.glareY}%, rgba(230, 201, 143, 0.28), transparent 70%)`,
              }}
            />

            {/* Top Airline Livery Band */}
            <div className="relative flex flex-wrap items-center justify-between gap-4 px-6 sm:px-9 py-4 bg-gradient-to-r from-[#CFE8FA] via-[#DFD5FA] to-[#FADCE8] border-b border-[#1B2138]/10">
              <div className="flex items-center gap-3">
                <Plane className="w-5 h-5 text-[#1B2138]" aria-hidden="true" />
                <span className="font-serif font-semibold tracking-[0.14em] text-lg sm:text-xl text-[#1B2138]">
                  {boardingPass.airline}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono tracking-wider text-[#1B2138]/80">
                <span>{boardingPass.boardingGroup}</span>
                <span aria-hidden="true">/</span>
                <span className="tabular-nums">GATE {boardingPass.gate}</span>
              </div>
            </div>

            {/* Ticket Body: Main Pass + Perforation + Right Stub */}
            <div className="relative grid grid-cols-1 lg:grid-cols-12">
              {/* Left Main Boarding Pass */}
              <div className="lg:col-span-8 p-6 sm:p-9 relative">
                {/* Route Header */}
                <div className="flex items-center justify-between gap-4 pb-7 mb-7 border-b border-[#1B2138]/10">
                  <div>
                    <div className="font-serif font-bold text-3xl sm:text-4xl text-[#1B2138] tracking-tight">
                      {boardingPass.routeOrigin}
                    </div>
                    <div className="text-xs text-[#4C5574] mt-0.5">
                      {boardingPass.routeOriginCity}
                    </div>
                  </div>

                  <div className="flex-1 flex items-center gap-2 px-2 sm:px-4">
                    <div className="h-px flex-1 border-t border-dashed border-[#8E7CC3]/60" />
                    <Plane className="w-4 h-4 text-[#7D6AB8] shrink-0" aria-hidden="true" />
                    <div className="h-px flex-1 border-t border-dashed border-[#8E7CC3]/60" />
                  </div>

                  <div className="text-right">
                    <div className="font-serif font-bold text-3xl sm:text-4xl text-[#1B2138] tracking-tight">
                      {boardingPass.routeDestination}
                    </div>
                    <div className="text-xs text-[#4C5574] mt-0.5">
                      {boardingPass.routeDestinationCity}
                    </div>
                  </div>
                </div>

                {/* Boarding Fields Grid */}
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-6">
                  <div>
                    <dt className="text-[11px] font-mono tracking-[0.16em] text-[#4C5574] uppercase mb-1">
                      PASSENGER
                    </dt>
                    <dd className="text-base sm:text-lg font-semibold text-[#1B2138]">
                      {boardingPass.fields.passenger}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[11px] font-mono tracking-[0.16em] text-[#4C5574] uppercase mb-1">
                      FLIGHT
                    </dt>
                    <dd className="text-base sm:text-lg font-mono font-medium tabular-nums text-[#1B2138]">
                      {boardingPass.fields.flight}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[11px] font-mono tracking-[0.16em] text-[#4C5574] uppercase mb-1">
                      SEAT
                    </dt>
                    <dd className="text-base sm:text-lg font-semibold text-[#1B2138]">
                      {boardingPass.fields.seat}
                    </dd>
                  </div>

                  <div className="col-span-2 sm:col-span-2">
                    <dt className="text-[11px] font-mono tracking-[0.16em] text-[#4C5574] uppercase mb-1">
                      DESTINATION
                    </dt>
                    <dd className="text-base sm:text-lg font-semibold text-[#1B2138]">
                      {boardingPass.fields.destination}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[11px] font-mono tracking-[0.16em] text-[#4C5574] uppercase mb-1">
                      DEPARTURE
                    </dt>
                    <dd className="text-sm sm:text-base font-mono tabular-nums text-[#1B2138]">
                      {boardingPass.fields.departure}
                    </dd>
                  </div>

                  <div className="col-span-2 sm:col-span-3 pt-4 border-t border-[#1B2138]/8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <dt className="text-[11px] font-mono tracking-[0.16em] text-[#4C5574] uppercase mb-1">
                        STATUS
                      </dt>
                      <dd className="text-base font-semibold text-[#7A5920]">
                        {boardingPass.fields.status}
                      </dd>
                    </div>

                    <button
                      type="button"
                      onClick={handleStamp}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#C8A055]/50 bg-[#FBF6EB] text-xs font-semibold tracking-wider uppercase text-[#6D4F19] hover:bg-[#F5EBD4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8A055] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {stamped ? (
                        <>
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Cleared For Magic</span>
                        </>
                      ) : (
                        <>
                          <Stamp className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Stamp Boarding Pass</span>
                        </>
                      )}
                    </button>
                  </div>
                </dl>

                {/* Animated Gold Foil Stamp Seal */}
                {stamped && (
                  <motion.div
                    initial={{ scale: 1.6, opacity: 0, rotate: -18 }}
                    animate={{ scale: 1, opacity: 1, rotate: -10 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    aria-label="Cleared for magic stamp"
                    className="pointer-events-none absolute right-8 bottom-20 sm:bottom-16 w-28 h-28 rounded-full border-2 border-dashed border-[#C8A055] flex flex-col items-center justify-center text-center bg-[#F6E9CB]/45 text-[#7A5920] shadow-sm"
                  >
                    <span className="text-[9px] font-mono tracking-[0.18em] uppercase">
                      APPROVED
                    </span>
                    <span className="font-serif font-bold text-sm leading-tight mt-0.5">
                      DREAM FAIRY
                    </span>
                    <span className="text-[9px] font-mono tabular-nums mt-0.5">06 DEC 2026</span>
                  </motion.div>
                )}
              </div>

              {/* Perforated Divider */}
              <div className="relative lg:col-span-4 border-t lg:border-t-0 lg:border-l border-dashed border-[#1B2138]/20 bg-[#F9FBFE] p-6 sm:p-8 flex flex-col justify-between items-center text-center">
                {/* Decorative semicircular notches on desktop */}
                <div
                  aria-hidden="true"
                  className="hidden lg:block absolute -top-3.5 -left-3.5 w-7 h-7 rounded-full bg-[#F6F3FC] border border-[#1B2138]/10"
                />
                <div
                  aria-hidden="true"
                  className="hidden lg:block absolute -bottom-3.5 -left-3.5 w-7 h-7 rounded-full bg-[#F6F3FC] border border-[#1B2138]/10"
                />

                <div className="w-full flex items-center justify-between text-[11px] font-mono tracking-wider text-[#4C5574] mb-4">
                  <span>STUB · {boardingPass.fields.flight}</span>
                  <span>1ST CLASS</span>
                </div>

                {/* Decorative QR-code-inspired geometric graphic */}
                <div className="p-3.5 rounded-2xl bg-white border border-[#1B2138]/10 shadow-sm mb-4">
                  <svg
                    viewBox="0 0 110 110"
                    className="w-32 h-32 text-[#1B2138]"
                    role="img"
                    aria-label="Decorative Dream Fairy Airways boarding pass QR graphic"
                  >
                    {QR_MATRIX.map((row, r) =>
                      row.map((cell, c) =>
                        cell ? (
                          <rect
                            key={`${r}-${c}`}
                            x={c * 10 + 1}
                            y={r * 10 + 1}
                            width="8"
                            height="8"
                            rx="1.8"
                            fill={(r + c) % 5 === 0 ? '#7D6AB8' : '#1B2138'}
                          />
                        ) : null,
                      ),
                    )}
                  </svg>
                </div>

                {/* Aviation Barcode Strip */}
                <div className="w-full">
                  <div
                    aria-hidden="true"
                    className="h-7 w-full flex items-stretch justify-center gap-[2px] mb-2 opacity-75"
                  >
                    {[3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 2, 1, 2].map(
                      (w, idx) => (
                        <span
                          key={idx}
                          className="bg-[#1B2138] rounded-[0.5px]"
                          style={{ width: `${w * 2}px` }}
                        />
                      ),
                    )}
                  </div>
                  <p className="font-mono text-[11px] tracking-[0.2em] text-[#4C5574] tabular-nums">
                    DF0612 · SHARAVANI
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
