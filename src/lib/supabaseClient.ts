import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Stable browser-session UUID — persisted in localStorage so it survives
// page reloads but is unique per browser/device. Used to scope RLS policies
// so each client can only mutate its own rows (no user auth required).
function getOrCreateSessionId(): string {
  const KEY = 'drumming_academy_session_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export const SESSION_ID = getOrCreateSessionId();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-session-id': SESSION_ID,
    },
  },
});

export interface LessonProgressRecord {
  id: string;
  lesson_id: string;
  lesson_title: string;
  avg_offset_ms: number;
  jitter_ms: number;
  streak_achieved: number;
  session_bpm: number;
  completed_at: string;
  session_id: string;
}

export interface UserAchievementRecord {
  id: string;
  badge_id: string;
  earned_at: string;
  session_id: string;
}

export interface QuizAttemptRecord {
  id: string;
  quiz_id: string;
  question_id: string;
  was_correct: boolean;
  attempted_at: string;
  session_id: string;
}
