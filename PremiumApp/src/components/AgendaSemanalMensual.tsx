'use client'

import { useMemo, useState, useEffect } from 'react'
import type { CitaDesdeVista } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'
import { Ban, Utensils, BarChart3, CheckCircle2, Wallet, AlertCircle, CircleDollarSign, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, parseLocalTimestamp } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"

interface AgendaSemanalMensualProps {
    citas: CitaDesdeVista[]
    bloqueos: any[]
    almuerzoBarbero: any
    fecha: string
    vista: 'semana' | 'mes'
    onUpdate: () => void
}

const getStatusColor = (estado: string) => {
    switch (estado) {
        case 'confirmada': return 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
        case 'en_espera': return 'bg-yellow-500/20 border-yellow-500 text-yellow-100'
        case 'en_proceso': return 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
        case 'por_cobrar': return 'bg-blue-500/20 border-blue-500 text-blue-400'
        case 'finalizada': return 'bg-zinc-500/20 border-zinc-500 text-zinc-300'
        case 'cancelada': return 'bg-red-500/20 border-red-500 text-red-400'
        case 'no_show': return 'bg-red-500/20 border-red-500 text-red-400'
        default: return 'bg-slate-700/50 border-slate-600 text-white'
    }
}

// ---------------------------------------------------------------------------
// VISTA SEMANAL
// ---------------------------------------------------------------------------
const HOUR_HEIGHT = 60 // px per hour
const START_HOUR = 8
const END_HOUR = 22
const TOTAL_HOURS = END_HOUR - START_HOUR

