-- ============================================================================
-- BarberCloud AI - Cortes de Turno
-- ============================================================================

CREATE TABLE IF NOT EXISTS cortes_turno (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbero_id UUID REFERENCES barberos(id) ON DELETE CASCADE,
  sucursal_id UUID REFERENCES sucursales(id) ON DELETE CASCADE,
  fecha_corte DATE NOT NULL,
  monto_bruto DECIMAL(10,2) NOT NULL DEFAULT 0,
  comision_barbero DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_servicios INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(barbero_id, fecha_corte)
);

-- Performance indexes
CREATE INDEX idx_cortes_barbero_fecha ON cortes_turno(barbero_id, fecha_corte);
CREATE INDEX idx_cortes_sucursal ON cortes_turno(sucursal_id);

-- RLS
ALTER TABLE cortes_turno ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON cortes_turno
  FOR ALL USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE cortes_turno;
