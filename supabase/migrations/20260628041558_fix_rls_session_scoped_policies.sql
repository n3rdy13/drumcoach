/*
  Fix overly-broad RLS policies by:
  1. Adding session_id column to all mutable tables
  2. Replacing USING(true)/WITH CHECK(true) on mutating operations with
     session-scoped checks using the x-session-id request header
  3. Removing DELETE access from singleton config tables (app never deletes them)
  4. Keeping SELECT unrestricted (read-only = safe for no-auth app)
*/

-- ─── lesson_progress ────────────────────────────────────────────────────────

ALTER TABLE lesson_progress
  ADD COLUMN IF NOT EXISTS session_id text NOT NULL DEFAULT 'legacy';

CREATE INDEX IF NOT EXISTS idx_lesson_progress_session_id
  ON lesson_progress (session_id);

-- Drop overly-broad mutating policies
DROP POLICY IF EXISTS "anon_insert_lesson_progress" ON lesson_progress;
DROP POLICY IF EXISTS "anon_update_lesson_progress" ON lesson_progress;
DROP POLICY IF EXISTS "anon_delete_lesson_progress" ON lesson_progress;

-- INSERT: row's session_id must match the header the client sends
CREATE POLICY "anon_insert_lesson_progress" ON lesson_progress FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    session_id = (
      current_setting('request.headers', true)::json->>'x-session-id'
    )
  );

-- UPDATE: only touch rows you own (app doesn't actually update these, but keep it safe)
CREATE POLICY "anon_update_lesson_progress" ON lesson_progress FOR UPDATE
  TO anon, authenticated
  USING (
    session_id = (
      current_setting('request.headers', true)::json->>'x-session-id'
    )
  )
  WITH CHECK (
    session_id = (
      current_setting('request.headers', true)::json->>'x-session-id'
    )
  );

-- DELETE: only touch rows you own
CREATE POLICY "anon_delete_lesson_progress" ON lesson_progress FOR DELETE
  TO anon, authenticated
  USING (
    session_id = (
      current_setting('request.headers', true)::json->>'x-session-id'
    )
  );


-- ─── user_achievements ──────────────────────────────────────────────────────

ALTER TABLE user_achievements
  ADD COLUMN IF NOT EXISTS session_id text NOT NULL DEFAULT 'legacy';

CREATE INDEX IF NOT EXISTS idx_user_achievements_session_id
  ON user_achievements (session_id);

DROP POLICY IF EXISTS "anon_insert_user_achievements" ON user_achievements;
DROP POLICY IF EXISTS "anon_update_user_achievements" ON user_achievements;
DROP POLICY IF EXISTS "anon_delete_user_achievements" ON user_achievements;

CREATE POLICY "anon_insert_user_achievements" ON user_achievements FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    session_id = (
      current_setting('request.headers', true)::json->>'x-session-id'
    )
  );

CREATE POLICY "anon_update_user_achievements" ON user_achievements FOR UPDATE
  TO anon, authenticated
  USING (
    session_id = (
      current_setting('request.headers', true)::json->>'x-session-id'
    )
  )
  WITH CHECK (
    session_id = (
      current_setting('request.headers', true)::json->>'x-session-id'
    )
  );

CREATE POLICY "anon_delete_user_achievements" ON user_achievements FOR DELETE
  TO anon, authenticated
  USING (
    session_id = (
      current_setting('request.headers', true)::json->>'x-session-id'
    )
  );


-- ─── quiz_attempts ──────────────────────────────────────────────────────────

ALTER TABLE quiz_attempts
  ADD COLUMN IF NOT EXISTS session_id text NOT NULL DEFAULT 'legacy';

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_session_id
  ON quiz_attempts (session_id);

DROP POLICY IF EXISTS "anon_insert_quiz_attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "anon_update_quiz_attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "anon_delete_quiz_attempts" ON quiz_attempts;

CREATE POLICY "anon_insert_quiz_attempts" ON quiz_attempts FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    session_id = (
      current_setting('request.headers', true)::json->>'x-session-id'
    )
  );

CREATE POLICY "anon_update_quiz_attempts" ON quiz_attempts FOR UPDATE
  TO anon, authenticated
  USING (
    session_id = (
      current_setting('request.headers', true)::json->>'x-session-id'
    )
  )
  WITH CHECK (
    session_id = (
      current_setting('request.headers', true)::json->>'x-session-id'
    )
  );

CREATE POLICY "anon_delete_quiz_attempts" ON quiz_attempts FOR DELETE
  TO anon, authenticated
  USING (
    session_id = (
      current_setting('request.headers', true)::json->>'x-session-id'
    )
  );


-- ─── latency_settings (singleton — no DELETE needed) ────────────────────────

ALTER TABLE latency_settings
  ADD COLUMN IF NOT EXISTS session_id text NOT NULL DEFAULT 'default';

DROP POLICY IF EXISTS "anon_insert_latency_settings" ON latency_settings;
DROP POLICY IF EXISTS "anon_update_latency_settings" ON latency_settings;
DROP POLICY IF EXISTS "anon_delete_latency_settings"  ON latency_settings;

CREATE POLICY "anon_insert_latency_settings" ON latency_settings FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    session_id = (
      current_setting('request.headers', true)::json->>'x-session-id'
    )
  );

CREATE POLICY "anon_update_latency_settings" ON latency_settings FOR UPDATE
  TO anon, authenticated
  USING (
    session_id = (
      current_setting('request.headers', true)::json->>'x-session-id'
    )
  )
  WITH CHECK (
    session_id = (
      current_setting('request.headers', true)::json->>'x-session-id'
    )
  );

-- No DELETE policy for singleton config tables — the app never deletes them


-- ─── midi_threshold_settings (singleton — no DELETE needed) ─────────────────

ALTER TABLE midi_threshold_settings
  ADD COLUMN IF NOT EXISTS session_id text NOT NULL DEFAULT 'default';

DROP POLICY IF EXISTS "anon_insert_midi_threshold" ON midi_threshold_settings;
DROP POLICY IF EXISTS "anon_update_midi_threshold" ON midi_threshold_settings;
DROP POLICY IF EXISTS "anon_delete_midi_threshold"  ON midi_threshold_settings;

CREATE POLICY "anon_insert_midi_threshold" ON midi_threshold_settings FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    session_id = (
      current_setting('request.headers', true)::json->>'x-session-id'
    )
  );

CREATE POLICY "anon_update_midi_threshold" ON midi_threshold_settings FOR UPDATE
  TO anon, authenticated
  USING (
    session_id = (
      current_setting('request.headers', true)::json->>'x-session-id'
    )
  )
  WITH CHECK (
    session_id = (
      current_setting('request.headers', true)::json->>'x-session-id'
    )
  );

-- No DELETE policy for singleton config tables
