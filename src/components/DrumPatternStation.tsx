import { useState, useEffect } from 'react';
import { 
  Drum, 
  CircleDot, 
  Sparkles, 
  Play, 
  VolumeX, 
  Volume2, 
  Sliders, 
  Grid3X3,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { DrumPattern, BeatDivision, FiredHits } from '../types';

export const DRUM_PATTERNS: DrumPattern[] = [
  {
    id: 'rock',
    name: 'Classic Rock Groove',
    description: 'The foundation of modern rhythm: Snare on beats 2 & 4, Kick on 1 & 3, steady eighth-note hi-hats.',
    beatsPerMeasure: 4,
    division: 2,
    grid: {
      kick:  [true,  false, false, false, true,  false, false, false],
      snare: [false, false, true,  false, false, false, true,  false],
      hihat: [true,  true,  true,  true,  true,  true,  true,  true]
    }
  },
  {
    id: 'four-floor',
    name: 'Four-on-the-Floor Dance',
    description: 'Continuous heavy kick drums on every solid beat with offbeat eighth-note hi-hats for energy.',
    beatsPerMeasure: 4,
    division: 2,
    grid: {
      kick:  [true,  false, true,  false, true,  false, true,  false],
      snare: [false, false, true,  false, false, false, true,  false],
      hihat: [false, true,  false, true,  false, true,  false, true]
    }
  },
  {
    id: 'boombap',
    name: 'Hip-Hop Boom Bap',
    description: 'Laid-back vintage groove with a syncopated double kick and strong snare backbeat.',
    beatsPerMeasure: 4,
    division: 4,
    grid: {
      kick:  [true,  false, false, true,  false, false, false, false, true,  false, false, false, false, false, false, false],
      snare: [false, false, false, false, true,  false, false, false, false, false, false, false, true,  false, false, false],
      hihat: [true,  false, true,  false, true,  false, true,  false, true,  false, true,  false, true,  false, true,  false]
    }
  },
  {
    id: 'trap',
    name: 'Half-Time Trap Beat',
    description: 'Modern half-time rhythm with a deep spacing kick drum and rapid hi-hat sequence.',
    beatsPerMeasure: 4,
    division: 4,
    grid: {
      kick:  [true,  false, false, false, false, false, false, false, false, false, true,  false, false, false, false, false],
      snare: [false, false, false, false, false, false, false, false, true,  false, false, false, false, false, false, false],
      hihat: [true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true]
    }
  },
  {
    id: 'waltz',
    name: 'Jazz Waltz (3/4 Signature)',
    description: 'A smooth, bouncing triple-meter pattern. Syncs metronome to a swing-tempo 3/4 flow.',
    beatsPerMeasure: 3,
    division: 2,
    grid: {
      kick:  [true,  false, false, false, false, false],
      snare: [false, false, true,  false, true,  false],
      hihat: [true,  true,  true,  true,  true,  true]
    }
  }
];

interface DrumPatternStationProps {
  isPlaying: boolean;
  currentBeat: number;
  currentSubdivision: number;
  division: BeatDivision;
  beatsPerMeasure: number;
  firedHits: FiredHits | null;
  activePattern: DrumPattern | null;
  muteMetronomeClick: boolean;
  setBeatsPerMeasure: (beats: number) => void;
  setDivision: (div: BeatDivision) => void;
  setActivePattern: (pattern: DrumPattern | null) => void;
  setMuteMetronomeClick: (mute: boolean) => void;
  triggerKick: () => void;
  triggerSnare: () => void;
  triggerHiHat: () => void;
  startMetronome: () => void;
  externalVisualTrigger?: { instrument: 'kick' | 'snare' | 'hihat'; timestamp: number } | null;
}

export function DrumPatternStation({
  isPlaying,
  currentBeat,
  currentSubdivision,
  division,
  beatsPerMeasure,
  firedHits,
  activePattern,
  muteMetronomeClick,
  setBeatsPerMeasure,
  setDivision,
  setActivePattern,
  setMuteMetronomeClick,
  triggerKick,
  triggerSnare,
  triggerHiHat,
  startMetronome,
  externalVisualTrigger
}: DrumPatternStationProps) {
  // Pad trigger transient visual states
  const [kickActive, setKickActive] = useState(false);
  const [snareActive, setSnareActive] = useState(false);
  const [hiHatActive, setHiHatActive] = useState(false);

  // Synchronize incoming MIDI triggers to flash
  useEffect(() => {
    if (externalVisualTrigger) {
      const { instrument } = externalVisualTrigger;
      if (instrument === 'kick') {
        setKickActive(true);
        const t = setTimeout(() => setKickActive(false), 120);
        return () => clearTimeout(t);
      } else if (instrument === 'snare') {
        setSnareActive(true);
        const t = setTimeout(() => setSnareActive(false), 120);
        return () => clearTimeout(t);
      } else if (instrument === 'hihat') {
        setHiHatActive(true);
        const t = setTimeout(() => setHiHatActive(false), 120);
        return () => clearTimeout(t);
      }
    }
  }, [externalVisualTrigger]);

  // Synchronize automated pattern sounds to light flashers
  useEffect(() => {
    if (firedHits) {
      if (firedHits.kick) {
        setKickActive(true);
        const t = setTimeout(() => setKickActive(false), 120);
        return () => clearTimeout(t);
      }
    }
  }, [firedHits, firedHits?.kick]);

  useEffect(() => {
    if (firedHits) {
      if (firedHits.snare) {
        setSnareActive(true);
        const t = setTimeout(() => setSnareActive(false), 120);
        return () => clearTimeout(t);
      }
    }
  }, [firedHits, firedHits?.snare]);

  useEffect(() => {
    if (firedHits) {
      if (firedHits.hihat) {
        setHiHatActive(true);
        const t = setTimeout(() => setHiHatActive(false), 120);
        return () => clearTimeout(t);
      }
    }
  }, [firedHits, firedHits?.hihat]);

  // Handle manual individual pads clicks
  const handleKickClick = () => {
    triggerKick();
    setKickActive(true);
    setTimeout(() => setKickActive(false), 120);
  };

  const handleSnareClick = () => {
    triggerSnare();
    setSnareActive(true);
    setTimeout(() => setSnareActive(false), 120);
  };

  const handleHiHatClick = () => {
    triggerHiHat();
    setHiHatActive(true);
    setTimeout(() => setHiHatActive(false), 120);
  };

  // Synchronize metronome structure to accommodate the loaded groove pattern
  const syncGrooveToMetronome = (pattern: DrumPattern) => {
    setBeatsPerMeasure(pattern.beatsPerMeasure);
    setDivision(pattern.division);
    setActivePattern(pattern);
    
    // Automatically turn on metronome/accompaniment play if stopped
    if (!isPlaying) {
      startMetronome();
    }
  };

  const clearPattern = () => {
    setActivePattern(null);
  };

  // Helper helper to format standard drumming subdivision column headers
  const getSubdivisionHeaders = () => {
    const totalSteps = beatsPerMeasure * division;
    const headers: string[] = [];
    
    for (let step = 0; step < totalSteps; step++) {
      const beatNum = Math.floor(step / division) + 1;
      const subIndex = step % division;

      if (division === 1) {
        headers.push(`${beatNum}`);
      } else if (division === 2) {
        headers.push(subIndex === 0 ? `${beatNum}` : `&`);
      } else if (division === 3) {
        headers.push(subIndex === 0 ? `${beatNum}` : subIndex === 1 ? `la` : `li`);
      } else if (division === 4) {
        if (subIndex === 0) headers.push(`${beatNum}`);
        else if (subIndex === 1) headers.push(`e`);
        else if (subIndex === 2) headers.push(`&`);
        else headers.push(`a`);
      }
    }
    return headers;
  };

  const headers = getSubdivisionHeaders();
  const currentStepIndex = isPlaying ? (currentBeat * division + currentSubdivision) : -1;
  const totalStepsCount = beatsPerMeasure * division;

  return (
    <div className="bg-[#0F0F11] p-6 rounded-3xl border border-slate-900 backdrop-blur-md space-y-6 w-full max-w-xl mx-auto shadow-2xl">
      
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Section 03</span>
          <h2 className="font-sans text-lg font-bold text-slate-100 tracking-tight flex items-center gap-1.5 mt-0.5">
            <Drum className="h-4.5 w-4.5 text-sky-400" /> Virtual Kit & Grooves
          </h2>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-widest text-sky-400 bg-sky-950/20 px-2 py-0.5 rounded border border-sky-900/35">
          Pro-Drums
        </span>
      </div>

      {/* 1. Interactive Drum Kit Pads (Individually triggerable with visual feedback) */}
      <div className="space-y-2.5">
        <span className="font-sans text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] block">
          Interactive Drum Pad Station
        </span>
        
        <div className="grid grid-cols-3 gap-3">
          {/* Closed Hi Hat */}
          <button
            onClick={handleHiHatClick}
            className={`relative flex flex-col items-center justify-center h-24 rounded-2xl cursor-pointer select-none transition-all duration-75 border ${
              hiHatActive 
                ? 'bg-sky-550 border-sky-400 text-white shadow-[0_0_20px_rgba(56,189,248,0.5)] scale-102' 
                : 'bg-[#141417] border-slate-900 text-slate-400 hover:border-slate-850 hover:text-slate-350'
            }`}
          >
            <div className="absolute top-2 right-2 text-[8px] font-bold uppercase tracking-wider text-slate-600 bg-black/30 px-1 py-0.2 rounded">
              HH
            </div>
            <CircleDot className={`h-6 w-6 stroke-[1.5] mb-2 ${hiHatActive ? 'text-white' : 'text-sky-400'}`} />
            <span className="text-xs font-bold leading-none tracking-tight">Hi-Hat</span>
            <span className="text-[9px] text-slate-500 font-mono mt-1 font-medium">Crisp Snap</span>
          </button>

          {/* Snare Drum */}
          <button
            onClick={handleSnareClick}
            className={`relative flex flex-col items-center justify-center h-24 rounded-2xl cursor-pointer select-none transition-all duration-75 border ${
              snareActive 
                ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-102' 
                : 'bg-[#141417] border-slate-900 text-slate-400 hover:border-slate-850 hover:text-slate-350'
            }`}
          >
            <div className="absolute top-2 right-2 text-[8px] font-bold uppercase tracking-wider text-slate-600 bg-black/30 px-1 py-0.2 rounded">
              SD
            </div>
            <Drum className={`h-6 w-6 stroke-[1.5] mb-2 ${snareActive ? 'text-slate-950' : 'text-amber-400'}`} />
            <span className="text-xs font-bold leading-none tracking-tight">Snare</span>
            <span className="text-[9px] text-slate-500 font-mono mt-1 font-medium">Mid-Crack</span>
          </button>

          {/* Kick Bass Drum */}
          <button
            onClick={handleKickClick}
            className={`relative flex flex-col items-center justify-center h-24 rounded-2xl cursor-pointer select-none transition-all duration-75 border ${
              kickActive 
                ? 'bg-purple-550 border-purple-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] scale-102' 
                : 'bg-[#141417] border-slate-900 text-slate-400 hover:border-slate-850 hover:text-slate-350'
            }`}
          >
            <div className="absolute top-2 right-2 text-[8px] font-bold uppercase tracking-wider text-slate-600 bg-black/30 px-1 py-0.2 rounded">
              BD
            </div>
            <CircleDot className={`h-6 w-6 stroke-[1.5] mb-2 scale-110 ${kickActive ? 'text-white' : 'text-purple-400'}`} />
            <span className="text-xs font-bold leading-none tracking-tight">Bass Kick</span>
            <span className="text-[9px] text-slate-500 font-mono mt-1 font-medium">Deep Thump</span>
          </button>
        </div>
        <p className="text-[10px] text-slate-500 text-center font-medium leading-relaxed italic">
          Click the pads above to play individually, or run the sequencer below for a real-time groove sync.
        </p>
      </div>

      {/* 2. Selection of Pre-defined Drum Beat Patterns */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <span className="font-sans text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
            Select Practice Groove
          </span>
          {activePattern && (
            <button
              onClick={clearPattern}
              className="text-[9px] font-mono font-bold text-rose-400 hover:text-rose-350 uppercase tracking-wider cursor-pointer bg-rose-950/20 px-2 py-0.5 rounded border border-rose-900/30"
            >
              Disable groove
            </button>
          )}
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {DRUM_PATTERNS.map((pat) => (
              <button
                key={pat.id}
                onClick={() => syncGrooveToMetronome(pat)}
                className={`py-2 px-1 rounded-xl text-center font-sans text-[10px] font-bold transition-all border ${
                  activePattern?.id === pat.id
                    ? 'bg-sky-500/10 border-sky-400/50 text-sky-300'
                    : 'bg-[#141417]/50 hover:bg-[#1C1C21] border-slate-900 text-slate-400'
                }`}
              >
                {pat.name}
              </button>
            ))}
          </div>

          {/* Loaded details card */}
          {activePattern && (
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-900 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> Synchronized: {activePattern.name}
                </span>
                <span className="font-mono text-[10px] text-slate-500 font-medium bg-slate-900 px-2 py-0.5 rounded border border-slate-900">
                  {activePattern.beatsPerMeasure}/4 @ {activePattern.division === 2 ? 'Eighths' : 'Sixteenths'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 italic leading-relaxed">
                "{activePattern.description}"
              </p>

              {/* Mute metronome tick control during performance */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-900/55">
                <span className="text-[10px] text-slate-500 font-medium">Accompaniment Style:</span>
                <button
                  onClick={() => setMuteMetronomeClick(!muteMetronomeClick)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border cursor-pointer transition-colors ${
                    muteMetronomeClick
                      ? 'bg-rose-500/10 hover:bg-rose-500/15 text-rose-400 border-rose-500/20'
                      : 'bg-[#141417] hover:bg-[#1C1C21] text-slate-450 border-slate-900'
                  }`}
                >
                  {muteMetronomeClick ? (
                    <>
                      <VolumeX className="h-3 w-3" /> Mute Click (Drums Only)
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3 w-3" /> Play Count click
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Visual Step Sequencer Board (Pre-defined drum beat representation) */}
      {activePattern && (
        <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-2xl space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="font-sans text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] block flex items-center gap-1.5">
              <Grid3X3 className="h-3 w-3 text-sky-450" /> Synchronization Matrix
            </span>
            <div className="flex items-center gap-1 font-mono text-[9px] text-slate-500 font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Playhead active
            </div>
          </div>

          <div className="overflow-x-auto select-none no-scrollbar">
            <div className="min-w-[280px] space-y-1.5">
              
              {/* Subdivision numerical timeline headers */}
              <div className="grid" style={{ gridTemplateColumns: `42px repeat(${totalStepsCount}, 1fr)` }}>
                <span className="text-[9px] uppercase font-bold text-slate-600">Count</span>
                {headers.map((h, stepIdx) => {
                  const isPlayheadHere = stepIdx === currentStepIndex;
                  return (
                    <span 
                      key={`header-${stepIdx}`} 
                      className={`text-center font-mono text-[10px] font-bold transition-all ${
                        isPlayheadHere ? 'text-emerald-400 scale-110 font-black' : 'text-slate-650'
                      }`}
                    >
                      {h}
                    </span>
                  );
                })}
              </div>

              {/* Rows */}
              {[
                { label: 'Hi-Hat', key: 'hihat', color: 'bg-sky-500/35 hover:bg-sky-550 border-sky-450/45 text-sky-300' },
                { label: 'Snare', key: 'snare', color: 'bg-amber-500/35 hover:bg-amber-550 border-amber-400/40 text-amber-300' },
                { label: 'Kick', key: 'kick', color: 'bg-purple-500/35 hover:bg-purple-550 border-purple-400/40 text-purple-300' }
              ].map((row) => {
                const hits = activePattern.grid[row.key as 'kick' | 'snare' | 'hihat'] || [];
                return (
                  <div key={`row-${row.key}`} className="grid items-center" style={{ gridTemplateColumns: `42px repeat(${totalStepsCount}, 1fr)` }}>
                    <span className="text-[10px] font-bold text-slate-450 truncate pr-1">{row.label}</span>
                    {Array.from({ length: totalStepsCount }).map((_, stepIdx) => {
                      const hasHit = hits[stepIdx];
                      const isPlayheadHere = stepIdx === currentStepIndex;
                      
                      let blockStyle = "bg-[#141417]/40 border-slate-900";
                      
                      if (hasHit) {
                        blockStyle = row.color;
                      }
                      
                      return (
                        <div key={`seq-step-${row.key}-${stepIdx}`} className="px-0.5">
                          <div 
                            className={`h-7 rounded-md border flex items-center justify-center transition-all ${blockStyle} ${
                              isPlayheadHere ? 'ring-1 ring-emerald-400/60 scale-102 brightness-110 shadow-[0_0_4px_rgba(52,211,153,0.1)]' : ''
                            }`}
                          >
                            {hasHit && (
                              <div className={`h-2.5 w-2.5 rounded-full ${
                                row.key === 'hihat' ? 'bg-sky-400' : row.key === 'snare' ? 'bg-amber-400' : 'bg-purple-400'
                              } ${isPlayheadHere ? 'animate-ping' : ''}`} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
