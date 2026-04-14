import { NextRequest, NextResponse } from 'next/server'
import { validarDisponibilidad, buscarAlternativas } from '@/lib/validations'

// ─── Helper ────────────────────────────────────────────────────────────────
function ok(data: unknown, status = 200) {
    return NextResponse.json({ data, ok: true }, { status })
}
function err(error: string, message: string, status: number) {
    return NextResponse.json({ error, message, ok: false }, { status })
}

// ─── GET /api/disponibilidad ────────────────────────────────────────────────
// Query params:
//   sucursal_id (required)
//   barbero_id  (required) - ID del profesional (columna barbero_id en BD)
//   timestamp   (required) - ISO 8601 string
//   duracion    (required) - minutes as integer
//   alternativas (optional) - "true" to also return next available slots
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)

    const sucursal_id = searchParams.get('sucursal_id')
    const barbero_id = searchParams.get('barbero_id')
    const timestamp = searchParams.get('timestamp')
    const duracion = searchParams.get('duracion')
    const withAlternativas = searchParams.get('alternativas') === 'true'

    // Validate required params
    if (!sucursal_id) return err('MissingParam', "'sucursal_id' es requerido", 400)
    if (!barbero_id) return err('MissingParam', "'barbero_id' es requerido", 400)
    if (!timestamp) return err('MissingParam', "'timestamp' es requerido (ISO 8601)", 400)
    if (!duracion) return err('MissingParam', "'duracion' (minutos) es requerido", 400)

    const fechaInicio = new Date(timestamp)
    if (isNaN(fechaInicio.getTime())) {
        return err('InvalidValue', "'timestamp' no es una fecha ISO 8601 válida", 400)
    }

    const duracionMinutos = parseInt(duracion)
    if (isNaN(duracionMinutos) || duracionMinutos <= 0) {
        return err('InvalidValue', "'duracion' debe ser un número entero positivo", 400)
    }

    try {
        const resultado = await validarDisponibilidad(
            sucursal_id,
            barbero_id,
            fechaInicio,
            duracionMinutos
        )

        let alternativas: string[] = []
        if (!resultado.valido && withAlternativas) {
            alternativas = await buscarAlternativas(
                sucursal_id,
                barbero_id,
                fechaInicio,
                duracionMinutos,
                3
            )
        }

        const response = {
            disponible: resultado.valido,
            mensaje: resultado.mensaje || null,
            ...(withAlternativas && { alternativas }),
        }

        // 409 Conflict if time slot is taken
        const status = resultado.valido ? 200 : 409
        return NextResponse.json({ data: response, ok: true }, { status })
    } catch (e: any) {
        console.error('[GET /api/disponibilidad]', e)
        return err('ValidationError', e.message, 500)
    }
}
