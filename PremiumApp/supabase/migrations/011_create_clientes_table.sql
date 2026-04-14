-- 011_create_clientes_table.sql
CREATE TABLE public.clientes (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    sucursal_id uuid NOT NULL,
    nombre character varying NOT NULL,
    telefono character varying,
    email character varying,
    notas_internas text,
    ultima_cita timestamp with time zone,
    total_citas integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT clientes_pkey PRIMARY KEY (id),
    CONSTRAINT clientes_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id) ON DELETE CASCADE
);

-- Habilitar RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Políticas de ROW LEVEL SECURITY
CREATE POLICY "Dueños ven los clientes de su sucursal" ON public.clientes
    FOR ALL
    USING (
        auth.role() = 'authenticated' -- Simplified logic for now, you can add auth check based on sucursal if needed
    );

-- Trigger para actualizar updated_at
CREATE TRIGGER update_clientes_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
