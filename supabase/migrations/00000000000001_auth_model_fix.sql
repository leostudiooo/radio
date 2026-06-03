-- Migration: Auth model fix - RLS policies, admin role, per-operation access
-- Depends on: 00000000000000_initial_schema.sql

-- ============================================================
-- A. Add role column to profiles
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user'));

-- ============================================================
-- B. Replace handle_new_user with advisory-lock version
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(1);
  IF NOT EXISTS (SELECT 1 FROM public.profiles) THEN
    INSERT INTO public.profiles (id, callsign, role)
    VALUES (new.id, new.raw_user_meta_data->>'callsign', 'admin');
  ELSE
    INSERT INTO public.profiles (id, callsign, role)
    VALUES (new.id, new.raw_user_meta_data->>'callsign', 'user');
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- C. Anti-demotion trigger (prevent last admin demotion)
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_last_admin_demotion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role = 'admin' AND NEW.role != 'admin' THEN
    IF (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') <= 1 THEN
      RAISE EXCEPTION 'Cannot demote the last admin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_admin_demotion ON public.profiles;
CREATE TRIGGER check_admin_demotion
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_admin_demotion();

-- ============================================================
-- D. Drop old FOR ALL policies, create per-operation RLS
-- ============================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can CRUD own QSOs" ON public.qsos;
DROP POLICY IF EXISTS "Users can CRUD own equipment" ON public.equipment;
DROP POLICY IF EXISTS "Users can CRUD own QSL cards" ON public.qsl_cards;

-- QSOS
CREATE POLICY "Anyone can read qsos" ON public.qsos
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Auth users can insert qsos" ON public.qsos
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = profile_id);
CREATE POLICY "Auth users can update own qsos" ON public.qsos
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = profile_id)
  WITH CHECK ((select auth.uid()) = profile_id);
CREATE POLICY "Auth users can delete own qsos" ON public.qsos
  FOR DELETE TO authenticated USING ((select auth.uid()) = profile_id);

-- EQUIPMENT
CREATE POLICY "Anyone can read equipment" ON public.equipment
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Auth users can insert equipment" ON public.equipment
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = profile_id);
CREATE POLICY "Auth users can update own equipment" ON public.equipment
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = profile_id)
  WITH CHECK ((select auth.uid()) = profile_id);
CREATE POLICY "Auth users can delete own equipment" ON public.equipment
  FOR DELETE TO authenticated USING ((select auth.uid()) = profile_id);

-- QSL_CARDS (no profile_id — uses subquery to qsos.profile_id)
CREATE POLICY "Anyone can read qsl_cards" ON public.qsl_cards
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Auth users can insert qsl_cards" ON public.qsl_cards
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IN (SELECT profile_id FROM public.qsos WHERE id = qso_id));
CREATE POLICY "Auth users can update own qsl_cards" ON public.qsl_cards
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) IN (SELECT profile_id FROM public.qsos WHERE id = qso_id))
  WITH CHECK ((select auth.uid()) IN (SELECT profile_id FROM public.qsos WHERE id = qso_id));
CREATE POLICY "Auth users can delete own qsl_cards" ON public.qsl_cards
  FOR DELETE TO authenticated
  USING ((select auth.uid()) IN (SELECT profile_id FROM public.qsos WHERE id = qso_id));

-- ============================================================
-- E. Add INSERT policy for profiles (keep existing SELECT/UPDATE)
-- ============================================================
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = id);

-- ============================================================
-- F. GRANT statements
-- ============================================================
GRANT SELECT ON public.qsos TO anon;
GRANT SELECT ON public.equipment TO anon;
GRANT SELECT ON public.qsl_cards TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.qsos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qsl_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- ============================================================
-- G. Indexes for RLS performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_qsos_profile_id ON public.qsos(profile_id);
CREATE INDEX IF NOT EXISTS idx_equipment_profile_id ON public.equipment(profile_id);
