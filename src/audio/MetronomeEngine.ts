import { SoundType, BeatDivision, BeatEvent, DrumPattern } from '../types';

export class MetronomeEngine {
  private audioContext: AudioContext | null = null;
  private isPlaying: boolean = false;

  // Current BPM & signature settings (can be mutated in real-time)
  public bpm: number = 100;
  public beatsPerMeasure: number = 4;
  public division: BeatDivision = 1; // 1 = quarter, 2 = 8ths, 3 = triplets, 4 = 16ths
  public soundType: SoundType = 'synth';
  public volume: number = 0.8;

  // Global latency offset applied to outgoing beat timestamps (ms).
  // Positive means user consistently hits late; the offset corrects the comparison window.
  public latencyOffsetMs: number = 0;

  // Active drum pattern playback settings
  public activePattern: DrumPattern | null = null;
  public muteMetronomeClick: boolean = false;

  // Returns the AudioContext's current time in seconds for external latency calculation.
  public getAudioContextTime(): number {
    return this.audioContext ? this.audioContext.currentTime : 0;
  }

  // Returns the browser's reported hardware output latency in ms.
  public getBaseLatencyMs(): number {
    if (!this.audioContext) return 0;
    return ((this.audioContext as any).baseLatency ?? 0) * 1000;
  }

  // Scheduler tracking
  private nextNoteTime: number = 0.0;
  private currentBeat: number = 0;
  private currentSubdivision: number = 0; // 0 to (division - 1)

  // Scheduling constants
  private readonly lookaheadMs = 25.0; // How frequently to run the scheduler check (ms)
  private readonly scheduleAheadSec = 0.1; // How far in advance to schedule audio (seconds)
  private timerId: number | null = null;

  // Animation synchronized queue
  private eventQueue: BeatEvent[] = [];
  private animationFrameId: number | null = null;

  // Real-time callback for UI updates, triggered exactly on the beat time check
  private onBeatCallback: (event: BeatEvent) => void;

  constructor(onBeatCallback: (event: BeatEvent) => void) {
    this.onBeatCallback = onBeatCallback;
  }

