import { useState, useRef } from 'react';
import { 
  Play, 
  Square, 
  Minus, 
  Plus, 
  Volume2, 
  VolumeX, 
  Disc, 
  Layers, 
  SlidersHorizontal,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { SoundType, BeatDivision } from '../types';

interface MetronomeControllerProps {
  isPlaying: boolean;
  bpm: number;
  beatsPerMeasure: number;
  division: BeatDivision;
  soundType: SoundType;
  volume: number;
  setBpm: (bpm: number) => void;
  setBeatsPerMeasure: (beats: number) => void;
  setDivision: (division: BeatDivision) => void;
  setSoundType: (type: SoundType) => void;
  setVolume: (vol: number) => void;
  togglePlayback: () => void;
}

export function MetronomeController({
  isPlaying,
  bpm,
  beatsPerMeasure,
  division,
  soundType,
  volume,
  setBpm,
  setBeatsPerMeasure,
  setDivision,
  setSoundType,
  setVolume,
  togglePlayback,
}: MetronomeControllerProps) {
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const isMuted = volume === 0;
  const prevVolumeRef = useRef(0.8);

  const handleTapTempo = () => {
    const now = Date.now();
    const cleanTaps = [...tapTimes, now].filter(t => now - t < 2500); // Filter out old inactive taps (2.5s)
    const newTaps = cleanTaps.slice(-6); // Store up to last 6 taps
    setTapTimes(newTaps);

    if (newTaps.length >= 2) {
      const deltas = [];
      for (let i = 1; i < newTaps.length; i++) {
        deltas.push(newTaps[i] - newTaps[i - 1]);
      }
      const averageInterval = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;
      const detectedBpm = Math.round(60000 / averageInterval);
      if (detectedBpm >= 40 && detectedBpm <= 240) {
        setBpm(detectedBpm);
      }
    }
  };

  const handleMuteToggle = () => {
    if (isMuted) {
      setVolume(prevVolumeRef.current || 0.8);
    } else {
      prevVolumeRef.current = volume;
      setVolume(0);
    }
  };

  const incrementBpm = (val: number) => {
    setBpm(bpm + val);
  };

  const decrementBpm = (val: number) => {
    setBpm(bpm - val);
  };

  return (
    <div className="bg-[#0F0F11] p-6 rounded-3xl border border-slate-900 backdrop-blur-md space-y-6 w-full max-w-xl mx-auto shadow-2xl">
      
      {/* 1. Play Trigger and Tap Tempo */}
      <div className="grid grid-cols-3 gap-3 items-center">
        {/* Tap Tempo Button */}
        <button
          onClick={handleTapTempo}
          className="flex flex-col items-center justify-center p-3 h-16 rounded-2xl bg-[#141417] hover:bg-[#1C1C21] active:bg-black border border-slate-900 text-slate-300 font-sans cursor-pointer transition-all active:scale-95"
        >
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-emerald-400">Tap</span>
          <span className="font-mono text-xs font-semibold mt-1">Tempo</span>
        </button>

        {/* Master Play Button with Premium Accent styles */}
        <button
          id="btn-play-metronome"
          onClick={togglePlayback}
          className={`flex items-center justify-center h-20 rounded-2xl cursor-pointer font-bold uppercase tracking-widest transition-all active:scale-95 flex-col shadow-xl ${
            isPlaying
              ? 'bg-rose-500 hover:bg-rose-450 text-slate-950 shadow-rose-500/10'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/15'
          }`}
        >
          {isPlaying ? (
            <div className="flex flex-col items-center">
              <Square className="h-5 w-5" fill="currentColor" />
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] mt-1.5">Stop</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Play className="h-5 w-5 fill-current pr-0.5" />
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] mt-1.5">Start</span>
            </div>
          )}
        </button>

        {/* Beats Per Measure */}
        <div className="flex flex-col items-center justify-center p-3 h-16 rounded-2xl bg-[#141417] border border-slate-900 text-slate-300">
          <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-sky-400">Signature</span>
          <div className="flex items-center gap-1.5 mt-1">
            <button
              onClick={() => beatsPerMeasure > 1 && setBeatsPerMeasure(beatsPerMeasure - 1)}
              className="p-1 h-5 w-5 rounded bg-[#1C1C21] hover:bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs"
            >
              -
            </button>
            <span className="font-mono font-bold text-xs text-slate-100">{beatsPerMeasure}/4</span>
            <button
              onClick={() => beatsPerMeasure < 12 && setBeatsPerMeasure(beatsPerMeasure + 1)}
              className="p-1 h-5 w-5 rounded bg-[#1C1C21] hover:bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* 2. BPM Slider Container */}
      <div className="space-y-3.5 bg-slate-950/70 p-5 rounded-2xl border border-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-sans text-xs font-semibold text-slate-400 uppercase tracking-[0.2em]">Tempo Adjustment</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-4xl font-bold tracking-tighter text-white">{bpm}</span>
            <span className="font-mono text-xs text-slate-500 font-bold uppercase tracking-wider">Bpm</span>
          </div>
        </div>

        {/* Interactive Slider */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => decrementBpm(1)}
            className="p-2 rounded-xl bg-[#141417] hover:bg-[#1C1C21] text-slate-300 active:scale-90 transition-all border border-slate-900"
            title="Decrease 1 BPM"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>

          <input
            type="range"
            min="60"
            max="180"
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value))}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-500 bg-[#1C1C21] hover:accent-emerald-400 focus:outline-none transition-colors"
          />

          <button
            onClick={() => incrementBpm(1)}
            className="p-2 rounded-xl bg-[#141417] hover:bg-[#1C1C21] text-slate-300 active:scale-90 transition-all border border-slate-900"
            title="Increase 1 BPM"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Fast Jump Actions */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {[-5, -10, 5, 10].map((step) => (
            <button
              key={`jump-${step}`}
              onClick={() => step > 0 ? incrementBpm(step) : decrementBpm(Math.abs(step))}
              className="text-[10px] font-mono py-1 rounded-lg bg-slate-950 border border-slate-900 text-slate-500 hover:bg-[#141417] hover:text-slate-300 transition-colors"
            >
              {step > 0 ? `+${step}` : step}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Subdivisions Selection & Sounds */}
      <div className="grid grid-cols-2 gap-4">
        {/* Subdivisions Selector */}
        <div className="space-y-2">
          <span className="font-sans text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] block flex items-center gap-1.5">
            <Layers className="h-3 w-3 text-sky-400" /> Subdivision
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: 'Quarter', val: 1 },
              { label: '8ths', val: 2 },
              { label: 'Triplets', val: 3 },
              { label: '16ths', val: 4 },
            ].map((div) => (
              <button
                key={`division-${div.val}`}
                onClick={() => setDivision(div.val as BeatDivision)}
                className={`py-2.5 px-1 rounded-xl text-center font-sans text-[11px] font-bold transition-all border ${
                  division === div.val
                    ? 'bg-sky-505/10 border-sky-500/50 text-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.1)]'
                    : 'bg-[#141417]/40 hover:bg-[#1C1C21] border-slate-900 text-slate-400'
                }`}
              >
                {div.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sound Selection Grid */}
        <div className="space-y-2">
          <span className="font-sans text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] block flex items-center gap-1.5">
            <Disc className="h-3 w-3 text-purple-400" /> Sound Set
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: 'Synth Click', type: 'synth' },
              { label: 'Woodblock', type: 'woodblock' },
              { label: 'Sidestick', type: 'sidestick' },
              { label: 'Cowbell', type: 'cowbell' },
            ].map((snd) => (
              <button
                key={`sound-set-${snd.type}`}
                onClick={() => setSoundType(snd.type as SoundType)}
                className={`py-2.5 px-1 rounded-xl text-center font-sans text-[11px] font-bold transition-all border ${
                  soundType === snd.type
                    ? 'bg-purple-500/10 border-purple-500/50 text-purple-300 shadow-[0_0_8px_rgba(192,132,252,0.1)]'
                    : 'bg-[#141417]/40 hover:bg-[#1C1C21] border-slate-900 text-slate-400'
                }`}
              >
                {snd.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Volume Bar controls */}
      <div className="flex items-center gap-4 bg-slate-950/40 p-3.5 rounded-2xl border border-slate-900">
        <button
          onClick={handleMuteToggle}
          className="p-1.5 rounded-lg bg-[#141417] hover:bg-[#1C1C21] text-slate-300 transition-colors border border-slate-900"
        >
          {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-slate-400" />}
        </button>
        <div className="flex-1 flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full h-1 bg-[#141417] accent-sky-400 rounded-lg cursor-pointer"
          />
          <span className="text-[10px] font-mono text-slate-500 w-8 text-right font-semibold">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>

    </div>
  );
}
