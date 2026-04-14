-- Migración para la Galería de Cortes vinculada a Servicios
-- Permite que los barberos suban fotos por cada tipo de servicio para n8n

CREATE TABLE IF NOT EXISTS public.fotos_cortes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    barbero_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    servicio_id UUID REFERENCES public.servicios(id) ON DELETE CASCADE NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(barbero_id, servicio_id)
);

-- Habilitar RLS
ALTER TABLE public.fotos_cortes ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad
CREATE POLICY "Barberos pueden gestionar sus fotos" ON public.fotos_cortes 
FOR ALL USING (auth.uid() = barbero_id);

CREATE POLICY "Fotos son públicas para lectura" ON public.fotos_cortes 
FOR SELECT USING (true);
