export type SoundType = 'synth' | 'woodblock' | 'sidestick' | 'cowbell';

export interface TimeSignature {
  beats: number; // Numerator (e.g. 4)
  noteValue: number; // Denominator (e.g. 4)
}

export type BeatDivision = 1 | 2 | 3 | 4; // 1 = quarter, 2 = eighths, 3 = triplets, 4 = sixteenths

export interface Rudiment {
  id: string;
  name: string;
  category: 'Roll' | 'Diddle' | 'Flam' | 'Drag';
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  pattern: ('R' | 'L')[]; // Hand pattern
  division: BeatDivision; // Rhythmic resolution (typically 16th notes for paradiddle, etc)
}

export interface FiredHits {
  kick?: boolean;
  snare?: boolean;
  hihat?: boolean;
  metronome?: boolean;
}

export interface BeatEvent {
  time: number;
  beatIndex: number;
  subdivisionIndex: number;
  isFirstBeat: boolean;
  firedHits?: FiredHits;
}

export type DrumInstrument = 'kick' | 'snare' | 'hihat';

export interface DrumPattern {
  id: string;
  name: string;
  description: string;
  beatsPerMeasure: number;
  division: BeatDivision;
  grid: {
    kick: boolean[];
    snare: boolean[];
    hihat: boolean[];
  };
}
