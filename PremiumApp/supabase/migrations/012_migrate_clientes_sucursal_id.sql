-- 012_migrate_clientes_sucursal_id.sql
-- Migration: Agregar sucursal_id a tabla clientes existente
-- Objetivo: Cholo Barber (f07a7640-9d86-499f-a048-24109345787a)

-- 1. Agregar columna sucursal_id (si no existe)
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS sucursal_id uuid;

-- 2. Agregar foreign key constraint (ignora error si ya existe)
DO $$
BEGIN
    ALTER TABLE public.clientes 
    ADD CONSTRAINT clientes_sucursal_id_fkey 
    FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Asignar Cholo Barber a clientes existentes sin sucursal_id
UPDATE public.clientes
SET sucursal_id = 'f07a7640-9d86-499f-a048-24109345787a'
WHERE sucursal_id IS NULL;

-- 4. Verificar resultado
SELECT 
    id, 
    nombre, 
    telefono, 
    sucursal_id 
FROM public.clientes 
ORDER BY created_at DESC 
LIMIT 10;