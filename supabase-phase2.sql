-- ═══════════════════════════════════════════════════════════════
-- LiftOff Free – Phase 2 Schema (Workout)
-- Im Supabase SQL Editor ausführen
-- ═══════════════════════════════════════════════════════════════

-- ── Phase 1 Tabelle (falls noch nicht vorhanden) ──────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  avatar_url    TEXT,
  level         INTEGER NOT NULL DEFAULT 1,
  xp            INTEGER NOT NULL DEFAULT 0,
  streak_days   INTEGER NOT NULL DEFAULT 0,
  last_workout_date DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── Workout Plans ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  days_per_week   INTEGER,
  difficulty      TEXT DEFAULT 'Anfänger',
  goal            TEXT,
  duration_weeks  INTEGER DEFAULT 8,
  is_ai_generated BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plans_all" ON workout_plans;
CREATE POLICY "plans_all" ON workout_plans FOR ALL USING (auth.uid() = user_id);

-- ── Plan Days ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_plan_days (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  day_number  INTEGER NOT NULL,
  name        TEXT NOT NULL,
  focus       TEXT
);

ALTER TABLE workout_plan_days ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plan_days_all" ON workout_plan_days;
CREATE POLICY "plan_days_all" ON workout_plan_days
  FOR ALL USING (
    EXISTS (SELECT 1 FROM workout_plans p WHERE p.id = workout_plan_days.plan_id AND p.user_id = auth.uid())
  );

-- ── Plan Exercises ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_plan_exercises (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id          UUID NOT NULL REFERENCES workout_plan_days(id) ON DELETE CASCADE,
  exercise_id     TEXT,
  exercise_name   TEXT NOT NULL,
  sets            INTEGER NOT NULL DEFAULT 3,
  reps_range      TEXT DEFAULT '8-12',
  rest_seconds    INTEGER DEFAULT 90,
  notes           TEXT,
  sort_order      INTEGER DEFAULT 0
);

ALTER TABLE workout_plan_exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plan_exercises_all" ON workout_plan_exercises;
CREATE POLICY "plan_exercises_all" ON workout_plan_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workout_plan_days d
      JOIN workout_plans p ON p.id = d.plan_id
      WHERE d.id = workout_plan_exercises.day_id AND p.user_id = auth.uid()
    )
  );

-- ── Workout Sessions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at       TIMESTAMPTZ,
  duration_minutes  INTEGER,
  total_volume      DECIMAL(10,2) DEFAULT 0,
  exercises_count   INTEGER DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sessions_all" ON workout_sessions;
CREATE POLICY "sessions_all" ON workout_sessions FOR ALL USING (auth.uid() = user_id);

-- ── Session Exercises ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_session_exercises (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id     TEXT,
  exercise_name   TEXT NOT NULL,
  sort_order      INTEGER DEFAULT 0
);

ALTER TABLE workout_session_exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "session_exercises_all" ON workout_session_exercises;
CREATE POLICY "session_exercises_all" ON workout_session_exercises
  FOR ALL USING (
    EXISTS (SELECT 1 FROM workout_sessions s WHERE s.id = workout_session_exercises.session_id AND s.user_id = auth.uid())
  );

-- ── Sets ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_sets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_exercise_id   UUID NOT NULL REFERENCES workout_session_exercises(id) ON DELETE CASCADE,
  set_number            INTEGER DEFAULT 1,
  reps                  INTEGER,
  weight_kg             DECIMAL(6,2),
  completed             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sets_all" ON workout_sets;
CREATE POLICY "sets_all" ON workout_sets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workout_session_exercises se
      JOIN workout_sessions s ON s.id = se.session_id
      WHERE se.id = workout_sets.session_exercise_id AND s.user_id = auth.uid()
    )
  );

-- ── XP Function ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION add_xp(user_id UUID, amount INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  current_xp INTEGER;
  current_level INTEGER;
  new_xp INTEGER;
  new_level INTEGER;
  xp_needed INTEGER;
BEGIN
  SELECT xp, level INTO current_xp, current_level FROM profiles WHERE id = user_id;
  new_xp := COALESCE(current_xp, 0) + amount;
  new_level := current_level;

  -- Level up check (simple: 500 XP per level)
  LOOP
    xp_needed := new_level * 500;
    EXIT WHEN new_xp < xp_needed;
    new_xp := new_xp - xp_needed;
    new_level := new_level + 1;
  END LOOP;

  UPDATE profiles SET xp = new_xp, level = new_level, updated_at = NOW() WHERE id = user_id;
END;
$$;
