-- ============================================================================
-- Migration: Add barbero_id to gastos and meta_cortes to barberos
-- ============================================================================

-- Add barbero_id to gastos table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gastos' AND column_name='barbero_id') THEN
        ALTER TABLE gastos ADD COLUMN barbero_id UUID REFERENCES barberos(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add meta_cortes_mensual to barberos table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barberos' AND column_name='meta_cortes_mensual') THEN
        ALTER TABLE barberos ADD COLUMN meta_cortes_mensual INTEGER DEFAULT 100;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barberos' AND column_name='comision_porcentaje') THEN
        ALTER TABLE barberos ADD COLUMN comision_porcentaje INTEGER DEFAULT 50;
    END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_gastos_barbero_id ON gastos(barbero_id);

-- Update RLS for gastos to allow barberos to see their own expenses
-- Assuming auth.uid() can be linked to barbero_id if we have a users table, 
-- but for now we'll stick to the existing "Allow all for authenticated users" policy 
-- or refine it if the user has a more strict RLS setup.