  /**
   * Lazy initializes the AudioContext and unlocks audio playback
   */
  public init() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      try {
        this.audioContext = new AudioCtx();
      } catch (err) {
        console.warn('AudioContext creation failed — user gesture may be required:', err);
        return;
      }
    }

    // Always resume: handles suspended state on mobile and after user-gesture requirement
    if (this.audioContext.state !== 'running') {
      this.audioContext.resume().catch(() => {});
    }
  }

  /**
   * Starts the metronome playback with Web Audio scheduling
   */
  public start() {
    this.init();
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.currentBeat = 0;
    this.currentSubdivision = 0;
    this.eventQueue = [];

    if (this.audioContext) {
      this.nextNoteTime = this.audioContext.currentTime + 0.05;
    }

    // Start look-ahead timer
    this.timerId = window.setInterval(() => this.scheduler(), this.lookaheadMs);

    // Start precision visual animation frame loop
    this.requestAnimationLoop();
  }

  /**
   * Stops the metronome playback
   */
  public stop() {
    if (!this.isPlaying) return;

    this.isPlaying = false;

    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.eventQueue = [];
  }

  /**
   * Checks if metronome is currently playing
   */
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Metronome scheduler look-ahead loop
   */
  private scheduler() {
    if (!this.audioContext) return;

    // While there are notes to play before completion of the look-ahead window
    while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadSec) {
      this.scheduleNote(this.currentBeat, this.currentSubdivision, this.nextNoteTime);
      this.advanceNote();
    }
  }

  /**
   * Advances current scheduler pointer to the next subdivision
   */
  private advanceNote() {
    const secondsPerBeat = 60.0 / this.bpm;
    // Divide the beat by active division (1 = whole beats, 2 = 8th notes, etc.)
    const secondsPerSubdivision = secondsPerBeat / this.division;

    this.nextNoteTime += secondsPerSubdivision;

    // Advance subdivision
    this.currentSubdivision++;
    if (this.currentSubdivision >= this.division) {
      this.currentSubdivision = 0;
      // Advance master beat count
      this.currentBeat++;
      if (this.currentBeat >= this.beatsPerMeasure) {
        this.currentBeat = 0;
      }
    }
  }

  /**
   * Schedules a drum click sound at the exact millisecond audio timestamp
   */
  private scheduleNote(beatIndex: number, subdivisionIndex: number, time: number) {
    if (!this.audioContext) return;

    const isFirstBeat = beatIndex === 0 && subdivisionIndex === 0;
    const isMainBeat = subdivisionIndex === 0;

    // Trigger audio creation for metronome tick (if not muted)
    if (!this.muteMetronomeClick) {
      this.playAudioSynth(isFirstBeat, isMainBeat, time);
    }

    let kickFired = false;
    let snareFired = false;
    let hihatFired = false;

    // Trigger accompaniments if pattern is loaded
    if (this.activePattern) {
      const stepIndex = beatIndex * this.division + subdivisionIndex;
      const kickGrid = this.activePattern.grid.kick;
      const snareGrid = this.activePattern.grid.snare;
      const hihatGrid = this.activePattern.grid.hihat;

      if (kickGrid && kickGrid[stepIndex]) {
        kickFired = true;
        this.triggerKick(time);
      }
      if (snareGrid && snareGrid[stepIndex]) {
        snareFired = true;
        this.triggerSnare(time);
      }
      if (hihatGrid && hihatGrid[stepIndex]) {
        hihatFired = true;
        this.triggerHiHat(time);
      }
    }

    // Queue visual frame synchronization event with details of which hit was triggered
    this.eventQueue.push({
      time,
      beatIndex,
      subdivisionIndex,
      isFirstBeat,
      firedHits: {
        kick: kickFired,
        snare: snareFired,
        hihat: hihatFired,
        metronome: !this.muteMetronomeClick && isMainBeat,
      }
    });
  }

  /**
   * Audio Synth generators based on visual instrument patterns
   */
  private playAudioSynth(isFirstBeat: boolean, isMainBeat: boolean, time: number) {
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume, time);
    masterGain.connect(ctx.destination);

    // Procedural sound designers
    if (this.soundType === 'synth') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      
      if (isFirstBeat) {
        osc.frequency.setValueAtTime(1200, time);
        gain.gain.setValueAtTime(1.0, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
      } else if (isMainBeat) {
        osc.frequency.setValueAtTime(800, time);
        gain.gain.setValueAtTime(0.7, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
      } else {
        // Off-beats subdivisions are higher and lighter
        osc.frequency.setValueAtTime(600, time);
        gain.gain.setValueAtTime(0.35, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
      }

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(time);
      osc.stop(time + 0.1);

    } else if (this.soundType === 'woodblock') {
      // Woodblock resonance: Double Sine oscillator pairing with rapid decays
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      const pitchFactor = isFirstBeat ? 1.5 : (isMainBeat ? 1.2 : 0.95);
      
      osc1.frequency.setValueAtTime(1400 * pitchFactor, time);
      osc2.frequency.setValueAtTime(1050 * pitchFactor, time);

      const level = isFirstBeat ? 1.0 : (isMainBeat ? 0.7 : 0.4);
      gain.gain.setValueAtTime(level, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.025);

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(200, time);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(filter);
      filter.connect(masterGain);

      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + 0.05);
      osc2.stop(time + 0.05);

    } else if (this.soundType === 'sidestick') {
      // Procedural sidestick: Sharp brief filtered white noise snare transient
      const length = 0.025; // 25ms
      const bufferSize = ctx.sampleRate * length;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(isFirstBeat ? 1800 : (isMainBeat ? 1400 : 1000), time);
      noiseFilter.Q.setValueAtTime(8, time);

      const noiseGain = ctx.createGain();
      const level = isFirstBeat ? 1.0 : (isMainBeat ? 0.65 : 0.35);
      noiseGain.gain.setValueAtTime(level, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + length);

      // Add a small sine "body" pop to the sidestick
      const bodyOsc = ctx.createOscillator();
      const bodyGain = ctx.createGain();
      bodyOsc.type = 'triangle';
      bodyOsc.frequency.setValueAtTime(isFirstBeat ? 380 : 300, time);
      bodyGain.gain.setValueAtTime(level * 0.4, time);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.015);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);

      bodyOsc.connect(bodyGain);
      bodyGain.connect(masterGain);

      noiseSource.start(time);
      noiseSource.stop(time + length);
      bodyOsc.start(time);
      bodyOsc.stop(time + 0.02);

    } else if (this.soundType === 'cowbell') {
      // Cowbell design: Summed square waves (800Hz / 540Hz) with sharp bandpass filter
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc1.type = 'square';
      osc2.type = 'square';

      // Transpose based on beat accents
      const trans = isFirstBeat ? 1.15 : (isMainBeat ? 1.0 : 0.85);
      osc1.frequency.setValueAtTime(800 * trans, time);
      osc2.frequency.setValueAtTime(540 * trans, time);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(850 * trans, time);
      filter.Q.setValueAtTime(4, time);

      const volumeLevel = isFirstBeat ? 0.9 : (isMainBeat ? 0.6 : 0.35);
      gain.gain.setValueAtTime(volumeLevel, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.091);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + 0.15);
      osc2.stop(time + 0.15);
    }
  }

  /**
   * High performance frame loop that monitors visual synchronization times and
   * fires frame-accurate rendering updates to listeners
   */
  private requestAnimationLoop = () => {
    if (!this.isPlaying || !this.audioContext) return;

    const currentTime = this.audioContext.currentTime;

    while (this.eventQueue.length > 0 && this.eventQueue[0].time <= currentTime) {
      const beatEvent = this.eventQueue.shift();
      if (beatEvent) {
        this.onBeatCallback(beatEvent);
      }
    }

    this.animationFrameId = requestAnimationFrame(this.requestAnimationLoop);
  };

  /**
   * Generates a high quality synthesizer kick-drum punch using frequency sweeping
   */
  public triggerKick(time?: number) {
    this.init();
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const t = time !== undefined ? time : ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);

    const baseVolume = this.volume || 0.8;
    gain.gain.setValueAtTime(baseVolume * 1.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  /**
   * Generates a sharp acoustic-mode snare drum hit from white noise + pitch body
   */
  public triggerSnare(time?: number) {
    this.init();
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const t = time !== undefined ? time : ctx.currentTime;

    // Snare white noise rattle
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(1200, t);

    const noiseGain = ctx.createGain();
    const baseVolume = this.volume || 0.8;
    noiseGain.gain.setValueAtTime(baseVolume * 0.75, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    // Snare tone body
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);

    oscGain.gain.setValueAtTime(baseVolume * 0.45, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    noiseSource.start(t);
    noiseSource.stop(t + 0.15);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * Generates a clean metallic highpass-layered closed hi-hat click
   */
  public triggerHiHat(time?: number) {
    this.init();
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const t = time !== undefined ? time : ctx.currentTime;

    const bufferSize = ctx.sampleRate * 0.04;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, t);

    const gain = ctx.createGain();
    const baseVolume = this.volume || 0.8;
    gain.gain.setValueAtTime(baseVolume * 0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noiseSource.start(t);
    noiseSource.stop(t + 0.05);
  }
}
