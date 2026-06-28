import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Shield, Disc, Music4, Upload, Check, Trash2, Info } from 'lucide-react';

export function AudioStemPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [backingVolume, setBackingVolume] = useState(0.8);
  const [drumVolume, setDrumVolume] = useState(0.6);
  const [isDrumMuted, setIsDrumMuted] = useState(false);
  
  // Custom uploaded file state
  const [backingFile, setBackingFile] = useState<File | null>(null);
  const [drumFile, setDrumFile] = useState<File | null>(null);
  const [isCustomLoaded, setIsCustomLoaded] = useState(false);

  // Web Audio Nodes refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const backingSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const drumSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const backingGainRef = useRef<GainNode | null>(null);
  const drumGainRef = useRef<GainNode | null>(null);
  const playStartTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  // Buffer state for custom uploaded tracks
  const backingBufferRef = useRef<AudioBuffer | null>(null);
  const drumBufferRef = useRef<AudioBuffer | null>(null);

  // Procedural audio generation state
  const proceduralIntervalRef = useRef<any>(null);
  const proceduralStepRef = useRef<number>(0);

  // Clean up Web Audio refs on unmount
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

  // Initialize Audio Context lazily
  const initAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  // Helper: Create noise buffer for snare and hi-hat synthesis
  const createNoiseBuffer = (ctx: AudioContext) => {
    const bufferSize = ctx.sampleRate * 2; // 2 seconds
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  };

  // Helper: Synthesize backing melody & bass note procedurally
  const playProceduralBackingNote = (ctx: AudioContext, time: number, step: number) => {
    if (!backingGainRef.current) return;

    // Progression: C major (0), G major (1), A minor (2), F major (3)
    const chordIndex = Math.floor(step / 16) % 4;
    const chordRoots = [130.81, 98.00, 110.00, 87.31]; // C3, G2, A2, F2 frequencies
    const chordPads = [
      [261.63, 329.63, 392.00], // C4, E4, G4
      [293.66, 392.00, 493.88], // D4, G4, B4
      [220.00, 261.63, 329.63], // A3, C4, E4
      [261.63, 349.23, 440.00], // C4, F4, A4
    ];

    // Play bass note on steps 0, 4, 8, 12 of chord
    const innerStep = step % 4;
    if (innerStep === 0 || innerStep === 2) {
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(chordRoots[chordIndex], time);
      
      bassGain.gain.setValueAtTime(0.12 * backingVolume, time);
      bassGain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
      
      bassOsc.connect(bassGain);
      bassGain.connect(backingGainRef.current);
      
      bassOsc.start(time);
      bassOsc.stop(time + 0.8);
    }

    // Play soft backing chords on step 0
    if (step % 8 === 0) {
      chordPads[chordIndex].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        
        gain.gain.setValueAtTime(0.06 * backingVolume, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 1.8);
        
        osc.connect(gain);
        gain.connect(backingGainRef.current);
        
        osc.start(time);
        osc.stop(time + 1.8);
      });
    }
  };

  // Helper: Synthesize drum sounds procedurally
  const playProceduralDrumNote = (ctx: AudioContext, time: number, step: number) => {
    if (!drumGainRef.current || isDrumMuted) return;

    const innerStep = step % 16;
    
    // 1. Kick on beat 1 and 3 (steps 0, 8) and soft syncopated on step 11
    if (innerStep === 0 || innerStep === 8 || innerStep === 11) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);
      
      gain.gain.setValueAtTime(0.4 * drumVolume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
      
      osc.connect(gain);
      gain.connect(drumGainRef.current);
      
      osc.start(time);
      osc.stop(time + 0.2);
    }

    // 2. Snare on beat 2 and 4 (steps 4, 12)
    if (innerStep === 4 || innerStep === 12) {
      // Noise component
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(ctx);
      
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 1000;
      
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18 * drumVolume, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(drumGainRef.current);
      
      // Tone sweep component
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, time);
      osc.frequency.exponentialRampToValueAtTime(80, time + 0.08);
      
      oscGain.gain.setValueAtTime(0.2 * drumVolume, time);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
      
      osc.connect(oscGain);
      oscGain.connect(drumGainRef.current);
      
      noise.start(time);
      osc.start(time);
      noise.stop(time + 0.2);
      osc.stop(time + 0.1);
    }

    // 3. Steady Hi-Hats on alternate 8th notes (0, 2, 4, 6, 8, 10, 12, 14)
    if (innerStep % 2 === 0) {
      const source = ctx.createBufferSource();
      source.buffer = createNoiseBuffer(ctx);
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7500;
      
      const gain = ctx.createGain();
      const isAccent = innerStep % 4 === 0;
      gain.gain.setValueAtTime((isAccent ? 0.06 : 0.03) * drumVolume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
      
      source.connect(filter);
      filter.connect(gain);
      gain.connect(drumGainRef.current);
      
      source.start(time);
      source.stop(time + 0.05);
    }
  };

  // Launch procedural dual-track looping synthesizers
  const startProceduralSynth = () => {
    initAudioContext();
    const ctx = audioCtxRef.current!;

    // Create persistent Gains if needed
    if (!backingGainRef.current) {
      backingGainRef.current = ctx.createGain();
      backingGainRef.current.connect(ctx.destination);
    }
    if (!drumGainRef.current) {
      drumGainRef.current = ctx.createGain();
      drumGainRef.current.connect(ctx.destination);
    }

    backingGainRef.current.gain.value = backingVolume;
    drumGainRef.current.gain.value = isDrumMuted ? 0 : drumVolume;

    const tempoBpm = 110;
    const stepDurationSecs = 60 / tempoBpm / 2; // Eighth note steps
    let nextNoteTime = ctx.currentTime + 0.05;

    proceduralStepRef.current = 0;

    proceduralIntervalRef.current = setInterval(() => {
      // Lookahead of 150ms
      while (nextNoteTime < ctx.currentTime + 0.15) {
        const step = proceduralStepRef.current;
        playProceduralBackingNote(ctx, nextNoteTime, step);
        playProceduralDrumNote(ctx, nextNoteTime, step);
        
        nextNoteTime += stepDurationSecs;
        proceduralStepRef.current++;
      }
    }, 50);

    setIsPlaying(true);
  };

  // Stop everything safely
  const stopAll = () => {
    // Clear procedural synth
    if (proceduralIntervalRef.current) {
      clearInterval(proceduralIntervalRef.current);
      proceduralIntervalRef.current = null;
    }

    // Stop custom stem audio sources
    try {
      if (backingSourceRef.current) {
        backingSourceRef.current.stop();
        backingSourceRef.current.disconnect();
        backingSourceRef.current = null;
      }
    } catch(e) {}

    try {
      if (drumSourceRef.current) {
        drumSourceRef.current.stop();
        drumSourceRef.current.disconnect();
        drumSourceRef.current = null;
      }
    } catch(e) {}

    setIsPlaying(false);
  };

  // Load custom user stem files
  const handleFileUpload = async (type: 'backing' | 'drum', file: File) => {
    initAudioContext();
    const ctx = audioCtxRef.current!;

    if (type === 'backing') {
      setBackingFile(file);
    } else {
      setDrumFile(file);
    }

    try {
      const arrayBuf = await file.arrayBuffer();
      // Decode audio data safely
      ctx.decodeAudioData(arrayBuf, (buffer) => {
        if (type === 'backing') {
          backingBufferRef.current = buffer;
        } else {
          drumBufferRef.current = buffer;
        }
        
        if (backingBufferRef.current && drumBufferRef.current) {
          setIsCustomLoaded(true);
        }
      }, (err) => {
        console.error('Stem decode error:', err);
      });
    } catch (e) {
      console.error('File parsing failed:', e);
    }
  };

  // Play custom loaded audio stems in absolute sync
  const playCustomStems = () => {
    initAudioContext();
    const ctx = audioCtxRef.current!;

    if (!backingBufferRef.current || !drumBufferRef.current) return;

    // Setup backing gain node
    if (!backingGainRef.current) {
      backingGainRef.current = ctx.createGain();
      backingGainRef.current.connect(ctx.destination);
    }
    backingGainRef.current.gain.value = backingVolume;

    // Setup drum gain node
    if (!drumGainRef.current) {
      drumGainRef.current = ctx.createGain();
      drumGainRef.current.connect(ctx.destination);
    }
    drumGainRef.current.gain.value = isDrumMuted ? 0 : drumVolume;

    // Create buffers source nodes
    backingSourceRef.current = ctx.createBufferSource();
    backingSourceRef.current.buffer = backingBufferRef.current;
    backingSourceRef.current.connect(backingGainRef.current);
    backingSourceRef.current.loop = true;

    drumSourceRef.current = ctx.createBufferSource();
    drumSourceRef.current.buffer = drumBufferRef.current;
    drumSourceRef.current.connect(drumGainRef.current);
    drumSourceRef.current.loop = true;

    // Play sources in absolute sync at the same instant
    const startTime = ctx.currentTime + 0.1;
    backingSourceRef.current.start(startTime);
    drumSourceRef.current.start(startTime);

    setIsPlaying(true);
  };

  // Playback Control Router
  const handleTogglePlay = () => {
    if (isPlaying) {
      stopAll();
    } else {
      if (isCustomLoaded) {
        playCustomStems();
      } else {
        startProceduralSynth();
      }
    }
  };

  // Adjust Backing track Volume Node
  const handleBackingVolumeChange = (val: number) => {
    setBackingVolume(val);
    if (backingGainRef.current) {
      backingGainRef.current.gain.value = val;
    }
  };

  // Adjust Drum track Volume Node
  const handleDrumVolumeChange = (val: number) => {
    setDrumVolume(val);
    if (drumGainRef.current && !isDrumMuted) {
      drumGainRef.current.gain.value = val;
    }
  };

  // Drum Track Mute Selector
  const handleToggleDrumMute = () => {
    const nextMute = !isDrumMuted;
    setIsDrumMuted(nextMute);
    if (drumGainRef.current) {
      drumGainRef.current.gain.value = nextMute ? 0 : drumVolume;
    }
  };

  const clearCustomLoadedStems = () => {
    stopAll();
    setBackingFile(null);
    setDrumFile(null);
    backingBufferRef.current = null;
    drumBufferRef.current = null;
    setIsCustomLoaded(false);
  };

  return (
    <div className="bg-[#0F0F11] p-6 rounded-3xl border border-slate-900 shadow-2xl space-y-5 relative overflow-hidden w-full max-w-xl mx-auto">
      
      {/* Background radial gradient decoration */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Audio Workspace</span>
          <h2 className="font-sans text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2 mt-0.5">
            <Disc className={`h-5 w-5 text-emerald-450 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
            Multi-Track Stem Player
          </h2>
        </div>
        <span className={`text-[9px] uppercase font-mono font-bold px-2 py-1 rounded-lg border ${
          isCustomLoaded 
            ? 'bg-sky-950/20 text-sky-400 border-sky-900/30' 
            : 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30'
        }`}>
          {isCustomLoaded ? 'Custom Stems Loaded' : 'Procedural Loops (Default)'}
        </span>
      </div>

      {/* Description Box */}
      <p className="text-xs text-slate-400 leading-relaxed">
        Sync two independent backing audio stems in perfect real-time phase. Slide down or mute the <strong>Recorded Drum Stem</strong> completely so you can act as the main drummer with our click!
      </p>

      {/* Custom Stem Uploader Zone */}
      <div className="bg-[#070709] rounded-2xl p-4 border border-slate-900 space-y-3.5">
        <span className="font-sans text-[10px] font-bold text-slate-550 uppercase tracking-[0.2em] flex items-center gap-1.5">
          <Upload className="h-3.5 w-3.5 text-indigo-400" /> Upload Custom Stems (Offline Practice)
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          
          {/* Backing track uploader */}
          <div className="relative border border-dashed border-slate-900 rounded-xl p-3 bg-slate-950/40 text-center hover:border-slate-800 transition-colors">
            <input
              type="file"
              id="backing-uploader"
              accept="audio/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload('backing', file);
              }}
            />
            {backingFile ? (
              <div className="space-y-1">
                <Check className="h-5 w-5 text-emerald-400 mx-auto" />
                <p className="text-[10px] font-bold text-slate-300 truncate px-1">{backingFile.name}</p>
                <span className="text-[8px] font-mono text-slate-600 uppercase">Backing Track Loaded</span>
              </div>
            ) : (
              <div className="space-y-1 py-1">
                <Music4 className="h-5 w-5 text-slate-600 mx-auto" />
                <span className="text-[10px] font-bold text-slate-400 block">Backing Stem</span>
                <span className="text-[8px] text-slate-650 block">Chords, Vocals, Bass</span>
              </div>
            )}
          </div>

          {/* Drum track uploader */}
          <div className="relative border border-dashed border-slate-900 rounded-xl p-3 bg-slate-950/40 text-center hover:border-slate-800 transition-colors">
            <input
              type="file"
              id="drum-uploader"
              accept="audio/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload('drum', file);
              }}
            />
            {drumFile ? (
              <div className="space-y-1">
                <Check className="h-5 w-5 text-emerald-400 mx-auto" />
                <p className="text-[10px] font-bold text-slate-300 truncate px-1">{drumFile.name}</p>
                <span className="text-[8px] font-mono text-slate-600 uppercase">Drum Stem Loaded</span>
              </div>
            ) : (
              <div className="space-y-1 py-1">
                <Disc className="h-5 w-5 text-slate-600 mx-auto" />
                <span className="text-[10px] font-bold text-slate-400 block">Drums Stem</span>
                <span className="text-[8px] text-slate-650 block">Percussion & Beats</span>
              </div>
            )}
          </div>

        </div>

        {isCustomLoaded && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-900/60">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-[9px] font-mono text-slate-500 uppercase">Ready for Sync Playback</span>
            </div>
            <button
              onClick={clearCustomLoadedStems}
              className="text-[9px] font-mono font-bold text-rose-450 hover:text-rose-400 uppercase flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="h-3 w-3" /> Clear custom stems
            </button>
          </div>
        )}
      </div>

      {/* Main Player Board Controls */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-900 space-y-4">
        
        {/* Play/Stop and status indicator */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleTogglePlay}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all select-none cursor-pointer ${
              isPlaying 
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)] font-bold'
            }`}
          >
            {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
          </button>

          <div className="text-right">
            <span className="text-[9px] font-mono text-slate-600 uppercase font-extrabold tracking-widest block">Stems Status</span>
            <p className="text-xs font-bold font-sans text-slate-300 mt-0.5">
              {isPlaying ? (
                <span className="flex items-center justify-end gap-1 text-emerald-450">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" /> Synchronous Playback Active
                </span>
              ) : 'Ready & Idle'}
            </p>
          </div>
        </div>

        {/* Stem Gain Mixing Sliders */}
        <div className="space-y-3.5 pt-2">
          
          {/* Backing stem slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 uppercase">
              <span>Backing Accompaniment Stem</span>
              <span className="text-slate-300">{Math.round(backingVolume * 100)}%</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Music4 className="h-4 w-4 text-slate-650" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={backingVolume}
                onChange={(e) => handleBackingVolumeChange(parseFloat(e.target.value))}
                className="flex-1 accent-indigo-500 h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Drum stem slider + isolate button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 uppercase">
              <span className="flex items-center gap-1">
                Recorded Drum Stem 
                {isDrumMuted && <span className="text-[8px] bg-rose-950/20 text-rose-400 px-1.5 py-0.2 rounded border border-rose-900/30 uppercase">Isolated / Muted</span>}
              </span>
              <span className="text-slate-300">{isDrumMuted ? 'Muted' : `${Math.round(drumVolume * 100)}%`}</span>
            </div>
            
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleToggleDrumMute}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  isDrumMuted 
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-400' 
                    : 'bg-slate-900 border-slate-800 text-slate-550 hover:text-slate-400'
                }`}
                title={isDrumMuted ? "Unmute Drum Stem" : "Mute Drum Stem (Isolate Backing Track)"}
              >
                {isDrumMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={drumVolume}
                disabled={isDrumMuted}
                onChange={(e) => handleDrumVolumeChange(parseFloat(e.target.value))}
                className="flex-1 accent-emerald-500 h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
              />
            </div>
          </div>

        </div>

      </div>

      {/* Info notice */}
      <div className="bg-indigo-950/10 rounded-2xl p-3 border border-indigo-900/25 flex gap-2.5 items-start">
        <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-indigo-300/85 leading-relaxed">
          <strong>Tip:</strong> The default Procedural loops use high-accuracy Web Audio API synth oscillators playing chord progression pads and classic beats. Great for instant timing tests!
        </p>
      </div>

    </div>
  );
}
