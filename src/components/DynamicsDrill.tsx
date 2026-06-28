import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Zap, ShieldCheck, Award, Info, Sparkles, Volume2, Shield } from 'lucide-react';

interface DynamicsDrillProps {
  externalVisualTrigger?: { instrument: 'kick' | 'snare' | 'hihat'; timestamp: number; velocity?: number } | null;
}

export function DynamicsDrill({ externalVisualTrigger }: DynamicsDrillProps) {
  // Target Drills:
  // - 'ghost': Target is Ghost Notes (10-40)
  // - 'accent': Target is Accents (90-127)
  // - 'alternate': Target alternates between Accent and Ghost each hit
  const [selectedDrill, setSelectedDrill] = useState<'ghost' | 'accent' | 'alternate'>('accent');
  
  // Track history of last 10 notes for success percentage
  const [drillHistory, setDrillHistory] = useState<{ id: string; velocity: number; success: boolean; targetRange: string }[]>([]);
  const [lastVelocity, setLastVelocity] = useState<number | null>(null);
  const [lastHitHand, setLastHitHand] = useState<'Left' | 'Right' | null>(null);

  // Left vs Right hand velocity tracking (S, D, F are left; J, K, V are right)
  const [leftHandHits, setLeftHandHits] = useState<number[]>([]);
  const [rightHandHits, setRightHandHits] = useState<number[]>([]);

  // Keep track of expected hand alternation for the drill
  const [nextExpectedDrillType, setNextExpectedDrillType] = useState<'accent' | 'ghost'>('accent');

  // Compute active range
  const currentTargetRange = useMemo(() => {
    if (selectedDrill === 'ghost') return { min: 10, max: 40, label: 'Ghost Notes Only' };
    if (selectedDrill === 'accent') return { min: 90, max: 127, label: 'Accents Only' };
    
    // For 'alternate', use the state-tracked next expected note
    if (nextExpectedDrillType === 'ghost') return { min: 10, max: 40, label: 'Alternating: Ghost' };
    return { min: 90, max: 127, label: 'Alternating: Accent' };
  }, [selectedDrill, nextExpectedDrillType]);

  // Handle checking of a velocity trigger
  const processVelocityTrigger = (velocity: number, hand: 'Left' | 'Right') => {
    const min = currentTargetRange.min;
    const max = currentTargetRange.max;
    const isSuccess = velocity >= min && velocity <= max;

    // Record last details
    setLastVelocity(velocity);
    setLastHitHand(hand);

    // Save in history
    setDrillHistory(prev => [
      { 
        id: Math.random().toString(), 
        velocity, 
        success: isSuccess, 
        targetRange: `${min}-${max}` 
      },
      ...prev.slice(0, 9)
    ]);

    // Handle Left/Right Hand balance histories
    if (hand === 'Left') {
      setLeftHandHits(prev => [velocity, ...prev.slice(0, 19)]);
    } else {
      setRightHandHits(prev => [velocity, ...prev.slice(0, 19)]);
    }

    // Toggle alternation expected targets if in alternating mode
    if (selectedDrill === 'alternate') {
      setNextExpectedDrillType(prev => prev === 'accent' ? 'ghost' : 'accent');
    }
  };

  // Listen to keyboard press events locally inside this drill block
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
      let emulatedVelocity = 80; // Standard

      // Dynamic Modifier emulation:
      // - Shift held: Accent (115)
      // - Ctrl/Alt/Meta held: Ghost note (25)
      if (e.shiftKey) {
        emulatedVelocity = 115;
      } else if (e.ctrlKey || e.altKey || e.metaKey) {
        emulatedVelocity = 25;
      } else {
        // Subtle randomization so standard hits have slight realistic variation
        emulatedVelocity = 70 + Math.floor(Math.random() * 20);
      }

      // Check left keys (Space, F, S, D) vs right keys (J, K, V)
      let hand: 'Left' | 'Right' | null = null;
      if (code === 'KeyS' || code === 'KeyD' || code === 'KeyF' || code === 'Space') {
        hand = 'Left';
      } else if (code === 'KeyJ' || code === 'KeyK' || code === 'KeyV') {
        hand = 'Right';
      }

      if (hand) {
        processVelocityTrigger(emulatedVelocity, hand);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentTargetRange, selectedDrill]);

  // Listen to external MIDI triggers with velocities passed
  const lastMidiTimestampRef = useRef<number>(0);
  useEffect(() => {
    if (!externalVisualTrigger) return;
    if (externalVisualTrigger.timestamp === lastMidiTimestampRef.current) return;
    lastMidiTimestampRef.current = externalVisualTrigger.timestamp;

    // Extract velocity. If none passed, emulate realistic
    const rawVelocity = externalVisualTrigger.velocity !== undefined 
      ? externalVisualTrigger.velocity 
      : (80 + Math.floor(Math.random() * 20));

    // Simple physical mapping: map kick and snare to left, hihat to right, or alternate
    const hand = externalVisualTrigger.instrument === 'hihat' ? 'Right' : 'Left';
    processVelocityTrigger(rawVelocity, hand);

  }, [externalVisualTrigger]);

  // Compute stats
  const scoreStats = useMemo(() => {
    if (drillHistory.length === 0) return { percent: 0, count: 0, total: 0 };
    const successCount = drillHistory.filter(h => h.success).length;
    return {
      percent: Math.round((successCount / drillHistory.length) * 100),
      count: successCount,
      total: drillHistory.length
    };
  }, [drillHistory]);

  // Compute single-stroke roll velocity balance (Left vs Right average)
  const balanceMetric = useMemo(() => {
    const leftAvg = leftHandHits.length > 0 
      ? leftHandHits.reduce((a, b) => a + b, 0) / leftHandHits.length 
      : 80;
    const rightAvg = rightHandHits.length > 0 
      ? rightHandHits.reduce((a, b) => a + b, 0) / rightHandHits.length 
      : 80;

    const totalAvg = leftAvg + rightAvg;
    const leftPercent = totalAvg > 0 ? (leftAvg / totalAvg) * 100 : 50;
    const rightPercent = totalAvg > 0 ? (rightAvg / totalAvg) * 100 : 50;

    return {
      leftAvg: Math.round(leftAvg),
      rightAvg: Math.round(rightAvg),
      leftPercent: Math.round(leftPercent),
      rightPercent: Math.round(rightPercent),
      isImbalanced: Math.abs(leftPercent - 50) > 6
    };
  }, [leftHandHits, rightHandHits]);

  const resetDrillCounters = () => {
    setDrillHistory([]);
    setLastVelocity(null);
    setLeftHandHits([]);
    setRightHandHits([]);
  };

  return (
    <div className="bg-[#0F0F11] p-6 rounded-3xl border border-slate-900 shadow-2xl space-y-6 relative overflow-hidden w-full max-w-xl mx-auto">
      
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Velocity Drills</span>
          <h2 className="font-sans text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2 mt-0.5">
            <Sparkles className="h-4.5 w-4.5 text-emerald-450" />
            Dynamics & Velocity Heatmap
          </h2>
        </div>
        <button
          onClick={resetDrillCounters}
          className="text-[9px] font-mono text-slate-550 hover:text-slate-400 uppercase tracking-widest font-extrabold cursor-pointer"
        >
          Reset Drill
        </button>
      </div>

      {/* Selector of current practice target */}
      <div className="space-y-2">
        <span className="font-sans text-[10px] font-bold text-slate-550 uppercase tracking-[0.2em] block">
          Select Active Target Zone
        </span>
        <div className="grid grid-cols-3 gap-2">
          
          <button
            onClick={() => { setSelectedDrill('ghost'); resetDrillCounters(); }}
            className={`py-2 px-2.5 rounded-xl border transition-all text-center flex flex-col justify-center h-16 cursor-pointer ${
              selectedDrill === 'ghost'
                ? 'bg-sky-500/10 border-sky-500/40 text-sky-300 shadow-lg'
                : 'bg-slate-950/60 hover:bg-[#141417] border-slate-900 text-slate-500'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wide block">Ghost Notes</span>
            <span className="text-[9px] font-mono text-slate-500 mt-1 block">Velocity 10 - 40</span>
          </button>

          <button
            onClick={() => { setSelectedDrill('accent'); resetDrillCounters(); }}
            className={`py-2 px-2.5 rounded-xl border transition-all text-center flex flex-col justify-center h-16 cursor-pointer ${
              selectedDrill === 'accent'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-lg'
                : 'bg-slate-950/60 hover:bg-[#141417] border-slate-900 text-slate-500'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wide block">Accents Only</span>
            <span className="text-[9px] font-mono text-slate-500 mt-1 block">Velocity 90 - 127</span>
          </button>

          <button
            onClick={() => { setSelectedDrill('alternate'); resetDrillCounters(); }}
            className={`py-2 px-2.5 rounded-xl border transition-all text-center flex flex-col justify-center h-16 cursor-pointer ${
              selectedDrill === 'alternate'
                ? 'bg-purple-500/10 border-purple-500/40 text-purple-300 shadow-lg'
                : 'bg-slate-950/60 hover:bg-[#141417] border-slate-900 text-slate-500'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wide block">Alternating</span>
            <span className="text-[9px] font-mono text-slate-500 mt-1 block">Accent &harr; Ghost</span>
          </button>

        </div>
      </div>

      {/* Target Velocity Zones Track visualizer */}
      <div className="bg-[#070709] rounded-2xl p-4 border border-slate-900 space-y-4">
        
        {/* Horizontal bar representing 0 to 127 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[9px] font-mono font-extrabold text-slate-550 uppercase tracking-wide">
            <span>Target Zone: {currentTargetRange.label}</span>
            <span>MIDI Vel Range: {currentTargetRange.min} - {currentTargetRange.max}</span>
          </div>

          <div className="relative h-7 bg-slate-950 rounded-xl border border-slate-900 flex items-center overflow-hidden">
            {/* Soft scale lines on background */}
            <div className="absolute left-[30%] w-[1px] h-full bg-slate-900/45 pointer-events-none" />
            <div className="absolute left-[50%] w-[1px] h-full bg-slate-900/45 pointer-events-none" />
            <div className="absolute left-[70%] w-[1px] h-full bg-slate-900/45 pointer-events-none" />

            {/* Target highlight overlay box */}
            <div 
              className="absolute h-full bg-emerald-500/10 border-x border-emerald-500/25 pointer-events-none transition-all duration-300"
              style={{
                left: `${(currentTargetRange.min / 127) * 100}%`,
                width: `${((currentTargetRange.max - currentTargetRange.min) / 127) * 100}%`
              }}
            />

            {/* Scale numbers */}
            <span className="absolute left-1 bottom-0 text-[7px] font-mono text-slate-700">0 (Silence)</span>
            <span className="absolute right-1 bottom-0 text-[7px] font-mono text-slate-700">127 (Max Slam)</span>

            {/* Floating indicator needle for latest user strike */}
            {lastVelocity !== null && (
              <motion.div
                key={lastVelocity}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 15 }}
                className="absolute top-0 bottom-0 w-1 flex flex-col items-center z-15 pointer-events-none -translate-x-1/2"
                style={{ left: `${(lastVelocity / 127) * 100}%` }}
              >
                {/* Glowing top point */}
                <div className={`w-3 h-3 rounded-full border border-white -mt-0.5 ${
                  lastVelocity >= currentTargetRange.min && lastVelocity <= currentTargetRange.max
                    ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                    : 'bg-rose-500 shadow-[0_0_8px_#ef4444]'
                }`} />
                {/* Vertical stem line */}
                <div className="w-[1.5px] flex-1 bg-white/70" />
              </motion.div>
            )}
          </div>
        </div>

        {/* Real-time Dynamic text readouts */}
        <div className="flex items-center justify-between min-h-6 border-t border-slate-900/60 pt-3">
          {lastVelocity === null ? (
            <span className="text-[10px] text-slate-500 italic flex items-center gap-1">
              <Info className="h-3.5 w-3.5" /> Hold <strong>Shift</strong> for Accents, <strong>Ctrl/Alt</strong> for Ghosts. Strike keys now.
            </span>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-sans font-bold flex items-center gap-1.5">
                Last Hit: 
                <span className={
                  lastVelocity >= currentTargetRange.min && lastVelocity <= currentTargetRange.max
                    ? 'text-emerald-400 font-extrabold'
                    : 'text-rose-400 font-extrabold'
                }>
                  {lastVelocity >= currentTargetRange.min && lastVelocity <= currentTargetRange.max
                    ? '🎯 PERFECT DYNAMIC!'
                    : lastVelocity < currentTargetRange.min
                    ? '⚠️ TOO SOFT (GHOST FAILURE)'
                    : '⚠️ TOO LOUD (ACCENT FAILURE)'}
                </span>
              </span>

              <div className="flex items-center gap-3 font-mono text-[10px] text-slate-450">
                <span>Hand: <strong className="text-slate-300">{lastHitHand}</strong></span>
                <span>Velocity: <strong className="text-slate-200">{lastVelocity}</strong></span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Left/Right Hand Roll Balance Monitor */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-sans text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Volume2 className="h-4 w-4 text-emerald-450" /> Single-Stroke Roll Balance (L vs R)
          </span>
          {balanceMetric.isImbalanced ? (
            <span className="text-[8px] uppercase font-bold text-rose-450 bg-rose-950/15 border border-rose-900/40 px-2 py-0.5 rounded-lg animate-pulse">
              Volume Imbalance Detected
            </span>
          ) : (
            <span className="text-[8px] uppercase font-bold text-emerald-450 bg-emerald-950/15 border border-emerald-900/40 px-2 py-0.5 rounded-lg flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Symmetrical
            </span>
          )}
        </div>

        <p className="text-[10px] text-slate-500 leading-relaxed">
          Ensure left-hand hits (Space/F/S/D) and right-hand hits (J/K/V) are identical in volume. Uneven roll dynamics sound choppy and unpolished.
        </p>

        <div className="space-y-2">
          {/* Symmetrical slider balance gauge */}
          <div className="relative h-4 bg-[#08080A] rounded-lg border border-slate-900 overflow-hidden flex items-center justify-between">
            {/* Symmetrical target box centered */}
            <div className="absolute left-[42%] right-[42%] top-0 bottom-0 bg-emerald-500/10 border-x border-emerald-500/10 pointer-events-none" />
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[1px] bg-slate-800 pointer-events-none" />

            {/* Symmetrical active pointer marker */}
            <motion.div 
              className="absolute h-full w-2 bg-indigo-500 rounded border border-white/20 shadow z-10 pointer-events-none"
              style={{ left: `calc(${balanceMetric.leftPercent}% - 4px)` }}
              animate={{ left: `calc(${balanceMetric.leftPercent}% - 4px)` }}
              transition={{ type: "spring", stiffness: 180, damping: 20 }}
            />

            <span className="text-[8px] font-mono text-slate-650 font-bold ml-2 relative z-5">LEFT ({balanceMetric.leftPercent}%)</span>
            <span className="text-[8px] font-mono text-slate-650 font-bold mr-2 relative z-5">RIGHT ({balanceMetric.rightPercent}%)</span>
          </div>

          <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
            <span>Left Avg Velocity: <strong className="text-slate-350">{balanceMetric.leftAvg}</strong></span>
            <span>Right Avg Velocity: <strong className="text-slate-350">{balanceMetric.rightAvg}</strong></span>
          </div>
        </div>
      </div>

      {/* Drill Score Banner */}
      {drillHistory.length > 0 && (
        <div className="bg-[#070709] rounded-2xl p-3 border border-slate-900 flex justify-between items-center">
          <div>
            <span className="text-[8px] uppercase tracking-wider font-bold text-slate-550 block">Drill Accuracy Rate</span>
            <p className="text-sm font-extrabold font-sans text-slate-200 mt-0.5">
              {scoreStats.percent}% success rate
            </p>
          </div>
          <div className="text-right">
            <span className="text-[8px] uppercase tracking-wider font-bold text-slate-550 block">Target Hits</span>
            <p className="text-xs font-bold text-slate-350 mt-0.5">
              {scoreStats.count} / {scoreStats.total} inside zone
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
