import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Keyboard, Sparkles, Eye, Circle as HelpCircle, Play, Layers, VolumeX, Volume2, Activity, RotateCcw, Clock, Zap, Gauge, Target } from 'lucide-react';
import { BeatDivision } from '../types';

interface PracticeModeProps {
  isPlaying: boolean;
  bpm: number;
  currentBeat: number;
  currentSubdivision: number;
  division: BeatDivision;
  beatsPerMeasure: number;
  triggerKick: () => void;
  triggerSnare: () => void;
  triggerHiHat: () => void;
  setBeatsPerMeasure: (beats: number) => void;
  setDivision: (div: BeatDivision) => void;
  togglePlayback: () => void;
  externalVisualTrigger?: { instrument: 'kick' | 'snare' | 'hihat'; timestamp: number } | null;
  onHistoryUpdated?: (history: { id: string; offset: number; type: 'kick' | 'snare' | 'hihat'; rating: 'Perfect' | 'Good' | 'Early' | 'Late' }[]) => void;
  importedPattern?: PracticePattern | null;
  latencyOffsetMs?: number;
}

export interface PracticePattern {
  id: string;
  name: string;
  difficulty: 'Easy' | 'Medium' | 'Challenging';
  description: string;
  beats: number;
  division: BeatDivision;
  // Step sequence: arrays of booleans indicating if instrument is triggered on that sub-step
  sequence: {
    kick: boolean[];
    snare: boolean[];
    hihat: boolean[];
  };
}

const PRACTICE_PATTERNS: PracticePattern[] = [
  {
    id: 'basic-backbeat',
    name: 'Standard 4/4 Backbeat',
    difficulty: 'Easy',
    description: 'Kick drum on beats 1 and 3, Snare drum on 2 and 4. The absolute baseline of drumming.',
    beats: 4,
    division: 1, // Quarter notes
    sequence: {
      kick:  [true,  false, true,  false],
      snare: [false, true,  false, true],
      hihat: [false, false, false, false]
    }
  },
  {
    id: 'rock-groove-starter',
    name: 'Rock Starter eighths',
    difficulty: 'Easy',
    description: 'Eighth-note steady hi-hats. Kick on 1 and 3, Snare on 2 and 4. Classic rock foundation!',
    beats: 4,
    division: 2, // Eighth notes
    sequence: {
      kick:  [true,  false, false, false, true,  false, false, false],
      snare: [false, false, true,  false, false, false, true,  false],
      hihat: [true,  true,  true,  true,  true,  true,  true,  true]
    }
  },
  {
    id: 'four-floor-pop',
    name: 'Four-on-the-Floor Pop',
    difficulty: 'Medium',
    description: 'Heavy kick hits on every single beat, snare snaps on 2 & 4, and hi-hats on off-beat eighths.',
    beats: 4,
    division: 2,
    sequence: {
      kick:  [true,  false, true,  false, true,  false, true,  false],
      snare: [false, false, true,  false, false, false, true,  false],
      hihat: [false, true,  false, true,  false, true,  false, true]
    }
  },
  {
    id: 'double-kick-syncopation',
    name: 'Syncopated Double Kick',
    difficulty: 'Challenging',
    description: 'A punchy rhythm where the bass drum slips an extra 16th-note transient beat in right before snare beat 2.',
    beats: 4,
    division: 4, // Sixteenth notes
    sequence: {
      kick:  [true,  false, false, true,  false, false, false, false, true,  false, false, false, false, false, false, false],
      snare: [false, false, false, false, true,  false, false, false, false, false, false, false, true,  false, false, false],
      hihat: [true,  false, true,  false, true,  false, true,  false, true,  false, true,  false, true,  false, true,  false]
    }
  }
];

