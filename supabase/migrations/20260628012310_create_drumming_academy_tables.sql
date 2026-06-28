/*
# Create Drumming Academy Persistence Tables

## Summary
This migration creates three tables to support the Virtual Drumming Academy's
progress tracking, badge/achievement system, and quiz attempt history.
No authentication is required — the app is single-tenant with no sign-in screen.
All tables use USING (true) policies with anon + authenticated roles.

## 1. New Tables

### lesson_progress
Stores one record per lesson completion session. Allows the progress chart to
display historical timing accuracy (avg_offset_ms, jitter_ms) over time.
- id: UUID primary key
- lesson_id: string identifier matching SYLLABUS lesson IDs
- lesson_title: display name of the lesson
- avg_offset_ms: average timing offset in milliseconds for this session
- jitter_ms: standard deviation of timing offsets (consistency metric)
- streak_achieved: the highest streak hit during the session
- session_bpm: the BPM the metronome was set to during the session
- completed_at: timestamp when the lesson was completed

### user_achievements
Stores earned badge records so they persist across browser sessions.
- id: UUID primary key
- badge_id: string identifier matching BADGE_DEFINITIONS
- earned_at: timestamp when the badge was first unlocked

### quiz_attempts
Tracks individual quiz question answer history per lesson.
- id: UUID primary key
- quiz_id: the quiz set identifier
- question_id: the specific question identifier
- was_correct: boolean result of the answer
- attempted_at: timestamp of the attempt

## 2. Security
- RLS enabled on all three tables
- All policies use TO anon, authenticated because the app has no login screen
- USING (true) and WITH CHECK (true) are intentional for this single-tenant scenario
*/

-- lesson_progress table
CREATE TABLE IF NOT EXISTS lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id text NOT NULL,
  lesson_title text NOT NULL,
  avg_offset_ms integer NOT NULL DEFAULT 0,
  jitter_ms integer NOT NULL DEFAULT 0,
  streak_achieved integer NOT NULL DEFAULT 0,
  session_bpm integer NOT NULL DEFAULT 100,
  completed_at timestamptz DEFAULT now()
);

ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_lesson_progress" ON lesson_progress;
CREATE POLICY "anon_select_lesson_progress" ON lesson_progress FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_lesson_progress" ON lesson_progress;
CREATE POLICY "anon_insert_lesson_progress" ON lesson_progress FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_lesson_progress" ON lesson_progress;
CREATE POLICY "anon_update_lesson_progress" ON lesson_progress FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_lesson_progress" ON lesson_progress;
CREATE POLICY "anon_delete_lesson_progress" ON lesson_progress FOR DELETE
  TO anon, authenticated USING (true);

-- user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id text UNIQUE NOT NULL,
  earned_at timestamptz DEFAULT now()
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_user_achievements" ON user_achievements;
CREATE POLICY "anon_select_user_achievements" ON user_achievements FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_user_achievements" ON user_achievements;
CREATE POLICY "anon_insert_user_achievements" ON user_achievements FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_user_achievements" ON user_achievements;
CREATE POLICY "anon_update_user_achievements" ON user_achievements FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_user_achievements" ON user_achievements;
CREATE POLICY "anon_delete_user_achievements" ON user_achievements FOR DELETE
  TO anon, authenticated USING (true);

-- quiz_attempts table
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id text NOT NULL,
  question_id text NOT NULL,
  was_correct boolean NOT NULL DEFAULT false,
  attempted_at timestamptz DEFAULT now()
);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_quiz_attempts" ON quiz_attempts;
CREATE POLICY "anon_select_quiz_attempts" ON quiz_attempts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_quiz_attempts" ON quiz_attempts;
CREATE POLICY "anon_insert_quiz_attempts" ON quiz_attempts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_quiz_attempts" ON quiz_attempts;
CREATE POLICY "anon_update_quiz_attempts" ON quiz_attempts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_quiz_attempts" ON quiz_attempts;
CREATE POLICY "anon_delete_quiz_attempts" ON quiz_attempts FOR DELETE
  TO anon, authenticated USING (true);

-- Index for fast lesson history queries
CREATE INDEX IF NOT EXISTS idx_lesson_progress_completed_at ON lesson_progress (completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON lesson_progress (lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts (quiz_id);