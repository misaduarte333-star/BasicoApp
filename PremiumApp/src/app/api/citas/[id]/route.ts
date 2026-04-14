import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import type { EstadoCita } from '@/lib/types'

// ─── Helper ────────────────────────────────────────────────────────────────
function ok(data: unknown, status = 200) {
    return NextResponse.json({ data, ok: true }, { status })
}
function err(error: string, message: string, status: number) {
    return NextResponse.json({ error, message, ok: false }, { status })
}

// ─── PATCH /api/citas/[id] ──────────────────────────────────────────────────
// Supports partial updates: estado, monto_pagado, metodo_pago, notas_crm,
// timestamp_inicio, timestamp_fin
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

    // Validate estado if provided
    const validEstados: EstadoCita[] = ['confirmada', 'en_espera', 'en_proceso', 'por_cobrar', 'finalizada', 'cancelada', 'no_show']
    if (body.estado && !validEstados.includes(body.estado as EstadoCita)) {
        return err('InvalidValue', `'estado' debe ser uno de: ${validEstados.join(', ')}`, 400)
    }

    // Whitelist allowed update fields and map local names to physical columns
    const allowedFields = [
        'estado', 'monto_pagado', 'metodo_pago', 'notas_crm', 'notas',
        'timestamp_inicio', 'timestamp_fin', 'barbero_id', 'servicio_id',
        'timestamp_inicio_servicio', 'timestamp_fin_servicio', 'duracion_real_minutos',
        'cliente_nombre', 'cliente_telefono'
    ]
    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    
    // Map _local fields if present
    if (body.timestamp_inicio_local !== undefined) updatePayload.timestamp_inicio = body.timestamp_inicio_local
    if (body.timestamp_fin_local !== undefined) updatePayload.timestamp_fin = body.timestamp_fin_local

    for (const field of allowedFields) {
        if (body[field] !== undefined) updatePayload[field] = body[field]
    }

    try {
        const { data, error } = await (supabase.from('citas') as any)
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            if (error.code === 'PGRST116') return err('NotFound', `Cita '${id}' no encontrada`, 404)
            throw error
        }

        return ok(data)
    } catch (e: any) {
        console.error('[PATCH /api/citas/[id]]', e)
        return err('UpdateError', e.message, 500)
    }
}

// ─── DELETE /api/citas/[id] ─────────────────────────────────────────────────
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = createClient()
    const { id } = await params

    if (!id) return err('MissingParam', 'El parámetro id es requerido', 400)

    try {
        const { error } = await (supabase.from('citas') as any)
            .delete()
            .eq('id', id)

        if (error) {
            if (error.code === 'PGRST116') return err('NotFound', `Cita '${id}' no encontrada`, 404)
            throw error
        }

        return new NextResponse(null, { status: 204 })
    } catch (e: any) {
        console.error('[DELETE /api/citas/[id]]', e)
        return err('DeleteError', e.message, 500)
    }
}
