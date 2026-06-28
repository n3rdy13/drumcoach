import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BeatDivision } from '../types';

interface VisualBeatsProps {
  currentBeat: number;
  currentSubdivision: number;
  beatsPerMeasure: number;
  division: BeatDivision;
  flashTrigger: number;
  isFirstBeat: boolean;
  isPlaying: boolean;
}

export function VisualBeats({
  currentBeat,
  currentSubdivision,
  beatsPerMeasure,
  division,
  flashTrigger,
  isFirstBeat,
  isPlaying,
}: VisualBeatsProps) {
  const [pulseScale, setPulseScale] = useState(1);
  const [accentFlash, setAccentFlash] = useState(false);

  // Synchronize internal flash trigger updates to initiate clean pulses
  useEffect(() => {
    if (isPlaying && flashTrigger > 0) {
      setPulseScale(1.3);
      if (isFirstBeat && currentSubdivision === 0) {
        setAccentFlash(true);
      }
      
      const timer = setTimeout(() => {
        setPulseScale(1);
        setAccentFlash(false);
      }, 90);

      return () => clearTimeout(timer);
    }
  }, [flashTrigger, isFirstBeat, isPlaying, currentSubdivision]);

  // Generate ticks helper for displaying subdivision grid dots inside each beat block
  const getSubdivisionsGrid = (beatIdx: number) => {
    return Array.from({ length: division }).map((_, subIdx) => {
      const isActive = isPlaying && currentBeat === beatIdx && currentSubdivision === subIdx;
      return (
        <span
          key={`sub-dot-${beatIdx}-${subIdx}`}
          className={`h-2.5 w-2.5 rounded-full transition-all duration-75 ${
            isActive
              ? isFirstBeat && subIdx === 0
                ? 'bg-amber-400 ring-4 ring-amber-400/30 scale-125 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                : 'bg-emerald-400 ring-4 ring-emerald-400/30 scale-125 shadow-[0_0_12px_rgba(52,211,153,0.6)]'
              : 'bg-slate-700/50 scale-100'
          }`}
        />
      );
    });
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-8 bg-[#0F0F11] border border-slate-900 rounded-3xl backdrop-blur-md shadow-2xl w-full max-w-xl mx-auto overflow-hidden">
      {/* Background circular radar patterns for premium Atmosphere */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <div className="w-[600px] h-[600px] border border-slate-700 rounded-full shrink-0 animate-[spin_120s_linear_infinite]"></div>
        <div className="absolute w-[450px] h-[450px] border border-slate-800 rounded-full shrink-0"></div>
      </div>

      {/* Main Flashing Downbeat / Pulsing Sphere indicator */}
      <div
        id="pulse-circle"
        style={{ transform: `scale(${isPlaying ? pulseScale : 1})` }}
        className={`relative flex flex-col justify-center items-center h-56 w-56 rounded-full border-4 bg-slate-950/75 mb-8 overflow-visible transition-all duration-75 select-none ${
          isPlaying
            ? isFirstBeat && currentSubdivision === 0
              ? 'border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.3)]'
              : currentSubdivision === 0
              ? 'border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.25)]'
              : 'border-sky-500 shadow-[0_0_15px_rgba(56,189,248,0.15)]'
            : 'border-slate-800'
        }`}
      >
        {/* Ambient Ring Wave 1 */}
        <AnimatePresence>
          {isPlaying && (
            <motion.div
              key={`ring-1-${flashTrigger}`}
              initial={{ scale: 0.95, opacity: 0.8 }}
              animate={{ scale: isFirstBeat ? 1.7 : 1.45, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className={`absolute inset-0 rounded-full border-2 ${
                isFirstBeat ? 'border-amber-400/30' : 'border-emerald-400/30'
              } pointer-events-none`}
            />
          )}
        </AnimatePresence>

        {/* Ambient Ring Wave 2 (Double Downbeat flash effect) */}
        <AnimatePresence>
          {isPlaying && isFirstBeat && (
            <motion.div
              key={`ring-2-${flashTrigger}`}
              initial={{ scale: 0.95, opacity: 0.9 }}
              animate={{ scale: 2.1, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full border-2 border-orange-500/20 pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Inner core value display */}
        <div className="text-center z-10">
          {isPlaying ? (
            <div>
              <span className="block font-mono text-7xl font-bold text-white tracking-tighter leading-none">
                {currentBeat + 1}
              </span>
              <span className="block text-[10px] uppercase tracking-[0.3em] text-slate-500 mt-2 font-semibold">
                {division > 1 ? `Sub ${currentSubdivision + 1}` : 'Beat'}
              </span>
            </div>
          ) : (
            <div>
              <span className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-500">
                Idle
              </span>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-slate-600 mt-1 font-medium">
                Click Play
              </span>
            </div>
          )}
        </div>

        {/* Glow effect inside pulse */}
        <div className={`absolute inset-0 rounded-full transition-all duration-75 pointer-events-none ${
          isPlaying && currentSubdivision === 0
            ? isFirstBeat 
              ? 'bg-amber-400/5' 
              : 'bg-emerald-500/5'
            : ''
        }`}></div>
      </div>

      {/* Grid of beats representing full measure context */}
      <div className="w-full space-y-4 z-10">
        <div className="flex items-center justify-between">
          <span className="font-sans text-xs font-bold uppercase tracking-wider text-slate-500">
            Measure Progress
          </span>
          <span className="font-mono text-xs text-emerald-400 font-bold bg-emerald-950/20 px-2.5 py-1 rounded-lg border border-emerald-900/30">
            {beatsPerMeasure}/4
          </span>
        </div>

        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${beatsPerMeasure}, minmax(0, 1fr))` }}>
          {Array.from({ length: beatsPerMeasure }).map((_, beatIdx) => {
            const isCurrentBeat = currentBeat === beatIdx && isPlaying;
            return (
              <div
                key={`beat-cell-${beatIdx}`}
                className={`p-3 rounded-2xl flex flex-col items-center justify-between space-y-3 transition-all duration-150 border ${
                  isCurrentBeat
                    ? beatIdx === 0
                      ? 'bg-amber-950/20 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.1)]'
                      : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                    : 'bg-[#121214]/60 border-slate-900 text-slate-500'
                }`}
              >
                {/* Beat Number indicator */}
                <span className="font-sans text-sm font-bold">
                  {beatIdx + 1}
                </span>

                {/* Sub-pulses nested dot grid */}
                <div className="flex gap-1 flex-wrap justify-center">
                  {getSubdivisionsGrid(beatIdx)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
