import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Sparkles, RefreshCw, Trophy, Zap, AlertCircle, HelpCircle } from 'lucide-react';
import { RUDIMENTS } from '../data/rudiments';
import { Rudiment, BeatDivision } from '../types';

interface RudimentCoachProps {
  isPlaying: boolean;
  bpm: number;
  division: BeatDivision;
  currentBeat: number;
  currentSubdivision: number;
  setBpm: (bpm: number) => void;
  setDivision: (div: BeatDivision) => void;
}

export function RudimentCoach({
  isPlaying,
  bpm,
  division,
  currentBeat,
  currentSubdivision,
  setBpm,
  setDivision,
}: RudimentCoachProps) {
  const [selectedRudimentId, setSelectedRudimentId] = useState(RUDIMENTS[2].id); // Default to Single Paradiddle
  
  // Speed Trainer Mode States
  const [speedTrainerActive, setSpeedTrainerActive] = useState(false);
  const [trainerTargetBpm, setTrainerTargetBpm] = useState(130);
  const [measuresElapsed, setMeasuresElapsed] = useState(0);
  const [lastMeasureIndex, setLastMeasureIndex] = useState(-1);

  const selectedRudiment = RUDIMENTS.find(r => r.id === selectedRudimentId) || RUDIMENTS[0];

  // Helper to sync Metronome to recommended state for the rudiment
  const syncSettings = () => {
    setDivision(selectedRudiment.division);
    if (selectedRudiment.difficulty === 'Beginner') {
      setBpm(80);
    } else if (selectedRudiment.difficulty === 'Intermediate') {
      setBpm(100);
    } else {
      setBpm(120);
    }
    setMeasuresElapsed(0);
  };

  // Speed Trainer monitoring
  useEffect(() => {
    if (!isPlaying) {
      setMeasuresElapsed(0);
      setLastMeasureIndex(-1);
      return;
    }

    // Triggered exactly at the start of a new measure (Beat 0, Sub 0)
    if (currentBeat === 0 && currentSubdivision === 0) {
      // Prevent multiple counts for the same frame
      if (lastMeasureIndex !== 0) {
        setLastMeasureIndex(0);
        setMeasuresElapsed(prev => {
          const next = prev + 1;
          
          // Every 4 measures, increase BPM if Speed Trainer is active
          if (speedTrainerActive && next % 4 === 0 && bpm < trainerTargetBpm) {
            const nextBpm = Math.min(trainerTargetBpm, bpm + 2);
            setBpm(nextBpm);
          }
          return next;
        });
      }
    } else {
      setLastMeasureIndex(-1);
    }
  }, [currentBeat, currentSubdivision, isPlaying, speedTrainerActive, bpm, trainerTargetBpm, setBpm]);

  // Map beat progress to position in hand-pattern sequence
  const getActiveStrokeIndex = () => {
    if (!isPlaying) return -1;
    // Calculate overall subdivisions from start of measure
    const totalSubdivisions = (currentBeat * division) + currentSubdivision;
    return totalSubdivisions % selectedRudiment.pattern.length;
  };

  const activeStrokeIdx = getActiveStrokeIndex();

  return (
    <div className="bg-[#0F0F11] p-6 rounded-3xl border border-slate-900/60 backdrop-blur-md space-y-6 w-full max-w-xl mx-auto shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-900 pb-4">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Section 02</span>
          <h2 className="font-sans text-lg font-bold text-slate-100 tracking-tight flex items-center gap-1.5 mt-0.5">
            <Sparkles className="h-4.5 w-4.5 text-emerald-400" /> Stick Training Engine
          </h2>
        </div>
        
        {/* Difficulty Selector badge */}
        <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
          selectedRudiment.difficulty === 'Beginner'
            ? 'bg-emerald-950/20 text-emerald-300 border border-emerald-900/30'
            : selectedRudiment.difficulty === 'Intermediate'
            ? 'bg-amber-950/20 text-amber-300 border border-amber-900/30'
            : 'bg-rose-950/20 text-rose-300 border border-rose-900/30'
        }`}>
          {selectedRudiment.difficulty}
        </span>
      </div>

      {/* Rudiment List Dropdown */}
      <div className="grid grid-cols-5 gap-2 items-center">
        <label htmlFor="rudiment-select" className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Practice Target:
        </label>
        <select
          id="rudiment-select"
          value={selectedRudimentId}
          onChange={(e) => {
            setSelectedRudimentId(e.target.value);
            setMeasuresElapsed(0);
          }}
          className="col-span-3 bg-slate-950 border border-slate-900 rounded-xl px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500/50 transition-colors cursor-pointer"
        >
          {RUDIMENTS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.category})
            </option>
          ))}
        </select>
      </div>

      {/* Detailed practice descriptions */}
      <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-900 space-y-3.5">
        <p className="text-xs text-slate-400 leading-relaxed italic">
          "{selectedRudiment.description}"
        </p>
        
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2.5 border-t border-slate-900">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 text-[11px]">Division:</span>
            <span className="font-mono text-emerald-400 font-extrabold text-[11px]">
              {selectedRudiment.division === 1 ? 'Quarter notes' : selectedRudiment.division === 2 ? 'Eighth notes' : selectedRudiment.division === 3 ? 'Triplets' : 'Sixteenth notes'}
            </span>
          </div>

          <button
            onClick={syncSettings}
            className="flex items-center gap-1 py-1 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400 text-[10px] font-bold uppercase tracking-wider cursor-pointer border border-emerald-500/20 active:scale-95 transition-all animate-none"
            title="Auto adjust metronome settings"
          >
            <RefreshCw className="h-3 w-3" /> Sync Tempo
          </button>
        </div>
      </div>

      {/* Interactive Play along hand patterns */}
      <div className="space-y-3">
        <span className="font-sans text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] block">
          Stick Pattern Sequence
        </span>
        
        {/* Scrollable / wrapped flex grid of strokes */}
        <div className="flex flex-wrap gap-2 justify-center py-2">
          {selectedRudiment.pattern.map((stroke, idx) => {
            const isActive = activeStrokeIdx === idx;
            const isLeft = stroke === 'L';

            return (
              <div
                key={`stroke-pad-${selectedRudiment.id}-${idx}`}
                className={`flex flex-col items-center justify-center h-14 w-12 rounded-xl transition-all duration-75 border ${
                  isActive
                    ? isLeft
                      ? 'bg-indigo-500 border-indigo-400 text-white scale-110 shadow-[0_0_15px_rgba(99,102,241,0.5)] font-black'
                      : 'bg-amber-500 border-amber-400 text-slate-950 scale-110 shadow-[0_0_15px_rgba(245,158,11,0.5)] font-black'
                    : isLeft
                    ? 'bg-slate-950/70 border-slate-900 text-indigo-400/80 hover:text-indigo-400 hover:border-indigo-950/40 transition-colors'
                    : 'bg-slate-950/70 border-slate-900 text-amber-500/80 hover:text-amber-500 hover:border-amber-950/40 transition-colors'
                }`}
              >
                <span className="text-lg font-sans font-black">{stroke}</span>
                <span className="text-[9px] font-mono opacity-80 mt-0.5">#{idx + 1}</span>
              </div>
            );
          })}
        </div>

        {/* Dynamic playing tip helper */}
        <div className="flex gap-4 items-center justify-center text-[10px] text-slate-500 pt-1">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Right Hand (R)
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-indigo-400" /> Left Hand (L)
          </div>
        </div>
      </div>

      {/* 4. Speed Trainer Module */}
      <div className="bg-slate-950/70 p-5 border border-slate-900 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className={`h-4 w-4 ${speedTrainerActive ? 'text-amber-500 animate-pulse' : 'text-slate-500'}`} />
            <span className="font-sans text-[11px] font-bold uppercase tracking-[0.25em] text-slate-300">Tempo Ramping Companion</span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={speedTrainerActive}
              onChange={() => setSpeedTrainerActive(prev => !prev)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-500 after:border-slate-400 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-slate-950"></div>
          </label>
        </div>

        {speedTrainerActive ? (
          <div className="space-y-3.5 antialiased">
            <p className="text-[11px] text-slate-400 leading-normal">
              Ramps up target tempo by <strong className="text-amber-400">+2 BPM every 4 full bars</strong> as you focus on hand muscle memory.
            </p>
            
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-[#141417]/60 p-2.5 rounded-xl border border-slate-900">
                <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">Elapsed</span>
                <span className="font-mono text-sm font-bold text-slate-200">{measuresElapsed} <span className="text-[10px] text-slate-500 font-bold">bars</span></span>
              </div>
              
              <div className="bg-[#141417]/60 p-2.5 rounded-xl border border-slate-900">
                <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">Target limit</span>
                <div className="flex items-center justify-center gap-1.5 mt-0.5">
                  <button
                    onClick={() => setTrainerTargetBpm(Math.max(bpm + 5, trainerTargetBpm - 5))}
                    className="text-slate-500 hover:text-slate-350 text-xs font-bold leading-none cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono text-xs font-bold text-amber-400">{trainerTargetBpm}</span>
                  <button
                    onClick={() => setTrainerTargetBpm(Math.min(240, trainerTargetBpm + 5))}
                    className="text-slate-500 hover:text-slate-350 text-xs font-bold leading-none cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="bg-[#141417]/60 p-2.5 rounded-xl border border-slate-900 flex flex-col justify-center">
                <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">Difficulty</span>
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mt-0.5">Active</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Activate the speed trainer to gradually auto-increment tempo over time. Perfect for training endurance, consistency, and building hand dexterity.
          </p>
        )}
      </div>
    </div>
  );
}
