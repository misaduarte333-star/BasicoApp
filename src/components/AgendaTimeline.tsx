'use client'

import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase'
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
const SLOT_PX = 80
const INACTIVIDAD_SEG = 15

// ── ESTADO_CONFIG — idéntico al de CitaCard ─────────────────────────────────
const ESTADO_CONFIG = {
    en_proceso: {
        wrapper: 'bg-[#E1F5EE] border-[#1D9E75] dark:bg-emerald-950/40 dark:border-[#1D9E75]',
        name: 'text-[#04342C] dark:text-emerald-300',
        service: 'text-[#0F6E56] dark:text-emerald-400',
        time: 'text-[#5DCAA5] dark:text-emerald-500',
        badge: 'bg-[#9FE1CB] text-[#085041] dark:bg-emerald-900/80 dark:text-emerald-200',
        payBtn: 'bg-[#1D9E75] dark:bg-emerald-600 text-white',
        label: 'En proceso',
        icon: 'pay' as const,
    },
    confirmada: {
        wrapper: 'bg-[#EEEDFE] border-[#534AB7] dark:bg-indigo-950/40 dark:border-[#7F77DD]',
        name: 'text-[#26215C] dark:text-indigo-300',
        service: 'text-[#7F77DD] dark:text-indigo-400',
        time: 'text-[#AFA9EC] dark:text-indigo-500',
        badge: 'bg-[#CECBF6] text-[#3C3489] dark:bg-indigo-900/80 dark:text-indigo-200',
        payBtn: 'bg-[#534AB7] dark:bg-indigo-600 text-white',
        label: 'Confirmada',
        icon: 'play' as const,
    },
    finalizada: {
        wrapper: 'bg-[#F1EFE8] border-[#B4B2A9] dark:bg-slate-800/40 dark:border-slate-600',
        name: 'text-[#444441] dark:text-slate-300',
        service: 'text-[#888780] dark:text-slate-400',
        time: 'text-[#B4B2A9] dark:text-slate-500',
        badge: 'bg-[#D3D1C7] text-[#5F5E5A] dark:bg-slate-700 dark:text-slate-200',
        payBtn: 'bg-[#888780] dark:bg-slate-600 text-white',
        label: 'Finalizada',
        icon: 'check' as const,
    },
    cancelada: {
        wrapper: 'bg-[#FDE2E2] border-[#E53E3E] dark:bg-red-950/40 dark:border-[#E53E3E]',
        name: 'text-[#742A2A] dark:text-red-300',
        service: 'text-[#9B2C2C] dark:text-red-400',
        time: 'text-[#F56565] dark:text-red-500',
        badge: 'bg-[#FED7D7] text-[#822727] dark:bg-red-900/80 dark:text-red-200',
        payBtn: 'bg-[#E53E3E] dark:bg-red-600 text-white',
        label: 'Cancelada',
        icon: 'check' as const,
    },
} as const

type EstadoKey = keyof typeof ESTADO_CONFIG

function getConfig(estado: string) {
    return ESTADO_CONFIG[estado as EstadoKey] ?? ESTADO_CONFIG.confirmada
}

// ── Iconos ───────────────────────────────────────────────────────────────────
function IconPay() {
    return (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
    )
}
function IconPlay() {
    return (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    )
}
function IconCheck() {
    return (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
    )
}

// ── Helpers ──────────────────────────────────────────────────────────────────
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

function formatHora(iso: string) {
    return new Date(iso).toLocaleTimeString('es-MX', {
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: APP_TIMEZONE,
    })
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
    const isStart = slotTime <= citaInicio && new Date(slotTime.getTime() + INTERVALO_MINUTOS * 60 * 1000) > citaInicio
    const isLast = nextSlotMs >= citaFin.getTime()
    return { cita, isStart, isLast }
}

