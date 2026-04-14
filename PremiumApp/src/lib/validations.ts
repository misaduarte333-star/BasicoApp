import { createClient } from './supabase'
import type {
    ValidacionResultado,
    DiasSemana,
    HorarioApertura,
    HorarioLaboralSemana,
    BloqueAlmuerzo
} from './types'

// ============================================================================
// Helper: Get day of week in Spanish
// ============================================================================
function getDiaSemana(fecha: Date): DiasSemana {
    const dias: DiasSemana[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    return dias[fecha.getDay()]
}

// ============================================================================
// Helper: Check if time is within a range
// ============================================================================
function dentroDeHorario(hora: string, horario?: { inicio?: string; fin?: string; apertura?: string; cierre?: string }): boolean {
    if (!horario) return false

    const inicio = horario.inicio || horario.apertura
    const fin = horario.fin || horario.cierre

    if (!inicio || !fin) return false

    return hora >= inicio && hora < fin
}

// ============================================================================
// Helper: Check if time overlaps with lunch block
// ============================================================================
function dentroDeBloqueAlmuerzo(horaInicio: string, horaFin: string, bloqueo: BloqueAlmuerzo): boolean {
    // Check if the appointment time range overlaps with lunch block
    return !(horaFin <= bloqueo.inicio || horaInicio >= bloqueo.fin)
}

// ============================================================================
// Helper: Check if two time ranges overlap
// ============================================================================
function hayOverlap(inicio1: Date, fin1: Date, inicio2: Date, fin2: Date): boolean {
    // Permisivo en las fronteras: solo hay solapamiento si los rangos realmente se cruzan
    // Si uno termina exactamente donde empieza el otro (fin1 === inicio2), NO es solapamiento.
    return inicio1 < fin2 && fin1 > inicio2
}

// ============================================================================
// Main Validation Function - Triple Cascade
// ============================================================================
export async function validarDisponibilidad(
    sucursalId: string,
    profesionalId: string,
    timestampInicio: Date,
    duracionMinutos: number,
    excludeCitaId?: string
): Promise<ValidacionResultado> {
    const supabase = createClient()
    const timestampFin = new Date(timestampInicio.getTime() + duracionMinutos * 60000)

    // Extraction in America/Hermosillo timezone to avoid server-local time issues
    const formatTime = (d: Date) => d.toLocaleTimeString('en-GB', {
        timeZone: 'America/Hermosillo',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    })

    const formatDay = (d: Date) => d.toLocaleDateString('es-ES', {
        timeZone: 'America/Hermosillo',
        weekday: 'long'
    }).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") as DiasSemana

    const diaSemana = formatDay(timestampInicio)
    const horaInicio = formatTime(timestampInicio)
    const horaFin = formatTime(timestampFin)

    // ========================================================================
    // LEVEL 1: Validate branch hours
    // ========================================================================
    const { data: sucursal, error: sucursalError } = await (supabase
        .from('sucursales') as any)
        .select('horario_apertura, activa')
        .eq('id', sucursalId)
        .single()

    if (sucursalError || !sucursal) {
        return { valido: false, mensaje: 'Sucursal no encontrada' }
    }

    if (!sucursal.activa) {
        return { valido: false, mensaje: 'La sucursal no está activa' }
    }

    const horarioSucursal = sucursal.horario_apertura as HorarioApertura
    const horarioDia = horarioSucursal[diaSemana]

    if (!horarioDia) {
        return { valido: false, mensaje: `La sucursal no abre los ${diaSemana}` }
    }

    if (!dentroDeHorario(horaInicio, horarioDia) || !dentroDeHorario(horaFin, horarioDia)) {
        return {
            valido: false,
            mensaje: `Fuera del horario de la sucursal (${horarioDia.apertura} - ${horarioDia.cierre})`
        }
    }

    // ========================================================================
    // LEVEL 2: Validate professional schedule
    // ========================================================================
    const { data: profesional, error: profesionalError } = await (supabase
        .from('barberos') as any)
        .select('horario_laboral, bloqueo_almuerzo, activo, nombre')
        .eq('id', profesionalId)
        .single()

    if (profesionalError || !profesional) {
        return { valido: false, mensaje: 'Profesional no encontrado' }
    }

    if (!profesional.activo) {
        return { valido: false, mensaje: 'El profesional no está activo' }
    }

    const horarioProfesional = profesional.horario_laboral as HorarioLaboralSemana
    const horarioLaboralDia = horarioProfesional[diaSemana]

    if (!horarioLaboralDia) {
        return { valido: false, mensaje: `${profesional.nombre} no trabaja los ${diaSemana}` }
    }

    if (!dentroDeHorario(horaInicio, horarioLaboralDia)) {
        return {
            valido: false,
            mensaje: `${profesional.nombre} trabaja de ${horarioLaboralDia.inicio} a ${horarioLaboralDia.fin}`
        }
    }

    // Check lunch block
    const bloqueoAlmuerzo = profesional.bloqueo_almuerzo as BloqueAlmuerzo | null
    if (bloqueoAlmuerzo && dentroDeBloqueAlmuerzo(horaInicio, horaFin, bloqueoAlmuerzo)) {
        return {
            valido: false,
            mensaje: `${profesional.nombre} está en hora de almuerzo (${bloqueoAlmuerzo.inicio} - ${bloqueoAlmuerzo.fin})`
        }
    }

    // ========================================================================
    // LEVEL 3: Check for overlapping appointments
    // ========================================================================
    // Calculation for start/end day in America/Hermosillo
    // to filter appointments correctly in the database
    const startOfDay = new Date(timestampInicio.toLocaleString('en-US', { timeZone: 'America/Hermosillo' }))
    startOfDay.setHours(0, 0, 0, 0)
    // Shift back to UTC adjusted (rough estimation but works since we use ISO strings)
    // A more precise way:
    const getHermosilloDayRange = (d: Date) => {
        const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Hermosillo' }).format(d)
        return {
            start: `${fmt}T00:00:00-07:00`,
            end: `${fmt}T23:59:59-07:00`
        }
    }
    const range = getHermosilloDayRange(timestampInicio)

    let query = (supabase.from('citas') as any)
        .select('id, timestamp_inicio, timestamp_fin')
        .eq('barbero_id', profesionalId)
        .neq('estado', 'cancelada')
        .neq('estado', 'no_show')
        .gte('timestamp_inicio', range.start)
        .lte('timestamp_fin', range.end)

    if (excludeCitaId) {
        query = query.neq('id', excludeCitaId)
    }

    const { data: citasExistentes, error: citasError } = await query

    if (citasError) {
        console.error('Error checking appointments:', citasError)
        return { valido: false, mensaje: 'Error al verificar disponibilidad' }
    }

    for (const cita of citasExistentes || []) {
        const citaInicio = new Date(cita.timestamp_inicio)
        const citaFin = new Date(cita.timestamp_fin)

        if (hayOverlap(timestampInicio, timestampFin, citaInicio, citaFin)) {
            return {
                valido: false,
                mensaje: 'Ya hay una cita programada en ese horario'
            }
        }
    }

    // ========================================================================
    // LEVEL 4: Check for active blocks
    // ========================================================================
    const { data: bloqueosActivos, error: bloqueosError } = await (supabase
        .from('bloqueos') as any)
        .select('tipo, motivo')
        .eq('sucursal_id', sucursalId)
        .or(`barbero_id.eq.${profesionalId},barbero_id.is.null`)
        .lte('timestamp_inicio', timestampFin.toISOString())
        .gte('timestamp_fin', timestampInicio.toISOString())

    if (bloqueosError) {
        console.error('Error checking blocks:', bloqueosError)
    }

    if (bloqueosActivos && bloqueosActivos.length > 0) {
        const bloqueo = bloqueosActivos[0]
        const tipoMensaje: Record<string, string> = {
            almuerzo: 'hora de almuerzo',
            vacaciones: 'vacaciones',
            dia_festivo: 'día festivo',
            emergencia: 'emergencia'
        }

        return {
            valido: false,
            mensaje: `No disponible por ${tipoMensaje[bloqueo.tipo] || bloqueo.tipo}${bloqueo.motivo ? `: ${bloqueo.motivo}` : ''}`
        }
    }

    // ========================================================================
    // All validations passed
    // ========================================================================
    return { valido: true }
}

// ============================================================================
// Find next available slots
// ============================================================================
export async function buscarAlternativas(
    sucursalId: string,
    profesionalId: string,
    fechaBase: Date,
    duracionMinutos: number,
    cantidad: number = 3
): Promise<string[]> {
    const alternativas: string[] = []
    const horaActual = new Date(fechaBase)

    // Round to next 15-minute slot
    const minutos = horaActual.getMinutes()
    const siguienteSlot = Math.ceil(minutos / 15) * 15
    horaActual.setMinutes(siguienteSlot, 0, 0)

    let intentos = 0
    const maxIntentos = 48 // Check up to 12 hours (48 x 15min slots)

    while (alternativas.length < cantidad && intentos < maxIntentos) {
        horaActual.setMinutes(horaActual.getMinutes() + 15)
        intentos++

        const resultado = await validarDisponibilidad(
            sucursalId,
            profesionalId,
            horaActual,
            duracionMinutos
        )

        if (resultado.valido) {
            alternativas.push(horaActual.toISOString())
        }
    }

    return alternativas
}
