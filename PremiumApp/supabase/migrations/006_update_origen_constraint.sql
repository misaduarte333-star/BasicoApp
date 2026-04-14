-- Migration: Update Origen Constraint
-- Description: Adds 'telefono' and 'manual' to the allowed values for the 'origen' column in the 'citas' table.

ALTER TABLE citas 
DROP CONSTRAINT IF EXISTS citas_origen_check;

ALTER TABLE citas 
ADD CONSTRAINT citas_origen_check 
CHECK (origen IN ('whatsapp', 'walkin', 'telefono', 'manual'));

-- Comment: This fix is necessary because the tablet interface permits manual registration 
-- of appointments via phone calls (telefono), which was missing in the initial schema.
