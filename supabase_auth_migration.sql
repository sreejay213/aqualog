-- ============================================================
-- AquaLog — Auth Migration
-- Run this in your Supabase SQL Editor (Project → SQL Editor)
-- ============================================================

-- ── Step 1: Add user_id column to all tables ────────────────
ALTER TABLE public.tanks      ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.parameters ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.diary      ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.livestock  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.tasks      ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- ── Step 2: Enable Row Level Security ───────────────────────
ALTER TABLE public.tanks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livestock  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks      ENABLE ROW LEVEL SECURITY;

-- ── Step 3: Drop any old permissive anon policies ───────────
DROP POLICY IF EXISTS "anon full access" ON public.tanks;
DROP POLICY IF EXISTS "anon full access" ON public.parameters;
DROP POLICY IF EXISTS "anon full access" ON public.diary;
DROP POLICY IF EXISTS "anon full access" ON public.livestock;
DROP POLICY IF EXISTS "anon full access" ON public.tasks;

-- ── Step 4: RLS policies — each user sees only their rows ───

-- tanks
CREATE POLICY "users manage own tanks" ON public.tanks
  FOR ALL TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- parameters
CREATE POLICY "users manage own parameters" ON public.parameters
  FOR ALL TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- diary
CREATE POLICY "users manage own diary" ON public.diary
  FOR ALL TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- livestock
CREATE POLICY "users manage own livestock" ON public.livestock
  FOR ALL TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- tasks
CREATE POLICY "users manage own tasks" ON public.tasks
  FOR ALL TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Step 5: Explicit GRANTs (required after Oct 30 2026) ────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tanks      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parameters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diary      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.livestock  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks      TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ── Step 6: Assign existing rows to your account ────────────
-- After signing up, find your user id in Supabase:
--   Authentication → Users → copy your UUID
-- Then run:
--
-- UPDATE public.tanks      SET user_id = '<your-uuid>' WHERE user_id IS NULL;
-- UPDATE public.parameters SET user_id = '<your-uuid>' WHERE user_id IS NULL;
-- UPDATE public.diary      SET user_id = '<your-uuid>' WHERE user_id IS NULL;
-- UPDATE public.livestock  SET user_id = '<your-uuid>' WHERE user_id IS NULL;
-- UPDATE public.tasks      SET user_id = '<your-uuid>' WHERE user_id IS NULL;