function VistaSemanal({ citas, bloqueos, almuerzoBarbero, days }: { citas: CitaDesdeVista[], bloqueos: any[], almuerzoBarbero: any, days: { dateStr: string, label: string }[] }) {
    const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i)

    const parseTimeStr = (dateStr: string, timeStr: string) => {
        // timeStr format: "14:30"
        return new Date(`${dateStr}T${timeStr}:00-07:00`)
    }

    const calculateStyles = (start: Date, end: Date) => {
        const startH = start.getHours() + start.getMinutes() / 60
        const endH = end.getHours() + end.getMinutes() / 60

        let topH = startH - START_HOUR
        if (topH < 0) topH = 0

        let durH = endH - startH
        if (startH < START_HOUR) durH -= (START_HOUR - startH)
        if (topH + durH > TOTAL_HOURS) durH = TOTAL_HOURS - topH

        return {
            top: `${topH * HOUR_HEIGHT}px`,
            height: `${durH * HOUR_HEIGHT}px`,
            display: durH <= 0 ? 'none' : 'flex'
        }
    }

    return (
        <div className="bg-black/40 border border-white/5 rounded-2xl shadow-lg backdrop-blur-md h-[70vh] min-h-[500px] flex flex-col overflow-hidden relative">

            {/* Horizontal & Vertical Scroll Container */}
            <div className="flex-1 overflow-auto custom-scrollbar relative">

                {/* Fixed width container ensuring perfect grid alignment */}
                <div className="min-w-[800px] lg:min-w-full flex flex-col relative w-full h-full">

                    {/* Header: Days (Sticky to top) */}
                    <div className="flex border-b border-white/5 bg-[#16181d]/95 sticky top-0 z-30 backdrop-blur-xl">
                        {/* Time label corner (Sticky to left & top) */}
                        {/* Time label corner (Sticky to left & top) */}
                        {/* Time label corner (Sticky to left & top) */}
                        {/* Time label corner (Sticky to left & top) */}
                        <div className="w-20 md:w-24 shrink-0 border-r border-white/5 bg-[#16181d] sticky left-0 z-40" />

                        {/* Day Headers */}
                        <div className="flex-1 grid grid-cols-7">
                            {days.map(d => (
                                <div key={d.dateStr} className="text-center py-2 border-r border-white/5 last:border-r-0">
                                    <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-primary/80 truncate px-1">{d.label.split(' ')[0]}</p>
                                    <p className="text-sm md:text-lg font-black text-white">{new Date(`${d.dateStr}T12:00:00-07:00`).getDate()}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Time Grid Area */}
                    <div className="flex flex-1 relative" style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>

                        {/* Time labels column (Sticky to left) */}
                        <div className="w-20 md:w-24 shrink-0 border-r border-white/5 bg-[#16181d] sticky left-0 z-20 flex flex-col">
                            {hours.map(h => (
                                <div key={h} className="relative text-right pr-4 border-b border-white/5 last:border-b-0 flex items-start justify-end" style={{ height: `${HOUR_HEIGHT}px` }}>
                                    <span className="text-[11px] md:text-sm font-black text-white/40 uppercase mt-1 leading-none">{h > 12 ? h - 12 : h} {h >= 12 ? 'PM' : 'AM'}</span>
                                </div>
                            ))}
                        </div>

                        {/* Schedule Columns Wrapper */}
                        <div className="flex-1 grid grid-cols-7 relative z-10 bg-black/20">
                            {/* Horizontal lines for entire grid */}
                            <div className="absolute inset-0 pointer-events-none flex flex-col z-0">
                                {hours.map(h => (
                                    <div key={h} className="border-t border-white/5 w-full" style={{ height: `${HOUR_HEIGHT}px` }} />
                                ))}
                            </div>

                            {/* Days content */}
                            {days.map(day => {
                                const citasDelDia = citas.filter(c => c.fecha_cita_local === day.dateStr)
                                const bloqueosDelDia = bloqueos.filter(b => {
                                    const bStart = new Date(b.timestamp_inicio_local)
                                    const bEnd = new Date(b.timestamp_fin_local)
                                    const dayD = new Date(`${day.dateStr}T12:00:00-07:00`)
                                    return dayD >= new Date(bStart.getFullYear(), bStart.getMonth(), bStart.getDate(), 0, 0, 0) &&
                                        dayD <= new Date(bEnd.getFullYear(), bEnd.getMonth(), bEnd.getDate(), 23, 59, 59)
                                })
                                let hasAlmuerzo = false;
                                if (almuerzoBarbero && almuerzoBarbero.inicio && almuerzoBarbero.fin) hasAlmuerzo = true;

                                return (
                                    <div key={day.dateStr} className="relative border-r border-white/5 last:border-r-0 p-0.5">
                                        {/* Citas */}
                                        {citasDelDia.map(cita => {
const start = parseLocalTimestamp(cita.timestamp_inicio_local || '')
const end = parseLocalTimestamp(cita.timestamp_fin_local || '')
                                            const style = calculateStyles(start, end)
                                            return (
                                                <div key={cita.id} className={`absolute left-0.5 right-0.5 rounded-lg border p-1 px-1.5 overflow-hidden backdrop-blur-md flex flex-col ${getStatusColor(cita.estado)} hover:brightness-110 transition-all z-10 shadow-md`} style={style} title={`${cita.cliente_nombre} - ${cita.servicio_nombre}`}>
                                                    <p className="text-[9px] md:text-[10px] font-black uppercase truncate leading-tight tracking-tight">{cita.cliente_nombre}</p>
                                                    <p className="text-[7px] md:text-[8px] font-black opacity-70 uppercase tracking-widest truncate mt-0.5">{cita.servicio_nombre}</p>
                                                </div>
                                            )
                                        })}

                                        {/* Bloqueos */}
                                        {bloqueosDelDia.map(bloqueo => {
                                            const start = new Date(bloqueo.timestamp_inicio_local)
                                            const end = new Date(bloqueo.timestamp_fin_local)
                                            const style = calculateStyles(start, end)
                                            return (
                                                <div key={bloqueo.id} className="absolute left-0.5 right-0.5 rounded-lg border border-red-500/50 bg-red-500/10 p-1 overflow-hidden flex flex-col justify-center items-center text-center z-[5] backdrop-blur-md" style={style}>
                                                    <Ban className="w-3 h-3 md:w-4 md:h-4 text-red-500/80 mb-0.5 mt-0.5" />
                                                    <p className="text-[7px] md:text-[8px] font-black text-red-400/80 uppercase tracking-widest truncate w-full">Bloqueado</p>
                                                </div>
                                            )
                                        })}

                                        {/* Almuerzo */}
                                        {hasAlmuerzo && (
                                            <div className="absolute left-0.5 right-0.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-1 overflow-hidden flex flex-col justify-center items-center text-center z-[5] backdrop-blur-md striped-bg-amber" style={calculateStyles(parseTimeStr(day.dateStr, almuerzoBarbero.inicio), parseTimeStr(day.dateStr, almuerzoBarbero.fin))}>
                                                <Utensils className="w-3 h-3 md:w-4 md:h-4 text-amber-500/80 mb-0.5 mt-0.5" />
                                                <p className="text-[7px] md:text-[8px] font-black text-amber-400/80 uppercase tracking-widest truncate w-full">Almuerzo</p>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// VISTA MENSUAL
// ---------------------------------------------------------------------------

function VistaMensual({ citas, bloqueos, days, fecha }: { citas: CitaDesdeVista[], bloqueos: any[], days: { dateStr: string, label: string }[], fecha: string }) {
    // We need a full grid for the month, including empty days padding at start/end to form proper weeks
    const gridDays = useMemo(() => {
        const base = new Date(`${fecha}T12:00:00-07:00`)
        const year = base.getFullYear()
        const month = base.getMonth()

        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)

        const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 // Start on Monday
        const endPadding = lastDay.getDay() === 0 ? 0 : 7 - lastDay.getDay()

        const result: { dateStr: string, dayNum: number, isCurrentMonth: boolean }[] = []

        // Add previous month padding
        const prevMonth = new Date(year, month, 0)
        for (let i = startPadding - 1; i >= 0; i--) {
            const dStr = new Date(year, month - 1, prevMonth.getDate() - i).toLocaleDateString('en-CA')
            result.push({ dateStr: dStr, dayNum: prevMonth.getDate() - i, isCurrentMonth: false })
        }

        // Add current month days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const dStr = new Date(year, month, i).toLocaleDateString('en-CA')
            result.push({ dateStr: dStr, dayNum: i, isCurrentMonth: true })
        }

        // Add next month padding
        for (let i = 1; i <= endPadding; i++) {
            const dStr = new Date(year, month + 1, i).toLocaleDateString('en-CA')
            result.push({ dateStr: dStr, dayNum: i, isCurrentMonth: false })
        }

        return result
    }, [fecha])

    const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

    return (
        <div className="bg-black/40 border border-white/5 rounded-2xl shadow-lg backdrop-blur-md flex flex-col h-[70vh] min-h-[500px] overflow-hidden relative">
            <div className="flex-1 overflow-auto custom-scrollbar relative">
                <div className="min-w-[700px] lg:min-w-full flex flex-col h-full min-h-[500px]">

                    {/* Header: Weekdays */}
                    <div className="grid grid-cols-7 border-b border-white/5 bg-[#16181d]/95 sticky top-0 z-20 backdrop-blur-xl">
                        {weekDays.map(wd => (
                            <div key={wd} className="text-center py-2 border-r border-white/5 last:border-r-0">
                                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-primary/80">{wd.substring(0, 3)}</span>
                            </div>
                        ))}
                    </div>

                    {/* Grid Days */}
                    <div className="flex-1 grid grid-cols-7 auto-rows-fr">
                        {gridDays.map((d, i) => {
                            const citasDelDia = citas.filter(c => c.fecha_cita_local === d.dateStr)
                            const isToday = d.dateStr === new Date().toLocaleDateString('en-CA')

                            const bloqueosDelDia = bloqueos.filter(b => {
                                const bStart = new Date(b.timestamp_inicio_local)
                                const bEnd = new Date(b.timestamp_fin_local)
                                const dayD = new Date(`${d.dateStr}T12:00:00-07:00`)
                                return dayD >= new Date(bStart.getFullYear(), bStart.getMonth(), bStart.getDate(), 0, 0, 0) &&
                                    dayD <= new Date(bEnd.getFullYear(), bEnd.getMonth(), bEnd.getDate(), 23, 59, 59)
                            })

                            return (
                                <div key={`${d.dateStr}-${i}`} className={`border-r border-b border-white/5 p-1 flex flex-col transition-colors hover:bg-white/[0.02] ${!d.isCurrentMonth ? 'opacity-30 bg-black/40' : 'bg-black/20'}`}>
                                    <div className="flex items-center justify-end mb-1 px-1">
                                        <span className={`text-[10px] md:text-sm font-black w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-lg ${isToday ? 'bg-primary text-black' : 'text-white/60'}`}>{d.dayNum}</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 px-0.5">
                                        {citasDelDia.map(cita => (
                                            <div key={cita.id} className={`text-[8px] md:text-[9px] font-black uppercase tracking-tight truncate px-1.5 py-0.5 rounded border ${getStatusColor(cita.estado)}`} title={`${cita.cliente_nombre}`}>
                                                {parseLocalTimestamp(cita.timestamp_inicio_local || '').toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '')} {cita.cliente_nombre.split(' ')[0]}
                                            </div>
                                        ))}
                                        {bloqueosDelDia.map(bloqueo => (
                                            <div key={bloqueo.id} className="text-[8px] font-black uppercase tracking-tight truncate px-1.5 py-0.5 rounded border border-red-500/50 bg-red-500/10 text-red-400">
                                                BLQ • {new Date(bloqueo.timestamp_inicio_local).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '')}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// MAIN WRAPPER
// ---------------------------------------------------------------------------

export function AgendaSemanalMensual({ citas, bloqueos, almuerzoBarbero, fecha, vista, onUpdate }: AgendaSemanalMensualProps) {
    const supabase = createClient()
    const [showCorteSemanal, setShowCorteSemanal] = useState(false)
    const [loadingCorte, setLoadingCorte] = useState(false)
    const [corteExistente, setCorteExistente] = useState(false)
    const [barbero, setBarbero] = useState<any>(null)

    // Cargar sesión del barbero
    useEffect(() => {
        const sessionStr = localStorage.getItem('profesional_session')
        if (sessionStr) {
            try {
                setBarbero(JSON.parse(sessionStr))
            } catch (e) {
                console.error('Error parsing session:', e)
            }
        }
    }, [])

    const days = useMemo(() => {
        const result: { dateStr: string, label: string }[] = []
        const base = new Date(`${fecha}T12:00:00-07:00`)
        if (vista === 'semana') {
            const dayNum = base.getDay() // 0 is Sunday
            const diff = base.getDate() - dayNum + (dayNum === 0 ? -6 : 1)
            const startD = new Date(base.setDate(diff))
            for (let i = 0; i < 7; i++) {
                const d = new Date(startD)
                d.setDate(d.getDate() + i)
                result.push({
                    dateStr: d.toLocaleDateString('en-CA'),
                    label: d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })
                })
            }
        }
        return result
    }, [fecha, vista])

    // Verificar si hay cortes diarios existentes para los días de esta semana
    useEffect(() => {
        const checkCorte = async () => {
            if (!barbero || vista !== 'semana' || days.length === 0) return
            
            setCorteExistente(false)
            setLoadingCorte(true)
            
            const dateStrs = days.map(d => d.dateStr)
            
            // Check if there are ANY daily closures already submitted for this week's days
            const { data } = await supabase
                .from('cortes_turno' as any)
                .select('id, fecha_corte')
                .eq('barbero_id', barbero.id)
                .in('fecha_corte', dateStrs)
                .eq('tipo', 'diario')
            
            // Consider the week "closed" fully ONLY if all 7 days have a daily closure record.
            // A week with 1 closed shift does not mean the entire week is closed.
            setCorteExistente((data && data.length === 7) ? true : false)
            setLoadingCorte(false)
        }
        checkCorte()
    }, [barbero, vista, days, supabase])

    const metrics = useMemo(() => {
        if (vista !== 'semana') return null
        const finalizadas = citas.filter(c => c.estado === 'finalizada' || c.estado === 'por_cobrar')
        const pendientes = citas.filter(c => !['finalizada', 'cancelada', 'no_show'].includes(c.estado))
        
        const totalBruto = finalizadas.reduce((acc, c) => acc + (c.monto_pagado || c.servicio_precio || 0), 0)
        const comision_porcentaje = barbero?.comision_porcentaje || 50
        const comision = totalBruto * (comision_porcentaje / 100)
        
        return {
            totalBruto,
            comision,
            totalCortes: finalizadas.length,
            pendientes
        }
    }, [citas, vista, barbero])

    const { esSemanaFutura, esSemanaActual } = useMemo(() => {
        if (days.length === 7) {
            const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Hermosillo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
            const future = todayStr < days[0].dateStr          // today is BEFORE the week start
            const current = todayStr >= days[0].dateStr && todayStr <= days[6].dateStr  // today is IN this week
            return { esSemanaFutura: future, esSemanaActual: current }
        }
        return { esSemanaFutura: false, esSemanaActual: false }
    }, [days])

    return (
        <div className="w-full pb-10 animate-fade-in relative flex flex-col h-full">
            <div className="flex-1 overflow-hidden">
                {vista === 'semana' ? (
                    <VistaSemanal citas={citas} bloqueos={bloqueos} almuerzoBarbero={almuerzoBarbero} days={days} />
                ) : (
                    <VistaMensual citas={citas} bloqueos={bloqueos} days={days} fecha={fecha} />
                )}
            </div>

            {vista === 'semana' && metrics && (
                <div className="shrink-0 bg-black/40 backdrop-blur-xl border-t border-white/5 p-3 pb-safe mt-4 rounded-2xl">
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-2 text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] text-white/40 mb-3">
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.3)]" />
                            <span>Confirmada</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                            <span>En Proceso</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]" />
                            <span>Por Cobrar</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 shadow-[0_0_8px_rgba(113,113,122,0.1)]" />
                            <span>Finalizada</span>
                        </div>
                    </div>

                    {(esSemanaFutura || esSemanaActual) && !corteExistente ? (
                        <div className="w-full border h-12 rounded-xl bg-white/[0.01] border-white/5 text-white/15 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] cursor-not-allowed select-none">
                            <AlertCircle className="w-4 h-4 opacity-40" />
                            <span>{esSemanaFutura ? 'Semana Futura — No disponible' : 'Semana en Curso — Aún no cerrada'}</span>
                        </div>
                    ) : (
                    <Button
                        onClick={() => setShowCorteSemanal(true)}
                        className={cn(
                            "w-full border h-12 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] gap-2 transition-all group/btn shadow-lg",
                            corteExistente 
                                ? "bg-emerald-600/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-600/20 shadow-emerald-900/10" 
                                : "bg-white/[0.03] hover:bg-white/[0.08] text-white border-white/10 shadow-black/20"
                        )}
                    >
                        {corteExistente ? (
                            <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 group-hover/btn:scale-110 transition-transform" />
                                Semana Cerrada
                            </>
                        ) : (
                            <>
                                <BarChart3 className="w-4 h-4 text-primary group-hover/btn:scale-110 transition-transform" />
                                Cerrar Semana
                            </>
                        )}
                    </Button>
                    )}
                </div>
            )}

            {/* MODAL CORTE SEMANAL */}
            <Dialog open={showCorteSemanal} onOpenChange={setShowCorteSemanal}>
                <DialogContent className="bg-[#050608] border-white/5 text-white rounded-[2.5rem] sm:max-w-md w-[95vw] shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-0 overflow-hidden outline-none">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-amber-500 to-primary/50 opacity-50" />

                    <DialogHeader className="pt-10 px-8 pb-4">
                        <div className="flex items-center gap-4 mb-2">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 transition-colors",
                                corteExistente 
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                                    : "bg-primary/10 border-primary/20 text-primary"
                            )}>
                                {corteExistente ? <CheckCircle2 className="w-6 h-6" /> : <Wallet className="w-6 h-6" />}
                            </div>
                            <div className="flex flex-col text-left">
                                <DialogTitle className="text-xl font-black uppercase tracking-tighter leading-none">Cierre de Semana</DialogTitle>
                                <DialogDescription className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">
                                    Resumen de actividad semanal
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="px-8 pb-8 space-y-6">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 transition-colors hover:bg-white/[0.04]">
                                <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Total Bruto</p>
                                <p className="text-xl font-black text-white italic">${metrics?.totalBruto.toLocaleString()}</p>
                            </div>
                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 transition-colors hover:bg-white/[0.04]">
                                <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Tu Comisión</p>
                                <p className="text-xl font-black text-primary italic">${metrics?.comision.toLocaleString()}</p>
                            </div>
                        </div>

                        {esSemanaFutura ? (
                            <div className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex gap-4 items-start">
                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-black text-amber-500 uppercase tracking-tight mb-1">Semana en Curso</p>
                                    <p className="text-[10px] text-white/60 leading-relaxed">
                                        Debes esperar a que finalice el último día de la semana (Domingo) para realizar el cierre semanal.
                                    </p>
                                </div>
                            </div>
                        ) : metrics && metrics.pendientes.length > 0 ? (
                            <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-2xl flex gap-4 items-start">
                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-black text-red-500 uppercase tracking-tight mb-1">Citas Pendientes</p>
                                    <p className="text-[10px] text-white/60 leading-relaxed">
                                        Tienes <span className="text-white font-bold">{metrics.pendientes.length} citas sin finalizar</span> en la semana. Debes gestionarlas antes de realizar el cierre semanal.
                                    </p>
                                </div>
                            </div>
                        ) : !corteExistente ? (
                            <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex gap-4 items-start">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-black text-emerald-500 uppercase tracking-tight mb-1">Semana Lista</p>
                                    <p className="text-[10px] text-white/60 leading-relaxed">
                                        Todas las citas de la semana han sido procesadas. Puedes proceder con el cierre correspondiente.
                                    </p>
                                </div>
                            </div>
                        ) : null}

                        <div className="flex flex-col gap-3 pt-2">
                                    <Button
                                        disabled={esSemanaFutura || (metrics && metrics.pendientes.length > 0) || loadingCorte}
                                        onClick={async () => {
                                            setLoadingCorte(true)
                                            try {
                                                // Inicializar todos los días visibles de la semana con valores en 0
                                                const porDia = days.reduce((acc, currentDay) => {
                                                    acc[currentDay.dateStr] = { bruto: 0, cortes: 0 }
                                                    return acc
                                                }, {} as Record<string, { bruto: number, cortes: number }>)

                                                // Sumar los valores de las citas finalizadas a sus respectivos días
                                                const finalizadas = citas.filter(c => c.estado === 'finalizada' || c.estado === 'por_cobrar')
                                        finalizadas.forEach(c => {
                                            const dateStr = c.fecha_cita_local || (c.timestamp_inicio_local ? c.timestamp_inicio_local.split('T')[0] : '')
                                            if (porDia[dateStr] !== undefined) {
                                                porDia[dateStr].bruto += (c.monto_pagado || c.servicio_precio || 0)
                                                porDia[dateStr].cortes += 1
                                            }
                                        })

                                        const comision_porcentaje = barbero?.comision_porcentaje || 50
                                        const upsertPayloads = Object.entries(porDia).map(([fecha, datos]) => ({
                                            barbero_id: barbero.id,
                                            sucursal_id: barbero.sucursal_id,
                                            fecha_corte: fecha,
                                            monto_bruto: datos.bruto,
                                            comision_barbero: datos.bruto * (comision_porcentaje / 100),
                                            total_servicios: datos.cortes,
                                            tipo: 'diario',
                                            created_at: new Date().toISOString()
                                        }))

                                        const { error } = await supabase
                                            .from('cortes_turno' as any)
                                            .upsert(upsertPayloads as any)

                                        if (error) throw error

                                        toast.success(corteExistente ? "Cierres Diarios Actualizados" : "Semana Cerrada (Cierres Diarios)", {
                                            description: "Se han guardado los cierres diarios correspondientes.",
                                            icon: <CircleDollarSign className="w-5 h-5 text-primary" />
                                        })
                                        setCorteExistente(true)
                                        setShowCorteSemanal(false)
                                        onUpdate()
                                    } catch (err: any) {
                                        toast.error("Error al guardar", { description: err.message })
                                    } finally {
                                        setLoadingCorte(false)
                                    }
                                }}
                                className={cn(
                                    "w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl",
                                    metrics && metrics.pendientes.length > 0
                                        ? "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
                                        : corteExistente
                                            ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-900/20"
                                            : "bg-primary text-black hover:bg-primary/90 shadow-primary/20"
                                )}
                            >
                                {loadingCorte ? <Loader2 className="w-4 h-4 animate-spin" /> : metrics && metrics.pendientes.length > 0 ? 'Cierre Bloqueado' : corteExistente ? 'Actualizar Cierre Semanal' : 'Confirmar Cierre Semanal'}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setShowCorteSemanal(false)}
                                className="w-full text-white/20 hover:text-white hover:bg-white/5 font-black uppercase tracking-widest text-[9px] py-4 rounded-xl"
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
