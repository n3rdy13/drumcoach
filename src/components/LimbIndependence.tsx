import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Zap, Trophy, Flame, Play, Pause, Activity, RefreshCw, Sparkles, Award } from 'lucide-react';

interface LimbIndependenceProps {
  isPlaying: boolean;
  bpm: number;
  currentBeat: number;
  currentSubdivision: number;
  division: number;
  triggerKick: () => void;
  triggerSnare: () => void;
  triggerHiHat: () => void;
  externalVisualTrigger?: { instrument: 'kick' | 'snare' | 'hihat'; timestamp: number; velocity?: number } | null;
}

export function LimbIndependence({
  isPlaying,
  bpm,
  currentBeat,
  currentSubdivision,
  division,
  triggerKick,
  triggerSnare,
  triggerHiHat,
  externalVisualTrigger
}: LimbIndependenceProps) {
  
  // Game state
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [handPerfectCount, setHandPerfectCount] = useState(0);

  // Active prompt grids (16 steps)
  // Hand pattern: steady eighth notes on hihat (steps 0, 2, 4, 6, 8, 10, 12, 14)
  const hihatPattern = useMemo(() => [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false], []);
  const [kickPrompts, setKickPrompts] = useState<boolean[]>(Array(16).fill(false));

  // Determine current active step (0-15)
  const activeStep = useMemo(() => {
    // Combine beat and subdivision into standard 0-15 step index
    // Assuming 4 beats per measure, division subdivisions per beat
    // Let's standardise to 16 steps total
    const beatIndex = (currentBeat - 1) % 4;
    const subIndex = currentSubdivision % 4;
    return (beatIndex * 4) + subIndex;
  }, [currentBeat, currentSubdivision]);

  // Generate randomized kick pedal prompts based on level difficulty
  const generateKickPrompts = (currentLevel: number) => {
    const freshKicks = Array(16).fill(false);
    
    if (currentLevel === 1) {
      // Level 1: Steady basic quarter notes (step 0 and 8 only)
      freshKicks[0] = true;
      freshKicks[8] = true;
    } else if (currentLevel === 2) {
      // Level 2: Simple eighth note offbeats (even steps)
      freshKicks[0] = true;
      freshKicks[4] = true;
      freshKicks[8] = true;
      freshKicks[12] = true;
    } else if (currentLevel === 3) {
      // Level 3: Syncopated eighth notes (random steps)
      freshKicks[0] = true;
      freshKicks[3] = true; // Syncopated offbeat
      freshKicks[8] = true;
      if (Math.random() > 0.5) freshKicks[11] = true;
    } else if (currentLevel === 4) {
      // Level 4: Complex double hits & sixteenth notes
      freshKicks[0] = true;
      freshKicks[2] = true;
      freshKicks[7] = true;
      freshKicks[8] = true;
      freshKicks[10] = true;
      freshKicks[15] = true;
    } else {
      // Level 5 (Pro): Complete random syncopation chaos
      for (let i = 0; i < 16; i++) {
        if (i % 2 === 0 && Math.random() > 0.4) {
          freshKicks[i] = true;
        } else if (i % 2 !== 0 && Math.random() > 0.75) {
          freshKicks[i] = true; // Sixteenth note syncopation!
        }
      }
    }

    setKickPrompts(freshKicks);
  };

  // Generate prompts on start or measure loop (when step goes back to 0)
  useEffect(() => {
    if (isPlaying && activeStep === 0) {
      generateKickPrompts(level);
    }
  }, [activeStep, isPlaying, level]);

  // Reset prompts when stop
  useEffect(() => {
    if (!isPlaying) {
      setKickPrompts(Array(16).fill(false));
    }
  }, [isPlaying]);

  // Progressive level complexity triggers
  useEffect(() => {
    if (streak > 0 && streak % 15 === 0) {
      // Advance to next coordination level
      setLevel(prev => {
        const next = Math.min(5, prev + 1);
        return next;
      });
    }
  }, [streak]);

  // Process user keypress hits inside the Independence game block
  const handleUserHit = (instrument: 'kick' | 'hihat') => {
    if (!isPlaying) return;

    const isHiHatExpected = hihatPattern[activeStep];
    const isKickExpected = kickPrompts[activeStep];

    if (instrument === 'hihat') {
      triggerHiHat();
      if (isHiHatExpected) {
        setScore(s => s + 5);
        setHandPerfectCount(c => c + 1);
        setStreak(st => {
          const next = st + 1;
          setMaxStreak(m => Math.max(m, next));
          return next;
        });
      } else {
        // Off-beat error
        setStreak(0);
      }
    } else if (instrument === 'kick') {
      triggerKick();
      if (isKickExpected) {
        setScore(s => s + 15); // Kick hits worth more coordinate points!
        setStreak(st => {
          const next = st + 1;
          setMaxStreak(m => Math.max(m, next));
          return next;
        });
      } else {
        // Off-beat kick error
        setStreak(0);
        // Reduce level if they fail too much
        setLevel(prev => Math.max(1, prev - 1));
      }
    }
  };

  // Bind local keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' || 
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const code = e.code;
      if (code === 'KeyD' || code === 'KeyK') {
        handleUserHit('hihat');
      } else if (code === 'KeyF' || code === 'KeyV' || code === 'Space') {
        handleUserHit('kick');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeStep, isPlaying, kickPrompts, hihatPattern]);

  // Connect MIDI triggers to Independence Game Loops
  const lastMidiTimestampRef = useRef<number>(0);
  useEffect(() => {
    if (!externalVisualTrigger) return;
    if (externalVisualTrigger.timestamp === lastMidiTimestampRef.current) return;
    lastMidiTimestampRef.current = externalVisualTrigger.timestamp;

    const inst = externalVisualTrigger.instrument;
    if (inst === 'hihat') {
      handleUserHit('hihat');
    } else if (inst === 'kick') {
      handleUserHit('kick');
    }
  }, [externalVisualTrigger, activeStep, kickPrompts]);

  const resetGame = () => {
    setLevel(1);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setHandPerfectCount(0);
    generateKickPrompts(1);
  };

  return (
    <div className="bg-[#0F0F11] p-6 rounded-3xl border border-slate-900 shadow-2xl space-y-5 relative overflow-hidden w-full max-w-xl mx-auto">
      
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Coordination builder</span>
          <h2 className="font-sans text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2 mt-0.5">
            <Trophy className="h-5 w-5 text-indigo-400" />
            Limb Independence Builder
          </h2>
        </div>
        <button
          onClick={resetGame}
          className="text-[9px] font-mono text-slate-550 hover:text-slate-400 uppercase tracking-widest font-extrabold cursor-pointer"
        >
          Reset Stats
        </button>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Keep up a steady <strong>eighth note hi-hat pattern</strong> (D or K key). While maintaining this roll, react to <strong>randomized syncopated kick pedal visual prompts</strong> (F, V, or Space) that appear on the timeline below.
      </p>

      {/* Stats Indicators board */}
      <div className="grid grid-cols-4 gap-2.5">
        
        {/* Coordination Score */}
        <div className="bg-[#070709] p-3 rounded-2xl border border-slate-900 text-center">
          <span className="text-[8px] uppercase tracking-wider font-bold text-slate-550 block mb-1">Total Score</span>
          <div className="text-sm font-extrabold font-sans text-slate-200 leading-none">
            {score}
          </div>
          <span className="text-[7.5px] font-mono text-slate-650 block mt-1">XP Points</span>
        </div>

        {/* Current coordination Streak */}
        <div className="bg-[#070709] p-3 rounded-2xl border border-slate-900 text-center">
          <span className="text-[8px] uppercase tracking-wider font-bold text-slate-550 block mb-1">Active Streak</span>
          <div className="text-sm font-extrabold font-sans text-amber-400 leading-none flex items-center justify-center gap-0.5">
            <Flame className="h-3.5 w-3.5 fill-amber-400 text-amber-500" /> {streak}
          </div>
          <span className="text-[7.5px] font-mono text-slate-650 block mt-1">Best: {maxStreak}</span>
        </div>

        {/* Level Complexity */}
        <div className="bg-[#070709] p-3 rounded-2xl border border-slate-900 text-center col-span-2">
          <span className="text-[8px] uppercase tracking-wider font-bold text-slate-550 block mb-1">Difficulty Complexity</span>
          <div className="text-sm font-extrabold font-sans text-indigo-400 leading-none">
            Level {level}: {level === 1 ? 'Beginner' : level === 2 ? 'Intermediate' : level === 3 ? 'Advanced' : level === 4 ? 'Expert' : 'Limb Master'}
          </div>
          <span className="text-[7.5px] font-mono text-slate-600 block mt-1">Automatic progressive scaling</span>
        </div>

      </div>

      {/* Interactive running timeline grid (16-steps) */}
      <div className="bg-[#070709] rounded-2xl p-4 border border-slate-900 space-y-4">
        <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
          <span className="flex items-center gap-1"><Activity className="h-3.5 w-3.5 text-indigo-400" /> Coordination Timeline</span>
          <span>Step {activeStep + 1} / 16</span>
        </div>

        {/* Hand track visual row (Hi-Hat) */}
        <div className="space-y-1.5">
          <span className="text-[8px] font-mono font-extrabold text-slate-650 uppercase tracking-wider">Hand Track: Steady Hi-Hats</span>
          <div className="grid grid-cols-16 gap-1">
            {hihatPattern.map((expected, idx) => (
              <div
                key={`hihat-game-${idx}`}
                className={`h-7 rounded-md flex items-center justify-center transition-all ${
                  activeStep === idx 
                    ? 'ring-2 ring-indigo-500 shadow-md bg-indigo-500/10' 
                    : expected 
                    ? 'bg-slate-900/60 border border-slate-950 text-slate-500' 
                    : 'bg-slate-950/20 text-slate-750'
                }`}
              >
                {expected ? <span className="text-[8.5px] font-extrabold font-mono text-indigo-400">H</span> : null}
              </div>
            ))}
          </div>
        </div>

        {/* Feet track visual row (Kick) */}
        <div className="space-y-1.5">
          <span className="text-[8px] font-mono font-extrabold text-slate-650 uppercase tracking-wider">Foot Track: Syncopated Kicks</span>
          <div className="grid grid-cols-16 gap-1">
            {kickPrompts.map((expected, idx) => (
              <div
                key={`kick-game-${idx}`}
                className={`h-7 rounded-md flex items-center justify-center transition-all ${
                  activeStep === idx 
                    ? 'ring-2 ring-emerald-500 shadow-md bg-emerald-500/15' 
                    : expected 
                    ? 'bg-emerald-950/20 border border-emerald-900/35 text-emerald-400 shadow-sm shadow-emerald-950' 
                    : 'bg-slate-950/20'
                }`}
              >
                {expected ? (
                  <motion.span 
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="text-[8.5px] font-extrabold font-mono text-emerald-450"
                  >
                    K
                  </motion.span>
                ) : null}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Real-time Game play prompt banner overlay */}
      <div className="bg-slate-950 rounded-2xl p-4 border border-slate-900 min-h-16 flex items-center justify-between">
        {!isPlaying ? (
          <p className="text-[11px] text-slate-500 italic flex items-center gap-1.5 w-full justify-center py-1">
            <ShieldAlert className="h-4 w-4 text-slate-600" /> Metronome is idle. Tap PLAY at the bottom to start coordination game!
          </p>
        ) : (
          <div className="flex justify-between items-center w-full">
            <div className="space-y-0.5">
              <span className="text-[8px] uppercase tracking-wider font-mono text-slate-600 font-extrabold">Reaction Prompt</span>
              <p className="text-xs font-extrabold font-sans text-slate-200">
                {kickPrompts[activeStep] ? (
                  <span className="text-emerald-450 uppercase animate-pulse flex items-center gap-1">
                    <Sparkles className="h-4.5 w-4.5 text-amber-400 fill-amber-400" /> STRIKE KICK PEDAL NOW!
                  </span>
                ) : hihatPattern[activeStep] ? (
                  <span className="text-indigo-450 uppercase">Steady Hi-Hat hit...</span>
                ) : (
                  <span className="text-slate-500 italic">Anticipate next prompt...</span>
                )}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[8px] uppercase tracking-wider font-mono text-slate-600 font-extrabold block">Hand Perfects</span>
              <span className="text-xs font-bold font-mono text-indigo-350">{handPerfectCount} hits</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
