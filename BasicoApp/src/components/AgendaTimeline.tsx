'use client'

import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { CitaConRelaciones } from '@/lib/types'
import { APP_TIMEZONE } from '@/lib/timezone'
import { CobroModal } from './CobroModal'

interface AgendaTimelineProps {
    citas: CitaConRelaciones[]
    currentTime: Date
    horaInicio?: number
    horaFin?: number
    onUpdate?: () => void
}

const INTERVALO_MINUTOS = 60
/** Altura en píxeles de cada slot de 1 hora — debe coincidir con min-h en el JSX */
const SLOT_PX = 80
/** Segundos de inactividad antes de volver al indicador de hora */
const INACTIVIDAD_SEG = 15

function generarSlots(horaInicio: number, horaFin: number): string[] {
    const slots: string[] = []
    for (let hora = horaInicio; hora < horaFin; hora++) {
        slots.push(`${hora.toString().padStart(2, '0')}:00`)
    }
    return slots
}

function formatSlot12h(slot: string): string {
    const [h] = slot.split(':').map(Number)
    const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h
    const ampm = h >= 12 ? 'pm' : 'am'
    return `${hour12}:00 ${ampm}`
}

function getCitaInfoEnSlot(
    slot: string,
    citas: CitaConRelaciones[],
    todayStr: string
): { cita: CitaConRelaciones; isStart: boolean; isLast: boolean } | null {
    const slotTime = new Date(`${todayStr}T${slot}:00-07:00`)
    const nextSlotMs = slotTime.getTime() + INTERVALO_MINUTOS * 60 * 1000

    const cita = citas.find(c => {
        if (c.estado === 'cancelada') return false
        const citaInicio = new Date(c.timestamp_inicio)
        const citaFin = new Date(c.timestamp_fin)
        return slotTime >= citaInicio && slotTime < citaFin
    })

    if (!cita) return null

    const citaInicio = new Date(cita.timestamp_inicio)
    const citaFin = new Date(cita.timestamp_fin)

    const isStart =
        slotTime <= citaInicio &&
        new Date(slotTime.getTime() + INTERVALO_MINUTOS * 60 * 1000) > citaInicio

    const isLast = nextSlotMs >= citaFin.getTime()

    return { cita, isStart, isLast }
}

