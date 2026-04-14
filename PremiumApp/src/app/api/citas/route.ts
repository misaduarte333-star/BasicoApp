import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { EstadoCita, OrigenCita, Database } from '@/lib/types'

// ─── Helper ────────────────────────────────────────────────────────────────
function ok(data: unknown, status = 200) {
    return NextResponse.json({ data, ok: true }, { status })
}
function err(error: string, message: string, status: number) {
    return NextResponse.json({ error, message, ok: false }, { status })
}

// ─── GET /api/citas ─────────────────────────────────────────────────────────
// Query params: fecha (YYYY-MM-DD), estado, barbero_id
export async function GET(req: NextRequest) {
    const supabase = createClient()
    const { searchParams } = new URL(req.url)

    const fecha = searchParams.get('fecha')
    const estado = searchParams.get('estado') as EstadoCita | null
    const barbero_id = searchParams.get('barbero_id')

    try {
        // Auditoría de Seguridad: 
        // Se utiliza 'vista_citas_app' para asegurar que el frontend siempre trabaje 
        // con la vista optimizada para la aplicación.
        let query = (supabase.from('vista_citas_app') as any)
            .select('*')
            .order('timestamp_inicio_local', { ascending: true })

        if (fecha) query = query.eq('fecha_cita_local', fecha)
        if (estado) query = query.eq('estado', estado)
        if (barbero_id) query = query.eq('barbero_id', barbero_id)

        const { data, error } = await query

        if (error) throw error
        return ok(data)
    } catch (e: any) {
        console.error('[GET /api/citas]', e)
        return err('FetchError', e.message, 500)
    }
}

// ─── POST /api/citas ────────────────────────────────────────────────────────
// Body: { sucursal_id, barbero_id, servicio_id, cliente_nombre, cliente_telefono,
//         timestamp_inicio, timestamp_fin, origen, notas? }
export async function POST(req: NextRequest) {
    // Usar Service Role Key para evadir el RLS en el servidor al insertar manualmente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false }
    })

    let body: Record<string, unknown>
    try {
        body = await req.json()
    } catch {
        return err('InvalidBody', 'Request body must be valid JSON', 400)
    }

    // Unified timestamp handling: Accept either native or local names
    const tInicio = (body.timestamp_inicio || body.timestamp_inicio_local) as string
    const tFin = (body.timestamp_fin || body.timestamp_fin_local) as string

    if (!body.cliente_nombre || !tInicio || !tFin || !body.origen) {
        return err('MissingField', "Los campos 'cliente_nombre', 'timestamp_inicio' (o local), 'timestamp_fin' (o local) y 'origen' son requeridos", 400)
    }

    // Validate origen enum
    const validOrigens: OrigenCita[] = ['whatsapp', 'walkin', 'telefono']
    if (!validOrigens.includes(body.origen as OrigenCita)) {
        return err('InvalidValue', `'origen' debe ser uno de: ${validOrigens.join(', ')}`, 400)
    }

    // If no sucursal_id provided, fetch the first active one
    let sucursalId = body.sucursal_id as string | null
    if (!sucursalId) {
        const { data: suc } = await (supabase.from('sucursales') as any)
            .select('id').eq('activa', true).limit(1).single()
        if (!suc) return err('NotFound', 'No hay sucursal activa configurada', 404)
        sucursalId = suc.id
    }

    const initialEstado = (body.origen as OrigenCita) === 'walkin' ? 'en_espera' : 'confirmada'

    const newCita = {
        sucursal_id: sucursalId,
        barbero_id: body.barbero_id || null,
        servicio_id: (body.servicio_id === 'custom' ? null : body.servicio_id) || null,
        cliente_id: body.cliente_id || null,
        cliente_nombre: body.cliente_nombre,
        cliente_telefono: body.cliente_telefono || '',
        timestamp_inicio: tInicio,
        timestamp_fin: tFin,
        origen: body.origen,
        estado: body.estado || initialEstado,
        notas: body.notas || null,
    }

    try {
        const { data, error } = await (supabase.from('citas') as any)
            .insert([newCita])
            .select()
            .single()

        if (error) {
            // Handle specifically the case where a deleted barber ID was passed
            if (error.code === '23503' && error.message.includes('barbero_id')) {
                return err('InvalidBarber', 'El barbero asignado no existe o fue eliminado.', 400)
            }
            throw error
        }

        return ok(data, 201)
    } catch (e: any) {
        console.error('[POST /api/citas]', e)
        return err('InsertError', e.message, 500)
    }
}
