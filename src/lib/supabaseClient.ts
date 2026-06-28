import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface LessonProgressRecord {
  id: string;
  lesson_id: string;
  lesson_title: string;
  avg_offset_ms: number;
  jitter_ms: number;
  streak_achieved: number;
  session_bpm: number;
  completed_at: string;
}

export interface UserAchievementRecord {
  id: string;
  badge_id: string;
  earned_at: string;
}

export interface QuizAttemptRecord {
  id: string;
  quiz_id: string;
  question_id: string;
  was_correct: boolean;
  attempted_at: string;
}
