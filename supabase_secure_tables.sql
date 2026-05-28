-- ============================================================
-- AquaLog — Supabase Table Security
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ── 1. Explicit GRANTs (required after Oct 30 2026) ─────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tanks      TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parameters TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diary      TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.livestock  TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks      TO anon, authenticated;

-- Also grant sequence usage so INSERT with serial/bigserial IDs works
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ── 2. Enable Row Level Security on all tables ───────────────
ALTER TABLE public.tanks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livestock  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks      ENABLE ROW LEVEL SECURITY;

-- ── 3. RLS Policies ─────────────────────────────────────────
-- Since AquaLog uses the anon key with no user auth,
-- we allow full access to the anon role.
-- If you add Supabase Auth in the future, tighten these to
-- use (auth.uid() = user_id) instead.

-- tanks
CREATE POLICY "anon full access" ON public.tanks
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- parameters
CREATE POLICY "anon full access" ON public.parameters
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- diary
CREATE POLICY "anon full access" ON public.diary
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- livestock
CREATE POLICY "anon full access" ON public.livestock
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- tasks
CREATE POLICY "anon full access" ON public.tasks
  FOR ALL TO anon USING (true) WITH CHECK (true);