const STATUS_COLORS: Record<string, { bar: string; border: string; text: string; badge: string }> = {
    confirmada:  { bar: 'bg-blue-500/25',    border: 'border-blue-500',    text: 'text-blue-300',    badge: 'bg-blue-500/20 text-blue-300' },
    en_proceso:  { bar: 'bg-emerald-500/25', border: 'border-emerald-500', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300' },
    finalizada:  { bar: 'bg-slate-500/20',   border: 'border-slate-500',   text: 'text-slate-400',   badge: 'bg-slate-500/20 text-slate-400' },
    cancelada:   { bar: 'bg-red-500/20',     border: 'border-red-500',     text: 'text-red-400',     badge: 'bg-red-500/20 text-red-400' },
}

function getColors(estado: string) {
    return STATUS_COLORS[estado] ?? STATUS_COLORS['finalizada']
}

const STATUS_LABELS: Record<string, string> = {
    confirmada: 'Confirmada',
    en_proceso: 'En proceso',
    finalizada: 'Finalizada',
    cancelada:  'Cancelada',
}

export function AgendaTimeline({
    citas,
    currentTime,
    horaInicio = 8,
    horaFin = 20,
    onUpdate,
}: AgendaTimelineProps) {
    const slots = useMemo(() => generarSlots(horaInicio, horaFin), [horaInicio, horaFin])
    const [citaParaCobro, setCitaParaCobro] = useState<CitaConRelaciones | null>(null)
    const [isMounted, setIsMounted] = useState(false)

    // Refs for auto-scroll
    const scrollRef = useRef<HTMLDivElement>(null)
    const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => { setIsMounted(true) }, [])

    // ─── Time calculations ──────────────────────────────────────────────────
    const currentHour = parseInt(
        currentTime.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false, timeZone: APP_TIMEZONE }), 10
    )
    const currentMinute = parseInt(
        currentTime.toLocaleTimeString('en-US', { minute: '2-digit', timeZone: APP_TIMEZONE }), 10
    )

    /**
     * Posición en píxeles de la barra roja:
     * cada slot de 1h = SLOT_PX px, los minutos se suman proporcional.
     */
    const minutesFromStart = (currentHour - horaInicio) * 60 + currentMinute
    const currentTimePx = (minutesFromStart / 60) * SLOT_PX

    /**
     * La barra roja solo se muestra si la hora actual está DENTRO del horario
     * de apertura de la sucursal recibido como props.
     */
    const dentroHorario = currentHour >= horaInicio && currentHour < horaFin

    const todayStr = currentTime.toLocaleDateString('en-CA', { timeZone: APP_TIMEZONE })

    // ─── Auto-scroll ────────────────────────────────────────────────────────

    /** Desplaza el contenedor para centrar la barra roja en el viewport */
    const scrollToCurrentTime = useCallback((smooth = true) => {
        const container = scrollRef.current
        if (!container || !dentroHorario) return
        const offset = container.clientHeight / 3   // mostrar 1/3 de espacio arriba
        const target = Math.max(0, currentTimePx - offset)
        container.scrollTo({ top: target, behavior: smooth ? 'smooth' : 'instant' })
    }, [currentTimePx, dentroHorario])

    /** Reinicia el temporizador de inactividad; al expirar vuelve a la barra */
    const resetInactivityTimer = useCallback(() => {
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
        inactivityTimer.current = setTimeout(() => {
            scrollToCurrentTime(true)
        }, INACTIVIDAD_SEG * 1000)
    }, [scrollToCurrentTime])

    // Al montar: scroll inicial sin animación (DOM ya pintado)
    useEffect(() => {
        const id = setTimeout(() => scrollToCurrentTime(false), 150)
        return () => clearTimeout(id)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // solo en mount

    // Cuando cambia la hora actual (cada minuto): si el usuario no está activo,
    // también actualizamos la posición (scroll suave)
    useEffect(() => {
        if (!dentroHorario) return
        resetInactivityTimer() // esto también disparará el scroll después de 15s de quietud
    }, [currentHour, currentMinute, dentroHorario, resetInactivityTimer])

    // Listener de scroll para detectar actividad del usuario
    useEffect(() => {
        const container = scrollRef.current
        if (!container) return
        const onScroll = () => resetInactivityTimer()
        container.addEventListener('scroll', onScroll, { passive: true })
        return () => {
            container.removeEventListener('scroll', onScroll)
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
        }
    }, [resetInactivityTimer])

    // ─── Render ─────────────────────────────────────────────────────────────
    return (
        <>
            {/* Contenedor scrollable */}
            <div ref={scrollRef} className="relative flex-1 overflow-y-auto pr-0.5 md:pr-2 scrollbar-hide">

                <div className="relative space-y-0">

                    {/* Barra de hora actual — solo visible dentro del horario de apertura */}
                    {dentroHorario && (
                        <div
                            className="current-time-line pointer-events-none"
                            style={{ top: `${currentTimePx}px`, zIndex: 20 }}
                        >
                            <span className="absolute left-0 -top-2.5 bg-red-500 text-white text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-sm font-bold shadow-sm z-50">
                                {currentTime.toLocaleTimeString('es-MX', {
                                    hour: '2-digit', minute: '2-digit',
                                    hour12: true, timeZone: APP_TIMEZONE
                                })}
                            </span>
                        </div>
                    )}

                    {slots.map((slot) => {
                        const citaInfo = getCitaInfoEnSlot(slot, citas, todayStr)
                        const isHour = true // todos los slots son de hora completa
                        const [slotHora] = slot.split(':').map(Number)
                        const isPast = slotHora < currentHour
                        const label = formatSlot12h(slot)

                        if (citaInfo) {
                            const { cita, isStart, isLast } = citaInfo
                            const colors = getColors(cita.estado)
                            const canCobrar = cita.estado === 'en_proceso' || cita.estado === 'confirmada'

                            if (isStart) {
                                const horaInicioCita = new Date(cita.timestamp_inicio)
                                    .toLocaleTimeString('es-MX', {
                                        hour: '2-digit', minute: '2-digit',
                                        hour12: true, timeZone: APP_TIMEZONE
                                    })
                                const horaFinCita = new Date(cita.timestamp_fin)
                                    .toLocaleTimeString('es-MX', {
                                        hour: '2-digit', minute: '2-digit',
                                        hour12: true, timeZone: APP_TIMEZONE
                                    })

                                return (
                                    <div
                                        key={slot}
                                        style={{ zIndex: 10 }}
                                        className={`
                                            relative flex items-stretch gap-1.5 md:gap-3
                                            px-1 md:px-2 border-t border-slate-700/30
                                            ${isPast && cita.estado === 'finalizada' ? 'opacity-50' : ''}
                                        `}
                                    >
                                        {/* Etiqueta de hora */}
                                        <div className="w-14 md:w-16 text-[9px] md:text-[11px] font-mono shrink-0 pt-3 leading-none text-slate-300 font-bold">
                                            {label}
                                        </div>

                                        {/* Bloque de cita */}
                                        <div
                                            className={`
                                                flex-1 min-w-0 min-h-[${SLOT_PX}px]
                                                rounded-t-xl ${isLast ? 'rounded-b-xl mb-1' : 'rounded-b-none'}
                                                border-l-4 ${colors.border} ${colors.bar}
                                                px-2.5 py-2 my-1
                                                flex flex-col gap-1 relative
                                            `}
                                        >
                                            <div className="flex items-center justify-between gap-1">
                                                <span className="text-[11px] md:text-sm text-white font-semibold truncate leading-tight min-w-0">
                                                    {cita.cliente_nombre}
                                                </span>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <span className={`text-[8px] md:text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${colors.badge}`}>
                                                        {STATUS_LABELS[cita.estado] ?? cita.estado}
                                                    </span>
                                                    {canCobrar && (
                                                        <button
                                                            onClick={() => setCitaParaCobro(cita)}
                                                            title="Cobrar y finalizar"
                                                            className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/50 border border-emerald-500/50 hover:border-emerald-400 flex items-center justify-center transition-all active:scale-90 group shrink-0"
                                                        >
                                                            <svg className="w-3 h-3 md:w-3.5 md:h-3.5 text-emerald-400 group-hover:text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    {cita.estado === 'finalizada' && cita.monto_pagado && (
                                                        <span className="text-[8px] font-bold text-emerald-400 whitespace-nowrap">
                                                            ${cita.monto_pagado.toLocaleString('es-MX')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-[10px] md:text-xs text-slate-400 truncate">
                                                {cita.servicio?.nombre ?? 'Servicio'}
                                            </span>
                                            <span className={`text-[9px] md:text-[10px] font-mono mt-0.5 ${colors.text}`}>
                                                {horaInicioCita} – {horaFinCita}
                                            </span>
                                        </div>
                                    </div>
                                )
                            }

                            /* Slot de continuación */
                            return (
                                <div
                                    key={slot}
                                    style={{ zIndex: 10 }}
                                    className={`
                                        relative flex items-stretch gap-1.5 md:gap-3
                                        px-1 md:px-2 min-h-[${SLOT_PX}px]
                                        ${isPast && cita.estado === 'finalizada' ? 'opacity-50' : ''}
                                        border-t border-slate-700/20
                                    `}
                                >
                                    <div className="w-14 md:w-16 text-[9px] md:text-[11px] font-mono shrink-0 leading-none flex items-center text-slate-500">
                                        {label}
                                    </div>
                                    <div className={`
                                        flex-1 min-w-0
                                        border-l-4 ${colors.border} ${colors.bar}
                                        ${isLast ? 'rounded-b-xl mb-1' : ''}
                                    `} />
                                </div>
                            )
                        }

                        /* Slot vacío */
                        return (
                            <div
                                key={slot}
                                className={`
                                    relative flex items-stretch gap-1.5 md:gap-3
                                    px-1 md:px-2 min-h-[${SLOT_PX}px]
                                    ${isPast ? 'opacity-40' : ''}
                                    border-t border-slate-700/30
                                    hover:bg-white/5 transition-colors duration-150 rounded-sm
                                `}
                            >
                                <div className="w-14 md:w-16 text-[9px] md:text-[11px] font-mono shrink-0 pt-3 leading-none text-slate-300 font-bold">
                                    {label}
                                </div>
                                <div className="flex-1 min-w-0 flex items-start pt-3">
                                    <div className="h-px bg-slate-700/30 w-full" />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* CobroModal montado en body vía portal */}
            {isMounted && citaParaCobro && createPortal(
                <CobroModal
                    cita={citaParaCobro}
                    onClose={() => setCitaParaCobro(null)}
                    onSuccess={() => {
                        setCitaParaCobro(null)
                        onUpdate?.()
                    }}
                />,
                document.body
            )}
        </>
    )
}
