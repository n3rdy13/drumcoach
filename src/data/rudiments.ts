import { Rudiment } from '../types';

export const RUDIMENTS: Rudiment[] = [
  {
    id: 'single-stroke-roll',
    name: 'Single Stroke Roll',
    category: 'Roll',
    description: 'The most fundamental rudiment. Alternating single strokes cleanly at equal volume.',
    difficulty: 'Beginner',
    pattern: ['R', 'L', 'R', 'L', 'R', 'L', 'R', 'L'],
    division: 2, // Played as eighth notes (2 notes per beat)
  },
  {
    id: 'double-stroke-roll',
    name: 'Double Stroke Roll',
    category: 'Roll',
    description: 'Play two strokes with each hand, allowing the second bounce to sound as full as the first.',
    difficulty: 'Beginner',
    pattern: ['R', 'R', 'L', 'L', 'R', 'R', 'L', 'L'],
    division: 2, // Played as eighth notes
  },
  {
    id: 'single-paradiddle',
    name: 'Single Paradiddle',
    category: 'Diddle',
    description: 'Combines two single strokes with a double stroke (diddle) to toggle starting hands.',
    difficulty: 'Beginner',
    pattern: ['R', 'L', 'R', 'R', 'L', 'R', 'L', 'L'],
    division: 4, // Played as sixteenth notes (4 notes per beat)
  },
  {
    id: 'double-paradiddle',
    name: 'Double Paradiddle',
    category: 'Diddle',
    description: 'Adds an extra pair of alternating strokes before the diddle. Perfect for 6/8 and triplet timings.',
    difficulty: 'Intermediate',
    pattern: ['R', 'L', 'R', 'L', 'R', 'R', 'L', 'R', 'L', 'R', 'L', 'L'],
    division: 3, // Played as triplets (3 notes per beat)
  },
  {
    id: 'paradiddle-diddle',
    name: 'Paradiddle-Diddle',
    category: 'Diddle',
    description: 'Consists of two single strokes followed by two double strokes. Great for fast flowing rolls.',
    difficulty: 'Intermediate',
    pattern: ['R', 'L', 'R', 'R', 'L', 'L', 'R', 'L', 'R', 'R', 'L', 'L'],
    division: 4, // Played as sixteenth notes (groups of six, often sextuplets)
  },
  {
    id: 'flam-accent',
    name: 'Flam Accent',
    category: 'Flam',
    description: 'A three-note pattern starting with an accented flam stroke, followed by two regular taps.',
    difficulty: 'Intermediate',
    pattern: ['R', 'L', 'R', 'L', 'R', 'L'], // Repetitive pattern
    division: 3, // Played as triplet accents
  },
  {
    id: 'drag-paradiddle',
    name: 'Drag',
    category: 'Drag',
    description: 'A paradiddle prefaced by a double bounce drag stroke with the opposite hand.',
    difficulty: 'Advanced',
    pattern: ['R', 'L', 'R', 'R', 'L', 'R', 'L', 'L'], // Played weaved with drag taps
    division: 4,
  },
];
