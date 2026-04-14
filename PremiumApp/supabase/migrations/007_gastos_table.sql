-- ============================================================================
-- Table: gastos (Expenses)
-- ============================================================================
CREATE TABLE IF NOT EXISTS gastos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sucursal_id UUID REFERENCES sucursales(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  fecha_pago TIMESTAMP WITH TIME ZONE NOT NULL,
  pagado BOOLEAN DEFAULT FALSE,
  es_recurrente BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safely add recurrence columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gastos' AND column_name='es_recurrente') THEN
        ALTER TABLE gastos ADD COLUMN es_recurrente BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gastos' AND column_name='frecuencia') THEN
        ALTER TABLE gastos ADD COLUMN frecuencia TEXT DEFAULT 'mensual'; -- 'mensual', 'semanal', 'diario'
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gastos' AND column_name='dia_semana') THEN
        ALTER TABLE gastos ADD COLUMN dia_semana TEXT; -- 'lunes', 'martes', etc.
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gastos' AND column_name='dia_mes') THEN
        ALTER TABLE gastos ADD COLUMN dia_mes INTEGER; -- 1-31
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gastos' AND column_name='metodo_pago') THEN
        ALTER TABLE gastos ADD COLUMN metodo_pago TEXT; -- 'efectivo', 'tarjeta', 'transferencia'
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gastos' AND column_name='detalles_pago') THEN
        ALTER TABLE gastos ADD COLUMN detalles_pago TEXT;
    END IF;
END $$;

-- Indices for performance (Safe check)
CREATE INDEX IF NOT EXISTS idx_gastos_sucursal_fecha ON gastos(sucursal_id, fecha_pago);

-- Enable RLS (Safe check)
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

-- Development policy (Safe check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gastos' AND policyname = 'Allow all for authenticated users') THEN
        CREATE POLICY "Allow all for authenticated users" ON gastos FOR ALL USING (true);
    END IF;
END $$;

-- Trigger for updated_at (Safe check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_gastos_updated_at') THEN
        CREATE TRIGGER update_gastos_updated_at
            BEFORE UPDATE ON gastos
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
