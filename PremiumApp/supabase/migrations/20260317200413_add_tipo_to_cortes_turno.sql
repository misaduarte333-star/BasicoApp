-- Añadir columna tipo a la tabla cortes_turno
ALTER TABLE public.cortes_turno 
ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'diario';

-- Actualizar la restricción de unicidad para permitir un cierre diario y uno semanal por barbero y fecha (o rango)
-- Primero eliminamos la restricción antigua si existe
ALTER TABLE public.cortes_turno 
DROP CONSTRAINT IF EXISTS cortes_turno_barbero_id_fecha_corte_key;

-- Creamos la nueva restricción que incluye el tipo
ALTER TABLE public.cortes_turno 
ADD CONSTRAINT cortes_turno_barbero_id_fecha_corte_tipo_key UNIQUE (barbero_id, fecha_corte, tipo);

-- Comentario informativo
COMMENT ON COLUMN public.cortes_turno.tipo IS 'Define si el corte es diario o semanal';
