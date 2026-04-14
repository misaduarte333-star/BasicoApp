-- ============================================================================
-- Fix RLS for Tablet Dashboard (Public/Anon Access)
-- ============================================================================

-- Since the tablet app currently uses a custom local session (localStorage) 
-- instead of Supabase Auth, we need to allow the 'anon' role to update citas.

-- 1. Allow anon to SELECT citas (needed to populate the dashboard)
CREATE POLICY "Allow anon to select citas" ON citas
FOR SELECT TO anon USING (true);

-- 2. Allow anon to UPDATE citas (needed for Attend, Checkout, Move, etc.)
CREATE POLICY "Allow anon to update citas" ON citas
FOR UPDATE TO anon USING (true);

-- 3. Ensure the anon role has basic USAGE on the schema and table
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON TABLE citas TO anon;
GRANT ALL ON TABLE barberos TO anon;
GRANT ALL ON TABLE servicios TO anon;
GRANT ALL ON TABLE sucursales TO anon;

-- Note: In a production environment with sensitive data, these policies 
-- should be more restrictive (e.g. checking a secret key in the request).
