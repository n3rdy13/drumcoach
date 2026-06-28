/*
# Add Latency Calibration and MIDI Threshold Settings Tables

## Overview
Two new configuration tables to support hardware latency compensation and MIDI
velocity-based instrument disambiguation for the Virtual Drumming Academy.

## New Tables

### 1. `latency_settings`
Stores the most recent latency calibration result. A single row is upserted
(using id = 'default') so there is always at most one active calibration.
- `id` (text, primary key) — always 'default', singleton pattern
- `offset_ms` (float8) — signed millisecond offset to subtract from hit timestamps
  (negative = user hits early relative to audio clock, positive = user hits late)
- `calibrated_at` (timestamptz) — when the calibration was performed
- `tap_count` (int4) — number of taps used to compute the average (for confidence)

### 2. `midi_threshold_settings`
Stores velocity thresholds computed by the Hi-Hat vs. Snare disambiguation wizard.
A single row is upserted (id = 'default') so configuration is always available.
- `id` (text, primary key) — always 'default', singleton pattern
- `threshold_velocity` (int4) — velocity below this = hi-hat, at or above = snare
- `hihat_max_velocity` (int4) — highest velocity recorded during hi-hat tap phase
- `snare_min_velocity` (int4) — lowest velocity recorded during snare tap phase
- `calibrated_at` (timestamptz) — when the wizard was last completed

## Security
Both tables use single-tenant RLS (no sign-in screen in this app).
Policies use `TO anon, authenticated` so the anon-key frontend can read and write.
USING (true) is intentional — settings are global to the single user of this app.

## Notes
- Both tables use a singleton row pattern (id = 'default') so the frontend can
  always `.upsert({ id: 'default', ... })` without checking for existing rows.
- No cascade deletes needed; these are standalone configuration tables.
*/

-- =========================================================
-- Table: latency_settings
-- =========================================================
CREATE TABLE IF NOT EXISTS latency_settings (
  id text PRIMARY KEY DEFAULT 'default',
  offset_ms float8 NOT NULL DEFAULT 0,
  tap_count int4 NOT NULL DEFAULT 0,
  calibrated_at timestamptz DEFAULT now()
);

ALTER TABLE latency_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_latency_settings" ON latency_settings;
CREATE POLICY "anon_select_latency_settings" ON latency_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_latency_settings" ON latency_settings;
CREATE POLICY "anon_insert_latency_settings" ON latency_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_latency_settings" ON latency_settings;
CREATE POLICY "anon_update_latency_settings" ON latency_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_latency_settings" ON latency_settings;
CREATE POLICY "anon_delete_latency_settings" ON latency_settings FOR DELETE
  TO anon, authenticated USING (true);

-- =========================================================
-- Table: midi_threshold_settings
-- =========================================================
CREATE TABLE IF NOT EXISTS midi_threshold_settings (
  id text PRIMARY KEY DEFAULT 'default',
  threshold_velocity int4 NOT NULL DEFAULT 64,
  hihat_max_velocity int4 NOT NULL DEFAULT 60,
  snare_min_velocity int4 NOT NULL DEFAULT 70,
  calibrated_at timestamptz DEFAULT now()
);

ALTER TABLE midi_threshold_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_midi_threshold" ON midi_threshold_settings;
CREATE POLICY "anon_select_midi_threshold" ON midi_threshold_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_midi_threshold" ON midi_threshold_settings;
CREATE POLICY "anon_insert_midi_threshold" ON midi_threshold_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_midi_threshold" ON midi_threshold_settings;
CREATE POLICY "anon_update_midi_threshold" ON midi_threshold_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_midi_threshold" ON midi_threshold_settings;
CREATE POLICY "anon_delete_midi_threshold" ON midi_threshold_settings FOR DELETE
  TO anon, authenticated USING (true);
