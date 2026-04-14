'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { cn, getHermosilloMins, getMinsFromHermosilloString, parseLocalTimestamp } from '@/lib/utils'
import { 
    Clock, 
    User, 
    Scissors, 
    Ban, 
    Coffee, 
    Calendar,
    ChevronRight,
    CircleDot
} from 'lucide-react'
import type { CitaDesdeVista, Barbero, Sucursal, Bloqueo, DiasSemana } from '@/lib/types'
import { Badge } from '@/components/ui/badge'

interface AdminDailyCalendarProps {
    citas: CitaDesdeVista[]
    barberos: Barbero[]
    currentTime: Date
    sucursal: Sucursal | null
    bloqueos: Bloqueo[]
}

const HORA_INICIO = 8
const HORA_FIN = 21 // Till 9 PM
const MINUTE_HEIGHT = 1.8 // Slightly taller to allow more padding inside cards
const HEADER_HEIGHT = 48 

function generarSlots(): { h: number, m: number }[] {
    const slots: { h: number, m: number }[] = []
    for (let hora = HORA_INICIO; hora <= HORA_FIN; hora++) {
        slots.push({ h: hora, m: 0 })
        if (hora < HORA_FIN) {
            slots.push({ h: hora, m: 30 })
        }
    }
    return slots
}