// ── Componente principal ─────────────────────────────────────────────────────
export function AgendaTimeline({
    citas,
    currentTime,
    horaInicio = 8,
    horaFin = 20,
    onUpdate,
}: AgendaTimelineProps) {
    const slots = useMemo(() => generarSlots(horaInicio, horaFin), [horaInicio, horaFin])
    const [citaParaCobro, setCitaParaCobro] = useState<CitaConRelaciones | null>(null)
    const [loading, setLoading] = useState<string | null>(null)
    const [isMounted, setIsMounted] = useState(false)
    const [supabase] = useState(() => createClient())

    const actualizarEstado = async (citaId: string, nuevoEstado: string) => {
        setLoading(citaId)
        try {
            const { error } = await (supabase.from('citas') as any)
                .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
                .eq('id', citaId)

            if (!error && onUpdate) onUpdate()
        } catch (err) {
            console.error('Error updating status:', err)
        } finally {
            setLoading(null)
        }
    }

    const scrollRef = useRef<HTMLDivElement>(null)
    const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => { setIsMounted(true) }, [])

    const currentHour = parseInt(
        currentTime.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false, timeZone: APP_TIMEZONE }), 10
    )
    const currentMinute = parseInt(
        currentTime.toLocaleTimeString('en-US', { minute: '2-digit', timeZone: APP_TIMEZONE }), 10
    )

    const minutesFromStart = (currentHour - horaInicio) * 60 + currentMinute
    const currentTimePx = (minutesFromStart / 60) * SLOT_PX
    const dentroHorario = currentHour >= horaInicio && currentHour < horaFin

    const todayStr = currentTime.toLocaleDateString('en-CA', { timeZone: APP_TIMEZONE })

    const scrollToCurrentTime = useCallback((smooth = true) => {
        const container = scrollRef.current
        if (!container || !dentroHorario) return
        const offset = container.clientHeight / 3
        const target = Math.max(0, currentTimePx - offset)
        container.scrollTo({ top: target, behavior: smooth ? 'smooth' : 'instant' })
    }, [currentTimePx, dentroHorario])

    const resetInactivityTimer = useCallback(() => {
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
        inactivityTimer.current = setTimeout(() => scrollToCurrentTime(true), INACTIVIDAD_SEG * 1000)
    }, [scrollToCurrentTime])

    useEffect(() => {
        const id = setTimeout(() => scrollToCurrentTime(false), 150)
        return () => clearTimeout(id)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (!dentroHorario) return
        resetInactivityTimer()
    }, [currentHour, currentMinute, dentroHorario, resetInactivityTimer])

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

    return (
        <>
            {/* Leyenda de colores */}
            <div className="flex flex-wrap items-center gap-3 md:gap-5 px-1 md:px-2 pb-3 mb-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded bg-[#1D9E75]"></div>
                    <span className="text-[10px] md:text-[11px] font-medium text-slate-600 dark:text-slate-300">En proceso</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded bg-[#534AB7]"></div>
                    <span className="text-[10px] md:text-[11px] font-medium text-slate-600 dark:text-slate-300">Confirmada</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded bg-[#B4B2A9]"></div>
                    <span className="text-[10px] md:text-[11px] font-medium text-slate-600 dark:text-slate-300">Finalizada</span>
                </div>
            </div>

            <div ref={scrollRef} className="relative flex-1 overflow-y-auto pr-0.5 md:pr-2 scrollbar-hide">
                <div className="relative space-y-0">

                    {/* Barra de hora actual */}
                    {dentroHorario && (
                        <div
                            className="current-time-line pointer-events-none"
                            style={{ top: `${currentTimePx}px`, zIndex: 20 }}
                        >
                            <span className="absolute left-0 -top-2.5 bg-red-500 text-white text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-sm font-bold shadow-sm z-50">
                                {currentTime.toLocaleTimeString('es-MX', {
                                    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: APP_TIMEZONE,
                                })}
                            </span>
                        </div>
                    )}

                    {slots.map((slot) => {
                        const citaInfo = getCitaInfoEnSlot(slot, citas, todayStr)
                        const [slotHora] = slot.split(':').map(Number)
                        const isPast = slotHora < currentHour
                        const label = formatSlot12h(slot)

                        if (citaInfo) {
                            const { cita, isStart, isLast } = citaInfo
                            let estado = (cita.estado || 'confirmada') as string
                            if (estado === 'pendiente') {
                                estado = 'confirmada'
                            }
                            const cfg = getConfig(estado)
                            const esFinalizada = estado === 'finalizada' || estado === 'cancelada'

                            // Slot de inicio — aquí va la tarjeta completa (igual que CitaCard)
                            if (citaInfo.isStart) {
                                return (
                                    <div
                                        key={slot}
                                        style={{ zIndex: 10 }}
                                        className={`
                                            relative flex items-start gap-1.5 md:gap-3
                                            px-1 md:px-2
                                            border-t border-slate-200 dark:border-slate-700/30
                                            ${isPast && esFinalizada ? 'opacity-50' : ''}
                                        `}
                                    >
                                        {/* Etiqueta hora */}
                                        <div className="w-14 md:w-16 text-[10px] md:text-[11px] font-mono shrink-0 pt-3.5 leading-none text-slate-500 dark:text-slate-400">
                                            {label}
                                        </div>

                                        {/*
                                         * ── TARJETA — mismo layout que CitaCard ──────────────
                                         * border-l-[3px] + rounded-r + flex items-center
                                         * con: info | badge | botón(es)
                                         */}
                                        <div
                                            className={`
                                                flex-1 min-w-0 my-1.5
                                                flex items-center gap-2
                                                border-l-[3px] rounded-r-[10px]
                                                px-3 py-2.5
                                                transition-opacity duration-200
                                                ${cfg.wrapper}
                                                ${esFinalizada ? 'opacity-70' : ''}
                                            `}
                                        >
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-[12px] md:text-[13px] font-medium leading-tight truncate ${cfg.name}`}>
                                                    {cita.cliente_nombre}
                                                </p>
                                                <p className={`text-[11px] mt-0.5 truncate ${cfg.service}`}>
                                                    {cita.servicio?.nombre ?? 'Servicio'}
                                                </p>
                                                <p className={`text-[10px] font-mono mt-0.5 ${cfg.time}`}>
                                                    {formatHora(cita.timestamp_inicio)} – {formatHora(cita.timestamp_fin)}
                                                </p>
                                            </div>

                                            {/* Badge */}
                                            <span className={`text-[9px] md:text-[10px] font-medium rounded-md px-2 py-1 shrink-0 whitespace-nowrap ${cfg.badge}`}>
                                                {cfg.label}
                                            </span>

                                            {/* Botón de acción */}
                                            {estado === 'en_proceso' && (
                                                <button
                                                    onClick={() => setCitaParaCobro(cita)}
                                                    title="Cobrar y finalizar"
                                                    className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.payBtn} active:scale-90 transition-transform shadow-sm`}
                                                >
                                                    <IconPay />
                                                </button>
                                            )}

                                            {estado === 'confirmada' && (
                                                <button
                                                    onClick={() => actualizarEstado(cita.id, 'en_proceso')}
                                                    disabled={loading === cita.id}
                                                    title="Iniciar atención"
                                                    className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.payBtn} active:scale-90 transition-transform shadow-sm disabled:opacity-50`}
                                                >
                                                    {loading === cita.id ? (
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <IconPlay />
                                                    )}
                                                </button>
                                            )}



                                            {esFinalizada && (
                                                <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center shrink-0 opacity-80 ${cfg.payBtn}`}>
                                                    <IconCheck />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            }

                            // Slot de continuación (cita que sigue de hora anterior)
                            return (
                                <div
                                    key={slot}
                                    style={{ zIndex: 10 }}
                                    className={`
                                        relative flex items-stretch gap-1.5 md:gap-3
                                        px-1 md:px-2
                                        min-h-[${SLOT_PX}px]
                                        border-t border-slate-100 dark:border-slate-700/20
                                        ${isPast && esFinalizada ? 'opacity-50' : ''}
                                    `}
                                >
                                    <div className="w-14 md:w-16 text-[9px] md:text-[11px] font-mono shrink-0 leading-none flex items-center text-slate-400 dark:text-slate-500">
                                        {label}
                                    </div>
                                    {/* Extensión visual de la tarjeta */}
                                    <div
                                        className={`
                                            flex-1 min-w-0
                                            border-l-[3px] ${cfg.wrapper}
                                            ${isLast ? 'rounded-br-[10px] mb-1.5' : ''}
                                        `}
                                    />
                                </div>
                            )
                        }

                        // ── Slot vacío ───────────────────────────────────────────────────
                        return (
                            <div
                                key={slot}
                                className={`
                                    relative flex items-stretch gap-1.5 md:gap-3
                                    px-1 md:px-2 min-h-[${SLOT_PX}px]
                                    border-t border-slate-200 dark:border-slate-700/30
                                    ${isPast ? 'opacity-40' : ''}
                                    hover:bg-slate-50 dark:hover:bg-white/5 transition-colors duration-150 rounded-sm
                                `}
                            >
                                <div className="w-14 md:w-16 text-[10px] md:text-[11px] font-mono shrink-0 pt-3 leading-none text-slate-500 dark:text-slate-400">
                                    {label}
                                </div>
                                <div className="flex-1 min-w-0 flex items-start pt-3">
                                    <div className="h-px bg-slate-200 dark:bg-slate-700/30 w-full" />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* CobroModal */}
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