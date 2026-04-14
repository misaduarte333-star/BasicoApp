import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// ─── Helper ────────────────────────────────────────────────────────────────
function ok(data: unknown, status = 200) {
    return NextResponse.json({ data, ok: true }, { status })
}
function err(error: string, message: string, status: number) {
    return NextResponse.json({ error, message, ok: false }, { status })
}

// ─── PATCH /api/servicios/[id] ──────────────────────────────────────────────
// Body: { nombre?, precio?, duracion_minutos?, activo? }
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = createClient()
    const { id } = await params

    if (!id) return err('MissingParam', 'El parámetro id es requerido', 400)

    let body: Record<string, unknown>
    try {
        body = await req.json()
    } catch {
        return err('InvalidBody', 'Request body must be valid JSON', 400)
    }

    if (Object.keys(body).length === 0) {
        return err('EmptyBody', 'Se requiere al menos un campo para actualizar', 400)
    }

    const allowedFields = ['nombre', 'precio', 'duracion_minutos', 'activo']
    const updatePayload: Record<string, unknown> = {}
    for (const field of allowedFields) {
        if (body[field] !== undefined) updatePayload[field] = body[field]
    }

    if (updatePayload.precio !== undefined) {
        updatePayload.precio = parseFloat(updatePayload.precio as string)
    }
    if (updatePayload.duracion_minutos !== undefined) {
        updatePayload.duracion_minutos = parseInt(updatePayload.duracion_minutos as string)
    }

    try {
        const { data, error } = await (supabase.from('servicios') as any)
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            if (error.code === 'PGRST116') return err('NotFound', `Servicio '${id}' no encontrado`, 404)
            throw error
        }

        return ok(data)
    } catch (e: any) {
        console.error('[PATCH /api/servicios/[id]]', e)
        return err('UpdateError', e.message, 500)
    }
}

// ─── DELETE /api/servicios/[id] ─────────────────────────────────────────────
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = createClient()
    const { id } = await params

    if (!id) return err('MissingParam', 'El parámetro id es requerido', 400)

    try {
        const { error } = await (supabase.from('servicios') as any)
            .delete()
            .eq('id', id)

        if (error) {
            if (error.code === 'PGRST116') return err('NotFound', `Servicio '${id}' no encontrado`, 404)
            throw error
        }

        return new NextResponse(null, { status: 204 })
    } catch (e: any) {
        console.error('[DELETE /api/servicios/[id]]', e)
        return err('DeleteError', e.message, 500)
    }
}