export function AdminDailyCalendar({ citas, barberos, currentTime, sucursal, bloqueos }: AdminDailyCalendarProps) {
    const slots = useMemo(() => generarSlots(), [])
    const sortedBarberos = useMemo(() => {
        return [...barberos].sort((a, b) => {
            const aEst = a.estacion_id ?? 999
            const bEst = b.estacion_id ?? 999
            return aEst - bEst
        })
    }, [barberos])
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [isUserScrolling, setIsUserScrolling] = useState(false)
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const currentMins = getHermosilloMins(currentTime)
    const dayStartMinutes = HORA_INICIO * 60

    const getTimeY = (totalMinutes: number) => {
        return ((totalMinutes - dayStartMinutes) * MINUTE_HEIGHT) + HEADER_HEIGHT
    }

    const currentTimeY = getTimeY(currentMins)

    const englishDay = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Hermosillo',
        weekday: 'long'
    }).format(currentTime).toLowerCase()

    const currentDayName: DiasSemana = 
        englishDay === 'monday' ? 'lunes' :
        englishDay === 'tuesday' ? 'martes' :
        englishDay === 'wednesday' ? 'miercoles' :
        englishDay === 'thursday' ? 'jueves' :
        englishDay === 'friday' ? 'viernes' :
        englishDay === 'saturday' ? 'sabado' :
        englishDay === 'sunday' ? 'domingo' : 'lunes' // fallback

    const horarioHoy = sucursal?.horario_apertura?.[currentDayName]

    useEffect(() => {
        if (!isUserScrolling && scrollContainerRef.current && currentMins >= (HORA_INICIO * 60) && currentMins < (HORA_FIN * 60)) {
            const containerHeight = scrollContainerRef.current.clientHeight
            const targetPosition = Math.max(0, currentTimeY - (containerHeight / 2))

            scrollContainerRef.current.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            })
        }
    }, [currentMins, isUserScrolling, currentTimeY])

    const handleUserScroll = () => {
        setIsUserScrolling(true)
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = setTimeout(() => {
            setIsUserScrolling(false)
        }, 5000)
    }

    const getStatusColor = (estado: string) => {
        switch (estado) {
            case 'confirmada':
            case 'en_espera': return 'border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-500 shadow-[0_0_15px_-5px_rgba(245,158,11,0.2)]'
            case 'en_proceso': return 'border-emerald-500 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]'
            case 'por_cobrar': return 'border-blue-500 bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)]'
            case 'finalizada': return 'border-slate-400/30 bg-muted/50 text-slate-500 dark:text-slate-400'
            case 'cancelada':
            case 'no_show': return 'border-red-500/60 bg-red-500/10 text-red-600 dark:text-red-400'
            default: return 'border-border bg-muted/30 text-muted-foreground'
        }
    }

    const renderCitaBlock = (cita: CitaDesdeVista) => {
        const start = parseLocalTimestamp(cita.timestamp_inicio_local || '')
        const end = parseLocalTimestamp(cita.timestamp_fin_local || '')
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return null

        const startMins = getMinsFromHermosilloString(cita.timestamp_inicio_local || '')
        const endMins = getMinsFromHermosilloString(cita.timestamp_fin_local || '')
        const startY = getTimeY(startMins) - HEADER_HEIGHT
        const height = 30 * MINUTE_HEIGHT // Fixed 30min height as requested

        const isEnProceso = cita.estado === 'en_proceso'
        const isPorCobrar = cita.estado === 'por_cobrar'

        let activeTimer = null
        if (isEnProceso && cita.timestamp_inicio_servicio) {
            const minTrasncurridos = Math.floor((new Date().getTime() - parseLocalTimestamp(cita.timestamp_inicio_servicio!).getTime()) / 60000)
            const horas = Math.floor(minTrasncurridos / 60)
            const mins = minTrasncurridos % 60
            activeTimer = horas > 0 ? `${horas}h ${mins}m` : `${mins}m`
        } else if (isPorCobrar && cita.duracion_real_minutos) {
            const horas = Math.floor(cita.duracion_real_minutos / 60)
            const mins = cita.duracion_real_minutos % 60
            activeTimer = horas > 0 ? `${horas}h ${mins}m` : `${mins}m`
        }

        return (
            <div
                key={cita.id}
                className={cn(
                    "absolute left-0 right-0 mx-1 rounded-xl border-l-[5px] px-3 py-1.5 flex flex-col justify-start overflow-hidden backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:z-30 cursor-pointer",
                    getStatusColor(cita.estado),
                    "z-20 pointer-events-auto group ring-1 ring-border/10 active:scale-95"
                )}
                style={{
                    top: `${startY}px`,
                    height: `${height}px`,
                }}
            >
                <div className="flex items-center justify-between gap-1 w-full min-w-0">
                    <span className="text-[11px] font-black uppercase tracking-tight truncate leading-none text-foreground drop-shadow-sm">
                        {cita.cliente_nombre || 'Sin Nombre'}
                    </span>
                    {activeTimer && (
                        <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-primary/30 shrink-0 shadow-[0_0_10px_rgba(212,175,55,0.2)]">
                            <Clock className="size-3 text-primary animate-pulse" />
                            <span className="text-[9px] font-black tabular-nums text-primary uppercase tracking-tight">{activeTimer}</span>
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-1 mt-0.5 opacity-80 overflow-hidden">
                    <Scissors className="size-2.5 shrink-0" />
                    <span className="text-[9px] font-bold uppercase tracking-tighter truncate leading-none">
                        {cita.servicio_nombre}
                    </span>
                </div>

                {cita.servicio_precio && (
                    <div className="mt-auto pt-0.5 flex items-center justify-between border-t border-border/10">
                        <span className="text-[8px] font-black text-foreground/40 uppercase tracking-[0.1em]">
                            {cita.timestamp_inicio_local?.split(' ')[1]?.substring(0, 5) || ''}
                        </span>
                        <span className="text-[9px] font-black text-primary/80 leading-none">
                            ${cita.servicio_precio}
                        </span>
                    </div>
                )}
            </div>
        )
    }

    const renderBloqueoProp = (bloqueo: Bloqueo) => {
        const fechaInicio = bloqueo.timestamp_inicio_local || bloqueo.fecha_inicio || ''
        const fechaFin = bloqueo.timestamp_fin_local || bloqueo.fecha_fin || ''
        const start = new Date(fechaInicio)
        const end = new Date(fechaFin)
        const startMins = getMinsFromHermosilloString(fechaInicio)
        const endMins = getMinsFromHermosilloString(fechaFin)
        const startY = getTimeY(startMins) - HEADER_HEIGHT
        const height = 30 * MINUTE_HEIGHT // Fixed 30min height as requested

        return (
            <div
                key={bloqueo.id}
                className="absolute left-0 right-0 mx-1.5 rounded-xl border-l-[5px] border-red-500/50 bg-red-500/10 p-2 flex flex-col items-center justify-center overflow-hidden z-10 ring-1 ring-border/10 backdrop-blur-sm"
                style={{ top: `${startY}px`, height: `${height}px` }}
            >
                <Ban className="size-4 text-red-500/40 mb-1" />
                <span className="text-[9px] font-black uppercase text-red-500/60 tracking-tighter truncate w-full text-center">
                    {bloqueo.motivo || 'OCUPADO'}
                </span>
            </div>
        )
    }

    const renderAlmuerzo = (barbero: Barbero) => {
        if (!barbero.bloqueo_almuerzo) return null
        const startMins = parseInt(barbero.bloqueo_almuerzo.inicio.substring(0, 2)) * 60 + parseInt(barbero.bloqueo_almuerzo.inicio.substring(3, 5))
        const endMins = parseInt(barbero.bloqueo_almuerzo.fin.substring(0, 2)) * 60 + parseInt(barbero.bloqueo_almuerzo.fin.substring(3, 5))
        const sY = getTimeY(startMins) - HEADER_HEIGHT
        const height = 30 * MINUTE_HEIGHT // Fixed 30min height as requested

        return (
            <div
                key={`almuerzo-${barbero.id}`}
                className="absolute left-0 right-0 mx-1.5 rounded-xl border-l-[5px] border-amber-500/30 bg-amber-500/10 p-2 flex items-center justify-center overflow-hidden z-10 ring-1 ring-border/10 backdrop-blur-sm"
                style={{ top: `${sY}px`, height: `${height}px` }}
            >
                <div className="rotate-[-10deg] opacity-60 flex items-center gap-1.5">
                    <Coffee className="size-4 text-amber-500/50" />
                    <span className="text-[10px] font-black uppercase text-amber-500/50 tracking-widest hidden sm:inline">RECESO</span>
                </div>
            </div>
        )
    }

    const dentroHorario = currentMins >= (HORA_INICIO * 60) && currentMins < (HORA_FIN * 60)

    return (
        <div className="relative h-[650px] md:h-[850px] flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl backdrop-blur-xl transition-colors duration-300">
            <div className="flex items-center gap-2.5 p-3 md:p-4 border-b border-border bg-gradient-to-r from-muted/40 to-transparent">
                <div className="size-8 md:size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
                    <Calendar className="size-4 md:size-5 shadow-sm" />
                </div>
                <div className="flex-1">
                    <h2 className="text-base md:text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2 leading-none">
                        Control <span className="text-primary italic">Global</span>
                    </h2>
                    <p className="text-[8px] md:text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-1">Monitoreo Live</p>
                </div>
                <div className="flex items-center gap-2 bg-muted px-2.5 py-1 rounded-xl border border-border">
                    <div className="size-1 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    <span className="text-[8px] md:text-[9px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-widest leading-none">Live</span>
                </div>
            </div>

            <div
                ref={scrollContainerRef}
                onScroll={handleUserScroll}
                className="flex-1 overflow-auto custom-scrollbar relative bg-muted/20"
            >
                <div className="relative flex min-w-full" style={{ height: `${(HORA_FIN - HORA_INICIO) * 60 * MINUTE_HEIGHT + HEADER_HEIGHT + 20}px` }}>

                    {/* Columna de Horas (Integral) */}
                    <div className="sticky left-0 z-[60] w-20 bg-card border-r border-border h-full">
                        <div className="absolute top-0 left-0 right-0 h-12 border-b border-border z-[60] bg-card" />
                        <div className="relative h-full pt-12">
                            {slots.map((slot, i) => (
                                <div
                                    key={`axis-${i}`}
                                    className="absolute w-full border-b border-border/20"
                                    style={{ top: `${getTimeY(slot.h * 60 + slot.m)}px`, height: `${30 * MINUTE_HEIGHT}px` }}
                                >
                                    <span className={`absolute -top-2 left-0 right-0 text-right pr-4 font-black uppercase leading-none tracking-tighter ${slot.m === 30 ? 'text-muted-foreground/60 text-[9px]' : 'text-muted-foreground text-[11px] md:text-xs'}`}>
                                        {slot.h >= 12 
                                            ? `${slot.h === 12 ? 12 : slot.h - 12}${slot.m === 30 ? ':30' : ''} PM` 
                                            : `${slot.h}${slot.m === 30 ? ':30' : ''} AM`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 relative flex h-full min-w-[max-content]">
                        <div className="flex-1 flex min-w-0">
                            {sortedBarberos.map((barbero, idx) => (
                                <div key={`col-${barbero.id}`} className="min-w-[140px] md:min-w-[170px] flex-1 border-r border-border relative bg-gradient-to-b from-transparent to-muted/5">
                                    <div className="sticky top-0 h-12 bg-card/95 backdrop-blur-xl border-b border-primary/20 flex flex-col items-center justify-center z-40 px-3 group/header">
                                        <div className="flex items-center gap-1.5 md:gap-2">
                                            <div className="size-1.5 md:size-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
                                            <p className="text-[10px] md:text-[11px] font-black text-foreground uppercase tracking-[0.1em] truncate transition-all group-hover/header:text-primary">
                                                {barbero.nombre.split(' ')[0]}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <span className="text-[6px] md:text-[7px] font-black text-muted-foreground uppercase tracking-widest bg-muted px-1 md:px-1.5 rounded-full border border-border">
                                                EST. {barbero.estacion_id || idx + 1}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="relative h-full">
                                        <div className="absolute inset-0 z-0">
                                            {slots.map((slot, sIdx) => (
                                                <div 
                                                    key={`slot-${barbero.id}-${sIdx}`} 
                                                    className="w-full hover:bg-muted/10 transition-colors border-b border-border/10" 
                                                    style={{ height: `${30 * MINUTE_HEIGHT}px` }}
                                                />
                                            ))}
                                        </div>
                                        
                                        <div className="relative h-full pointer-events-none z-10">
                                            <div className="relative h-full pointer-events-auto">
                                                {renderAlmuerzo(barbero)}
                                                {bloqueos.filter(b => b.barbero_id === barbero.id).map(renderBloqueoProp)}
                                                {citas
                                                    .filter(c => String(c.barbero_id).toLowerCase() === String(barbero.id).toLowerCase() && c.estado !== 'cancelada')
                                                    .map(renderCitaBlock)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {dentroHorario && (
                                <div
                                    className="absolute left-0 right-0 h-[2px] bg-red-500 z-50 pointer-events-none shadow-[0_0_15px_rgba(239,68,68,0.8)]"
                                    style={{ top: `${currentTimeY}px` }}
                                >
                                    <div className="absolute -left-1 -top-1 size-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)]" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-3 md:p-5 bg-card border-t border-border flex flex-wrap items-center justify-center gap-4 md:gap-8">
                <div className="flex items-center gap-2 md:gap-3 group">
                    <div className="size-1.5 md:size-2 rounded-full bg-amber-500 ring-2 md:ring-4 ring-amber-500/10 group-hover:scale-125 transition-transform" />
                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground transition-colors">Confirmada</span>
                </div>
                <div className="flex items-center gap-2 md:gap-3 group">
                    <div className="size-1.5 md:size-2 rounded-full bg-emerald-500 ring-2 md:ring-4 ring-emerald-500/10 group-hover:scale-125 transition-transform" />
                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground transition-colors">En Proceso</span>
                </div>
                <div className="flex items-center gap-2 md:gap-3 group">
                    <div className="size-1.5 md:size-2 rounded-full bg-blue-500 ring-2 md:ring-4 ring-blue-500/10 group-hover:scale-125 transition-transform" />
                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground transition-colors">Por Cobrar</span>
                </div>
                <div className="flex items-center gap-2 md:gap-3 group">
                    <div className="size-1.5 md:size-2 rounded-full bg-red-500/40 group-hover:scale-125 transition-transform" />
                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground transition-colors">Ocupado</span>
                </div>
                <div className="flex items-center gap-2 md:gap-3 group">
                    <div className="size-1.5 md:size-2 rounded-full bg-amber-600/40 group-hover:scale-125 transition-transform" />
                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground transition-colors">Receso</span>
                </div>
            </div>
        </div>
    )
}
