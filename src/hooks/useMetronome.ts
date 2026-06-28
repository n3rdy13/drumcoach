import { useState, useEffect, useRef, useCallback } from 'react';
import { SoundType, BeatDivision, BeatEvent, DrumPattern, FiredHits } from '../types';
import { MetronomeEngine } from '../audio/MetronomeEngine';

export function useMetronome() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpmState] = useState(110);
  const [beatsPerMeasure, setBeatsPerMeasureState] = useState(4);
  const [division, setDivisionState] = useState<BeatDivision>(1);
  const [soundType, setSoundTypeState] = useState<SoundType>('synth');
  const [volume, setVolumeState] = useState(0.8);

  // Active drum pattern playback settings & mute ticks
  const [activePattern, setActivePatternState] = useState<DrumPattern | null>(null);
  const [muteMetronomeClick, setMuteMetronomeClickState] = useState(false);
  const [firedHits, setFiredHits] = useState<FiredHits | null>(null);

  // Live visual tracks for visual pulses synchronized to play time
  const [currentBeat, setCurrentBeat] = useState(0);
  const [currentSubdivision, setCurrentSubdivision] = useState(0);
  const [flashTrigger, setFlashTrigger] = useState(0);
  const [isFirstBeat, setIsFirstBeat] = useState(false);

  // Persisted engine reference inside the React closure
  const engineRef = useRef<MetronomeEngine | null>(null);

  // Keep engine settings updated in real-time when reacting to state updates
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.bpm = bpm;
      engineRef.current.beatsPerMeasure = beatsPerMeasure;
      engineRef.current.division = division;
      engineRef.current.soundType = soundType;
      engineRef.current.volume = volume;
      engineRef.current.activePattern = activePattern;
      engineRef.current.muteMetronomeClick = muteMetronomeClick;
    }
  }, [bpm, beatsPerMeasure, division, soundType, volume, activePattern, muteMetronomeClick]);

  // Synchronized callback executed on frame actions
  const handleBeatEvent = useCallback((event: BeatEvent) => {
    setCurrentBeat(event.beatIndex);
    setCurrentSubdivision(event.subdivisionIndex);
    setIsFirstBeat(event.isFirstBeat);
    setFlashTrigger((prev) => prev + 1);
    
    if (event.firedHits) {
      setFiredHits(event.firedHits);
    }
  }, []);

  // Instantiate standard engine on mount
  useEffect(() => {
    const engine = new MetronomeEngine(handleBeatEvent);
    engine.bpm = bpm;
    engine.beatsPerMeasure = beatsPerMeasure;
    engine.division = division;
    engine.soundType = soundType;
    engine.volume = volume;
    engine.activePattern = activePattern;
    engine.muteMetronomeClick = muteMetronomeClick;
    engineRef.current = engine;

    return () => {
      engine.stop();
    };
  }, [handleBeatEvent]); // Exclude other values so we only build metronome once on startup

  const startMetronome = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.start();
      setIsPlaying(true);
    }
  }, []);

  const stopMetronome = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
      setIsPlaying(false);
      setCurrentBeat(0);
      setCurrentSubdivision(0);
      setFiredHits(null);
    }
  }, []);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      stopMetronome();
    } else {
      startMetronome();
    }
  }, [isPlaying, startMetronome, stopMetronome]);

  // Direct manual API setters that validate clean constraints
  const setBpm = useCallback((newBpm: number) => {
    const validatedBpm = Math.max(20, Math.min(300, Math.round(newBpm)));
    setBpmState(validatedBpm);
  }, []);

  const setBeatsPerMeasure = useCallback((newBeats: number) => {
    const validatedBeats = Math.max(1, Math.min(16, newBeats));
    setBeatsPerMeasureState(validatedBeats);
  }, []);

  const setDivision = useCallback((newDivision: BeatDivision) => {
    setDivisionState(newDivision);
  }, []);

  const setSoundType = useCallback((newType: SoundType) => {
    setSoundTypeState(newType);
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    const val = Math.max(0, Math.min(1, newVolume));
    setVolumeState(val);
  }, []);

  // Manual individual sample trigger controls
  const triggerKick = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.triggerKick();
    }
  }, []);

  const triggerSnare = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.triggerSnare();
    }
  }, []);

  const triggerHiHat = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.triggerHiHat();
    }
  }, []);

  return {
    isPlaying,
    bpm,
    beatsPerMeasure,
    division,
    soundType,
    volume,
    currentBeat,
    currentSubdivision,
    flashTrigger,
    isFirstBeat,
    activePattern,
    muteMetronomeClick,
    firedHits,
    setBpm,
    setBeatsPerMeasure,
    setDivision,
    setSoundType,
    setVolume,
    setActivePattern: setActivePatternState,
    setMuteMetronomeClick: setMuteMetronomeClickState,
    togglePlayback,
    startMetronome,
    stopMetronome,
    triggerKick,
    triggerSnare,
    triggerHiHat,
  };
}
