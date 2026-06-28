import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileSliders as Sliders, CircleCheck as CheckCircle, RotateCcw, Info, Loader, ArrowRight } from 'lucide-react';
import { supabase, SESSION_ID } from '../lib/supabaseClient';
import type { RawMidiHit } from '../hooks/useMIDI';

const SAMPLES_PER_PHASE = 8;

interface MidiThresholdWizardProps {
  isOpen: boolean;
  onClose: () => void;
  latestRawHit: RawMidiHit | null;
  onThresholdSaved: (threshold: number) => void;
  currentThreshold?: number;
}

type WizardPhase = 'intro' | 'hihat' | 'snare' | 'result' | 'saving';

export function MidiThresholdWizard({ isOpen, onClose, latestRawHit, onThresholdSaved, currentThreshold }: MidiThresholdWizardProps) {
  const [phase, setPhase] = useState<WizardPhase>('intro');
  const [hihatVelocities, setHihatVelocities] = useState<number[]>([]);
  const [snareVelocities, setSnareVelocities] = useState<number[]>([]);
  const [computedThreshold, setComputedThreshold] = useState<number>(64);
  const [hihatMax, setHihatMax] = useState(0);
  const [snareMin, setSnareMin] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastHitFlash, setLastHitFlash] = useState(false);
  const lastProcessedHitRef = useRef<number>(0);

  const resetState = useCallback(() => {
    setPhase('intro');
    setHihatVelocities([]);
    setSnareVelocities([]);
    setComputedThreshold(64);
    setSaveError(null);
    setLastHitFlash(false);
    lastProcessedHitRef.current = 0;
  }, []);

  useEffect(() => {
    if (!isOpen) resetState();
  }, [isOpen, resetState]);

  // Respond to incoming MIDI hits during collection phases
  useEffect(() => {
    if (!latestRawHit) return;
    if (latestRawHit.performanceNowMs === lastProcessedHitRef.current) return;
    lastProcessedHitRef.current = latestRawHit.performanceNowMs;

    const vel = latestRawHit.velocity;
    setLastHitFlash(true);
    setTimeout(() => setLastHitFlash(false), 150);

    if (phase === 'hihat') {
      setHihatVelocities(prev => {
        const next = [...prev, vel];
        if (next.length >= SAMPLES_PER_PHASE) {
          setPhase('snare');
        }
        return next.slice(0, SAMPLES_PER_PHASE);
      });
    } else if (phase === 'snare') {
      setSnareVelocities(prev => {
        const next = [...prev, vel].slice(0, SAMPLES_PER_PHASE);
        if (next.length >= SAMPLES_PER_PHASE) {
          // All samples collected — compute threshold from current hihat and snare velocities
          setHihatVelocities(currentHH => {
            const hhMax = currentHH.length > 0 ? Math.max(...currentHH) : vel;
            const snMin = Math.min(...next);
            const threshold = Math.round((hhMax + snMin) / 2);
            setHihatMax(hhMax);
            setSnareMin(snMin);
            setComputedThreshold(Math.max(1, Math.min(127, threshold)));
            setPhase('result');
            return currentHH;
          });
        }
        return next;
      });
    }
  }, [latestRawHit, phase]);

  const handleSave = useCallback(async () => {
    setPhase('saving');
    setSaveError(null);
    try {
      const { error } = await supabase
        .from('midi_threshold_settings')
        .upsert({
          id: 'default',
          threshold_velocity: computedThreshold,
          hihat_max_velocity: hihatMax,
          snare_min_velocity: snareMin,
          calibrated_at: new Date().toISOString(),
          session_id: SESSION_ID,
        }, { onConflict: 'id' });

      if (error) throw error;
      onThresholdSaved(computedThreshold);
      onClose();
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save threshold.');
      setPhase('result');
    }
  }, [computedThreshold, hihatMax, snareMin, onThresholdSaved, onClose]);

  if (!isOpen) return null;

  const hihatProgress = hihatVelocities.length / SAMPLES_PER_PHASE;
  const snareProgress = snareVelocities.length / SAMPLES_PER_PHASE;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

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
              <div className="h-8 w-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                <Sliders className="h-4 w-4 text-sky-400" />
              </div>
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-slate-500">MIDI Velocity</p>
                <h3 className="font-sans text-sm font-bold text-slate-100">Hi-Hat / Snare Threshold</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-7 w-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="px-6 py-6 space-y-5">
            <AnimatePresence mode="wait">
              {/* INTRO */}
              {phase === 'intro' && (
                <motion.div key="intro" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                  <div className="bg-sky-950/20 border border-sky-900/30 rounded-2xl p-4">
                    <div className="flex items-start gap-2.5">
                      <Info className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        When hi-hat and snare share MIDI note numbers on your kit, velocity separation is used to distinguish them. This wizard collects {SAMPLES_PER_PHASE} hi-hat hits then {SAMPLES_PER_PHASE} snare hits to compute the optimal threshold.
                      </p>
                    </div>
                  </div>

                  {currentThreshold !== undefined && (
                    <div className="bg-slate-900/60 rounded-xl px-4 py-2.5 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-mono">Current threshold</span>
                      <span className="font-mono text-sm font-bold text-sky-400">v{currentThreshold}</span>
                    </div>
                  )}

                  <button
                    onClick={() => setPhase('hihat')}
                    className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-[0_4px_16px_rgba(14,165,233,0.2)] cursor-pointer"
                  >
                    Start Wizard <ArrowRight className="h-4 w-4" />
                  </button>
                </motion.div>
              )}

              {/* HIHAT PHASE */}
              {phase === 'hihat' && (
                <motion.div key="hihat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-mono text-sky-400 uppercase tracking-widest font-bold">Phase 1 of 2</p>
                    <h4 className="font-sans text-base font-bold text-slate-100">Strike your Hi-Hat</h4>
                    <p className="text-[11px] text-slate-500">Hit your hi-hat with typical playing force</p>
                  </div>

                  <div className="flex justify-center">
                    <motion.div
                      animate={{ scale: lastHitFlash ? 1.15 : 1, backgroundColor: lastHitFlash ? 'rgb(56,189,248)' : 'rgb(14,165,233,0.15)' }}
                      transition={{ duration: 0.1 }}
                      className="h-20 w-20 rounded-full border-2 border-sky-500/50 flex items-center justify-center"
                    >
                      <span className="font-mono text-2xl font-extrabold text-sky-400">{hihatVelocities.length}</span>
                    </motion.div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-sky-500 rounded-full"
                        animate={{ width: `${hihatProgress * 100}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-slate-600">
                      <span>{SAMPLES_PER_PHASE - hihatVelocities.length} hits remaining</span>
                      {hihatVelocities.length > 0 && (
                        <span>avg vel: {Math.round(hihatVelocities.reduce((s, v) => s + v, 0) / hihatVelocities.length)}</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SNARE PHASE */}
              {phase === 'snare' && (
                <motion.div key="snare" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold">Phase 2 of 2</p>
                    <h4 className="font-sans text-base font-bold text-slate-100">Strike your Snare</h4>
                    <p className="text-[11px] text-slate-500">Hit your snare with typical playing force</p>
                  </div>

                  <div className="flex justify-center">
                    <motion.div
                      animate={{ scale: lastHitFlash ? 1.15 : 1, backgroundColor: lastHitFlash ? 'rgb(245,158,11)' : 'rgb(245,158,11,0.1)' }}
                      transition={{ duration: 0.1 }}
                      className="h-20 w-20 rounded-full border-2 border-amber-500/50 flex items-center justify-center"
                    >
                      <span className="font-mono text-2xl font-extrabold text-amber-400">{snareVelocities.length}</span>
                    </motion.div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-amber-500 rounded-full"
                        animate={{ width: `${snareProgress * 100}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-slate-600">
                      <span>{SAMPLES_PER_PHASE - snareVelocities.length} hits remaining</span>
                      {snareVelocities.length > 0 && (
                        <span>avg vel: {Math.round(snareVelocities.reduce((s, v) => s + v, 0) / snareVelocities.length)}</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* RESULT */}
              {phase === 'result' && (
                <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
                  <div className="text-center space-y-3">
                    <div className="h-14 w-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto">
                      <CheckCircle className="h-7 w-7 text-sky-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Computed Threshold</p>
                      <p className="font-mono text-4xl font-extrabold text-sky-400">v{computedThreshold}</p>
                    </div>
                  </div>

                  {/* Velocity range visualization */}
                  <div className="bg-slate-950/60 rounded-2xl p-4 space-y-3 border border-slate-900">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-sky-400">Hi-Hat max: <strong>v{hihatMax}</strong></span>
                      <span className="text-amber-400">Snare min: <strong>v{snareMin}</strong></span>
                    </div>
                    <div className="relative h-4 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-sky-600 to-sky-500 rounded-full opacity-70"
                        style={{ width: `${(hihatMax / 127) * 100}%` }}
                      />
                      <div
                        className="absolute top-0 h-full w-0.5 bg-white z-10"
                        style={{ left: `${(computedThreshold / 127) * 100}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-slate-600 text-center">
                      Velocity below {computedThreshold} → Hi-Hat &nbsp;|&nbsp; At or above → Snare
                    </p>
                  </div>

                  {saveError && <p className="text-[10px] text-rose-400 text-center">{saveError}</p>}

                  <div className="flex gap-2">
                    <button
                      onClick={resetState}
                      className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 text-[11px] font-bold flex items-center justify-center gap-1.5 hover:border-slate-700 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Redo
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex-[2] py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Save Threshold
                    </button>
                  </div>
                </motion.div>
              )}

              {/* SAVING */}
              {phase === 'saving' && (
                <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-8 gap-3">
                  <Loader className="h-8 w-8 text-sky-400 animate-spin" />
                  <p className="text-[11px] text-slate-400">Saving threshold...</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export async function loadVelocityThreshold(): Promise<number | undefined> {
  try {
    const { data, error } = await supabase
      .from('midi_threshold_settings')
      .select('threshold_velocity')
      .eq('id', 'default')
      .maybeSingle();
    if (error || !data) return undefined;
    return data.threshold_velocity ?? undefined;
  } catch {
    return undefined;
  }
}
