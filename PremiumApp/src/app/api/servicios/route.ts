import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// ─── Helper ────────────────────────────────────────────────────────────────
function ok(data: unknown, status = 200) {
    return NextResponse.json({ data, ok: true }, { status })
}
function err(error: string, message: string, status: number) {
    return NextResponse.json({ error, message, ok: false }, { status })
}

// ─── GET /api/servicios ─────────────────────────────────────────────────────
// Query params: activo (true|false)
export async function GET(req: NextRequest) {
    const supabase = createClient()
    const { searchParams } = new URL(req.url)
    const activo = searchParams.get('activo')

    try {
        let query = (supabase.from('servicios') as any)
            .select('*')
            .order('precio', { ascending: true })

        if (activo !== null) {
            query = query.eq('activo', activo === 'true')
        }

        const { data, error } = await query
        if (error) throw error
        return ok(data)
    } catch (e: any) {
        console.error('[GET /api/servicios]', e)
        return err('FetchError', e.message, 500)
    }
}

// ─── POST /api/servicios ────────────────────────────────────────────────────
// Body: { nombre, precio, duracion_minutos, activo? }
export async function POST(req: NextRequest) {
    const supabase = createClient()

    let body: Record<string, unknown>
    try {
        body = await req.json()
    } catch {
        return err('InvalidBody', 'Request body must be valid JSON', 400)
    }

    const required = ['nombre', 'precio', 'duracion_minutos'] as const
    for (const field of required) {
        if (body[field] === undefined || body[field] === null || body[field] === '') {
            return err('MissingField', `El campo '${field}' es requerido`, 400)
        }
    }

    // Use sucursal_id from the request body (set by the client from auth context)
    const sucursalId = body.sucursal_id as string | undefined
    if (!sucursalId) {
        // Fallback: fetch first active sucursal (legacy behavior)
        const { data: suc } = await (supabase.from('sucursales') as any)
            .select('id').eq('activa', true).limit(1).single()
        if (!suc) return err('NotFound', 'No hay sucursal activa configurada', 404)
        body.sucursal_id = suc.id
    }

    const newServicio = {
        sucursal_id: body.sucursal_id,
        nombre: body.nombre,
        precio: parseFloat(body.precio as string),
        duracion_minutos: parseInt(body.duracion_minutos as string),
        activo: body.activo !== undefined ? body.activo : true,
    }

    try {
        const { data, error } = await (supabase.from('servicios') as any)
            .insert([newServicio])
            .select()
            .single()

        if (error) throw error
        return ok(data, 201)
    } catch (e: any) {
        console.error('[POST /api/servicios]', e)
        return err('InsertError', e.message, 500)
    }
}