export function PracticeMode({
  isPlaying,
  bpm,
  currentBeat,
  currentSubdivision,
  division,
  beatsPerMeasure,
  triggerKick,
  triggerSnare,
  triggerHiHat,
  setBeatsPerMeasure,
  setDivision,
  togglePlayback,
  externalVisualTrigger,
  onHistoryUpdated,
  importedPattern,
  latencyOffsetMs = 0,
}: PracticeModeProps) {
  const [selectedPattern, setSelectedPattern] = useState<PracticePattern>(PRACTICE_PATTERNS[0]);

  // Handle auto-selecting newly imported MIDI charts
  useEffect(() => {
    if (importedPattern) {
      setSelectedPattern(importedPattern);
    }
  }, [importedPattern]);
  const [enableProgrammaticAutoplay, setEnableProgrammaticAutoplay] = useState(false);
  const [activeKeys, setActiveKeys] = useState<{ [key: string]: boolean }>({});
  const [practiceLog, setPracticeLog] = useState<{ id: string; msg: string; time: string; type: 'kick' | 'snare' | 'hihat' }[]>([]);

  // Local flash tracking for visual lights above drum pads
  const [visualKickFlash, setVisualKickFlash] = useState(false);
  const [visualSnareFlash, setVisualSnareFlash] = useState(false);
  const [visualHiHatFlash, setVisualHiHatFlash] = useState(false);

  // Timing Accuracy & Streak State
  const [lastOffset, setLastOffset] = useState<number | null>(null);
  const [offsetHistory, setOffsetHistory] = useState<{ id: string; offset: number; type: 'kick' | 'snare' | 'hihat'; rating: 'Perfect' | 'Good' | 'Early' | 'Late' }[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // Ref to track the performance.now() of the most recent metronome subdivision tick
  const lastStepTimestampRef = useRef<number>(performance.now());

  // Listen to step changes to update step timestamps
  useEffect(() => {
    if (isPlaying) {
      lastStepTimestampRef.current = performance.now();
    }
  }, [currentBeat, currentSubdivision, isPlaying]);

  // Combined offset recording mechanism
  const recordTimingOffset = useCallback((type: 'kick' | 'snare' | 'hihat') => {
    if (!isPlaying) return null;

    // Apply latency compensation: subtract the hardware offset so the timing window
    // centers on the actual intended hit time rather than the raw event time.
    const now = performance.now() - latencyOffsetMs;
    const elapsedSinceStepStart = now - lastStepTimestampRef.current;
    const stepDurationMs = ((60 / bpm) / division) * 1000;

    let offset = 0;
    if (elapsedSinceStepStart <= stepDurationMs / 2) {
      // User is late relative to the current step
      offset = elapsedSinceStepStart;
    } else {
      // User is early relative to the next step
      offset = -(stepDurationMs - elapsedSinceStepStart);
    }

    // Determine accuracy rating
    const absOffset = Math.abs(offset);
    let rating: 'Perfect' | 'Good' | 'Early' | 'Late' = 'Perfect';
    if (absOffset <= 20) {
      rating = 'Perfect';
    } else if (absOffset <= 55) {
      rating = 'Good';
    } else if (offset < 0) {
      rating = 'Early';
    } else {
      rating = 'Late';
    }

    setLastOffset(offset);
    setOffsetHistory(prev => {
      const nextList = [
        { id: Math.random().toString(), offset, type, rating },
        ...prev.slice(0, 14) // Keep last 15 elements
      ];
      if (onHistoryUpdated) {
        onHistoryUpdated(nextList);
      }
      return nextList;
    });

    // Manage accuracy streaks
    if (rating === 'Perfect' || rating === 'Good') {
      setStreak(prev => {
        const next = prev + 1;
        setBestStreak(b => Math.max(b, next));
        return next;
      });
    } else {
      setStreak(0);
    }

    return { offset, rating };
  }, [isPlaying, bpm, division, latencyOffsetMs]);

  // Trigger drum sounds locally and add to logging console
  const playKickLocally = useCallback(() => {
    triggerKick();
    setVisualKickFlash(true);
    setTimeout(() => setVisualKickFlash(false), 120);
    
    const timing = recordTimingOffset('kick');
    const timingMsg = timing 
      ? ` (${timing.rating}: ${timing.offset > 0 ? '+' : ''}${Math.round(timing.offset)}ms)`
      : '';
      
    setPracticeLog(prev => [
      { id: Math.random().toString(), msg: `Bass Kick (BD) played${timingMsg}`, time: new Date().toLocaleTimeString([], { hour12: false, second: '2-digit', minute: '2-digit' }), type: 'kick' },
      ...prev.slice(0, 5)
    ]);
  }, [triggerKick, recordTimingOffset]);

  const playSnareLocally = useCallback(() => {
    triggerSnare();
    setVisualSnareFlash(true);
    setTimeout(() => setVisualSnareFlash(false), 120);
    
    const timing = recordTimingOffset('snare');
    const timingMsg = timing 
      ? ` (${timing.rating}: ${timing.offset > 0 ? '+' : ''}${Math.round(timing.offset)}ms)`
      : '';

    setPracticeLog(prev => [
      { id: Math.random().toString(), msg: `Snare Drum (SD) played${timingMsg}`, time: new Date().toLocaleTimeString([], { hour12: false, second: '2-digit', minute: '2-digit' }), type: 'snare' },
      ...prev.slice(0, 5)
    ]);
  }, [triggerSnare, recordTimingOffset]);

  const playHiHatLocally = useCallback(() => {
    triggerHiHat();
    setVisualHiHatFlash(true);
    setTimeout(() => setVisualHiHatFlash(false), 120);
    
    const timing = recordTimingOffset('hihat');
    const timingMsg = timing 
      ? ` (${timing.rating}: ${timing.offset > 0 ? '+' : ''}${Math.round(timing.offset)}ms)`
      : '';

    setPracticeLog(prev => [
      { id: Math.random().toString(), msg: `Closed Hi-Hat (HH) played${timingMsg}`, time: new Date().toLocaleTimeString([], { hour12: false, second: '2-digit', minute: '2-digit' }), type: 'hihat' },
      ...prev.slice(0, 5)
    ]);
  }, [triggerHiHat, recordTimingOffset]);

  // MIDI external triggers listener
  const lastMidiTimestampRef = useRef<number>(0);
  useEffect(() => {
    if (!externalVisualTrigger) return;
    
    // Prevent duplicate triggers inside the same millisecond timestamp
    if (externalVisualTrigger.timestamp === lastMidiTimestampRef.current) return;
    lastMidiTimestampRef.current = externalVisualTrigger.timestamp;

    const inst = externalVisualTrigger.instrument;
    if (inst === 'kick') {
      setVisualKickFlash(true);
      setTimeout(() => setVisualKickFlash(false), 120);
      const timing = recordTimingOffset('kick');
      const timingMsg = timing 
        ? ` (${timing.rating}: ${timing.offset > 0 ? '+' : ''}${Math.round(timing.offset)}ms)`
        : '';
      setPracticeLog(prev => [
        { id: Math.random().toString(), msg: `MIDI Bass Kick (BD) played${timingMsg}`, time: new Date().toLocaleTimeString([], { hour12: false, second: '2-digit', minute: '2-digit' }), type: 'kick' },
        ...prev.slice(0, 5)
      ]);
    } else if (inst === 'snare') {
      setVisualSnareFlash(true);
      setTimeout(() => setVisualSnareFlash(false), 120);
      const timing = recordTimingOffset('snare');
      const timingMsg = timing 
        ? ` (${timing.rating}: ${timing.offset > 0 ? '+' : ''}${Math.round(timing.offset)}ms)`
        : '';
      setPracticeLog(prev => [
        { id: Math.random().toString(), msg: `MIDI Snare Drum (SD) played${timingMsg}`, time: new Date().toLocaleTimeString([], { hour12: false, second: '2-digit', minute: '2-digit' }), type: 'snare' },
        ...prev.slice(0, 5)
      ]);
    } else if (inst === 'hihat') {
      setVisualHiHatFlash(true);
      setTimeout(() => setVisualHiHatFlash(false), 120);
      const timing = recordTimingOffset('hihat');
      const timingMsg = timing 
        ? ` (${timing.rating}: ${timing.offset > 0 ? '+' : ''}${Math.round(timing.offset)}ms)`
        : '';
      setPracticeLog(prev => [
        { id: Math.random().toString(), msg: `MIDI Hi-Hat (HH) played${timingMsg}`, time: new Date().toLocaleTimeString([], { hour12: false, second: '2-digit', minute: '2-digit' }), type: 'hihat' },
        ...prev.slice(0, 5)
      ]);
    }
  }, [externalVisualTrigger, recordTimingOffset]);

  // Handle programmatic beat accompaniment based on selected pattern sequence
  useEffect(() => {
    if (!isPlaying || !enableProgrammaticAutoplay) return;

    // Calculate current sequence step index
    // Note: the metronome uses state variables `currentBeat` and `currentSubdivision`
    // Ensure the metronome subdivision matches our pattern's division
    if (division !== selectedPattern.division || beatsPerMeasure !== selectedPattern.beats) {
      return; // Awaiting alignment
    }

    const stepIndex = currentBeat * division + currentSubdivision;
    const kickSeq = selectedPattern.sequence.kick;
    const snareSeq = selectedPattern.sequence.snare;
    const hihatSeq = selectedPattern.sequence.hihat;

    if (kickSeq[stepIndex]) {
      triggerKick();
      setVisualKickFlash(true);
      setTimeout(() => setVisualKickFlash(false), 120);
    }
    if (snareSeq[stepIndex]) {
      triggerSnare();
      setVisualSnareFlash(true);
      setTimeout(() => setVisualSnareFlash(false), 120);
    }
    if (hihatSeq[stepIndex]) {
      triggerHiHat();
      setVisualHiHatFlash(true);
      setTimeout(() => setVisualHiHatFlash(false), 120);
    }

  }, [
    isPlaying, 
    currentBeat, 
    currentSubdivision, 
    division, 
    beatsPerMeasure, 
    enableProgrammaticAutoplay, 
    selectedPattern, 
    triggerKick, 
    triggerSnare, 
    triggerHiHat
  ]);

  // Set keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard to prevent triggers while user is typing in chat inputs or textboxes
      if (
        document.activeElement?.tagName === 'INPUT' || 
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const code = e.code;
      setActiveKeys(prev => ({ ...prev, [code]: true }));

      switch (code) {
        case 'Space':
        case 'KeyF':
        case 'KeyV':
          e.preventDefault(); // Prevents page scrolling down on Space
          playKickLocally();
          break;
        case 'KeyS':
        case 'KeyJ':
          playSnareLocally();
          break;
        case 'KeyD':
        case 'KeyK':
          playHiHatLocally();
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      setActiveKeys(prev => ({ ...prev, [code]: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [playKickLocally, playSnareLocally, playHiHatLocally]);

  // Sync selected pattern configuration to master metronome state
  const handleSelectPattern = (pattern: PracticePattern) => {
    setSelectedPattern(pattern);
    setBeatsPerMeasure(pattern.beats);
    setDivision(pattern.division);
  };

  const currentStepIndex = isPlaying && division === selectedPattern.division && beatsPerMeasure === selectedPattern.beats
    ? (currentBeat * division + currentSubdivision)
    : -1;

  const totalSteps = selectedPattern.beats * selectedPattern.division;

  return (
    <div className="bg-[#0F0F11] p-6 rounded-3xl border border-slate-900 backdrop-blur-md space-y-6 w-full max-w-xl mx-auto shadow-2xl relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Feature Addition</span>
          <h2 className="font-sans text-lg font-bold text-slate-100 tracking-tight flex items-center gap-1.5 mt-0.5">
            <Keyboard className="h-4.5 w-4.5 text-indigo-400" /> Interactive Practice Mode
          </h2>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 bg-indigo-950/20 px-2.5 py-1 rounded-xl border border-indigo-900/35 flex items-center gap-1">
          <Activity className="h-3 w-3 animate-pulse" /> Keyboard Enabled
        </span>
      </div>

      {/* Intro info box */}
      <p className="text-xs text-slate-400 leading-relaxed">
        Follow the visual light guide to practice drum rhythms. You can strike the pads using your keyboard or click them directly. Try matching the glowing timeline in real-time!
      </p>

      {/* Keyboard mappings guide banner */}
      <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-900 space-y-3">
        <span className="font-sans text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] block">
          🎹 Interactive Key Bindings
        </span>
        <div className="grid grid-cols-3 gap-2.5 text-center">
          
          {/* Kick bind */}
          <div className={`p-2.5 rounded-xl border transition-all ${
            activeKeys['Space'] || activeKeys['KeyF'] || activeKeys['KeyV'] || visualKickFlash
              ? 'bg-purple-950/40 border-purple-500/40 text-purple-200'
              : 'bg-[#141417]/50 border-slate-900 text-slate-400'
          }`}>
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Bass Kick</span>
            <div className="flex justify-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px] font-mono font-bold">Space</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px] font-mono font-bold">F</kbd>
            </div>
            <span className="text-[9px] text-slate-600 block mt-1">Deep Thump</span>
          </div>

          {/* Snare bind */}
          <div className={`p-2.5 rounded-xl border transition-all ${
            activeKeys['KeyS'] || activeKeys['KeyJ'] || visualSnareFlash
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
              : 'bg-[#141417]/50 border-slate-900 text-slate-400'
          }`}>
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Snare Drum</span>
            <div className="flex justify-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px] font-mono font-bold">S</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px] font-mono font-bold">J</kbd>
            </div>
            <span className="text-[9px] text-slate-600 block mt-1">Mid Crack</span>
          </div>

          {/* Hi-Hat bind */}
          <div className={`p-2.5 rounded-xl border transition-all ${
            activeKeys['KeyD'] || activeKeys['KeyK'] || visualHiHatFlash
              ? 'bg-sky-950/40 border-sky-500/40 text-sky-200'
              : 'bg-[#141417]/50 border-slate-900 text-slate-400'
          }`}>
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Hi-Hat</span>
            <div className="flex justify-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px] font-mono font-bold">D</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px] font-mono font-bold">K</kbd>
            </div>
            <span className="text-[9px] text-slate-600 block mt-1">Crisp Snap</span>
          </div>

        </div>
      </div>

      {/* Visual Lights row directly above the pads */}
      <div className="space-y-2">
        <span className="font-sans text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] block">
          🚨 Active Pad Light Indicators
        </span>
        <div className="grid grid-cols-3 gap-3">
          
          {/* Hihat Light */}
          <div className="flex flex-col items-center">
            <div className={`w-full h-2 rounded-full transition-all duration-75 ${
              visualHiHatFlash 
                ? 'bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)] scale-x-105' 
                : 'bg-slate-950 border border-slate-900'
            }`} />
            <span className="text-[8px] font-bold text-slate-600 uppercase mt-1">HH Light</span>
          </div>

          {/* Snare Light */}
          <div className="flex flex-col items-center">
            <div className={`w-full h-2 rounded-full transition-all duration-75 ${
              visualSnareFlash 
                ? 'bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.8)] scale-x-105' 
                : 'bg-slate-950 border border-slate-900'
            }`} />
            <span className="text-[8px] font-bold text-slate-600 uppercase mt-1">SD Light</span>
          </div>

          {/* Kick Light */}
          <div className="flex flex-col items-center">
            <div className={`w-full h-2 rounded-full transition-all duration-75 ${
              visualKickFlash 
                ? 'bg-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.8)] scale-x-105' 
                : 'bg-slate-950 border border-slate-900'
            }`} />
            <span className="text-[8px] font-bold text-slate-600 uppercase mt-1">BD Light</span>
          </div>

        </div>
      </div>

      {/* Real-time Timing Accuracy Gauge & Scatter plot */}
      <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-900/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Gauge className="h-4 w-4 text-indigo-400" />
            <span className="font-sans text-[10.5px] font-bold text-slate-300 uppercase tracking-wider">
              Real-time Timing Accuracy
            </span>
          </div>
          {isPlaying && (
            <div className="flex items-center gap-3">
              {streak > 0 && (
                <span className="text-[10px] bg-emerald-950/40 text-emerald-300 font-extrabold px-2 py-0.5 rounded-xl border border-emerald-500/20 flex items-center gap-1 animate-bounce">
                  <Zap className="h-3 w-3 text-amber-400 fill-amber-400" /> STREAK: {streak}
                </span>
              )}
              {bestStreak > 0 && (
                <span className="text-[10px] text-slate-500 font-bold font-mono">
                  BEST: {bestStreak}
                </span>
              )}
            </div>
          )}
        </div>

        {/* The Sliding Offset Gauge */}
        <div className="space-y-2">
          <div className="relative h-6 bg-[#0B0B0D] rounded-lg border border-slate-900 overflow-hidden flex items-center">
            {/* Background color bands for perfect/good/early/late zones */}
            <div className="absolute left-[30%] right-[30%] top-0 bottom-0 bg-emerald-500/5 border-x border-dashed border-emerald-500/10 pointer-events-none" />
            
            {/* Highlighted exact sweetspot (Perfect is ±20ms, Good is ±55ms. Let's visualize center range) */}
            <div className="absolute left-[45%] right-[45%] top-0 bottom-0 bg-emerald-500/15 pointer-events-none" />

            {/* Zero/Perfect Center mark */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-indigo-500/40 z-10 pointer-events-none" />
            
            {/* Guide labels on track */}
            <span className="absolute left-3 text-[8.5px] font-mono font-bold text-slate-650 pointer-events-none uppercase">Early</span>
            <span className="absolute right-3 text-[8.5px] font-mono font-bold text-slate-650 pointer-events-none uppercase">Late</span>
            <span className="absolute left-1/2 -translate-x-1/2 bottom-0.5 text-[7px] font-mono font-extrabold text-slate-600 pointer-events-none">PERFECT</span>

            {/* Glowing active indicator needle */}
            {isPlaying && lastOffset !== null ? (
              <motion.div
                key={lastOffset} // Force restart of entry animation
                initial={{ opacity: 0.4, scale: 1.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="absolute h-4 w-4 rounded-full border border-white shadow-lg flex items-center justify-center -translate-x-1/2 z-20 pointer-events-none"
                style={{
                  left: `${50 + (Math.max(-100, Math.min(100, lastOffset)) / 200) * 100}%`,
                  backgroundColor: Math.abs(lastOffset) <= 20 
                    ? '#10b981' // emerald-500
                    : Math.abs(lastOffset) <= 55
                    ? '#f59e0b' // amber-500
                    : '#ef4444', // red-500
                  boxShadow: Math.abs(lastOffset) <= 20 
                    ? '0 0 10px rgba(16,185,129,0.8)' 
                    : Math.abs(lastOffset) <= 55
                    ? '0 0 10px rgba(245,158,11,0.8)'
                    : '0 0 10px rgba(239,68,68,0.8)'
                }}
              >
                <div className="h-1 w-1 rounded-full bg-white" />
              </motion.div>
            ) : null}
          </div>

          {/* Dynamic feedback textual readout */}
          <div className="flex items-center justify-between text-[10px] font-medium min-h-4">
            {!isPlaying ? (
              <span className="text-slate-500 italic flex items-center gap-1">
                <Target className="h-3.5 w-3.5 text-slate-600" /> Metronome is idle. Tap PLAY below to practice timing metrics.
              </span>
            ) : lastOffset === null ? (
              <span className="text-slate-500 italic">
                Strike drum pads or keys to gauge microsecond offsets relative to the grid.
              </span>
            ) : (
              <div className="flex justify-between items-center w-full">
                <span className="flex items-center gap-1.5 font-bold">
                  Timing rating:{" "}
                  <span className={
                    Math.abs(lastOffset) <= 20 
                      ? 'text-emerald-400 font-extrabold' 
                      : Math.abs(lastOffset) <= 55
                      ? 'text-amber-400 font-extrabold'
                      : 'text-rose-400 font-extrabold'
                  }>
                    {Math.abs(lastOffset) <= 20 
                      ? '🎯 Perfect!' 
                      : Math.abs(lastOffset) <= 55
                      ? '👍 Good' 
                      : lastOffset < 0 
                      ? '⏰ Early' 
                      : '🐢 Late'}
                  </span>
                </span>
                <span className="font-mono text-slate-400">
                  Offset: <span className="font-bold text-slate-200">{lastOffset > 0 ? '+' : ''}{Math.round(lastOffset)} ms</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Scrolling Scatter plot / Dot history graph */}
        {isPlaying && offsetHistory.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-slate-900/55">
            <span className="font-sans text-[9px] font-bold text-slate-650 uppercase tracking-[0.1em] block">
              Precision Dot Stream History (Last 15 hits)
            </span>
            <div className="relative h-20 bg-[#070709] rounded-xl border border-slate-900/80 overflow-hidden p-1 flex items-center">
              
              {/* Center dashed perfect line */}
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t border-dashed border-slate-900 pointer-events-none" />
              
              {/* Safe zone shade */}
              <div className="absolute left-0 right-0 top-[35%] bottom-[35%] bg-emerald-500/[0.015] pointer-events-none" />

              {/* Grid indicators for early/late direction */}
              <span className="absolute left-2.5 top-1.5 text-[8px] font-mono font-bold text-slate-700 pointer-events-none">LATE (+)</span>
              <span className="absolute left-2.5 bottom-1.5 text-[8px] font-mono font-bold text-slate-700 pointer-events-none">EARLY (-)</span>

              {/* Dot mapping list */}
              <div className="flex items-center justify-between w-full h-full px-4 relative z-10">
                {Array.from({ length: 15 }).map((_, colIdx) => {
                  // offsetHistory is newest-first, let's reverse to render oldest-to-newest (left to right)
                  const itemIdx = 14 - colIdx;
                  const item = offsetHistory[itemIdx];

                  if (!item) {
                    return (
                      <div 
                        key={`history-slot-${colIdx}`} 
                        className="w-4 h-full flex items-center justify-center border-r border-slate-950/10 last:border-0"
                      >
                        <span className="h-0.5 w-0.5 bg-slate-900 rounded-full" />
                      </div>
                    );
                  }

                  // Offset ranges from -100 to +100 ms for scatter graph limit
                  // Compute standard top percentage where center 50% is 0ms, 5% is +100ms (late), 95% is -100ms (early)
                  const clampedVal = Math.max(-100, Math.min(100, item.offset));
                  const topPercent = 50 - (clampedVal / 200) * 80;

                  return (
                    <div 
                      key={item.id} 
                      className="w-4 h-full relative flex justify-center border-r border-slate-950/10 last:border-0"
                    >
                      {/* Vertical line indicator */}
                      <div className="absolute top-1 bottom-1 w-[1px] bg-slate-900/30 pointer-events-none" />

                      {/* Floating dot representing user hit */}
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute w-2 h-2 rounded-full border border-white/10 shadow-md cursor-help"
                        style={{
                          top: `${topPercent}%`,
                          marginTop: '-4px', // Center the height perfectly
                          backgroundColor: item.rating === 'Perfect' 
                            ? '#10b981' // emerald-500
                            : item.rating === 'Good'
                            ? '#f59e0b' // amber-500
                            : '#ef4444', // red-500
                        }}
                        title={`${item.type.toUpperCase()}: ${Math.round(item.offset)}ms (${item.rating})`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="flex items-center justify-between text-[8px] font-mono text-slate-600 px-1">
              <span>Oldest hit</span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" /> Perfect (±20ms)
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 ml-1.5" /> Good (±55ms)
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1.5" /> Poor (&gt;55ms)
              </span>
              <span>Newest hit</span>
            </div>
          </div>
        )}
      </div>

      {/* Drum Beat Practice Selector */}
      <div className="space-y-2">
        <span className="font-sans text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] block">
          Select Visual Practice Pattern
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {PRACTICE_PATTERNS.map((pat) => (
            <button
              key={pat.id}
              onClick={() => handleSelectPattern(pat)}
              className={`py-2 px-3 rounded-xl text-left transition-all border flex flex-col justify-between h-16 cursor-pointer select-none ${
                selectedPattern.id === pat.id
                  ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300 shadow-md'
                  : 'bg-[#141417]/60 hover:bg-[#1C1C21] border-slate-900 text-slate-400'
              }`}
            >
              <span className="text-[11px] font-bold tracking-tight block leading-none">{pat.name}</span>
              <div className="flex items-center justify-between w-full mt-1.5">
                <span className="text-[9px] text-slate-500 italic truncate max-w-[70%]">
                  {pat.beats}/4 metronome
                </span>
                <span className={`text-[8px] font-bold font-mono px-1.5 py-0.2 rounded ${
                  pat.difficulty === 'Easy' 
                    ? 'bg-emerald-950/25 text-emerald-400 border border-emerald-900/30' 
                    : pat.difficulty === 'Medium'
                    ? 'bg-amber-950/25 text-amber-400 border border-amber-900/30'
                    : 'bg-rose-950/25 text-rose-400 border border-rose-900/30'
                }`}>
                  {pat.difficulty}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Pattern details */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-900 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900/50 pb-2">
          <p className="text-[11.5px] text-slate-400 leading-relaxed italic pr-2">
            "{selectedPattern.description}"
          </p>
          <button
            onClick={() => {
              // Ensure metronome state matches pattern state
              setBeatsPerMeasure(selectedPattern.beats);
              setDivision(selectedPattern.division);
              setEnableProgrammaticAutoplay(!enableProgrammaticAutoplay);
              if (!isPlaying) togglePlayback();
            }}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border cursor-pointer select-none transition-colors self-start sm:self-center shrink-0 ${
              enableProgrammaticAutoplay
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                : 'bg-[#141417] text-slate-400 border-slate-900 hover:border-slate-800'
            }`}
          >
            {enableProgrammaticAutoplay ? (
              <>
                <Volume2 className="h-3.5 w-3.5" /> Program Play: ON
              </>
            ) : (
              <>
                <VolumeX className="h-3.5 w-3.5" /> Program Play: OFF
              </>
            )}
          </button>
        </div>

        {/* Dynamic Light Sequence Tracker */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[9px] uppercase font-bold text-slate-550 font-mono tracking-wider">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5 text-indigo-400 animate-pulse" /> Visual Rhythm Light-bar
            </span>
            <span>{selectedPattern.beats} Beats ({selectedPattern.division === 1 ? 'Quarter' : selectedPattern.division === 2 ? '8th' : '16th'} notes)</span>
          </div>

          <div className="overflow-x-auto no-scrollbar py-0.5">
            <div className="min-w-[280px] space-y-1.5">
              
              {/* Timeline beat counts */}
              <div className="grid items-center" style={{ gridTemplateColumns: `50px repeat(${totalSteps}, 1fr)` }}>
                <span className="text-[9px] uppercase font-bold text-slate-650 font-mono">Count</span>
                {Array.from({ length: totalSteps }).map((_, stepIdx) => {
                  const beatNum = Math.floor(stepIdx / selectedPattern.division) + 1;
                  const isPlayheadHere = stepIdx === currentStepIndex;
                  return (
                    <span 
                      key={`guide-count-${stepIdx}`} 
                      className={`text-center font-mono text-[9.5px] font-bold ${
                        isPlayheadHere ? 'text-indigo-400 font-extrabold scale-110' : 'text-slate-700'
                      }`}
                    >
                      {beatNum}
                    </span>
                  );
                })}
              </div>

              {/* Guide light row for Hihat */}
              <div className="grid items-center" style={{ gridTemplateColumns: `50px repeat(${totalSteps}, 1fr)` }}>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Hi-Hat</span>
                {Array.from({ length: totalSteps }).map((_, stepIdx) => {
                  const hasHit = selectedPattern.sequence.hihat[stepIdx];
                  const isPlayheadHere = stepIdx === currentStepIndex;
                  return (
                    <div key={`guide-hh-${stepIdx}`} className="px-0.5">
                      <div className={`h-4.5 rounded transition-all flex items-center justify-center border ${
                        hasHit 
                          ? isPlayheadHere 
                            ? 'bg-sky-400 border-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.6)]' 
                            : 'bg-sky-950/40 border-sky-900/40 text-sky-400'
                          : isPlayheadHere
                          ? 'bg-slate-900/80 border-slate-850'
                          : 'bg-slate-950/20 border-slate-950'
                      }`}>
                        {hasHit && (
                          <div className={`h-1.5 w-1.5 rounded-full ${isPlayheadHere ? 'bg-white' : 'bg-sky-400'}`} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Guide light row for Snare */}
              <div className="grid items-center" style={{ gridTemplateColumns: `50px repeat(${totalSteps}, 1fr)` }}>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Snare</span>
                {Array.from({ length: totalSteps }).map((_, stepIdx) => {
                  const hasHit = selectedPattern.sequence.snare[stepIdx];
                  const isPlayheadHere = stepIdx === currentStepIndex;
                  return (
                    <div key={`guide-snare-${stepIdx}`} className="px-0.5">
                      <div className={`h-4.5 rounded transition-all flex items-center justify-center border ${
                        hasHit 
                          ? isPlayheadHere 
                            ? 'bg-amber-400 border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.6)]' 
                            : 'bg-amber-950/40 border-amber-900/40 text-amber-400'
                          : isPlayheadHere
                          ? 'bg-slate-900/80 border-slate-850'
                          : 'bg-slate-950/20 border-slate-950'
                      }`}>
                        {hasHit && (
                          <div className={`h-1.5 w-1.5 rounded-full ${isPlayheadHere ? 'bg-slate-950 font-bold' : 'bg-amber-400'}`} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Guide light row for Kick */}
              <div className="grid items-center" style={{ gridTemplateColumns: `50px repeat(${totalSteps}, 1fr)` }}>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Kick</span>
                {Array.from({ length: totalSteps }).map((_, stepIdx) => {
                  const hasHit = selectedPattern.sequence.kick[stepIdx];
                  const isPlayheadHere = stepIdx === currentStepIndex;
                  return (
                    <div key={`guide-kick-${stepIdx}`} className="px-0.5">
                      <div className={`h-4.5 rounded transition-all flex items-center justify-center border ${
                        hasHit 
                          ? isPlayheadHere 
                            ? 'bg-purple-400 border-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.6)]' 
                            : 'bg-purple-950/40 border-purple-900/40 text-purple-400'
                          : isPlayheadHere
                          ? 'bg-slate-900/80 border-slate-850'
                          : 'bg-slate-950/20 border-slate-950'
                      }`}>
                        {hasHit && (
                          <div className={`h-1.5 w-1.5 rounded-full ${isPlayheadHere ? 'bg-white' : 'bg-purple-400'}`} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

          {/* Sync instruction status warning */}
          {isPlaying && (division !== selectedPattern.division || beatsPerMeasure !== selectedPattern.beats) && (
            <div className="flex items-center justify-between bg-[#1C1212] border border-rose-500/20 rounded-xl px-3 py-2 text-[10px] text-rose-350">
              <span>⚠️ Configuration out of sync with guide template. Click Sync below to re-align beats.</span>
              <button
                onClick={() => {
                  setBeatsPerMeasure(selectedPattern.beats);
                  setDivision(selectedPattern.division);
                }}
                className="font-mono font-bold underline hover:text-rose-200 cursor-pointer"
              >
                Sync Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hit Logging Console */}
      <div className="bg-[#141417]/60 rounded-2xl p-4 border border-slate-900 space-y-2">
        <div className="flex items-center justify-between border-b border-slate-900/85 pb-1.5">
          <span className="font-sans text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
            Practice Hit Logs
          </span>
          <button
            onClick={() => setPracticeLog([])}
            className="text-[8px] font-mono font-bold text-slate-600 hover:text-slate-400 uppercase tracking-widest cursor-pointer"
          >
            Clear logs
          </button>
        </div>
        
        <div className="space-y-1 max-h-24 overflow-y-auto no-scrollbar font-mono text-[9px] text-slate-500">
          {practiceLog.length === 0 ? (
            <p className="text-slate-600 italic">No drum pads hit yet. Tap Space, F, S, J, D, K or click pad inputs above.</p>
          ) : (
            practiceLog.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-0.5 border-b border-white/[0.01]">
                <span className="flex items-center gap-1">
                  <span className={`h-1 w-1 rounded-full ${
                    log.type === 'kick' ? 'bg-purple-400' : log.type === 'snare' ? 'bg-amber-400' : 'bg-sky-400'
                  }`} />
                  <span className="text-slate-400">{log.msg}</span>
                </span>
                <span className="text-slate-600 text-[8px]">{log.time}</span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
