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

// ---- Academy / Lesson System ----

export interface Lesson {
  id: string;
  number: number;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  bpm: number;
  division: BeatDivision;
  beatsPerMeasure: number;
  objective: string;
  targetStreak: number;
  instructions: string;
  focusInstrument: 'kick' | 'snare' | 'hihat';
  schematic: string;
  prerequisites: string[];
  quizId: string | null;
  badgeAwarded: string | null;
  theoryModule: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizAttempt {
  questionId: string;
  selectedIndex: number;
  wasCorrect: boolean;
}

// ---- Badge System ----

export interface BadgeDefinition {
  id: string;
  title: string;
  profileTitle: string;
  description: string;
  iconName: 'Star' | 'Award' | 'Trophy' | 'Flame' | 'Zap' | 'Music' | 'Target' | 'Crown' | 'Shield';
  colorClass: string;
  glowClass: string;
  requirement: (completedLessonIds: string[]) => boolean;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first-beat',
    title: 'First Beat',
    profileTitle: 'Beat Keeper',
    description: 'Complete your very first lesson in the Academy.',
    iconName: 'Star',
    colorClass: 'text-emerald-400',
    glowClass: 'shadow-emerald-500/30',
    requirement: (ids) => ids.length >= 1,
  },
  {
    id: 'on-the-two',
    title: 'On The Two',
    profileTitle: 'Backbeat Disciple',
    description: 'Complete 2 lessons and feel the backbeat.',
    iconName: 'Music',
    colorClass: 'text-sky-400',
    glowClass: 'shadow-sky-500/30',
    requirement: (ids) => ids.length >= 2,
  },
  {
    id: 'groove-seeker',
    title: 'Groove Seeker',
    profileTitle: 'Groove Seeker',
    description: 'Complete 3 lessons. You are finding your pocket.',
    iconName: 'Flame',
    colorClass: 'text-amber-400',
    glowClass: 'shadow-amber-500/30',
    requirement: (ids) => ids.length >= 3,
  },
  {
    id: 'pocket-player',
    title: 'Pocket Player',
    profileTitle: 'Pocket Player',
    description: 'Complete 5 lessons. You are deep in the groove.',
    iconName: 'Target',
    colorClass: 'text-indigo-400',
    glowClass: 'shadow-indigo-500/30',
    requirement: (ids) => ids.length >= 5,
  },
  {
    id: 'groove-architect',
    title: 'Groove Architect',
    profileTitle: 'Groove Architect',
    description: 'Complete 7 lessons. You build rhythms from the ground up.',
    iconName: 'Zap',
    colorClass: 'text-violet-400',
    glowClass: 'shadow-violet-500/30',
    requirement: (ids) => ids.length >= 7,
  },
  {
    id: 'paradiddle-pro',
    title: 'Paradiddle Pro',
    profileTitle: 'Paradiddle Pro',
    description: 'Complete the Paradiddle Introduction lesson.',
    iconName: 'Award',
    colorClass: 'text-rose-400',
    glowClass: 'shadow-rose-500/30',
    requirement: (ids) => ids.includes('lesson-6-paradiddle'),
  },
  {
    id: 'kick-commander',
    title: 'Kick Commander',
    profileTitle: 'Kick Commander',
    description: 'Complete the Syncopated Kick Patterns lesson.',
    iconName: 'Shield',
    colorClass: 'text-orange-400',
    glowClass: 'shadow-orange-500/30',
    requirement: (ids) => ids.includes('lesson-7-synco-kick'),
  },
  {
    id: 'rudiment-master',
    title: 'Rudiment Master',
    profileTitle: 'Rudiment Master',
    description: 'Complete all 10 lessons in the Academy syllabus.',
    iconName: 'Trophy',
    colorClass: 'text-amber-300',
    glowClass: 'shadow-amber-400/40',
    requirement: (ids) => ids.length >= 10,
  },
];

export function getProfileTitle(completedCount: number): string {
  if (completedCount === 0) return 'Recruit';
  if (completedCount === 1) return 'Beat Keeper';
  if (completedCount < 3) return 'Backbeat Disciple';
  if (completedCount < 5) return 'Groove Seeker';
  if (completedCount < 7) return 'Pocket Player';
  if (completedCount < 10) return 'Groove Architect';
  return 'Rhythm Master';
}
