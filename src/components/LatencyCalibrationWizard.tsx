import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Radio, CircleCheck as CheckCircle, RotateCcw, Zap, Clock, Info, Loader } from 'lucide-react';
import { supabase, SESSION_ID } from '../lib/supabaseClient';

const TAP_TARGET = 10;

interface LatencyCalibrationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  engineRef: React.RefObject<{ getAudioContextTime: () => number; getBaseLatencyMs: () => number; latencyOffsetMs: number } | null>;
  onCalibrationSaved: (offsetMs: number) => void;
  currentOffsetMs: number;
}

type WizardPhase = 'intro' | 'tapping' | 'result' | 'saving';

export function LatencyCalibrationWizard({ isOpen, onClose, engineRef, onCalibrationSaved, currentOffsetMs }: LatencyCalibrationWizardProps) {
  const [phase, setPhase] = useState<WizardPhase>('intro');
  const [tapCount, setTapCount] = useState(0);
  const [computedOffset, setComputedOffset] = useState<number>(0);
  const [tapFlash, setTapFlash] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Beat pulse state for visual guide
  const [beatPulse, setBeatPulse] = useState(false);

  // Store the scheduled beat times (AudioContext seconds) and the performance.now at each beat
  const beatScheduleRef = useRef<{ audioTime: number; perfNow: number }[]>([]);
  const tapOffsetsRef = useRef<number[]>([]);
  const beatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const beatBpmRef = useRef(80);
  const lastBeatPerfNowRef = useRef<number>(0);

  const resetState = useCallback(() => {
    setPhase('intro');
    setTapCount(0);
    setComputedOffset(0);
    setTapFlash(false);
    setSaveError(null);
    tapOffsetsRef.current = [];
    beatScheduleRef.current = [];
    if (beatIntervalRef.current) {
      clearInterval(beatIntervalRef.current);
      beatIntervalRef.current = null;
    }
  }, []);

  // Clean up on close
  useEffect(() => {
    if (!isOpen) resetState();
  }, [isOpen, resetState]);

  const startTapping = useCallback(() => {
    setPhase('tapping');
    setTapCount(0);
    tapOffsetsRef.current = [];
    lastBeatPerfNowRef.current = performance.now();

    const beatIntervalMs = (60 / beatBpmRef.current) * 1000;

    // Emit a beat every quarter note, record performance.now at each scheduled tick
    beatIntervalRef.current = setInterval(() => {
      lastBeatPerfNowRef.current = performance.now();
      setBeatPulse(p => !p);
    }, beatIntervalMs);
  }, []);

  const handleTap = useCallback(() => {
    if (phase !== 'tapping') return;

    const tapNow = performance.now();
    const beatIntervalMs = (60 / beatBpmRef.current) * 1000;
    const elapsed = tapNow - lastBeatPerfNowRef.current;

    // Signed offset: positive = late (tapped after beat), negative = early
    let offset: number;
    if (elapsed <= beatIntervalMs / 2) {
      offset = elapsed; // late
    } else {
      offset = -(beatIntervalMs - elapsed); // early
    }

    tapOffsetsRef.current = [...tapOffsetsRef.current, offset];
    setTapCount(prev => {
      const next = prev + 1;
      setTapFlash(true);
      setTimeout(() => setTapFlash(false), 120);

      if (next >= TAP_TARGET) {
        // Compute trimmed mean (drop highest and lowest offset)
        const sorted = [...tapOffsetsRef.current].sort((a, b) => a - b);
        const trimmed = sorted.slice(1, sorted.length - 1);
        const avg = trimmed.reduce((s, v) => s + v, 0) / trimmed.length;
        setComputedOffset(Math.round(avg));

        if (beatIntervalRef.current) {
          clearInterval(beatIntervalRef.current);
          beatIntervalRef.current = null;
        }
        setPhase('result');
      }

      return next;
    });
  }, [phase]);

  const handleSave = useCallback(async () => {
    setPhase('saving');
    setSaveError(null);
    try {
      const { error } = await supabase
        .from('latency_settings')
        .upsert({
          id: 'default',
          offset_ms: computedOffset,
          tap_count: TAP_TARGET,
          calibrated_at: new Date().toISOString(),
          session_id: SESSION_ID,
        }, { onConflict: 'id' });

      if (error) throw error;
      onCalibrationSaved(computedOffset);
      onClose();
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save calibration.');
      setPhase('result');
    }
  }, [computedOffset, onCalibrationSaved, onClose]);

  // Keyboard shortcut: Space taps during calibration
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && phase === 'tapping') {
        e.preventDefault();
        handleTap();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, phase, handleTap]);

  if (!isOpen) return null;

  const progress = Math.min(tapCount / TAP_TARGET, 1);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          className="relative z-10 bg-[#0F0F11] border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          initial={{ scale: 0.94, y: 16 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.94, y: 16 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-900">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Clock className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-slate-500">Hardware Timing</p>
                <h3 className="font-sans text-sm font-bold text-slate-100">Latency Calibration</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-7 w-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Phase content */}
          <div className="px-6 py-6 space-y-5">
            <AnimatePresence mode="wait">
              {/* INTRO */}
              {phase === 'intro' && (
                <motion.div
                  key="intro"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-4"
                >
                  <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-2xl p-4 space-y-2">
                    <div className="flex items-start gap-2.5">
                      <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        This wizard measures the delay between your drum hardware and the browser audio clock. A flashing pulse will play at 80 BPM. Tap Space or the button below in sync with the beat for {TAP_TARGET} taps.
                      </p>
                    </div>
                  </div>

                  {currentOffsetMs !== 0 && (
                    <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl px-4 py-3 flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span className="text-[10px] text-amber-300 font-mono font-bold">
                        Current offset: {currentOffsetMs > 0 ? '+' : ''}{currentOffsetMs} ms
                      </span>
                    </div>
                  )}

                  <button
                    onClick={startTapping}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-[0_4px_16px_rgba(16,185,129,0.2)] cursor-pointer"
                  >
                    <Radio className="h-4 w-4" /> Start Calibration
                  </button>
                </motion.div>
              )}

              {/* TAPPING */}
              {phase === 'tapping' && (
                <motion.div
                  key="tapping"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-5"
                >
                  <div className="text-center space-y-2">
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                      Tap in sync with the pulse
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono text-3xl font-extrabold text-slate-100">{tapCount}</span>
                      <span className="font-mono text-lg text-slate-600">/ {TAP_TARGET}</span>
                    </div>
                  </div>

                  {/* Animated beat pulse */}
                  <div className="flex items-center justify-center py-2">
                    <motion.div
                      animate={{ scale: beatPulse ? 1.25 : 1, opacity: beatPulse ? 1 : 0.35 }}
                      transition={{ duration: 0.08 }}
                      className="h-16 w-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center"
                    >
                      <div className={`h-6 w-6 rounded-full transition-colors ${beatPulse ? 'bg-emerald-400' : 'bg-emerald-900'}`} />
                    </motion.div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-emerald-500 rounded-full"
                        animate={{ width: `${progress * 100}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                    <p className="text-[9px] font-mono text-slate-600 text-center">
                      {TAP_TARGET - tapCount} taps remaining
                    </p>
                  </div>

                  <button
                    onClick={handleTap}
                    className={`w-full py-4 rounded-2xl text-sm font-bold uppercase tracking-wider transition-all cursor-pointer select-none border-2 ${
                      tapFlash
                        ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                        : 'bg-[#141417] border-slate-800 text-slate-300 hover:border-emerald-800 hover:bg-emerald-950/20'
                    }`}
                  >
                    TAP BEAT
                    <span className="ml-2 text-[10px] font-mono text-slate-500">(Space)</span>
                  </button>
                </motion.div>
              )}

              {/* RESULT */}
              {phase === 'result' && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-5"
                >
                  <div className="text-center space-y-3">
                    <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                      <CheckCircle className="h-7 w-7 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Measured Offset</p>
                      <p className={`font-mono text-4xl font-extrabold ${
                        Math.abs(computedOffset) <= 15 ? 'text-emerald-400' :
                        Math.abs(computedOffset) <= 40 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {computedOffset > 0 ? '+' : ''}{computedOffset} ms
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                      {computedOffset > 5
                        ? 'You tend to hit slightly late. This offset will be subtracted from your timing measurements to correct for hardware delay.'
                        : computedOffset < -5
                        ? 'You tend to hit slightly early. This offset will compensate for your hardware response time.'
                        : 'Excellent — your timing is very close to the audio clock. Minimal compensation needed.'}
                    </p>
                  </div>

                  {saveError && (
                    <p className="text-[10px] text-rose-400 text-center">{saveError}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={resetState}
                      className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 text-[11px] font-bold flex items-center justify-center gap-1.5 hover:border-slate-700 hover:text-slate-300 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Redo
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex-[2] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Save Calibration
                    </button>
                  </div>
                </motion.div>
              )}

              {/* SAVING */}
              {phase === 'saving' && (
                <motion.div
                  key="saving"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center py-8 gap-3"
                >
                  <Loader className="h-8 w-8 text-emerald-400 animate-spin" />
                  <p className="text-[11px] text-slate-400">Saving calibration...</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export async function loadLatencyOffset(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('latency_settings')
      .select('offset_ms')
      .eq('id', 'default')
      .maybeSingle();
    if (error || !data) return 0;
    return data.offset_ms ?? 0;
  } catch {
    return 0;
  }
}
