'use client'
import { useMemo, useEffect, useRef, useState, memo, useCallback } from 'react'
import { motion, useDragControls } from 'framer-motion'
import {
    Play,
    X,
    Info,
    RefreshCcw,
    AlertTriangle,
    CheckCircle2,
    ArrowRight,
    History,
    Clock,
    User,
    Scissors,
    CreditCard,
    AlertCircle,
    TrendingUp,
    CircleDollarSign,
    Wallet,
    BarChart3,
    Loader2
} from 'lucide-react'
import { toast } from "sonner"
import type { CitaDesdeVista, EstadoCita } from '@/lib/types'
import { createClient } from '@/lib/supabase'
import { CitaCard } from './CitaCard'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { cn, getHermosilloMins, getHermosilloDateStr, formatToHermosilloISO, parseLocalTimestamp } from "@/lib/utils"

interface AgendaTimelineProps {
    citas: CitaDesdeVista[]
    bloqueos?: any[]
    almuerzoBarbero?: any
    horarioSucursal?: any
    fechaBase?: string
    currentTime: Date
    barbero?: any
    onUpdate?: () => void
    /** Pre-loaded from parent to avoid fetch on every modal open */
    allServicios?: any[]
    /** Pre-loaded from parent to avoid fetch on every modal open */
    allBarberos?: any[]
}


const SLOT_HEIGHT = 60 // More compact height

function generarSlots(inicio: number, fin: number): string[] {
    const slots: string[] = []
    for (let hora = inicio; hora < fin; hora++) {
        const ampm = hora >= 12 ? 'PM' : 'AM'
        const hour12 = hora % 12 || 12
        slots.push(`${hour12}:00 ${ampm}`)
        slots.push(`${hour12}:30 ${ampm}`)
    }
    return slots
}

const TimelineAppointmentCard = memo(({
    item,
    cardResetKey,
    longPressActive,
    highlightedCitaId,
    handleDragStart,
    handleDragEnd,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    activeTimer,
    isEnProceso,
    isPorCobrar,
    cardBorder,
    getStatusColor,
    handleAtenderClick,
    handleDetailsClick,
    handleMoveClick,
    handleCancelClick,
    handleCheckoutClick,
    actualizarEstadoDirecto,
    onUpdate
}: any) => {
    const controls = useDragControls()
    const isThisLongPress = longPressActive === (item.tipo === 'cita' ? item.data.id : null)
    const isThisHighlighted = highlightedCitaId === item.data.id

    const CardContainer = motion.div as any
    const motionProps = {
        drag: item.tipo === 'cita' && (item.data.estado === 'confirmada' || item.data.estado === 'en_espera' || item.data.estado === 'finalizada') ? "y" : false,
        dragElastic: 0,
        dragMomentum: false,
        dragControls: controls,
        dragListener: false,
        onDragStart: () => handleDragStart(item.data.id),
        onDragEnd: (e: any, info: any) => handleDragEnd(e, info, item.data),
        initial: { opacity: 0, scale: 0.98 },
        animate: {
            opacity: 1,
            scale: isThisLongPress ? 1.02 : 1,
            boxShadow: isThisLongPress
                ? '0 10px 25px -5px hsl(var(--foreground) / 0.1), 0 8px 10px -6px hsl(var(--foreground) / 0.1)'
                : 'none',
            zIndex: isThisLongPress ? 40 : 10
        },
        transition: { type: 'spring', stiffness: 300, damping: 25 }
    }

    return (
        <CardContainer
            key={`${item.data.id}-${cardResetKey}`}
            data-drag-id={item.tipo === 'cita' ? item.data.id : undefined}
            onPointerDown={(e: any) => item.tipo === 'cita' && handlePointerDown(e, item.data, controls)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            {...(motionProps as any)}
            className={cn(
                "absolute inset-x-0 h-[calc(100%-4px)] flex items-center justify-between gap-1 px-2.5 py-1 rounded-xl border transition-colors group/card overflow-hidden cursor-pointer select-none",
                "animate-fade-in",
                isThisHighlighted ? 'bg-emerald-500/20' : cardBorder
            )}
            style={{
                backgroundColor: isThisLongPress ? 'var(--background)' : undefined,
                WebkitTouchCallout: 'none',
                touchAction: isThisLongPress ? 'none' : 'pan-y',
                willChange: isThisLongPress ? 'transform' : 'auto',
                transform: isThisLongPress ? 'translateZ(0)' : undefined,
            }}
        >
            <div className="flex items-center gap-1.5 min-w-0 flex-1 h-full">
                <div className={`w-0.5 h-full rounded-full ${getStatusColor(item.tipo === 'cita' ? item.data.estado : '', item.tipo)} shrink-0`} />
                <div className="min-w-0 flex-1 flex flex-col justify-center h-full">
                    <div className="flex justify-between items-center gap-1">
                        <p className={`text-[10px] lg:text-[13px] font-black ${item.tipo === 'bloqueo' ? 'text-red-400' : item.tipo === 'almuerzo' ? 'text-amber-400' : 'text-foreground'} truncate leading-none uppercase tracking-tight`}>
                            {item.tipo === 'cita' ? item.data.cliente_nombre : item.tipo === 'almuerzo' ? 'ALMUERZO' : 'BLOQUEO'}
                        </p>
                        {activeTimer && (
                            <div className="px-1 py-0.5 rounded bg-muted text-[7px] lg:text-[9px] font-black text-primary border border-primary/20 shrink-0">
                                {activeTimer}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 lg:mt-1">
                        <p className={`text-[7px] lg:text-[10px] font-black ${item.tipo === 'cita' ? 'text-foreground/50' : item.tipo === 'bloqueo' ? 'text-red-500/50' : 'text-amber-500/50'} uppercase tracking-widest leading-none truncate`}>
                            {item.tipo === 'cita' ? item.data.servicio_nombre : item.tipo === 'almuerzo' ? 'DESCANSO' : (item.data.motivo || 'OCUPADO')}
                        </p>
                        {item.tipo === 'cita' && item.data.servicio_precio && (
                            <span className="text-[7px] lg:text-[9px] font-black text-primary/60 border-l border-border pl-2 leading-none">
                                ${item.data.servicio_precio}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions - Only for Citas */}
            {item.tipo === 'cita' && (
                <div className="flex items-center gap-1 shrink-0">
                    {item.data.estado === 'confirmada' && (
                        <button
                            onClick={(e) => handleAtenderClick(e, item.data)}
                            className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center hover:bg-emerald-500 hover:text-primary-foreground transition-all border border-emerald-500/10 group"
                            title="Atender"
                        >
                            <Play className="w-3 h-3 md:w-4 md:h-4 fill-current" />
                        </button>
                    )}

                    {item.data.estado === 'en_proceso' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); actualizarEstadoDirecto(item.data, 'por_cobrar') }}
                            className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center hover:bg-emerald-500 hover:text-primary-foreground transition-all border border-emerald-500/10 group"
                            title="Finalizar Servicio"
                        >
                            <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 fill-current" />
                        </button>
                    )}

                    <div className="flex items-center gap-0.5 transition-opacity">
                        <button
                            onClick={(e) => handleDetailsClick(e, item.data)}
                            className="w-6 h-6 rounded-lg bg-muted text-foreground/40 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all border border-border"
                            title="Detalles"
                        >
                            <Info className="w-3 h-3" />
                        </button>

                        {(item.data.estado === 'confirmada' || item.data.estado === 'en_espera' || item.data.estado === 'finalizada') && (
                            <button
                                onClick={(e) => handleMoveClick(e, item.data)}
                                className="w-6 h-6 rounded-lg bg-muted text-foreground/40 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all border border-border"
                                title="Mover"
                            >
                                <History className="w-3 h-3" />
                            </button>
                        )}

                        {item.data.estado === 'por_cobrar' && (
                            <button
                                onClick={(e) => handleCheckoutClick(e, item.data)}
                                className="w-7 h-7 md:w-10 md:h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center hover:bg-blue-500 hover:text-primary-foreground transition-all border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                                title="Cobrar Cita"
                            >
                                <CreditCard className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                        )}

                        {(item.data.estado === 'confirmada' || item.data.estado === 'en_espera' || item.data.estado === 'finalizada') && (
                            <button
                                onClick={(e) => handleCancelClick(e, item.data)}
                                className="w-6 h-6 rounded-lg bg-muted text-red-500/40 flex items-center justify-center hover:bg-red-500 hover:text-primary-foreground transition-all border border-border"
                                title="Cancelar"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </CardContainer>
    )
})

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

export const AgendaTimeline = memo(function AgendaTimeline({ citas, bloqueos = [], almuerzoBarbero = null, horarioSucursal, fechaBase, currentTime, barbero, onUpdate, allServicios = [], allBarberos = [] }: AgendaTimelineProps) {
    const [isMounted, setIsMounted] = useState(false)
    useEffect(() => { setIsMounted(true) }, [])
    
    const todayLocalStr = useMemo(() => {
        if (!isMounted) return ""
        try {
            return new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Hermosillo',
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).format(new Date())
        } catch (e) {
            // Fallback for devices without timezone support
            return new Date().toISOString().split('T')[0]
        }
    }, [isMounted])

    const viewDate = fechaBase || todayLocalStr
    
    const { nombreDia } = useMemo(() => {
        if (!viewDate) return { nombreDia: DIAS_SEMANA[new Date().getDay()] }
        try {
            const targetDate = new Date(`${viewDate}T12:00:00-07:00`)
            if (isNaN(targetDate.getTime())) throw new Error("Invalid Date")
            return { nombreDia: DIAS_SEMANA[targetDate.getDay()] }
        } catch (e) {
            return { nombreDia: DIAS_SEMANA[new Date().getDay()] }
        }
    }, [viewDate])

    const { horaInicio, horaFin } = useMemo(() => {
        let inicio = 8
        let fin = 21

        if (horarioSucursal && horarioSucursal[nombreDia]) {
            const hA = horarioSucursal[nombreDia].apertura
            const hC = horarioSucursal[nombreDia].cierre
            if (hA) {
                const parts = hA.split(':')
                inicio = parseInt(parts[0], 10) - 2
                if (inicio < 0) inicio = 0
            }
            if (hC) {
                const parts = hC.split(':')
                fin = parseInt(parts[0], 10) + 3
                if (fin > 24) fin = 24
            }
        }
        return { horaInicio: inicio, horaFin: fin }
    }, [horarioSucursal, nombreDia])

    const slots = useMemo(() => generarSlots(horaInicio, horaFin), [horaInicio, horaFin])
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [selectedCita, setSelectedCita] = useState<CitaDesdeVista | null>(null)

    // Sincronizar selectedCita cuando los datos globales cambian (evita datos obsoletos en el modal)
    useEffect(() => {
        if (selectedCita) {
            const updated = citas.find(c => c.id === selectedCita.id)
            if (updated) {
                setSelectedCita(updated)
            }
        }
    }, [citas])

    const [isManualScroll, setIsManualScroll] = useState(false)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const supabase = useMemo(() => createClient(), [])

    const [activeModal, setActiveModal] = useState<'move' | 'cancel' | 'details' | 'checkout' | null>(null)
    const [showEarlyWarning, setShowEarlyWarning] = useState(false)
    const [showActiveWarning, setShowActiveWarning] = useState(false)
    const [highlightedCitaId, setHighlightedCitaId] = useState<string | null>(null)
    const [citaActiva, setCitaActiva] = useState<CitaDesdeVista | null>(null)
    const [pendingCitaAction, setPendingCitaAction] = useState<CitaDesdeVista | null>(null)
    const [showCorteTurno, setShowCorteTurno] = useState(false)
    const [corteExistente, setCorteExistente] = useState<any>(null)
    const [loadingCorte, setLoadingCorte] = useState(false)
    const [showEarlyCloseAlert, setShowEarlyCloseAlert] = useState(false)

    // Determine if current time is before the scheduled closing time
    const closingTimeStr: string = useMemo(() => {
        if (horarioSucursal && horarioSucursal[nombreDia]?.cierre) {
            return horarioSucursal[nombreDia].cierre as string // e.g. "20:00"
        }
        return '20:00'
    }, [horarioSucursal, nombreDia])

    const isEarlyClosure = useMemo(() => {
        // Only warn when the viewDate is today and the current time is before closing time
        if (viewDate !== todayLocalStr) return false
        const [ch, cm] = closingTimeStr.split(':').map(Number)
        const closingMins = ch * 60 + (cm || 0)
        const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes()
        return nowMins < closingMins
    }, [closingTimeStr, currentTime, viewDate, todayLocalStr])

    useEffect(() => {
        const checkCorte = async () => {
            if (!barbero?.id || !viewDate) return
            setLoadingCorte(true)
            setCorteExistente(null)
            try {
                const { data, error } = await supabase
                    .from('cortes_turno' as any)
                    .select('*')
                    .eq('barbero_id', barbero.id)
                    .eq('fecha_corte', viewDate)
                    .eq('tipo', 'diario')
                    .limit(1)
                    .maybeSingle()

                if (error) throw error
                setCorteExistente(data)
            } catch (err) {
                console.error('Error checking existing corte:', err)
            } finally {
                setLoadingCorte(false)
            }
        }

        checkCorte()
    }, [barbero?.id, viewDate])

    // Refs for drag state tracking
    const isDraggingRef = useRef(false)
    const [longPressActive, setLongPressActive] = useState<string | null>(null)
    const [cardResetKey, setCardResetKey] = useState(0)
    const [proposedMove, setProposedMove] = useState<{ cita: CitaDesdeVista, newStartTime: string } | null>(null)
    // advanced-use-latest: keep last proposedMove so CSS exit animation can still render content
    const lastMoveRef = useRef<{ cita: CitaDesdeVista, newStartTime: string } | null>(null)
    if (proposedMove) lastMoveRef.current = proposedMove
    const displayMove = proposedMove || lastMoveRef.current

    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const touchStartPos = useRef<{ x: number, y: number } | null>(null)
    const activePointerId = useRef<number | null>(null)
    const dragPointerY = useRef<number>(0) // Tracks pointer Y for edge auto-scroll


    const currentHour = currentTime.getHours()
    const currentMinute = currentTime.getMinutes()

    // Position in pixels: (Hour offset * height) + (Minutes proportional to height)
    // Now SLOT_HEIGHT is for 30 mins, so double the hour offset and (mins/30)
    const currentTimePosition = ((currentHour - horaInicio) * 2 * SLOT_HEIGHT) + (currentMinute / 30 * SLOT_HEIGHT)

    const targetScrollPosition = Math.max(0, ((currentHour - 1 - horaInicio) * 2 * SLOT_HEIGHT))

    const metrics = useMemo(() => {
        const todayStr = getHermosilloDateStr(new Date())
        const targetDateStr = fechaBase || todayStr
        const citasDeHoy = citas.filter(c => c.fecha_cita_local === targetDateStr)

        const finalizadas = citasDeHoy.filter(c => c.estado === 'finalizada')
        const totalBruto = finalizadas.reduce((acc, c) => acc + (c.monto_pagado ?? c.servicio_precio ?? 0), 0)
        const totalCortes = finalizadas.length

        // Citas que requieren acción (no finalizadas ni canceladas)
        const pendientes = citasDeHoy.filter(c => !['finalizada', 'cancelada'].includes(c.estado))

        return {
            totalBruto,
            totalCortes,
            pendientes,
            comision_porcentaje: barbero?.comision_porcentaje ?? 50,
            comision: totalBruto * ((barbero?.comision_porcentaje ?? 50) / 100),
            resumenPendientes: pendientes.length > 0 ? `${pendientes.length} citas por gestionar` : null
        }
    }, [citas, fechaBase, barbero])

    // Auto-center: only scroll to current time when viewing TODAY
    const isViewingToday = useMemo(() => {
        try {
            const todayLocal = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Hermosillo',
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).format(new Date())
            return !fechaBase || fechaBase === todayLocal
        } catch {
            return !fechaBase
        }
    }, [fechaBase])

    useEffect(() => {
        if (!isManualScroll && isViewingToday && scrollContainerRef.current) {
            const timer = setTimeout(() => {
                scrollContainerRef.current?.scrollTo({
                    top: targetScrollPosition,
                    behavior: 'smooth'
                })
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [targetScrollPosition, isManualScroll, isViewingToday])

    // Unified mobile drag handler — attached directly to the card (guaranteed touch target)
    // Merges: (1) preventDefault to block page scroll, (2) edge-scroll via applyScroll
    // Document-level listeners are unreliable after setPointerCapture on mobile browsers
    useEffect(() => {
        if (!longPressActive) return
        const card = document.querySelector(`[data-drag-id="${longPressActive}"]`) as HTMLElement
        const scroll = scrollContainerRef.current
        if (!card || !scroll) return

        const MAX_SPEED = 50
        const VH = () => window.visualViewport?.height ?? window.innerHeight
        const ZONE = 220 // px from each edge of the visual viewport

        const applyScroll = (py: number) => {
            if (!isDraggingRef.current || py <= 0) return
            dragPointerY.current = py
            const vh = VH()
            if (py < ZONE) {
                scroll.scrollTop -= Math.ceil(MAX_SPEED * Math.max(0, 1 - py / ZONE))
            } else if (py > vh - ZONE) {
                scroll.scrollTop += Math.ceil(MAX_SPEED * Math.max(0, (py - (vh - ZONE)) / ZONE))
            }
        }

        // Card touchmove: {passive: false} so we can call preventDefault AND scroll
        const onCardTouch = (e: TouchEvent) => {
            if (isDraggingRef.current) e.preventDefault()
            if (e.touches[0]) applyScroll(e.touches[0].clientY)
        }
        // Card pointermove: for desktop pointer events (also fires on mobile for captured pointer)
        const onCardPointer = (e: PointerEvent) => applyScroll(e.clientY)

        card.addEventListener('touchmove', onCardTouch, { passive: false })
        card.addEventListener('pointermove', onCardPointer)
        // Keep document pointermove as desktop fallback (mouse drag)
        document.addEventListener('pointermove', onCardPointer)

        // RAF: scrolls when finger is held still at edge (no move events fire)
        let rafId: number
        const loop = () => {
            if (dragPointerY.current > 0) applyScroll(dragPointerY.current)
            rafId = requestAnimationFrame(loop)
        }
        rafId = requestAnimationFrame(loop)

        return () => {
            cancelAnimationFrame(rafId)
            card.removeEventListener('touchmove', onCardTouch)
            card.removeEventListener('pointermove', onCardPointer)
            document.removeEventListener('pointermove', onCardPointer)
        }
    }, [longPressActive])

    const handleUserInteraction = () => {
        setIsManualScroll(true)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
            setIsManualScroll(false)
        }, 15000)
    }

    const scrollAndHighlight = (citaId: string) => {
        // Encontrar el elemento en el DOM
        const element = document.querySelector(`[data-drag-id="${citaId}"]`)
        if (element) {
            handleUserInteraction() // Pausar autoscroll de tiempo real
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            setHighlightedCitaId(citaId)
            // Quitar el resaltado después de unos segundos
            setTimeout(() => setHighlightedCitaId(null), 4000)
        }
    }

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [])

    // Performance Index: Map each slot string to its content for O(1) lookup
    const slotMap = useMemo(() => {
        const map = new Map<string, { tipo: 'cita' | 'bloqueo' | 'almuerzo', data: any }>()

        // Hoist base date parsing
        const baseDate = fechaBase ? new Date(`${fechaBase}T00:00:00`) : new Date()
        const year = baseDate.getFullYear()
        const month = baseDate.getMonth()
        const day = baseDate.getDate()

        // 0. Pre-calculate slot timestamps to avoid repeated arithmetic/parsing
        const slotData = slots.map(slot => {
            const [timePart, ampm] = slot.split(' ')
            const [h, m] = timePart.split(':').map(Number)
            let h24 = h
            if (ampm === 'PM' && h24 !== 12) h24 += 12
            if (ampm === 'AM' && h24 === 12) h24 = 0

            const minutesOfDay = h24 * 60 + m
            const timestamp = new Date(year, month, day, h24, m).getTime()
            const timestampEnd = timestamp + 30 * 60 * 1000

            return { slot, minutesOfDay, timestamp, timestampEnd }
        })

        // 1. Process Lunch (lower priority than appointments)
        if (almuerzoBarbero && almuerzoBarbero.inicio && almuerzoBarbero.fin) {
            const [startH, startM] = almuerzoBarbero.inicio.split(':').map(Number)
            const [endH, endM] = almuerzoBarbero.fin.split(':').map(Number)
            const lunchStartMinutes = startH * 60 + startM
            const lunchEndMinutes = endH * 60 + endM

            slotData.forEach(sd => {
                const slotEndMinutes = sd.minutesOfDay + 30
                if (lunchStartMinutes < slotEndMinutes && lunchEndMinutes > sd.minutesOfDay) {
                    map.set(sd.slot, { tipo: 'almuerzo', data: almuerzoBarbero })
                }
            })
        }

        // 2. Process Bloqueos (uses fecha_inicio/fecha_fin per actual DB schema)
        bloqueos.forEach(b => {
            const bStart = parseLocalTimestamp(b.fecha_inicio).getTime()
            const bEnd = parseLocalTimestamp(b.fecha_fin).getTime()

            slotData.forEach(sd => {
                if (bStart < sd.timestampEnd && bEnd > sd.timestamp) {
                    map.set(sd.slot, { tipo: 'bloqueo', data: b })
                }
            })
        })

        // 3. Process Citas (Highest priority)
        citas.forEach(cita => {
            if (['cancelada', 'no_show'].includes(cita.estado)) return

            const st = parseLocalTimestamp(cita.timestamp_inicio_local || '')
            const ampm = st.getHours() >= 12 ? 'PM' : 'AM'
            const h12 = st.getHours() % 12 || 12
            const m = st.getMinutes() < 30 ? '00' : '30'
            const slotKey = `${h12}:${m} ${ampm}`
            map.set(slotKey, { tipo: 'cita', data: cita })
        })

        return map
    }, [citas, bloqueos, almuerzoBarbero, slots, fechaBase])

    const getCitaEnSlot = (slotString: string) => slotMap.get(slotString) || null

    const getStatusColor = (estado: string, tipoItem?: string) => {
        if (tipoItem === 'bloqueo') return 'bg-red-500'
        if (tipoItem === 'almuerzo') return 'bg-amber-500'

        switch (estado) {
            case 'confirmada': return 'bg-yellow-500'
            case 'en_espera': return 'bg-yellow-500'
            case 'en_proceso': return 'bg-emerald-500'
            case 'por_cobrar': return 'bg-blue-500'
            case 'finalizada': return 'bg-muted-foreground'
            case 'cancelada': return 'bg-red-500'
            case 'no_show': return 'bg-red-500'
            default: return 'bg-muted'
        }
    }

    const actualizarEstadoDirecto = useCallback(async (cita: CitaDesdeVista, nuevoEstado: EstadoCita) => {
        try {
            const payload: any = { estado: nuevoEstado, updated_at: new Date().toISOString() }

            if (nuevoEstado === 'en_proceso') {
                payload.timestamp_inicio_servicio = new Date().toISOString()
            }

            if (nuevoEstado === 'por_cobrar') {
                const now = new Date()
                payload.timestamp_fin_servicio = now.toISOString()

                if (cita.timestamp_inicio_servicio) {
                    const start = parseLocalTimestamp(cita.timestamp_inicio_servicio!)
                    const diffMs = now.getTime() - start.getTime()
                    payload.duracion_real_minutos = Math.round(diffMs / 60000)
                } else {
                    const scheduledStart = parseLocalTimestamp(cita.timestamp_inicio_local || '')
                    const diffMs = now.getTime() - scheduledStart.getTime()
                    payload.duracion_real_minutos = Math.max(0, Math.round(diffMs / 60000))
                }
            }

            const res = await fetch(`/api/citas/${cita.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const body = await res.json()
                throw new Error(body.message || 'Error en la API')
            }

            onUpdate?.()
        } catch (err: any) {
            console.error('Error updating state:', err)
            alert(`Error al actualizar: ${err.message || 'Error desconocido'}`)
        }
    }, [onUpdate, citas])

    const handleAtenderClick = useCallback((e: React.MouseEvent, cita: CitaDesdeVista) => {
        e.stopPropagation()

        // VALIDACIÓN: ¿Hay otra cita en proceso?
        const citaEnCurso = citas.find(c => c.estado === 'en_proceso')
        if (citaEnCurso && citaEnCurso.id !== cita.id) {
            setCitaActiva(citaEnCurso)
            setShowActiveWarning(true)
            return
        }

        const citaStartTime = parseLocalTimestamp(cita.timestamp_inicio_local || '')
        const minutosDiferencia = Math.floor((currentTime.getTime() - citaStartTime.getTime()) / 60000)
        const minHastaCita = -minutosDiferencia

        if (minHastaCita >= 30) {
            setPendingCitaAction(cita)
            setShowEarlyWarning(true)
        } else {
            actualizarEstadoDirecto(cita, 'en_proceso')
        }
    }, [citas, currentTime, actualizarEstadoDirecto])

    const confirmarAtencionTemprana = () => {
        if (pendingCitaAction) {
            // VALIDACIÓN: ¿Hay otra cita en proceso? (doble check por si cambió mientras estaba el modal)
            const citaEnCurso = citas.find(c => c.estado === 'en_proceso')
            if (citaEnCurso && citaEnCurso.id !== pendingCitaAction.id) {
                setCitaActiva(citaEnCurso)
                setShowActiveWarning(true)
                setShowEarlyWarning(false)
                return
            }

            actualizarEstadoDirecto(pendingCitaAction, 'en_proceso')
            setShowEarlyWarning(false)
            setPendingCitaAction(null)
        }
    }

    const handleDragStart = useCallback((citaId: string) => {
        isDraggingRef.current = true
        setLongPressActive(citaId)
        // Lock body to prevent Chrome pull-to-refresh (but NOT scroll container — needed for edge scroll)
        document.body.style.overflow = 'hidden'
        document.body.style.touchAction = 'none'
        document.body.style.overscrollBehavior = 'none'
    }, [])

    const handlePointerDown = useCallback((e: React.PointerEvent, cita: CitaDesdeVista, controls: any) => {
        e.stopPropagation()
        if (cita.estado !== 'confirmada' && cita.estado !== 'finalizada') return

        touchStartPos.current = { x: e.clientX, y: e.clientY }
        activePointerId.current = e.pointerId

        timerRef.current = setTimeout(() => {
            isDraggingRef.current = true
            const target = e.target as HTMLElement
            if (target?.setPointerCapture && activePointerId.current !== null) {
                try { target.setPointerCapture(activePointerId.current) } catch (_) { }
            }
            setLongPressActive(cita.id)
            controls.start(e)
            if (window.navigator?.vibrate) window.navigator.vibrate(50)
        }, 600)
    }, [])

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        dragPointerY.current = e.clientY

        if (!touchStartPos.current) return

        const deltaX = Math.abs(e.clientX - touchStartPos.current.x)
        const deltaY = Math.abs(e.clientY - touchStartPos.current.y)

        // Threshold de 18px para tablet — evita cancelar por micro-movimientos al presionar
        if (deltaX > 18 || deltaY > 18) {
            if (timerRef.current) {
                clearTimeout(timerRef.current)
                timerRef.current = null
            }
            touchStartPos.current = null
            // Si el timer ya había disparado (drag activo), limpiar todo
            if (isDraggingRef.current) {
                isDraggingRef.current = false
                setLongPressActive(null)
                document.body.style.overflow = ''
                document.body.style.touchAction = ''
                document.body.style.overscrollBehavior = ''
            }
        }
    }, [])

    const handlePointerUp = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
        touchStartPos.current = null
        activePointerId.current = null
        dragPointerY.current = 0
        if (!isDraggingRef.current) {
            setLongPressActive(null)
        }
    }, [])

    // Limpia TODO cuando el browser toma control del scroll (pointercancel)
    // Sin esto, la tarjeta queda "clavada" en modo drag al deslizar la agenda
    const handlePointerCancel = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
        touchStartPos.current = null
        activePointerId.current = null
        dragPointerY.current = 0
        isDraggingRef.current = false
        setLongPressActive(null)
        document.body.style.overflow = ''
        document.body.style.touchAction = ''
        document.body.style.overscrollBehavior = ''
    }, [])

    const handleDragEnd = (event: any, info: any, cita: CitaDesdeVista) => {
        isDraggingRef.current = false
        dragPointerY.current = 0
        setLongPressActive(null)
        // Restore body styles (scroll container was NOT locked to allow edge-scroll)
        document.body.style.overflow = ''
        document.body.style.touchAction = ''
        document.body.style.overscrollBehavior = ''

        const deltaY = info.offset.y
        const slotsMoved = Math.round(deltaY / SLOT_HEIGHT)

        if (slotsMoved === 0) {
            setCardResetKey(k => k + 1)
            return
        }

        // Snap to half-hour grid and normalize using relative timestamp manipulation
        const originalStart = parseLocalTimestamp(cita.timestamp_inicio_local || '')
        const originalEnd = parseLocalTimestamp(cita.timestamp_fin_local || '')
        const durationMs = originalEnd.getTime() - originalStart.getTime()

        // Mover el inicio sumando minutos (30 min por slot)
        const newStart = new Date(originalStart.getTime() + (slotsMoved * 30 * 60000))

        // Asegurar que el inicio caiga en :00 o :30 de Hermosillo
        const currentMins = getHermosilloMins(newStart)
        if (currentMins % 30 !== 0) {
            const adjustedMins = Math.round(currentMins / 30) * 30
            const diff = adjustedMins - currentMins
            newStart.setTime(newStart.getTime() + diff * 60000)
        }

        const newEnd = new Date(newStart.getTime() + durationMs)

        // --- VALIDACIÓN DE COLISIONES ROBUSTA ---
        const colisionProhibida = citas.find((c: CitaDesdeVista) => {
            if (c.id != null && cita.id != null && String(c.id) === String(cita.id)) return false

            const estadosProhibidos = ['en_proceso', 'por_cobrar', 'finalizada', 'completada', 'confirmada', 'en_espera']
            if (!estadosProhibidos.includes(c.estado)) return false

            const cStart = parseLocalTimestamp(c.timestamp_inicio_local || '').getTime()
            const cEndOriginal = parseLocalTimestamp(c.timestamp_fin_local || '').getTime()
            const cDur = Math.round((cEndOriginal - cStart) / 60000)
            const cDurBlocks = Math.max(1, Math.floor(cDur / 30))
            const cEndEffective = cStart + (cDurBlocks * 30 * 60000)

            // Usar duración redondeada para el nuevo fin (ej: si movemos una de 45m, solo ocupa 30m)
            const nDur = Math.round(durationMs / 60000)
            const nDurBlocks = Math.max(1, Math.floor(nDur / 30))
            const nEndEffective = newStart.getTime() + (nDurBlocks * 30 * 60000)

            // Interval Overlap logic
            return (newStart.getTime() < cEndEffective && nEndEffective > cStart)
        })

        if (colisionProhibida) {
            toast.error("Colisión de Horario", {
                description: `No es posible mover aquí. Se solapa con una cita ${colisionProhibida.estado.replace('_', ' ')} de ${colisionProhibida.cliente_nombre}.`,
                icon: <AlertCircle className="w-5 h-5 text-red-500" />,
                duration: 4000
            })
            setCardResetKey(k => k + 1)
            return
        }

        // --- VALIDACIÓN DE ALMUERZO Y BLOQUEOS ---
        const nStartMs = newStart.getTime()
        const nEndMs = newEnd.getTime()

        const enAlmuerzo = (() => {
            if (!almuerzoBarbero || !almuerzoBarbero.inicio || !almuerzoBarbero.fin) return false
            const dateStr = getHermosilloDateStr(parseLocalTimestamp(cita.timestamp_inicio_local || ''))
            const aStart = new Date(`${dateStr}T${almuerzoBarbero.inicio}:00-07:00`).getTime()
            const aEnd = new Date(`${dateStr}T${almuerzoBarbero.fin}:00-07:00`).getTime()
            return (nStartMs < aEnd && nEndMs > aStart)
        })()

        if (enAlmuerzo) {
            toast.error("Horario de Almuerzo", {
                description: "No es posible mover la cita al horario de almuerzo del barbero.",
                icon: <Clock className="w-5 h-5 text-amber-500" />,
                duration: 4000
            })
            setCardResetKey(k => k + 1)
            return
        }

        const enBloqueo = bloqueos.some(b => {
            const bStart = parseLocalTimestamp(b.fecha_inicio).getTime()
            const bEnd = parseLocalTimestamp(b.fecha_fin).getTime()
            return (nStartMs < bEnd && nEndMs > bStart)
        })

        if (enBloqueo) {
            toast.error("Horario Bloqueado", {
                description: "Este horario está bloqueado administrativamente.",
                icon: <AlertCircle className="w-5 h-5 text-red-500" />,
                duration: 4000
            })
            setCardResetKey(k => k + 1)
            return
        }

        setProposedMove({ cita, newStartTime: newStart.toISOString() })
    }

    const confirmarMoverCita = async () => {
        if (!proposedMove) return
        const { cita, newStartTime } = proposedMove

        try {
            // Preserve original duration
            const originalStart = parseLocalTimestamp(cita.timestamp_inicio_local || '')
            const originalEnd = parseLocalTimestamp(cita.timestamp_fin_local || '')
            const durationMs = originalEnd.getTime() - originalStart.getTime()

            const newStart = new Date(newStartTime)
            const newEnd = new Date(newStart.getTime() + durationMs)

            const res = await fetch(`/api/citas/${cita.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    timestamp_inicio_local: formatToHermosilloISO(newStart),
                    timestamp_fin_local: formatToHermosilloISO(newEnd)
                })
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.message || 'Error al mover la cita')
            }
            onUpdate?.()
        } catch (err) {
            console.error('Error moving appointment:', err)
            alert('Error al mover la cita')
        } finally {
            setProposedMove(null)
        }
    }

    const dentroHorario = currentHour >= horaInicio && currentHour < horaFin

    const handleDetailsClick = useCallback((e: any, c: any) => { e.stopPropagation(); setSelectedCita(c); setActiveModal('details'); }, [])
    const handleMoveClick = useCallback((e: any, c: any) => { e.stopPropagation(); setSelectedCita(c); setActiveModal('move'); }, [])
    const handleCancelClick = useCallback((e: any, c: any) => { e.stopPropagation(); setSelectedCita(c); setActiveModal('cancel'); }, [])
    const handleCheckoutClick = useCallback((e: any, c: any) => { e.stopPropagation(); setSelectedCita(c); setActiveModal('checkout'); }, [])

    return (
        <div className="absolute inset-0 flex flex-col">
            <div
                ref={scrollContainerRef}
                onWheel={handleUserInteraction}
                onTouchMove={handleUserInteraction}
                className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4 relative scroll-smooth"
                style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
            >
                {dentroHorario && (
                    <div
                        className="absolute left-0 right-0 z-[10] border-t-[2px] border-primary pointer-events-none transition-all duration-1000 flex items-center"
                        style={{ top: `${currentTimePosition + (typeof window !== 'undefined' && window.innerWidth >= 768 ? 16 : 12)}px` }}
                    >
                        <div className="absolute left-0 -translate-y-1/2 flex items-center">
                            <span className="bg-primary text-black text-[10px] font-black pl-3 pr-2 py-1 rounded-r shadow-lg uppercase whitespace-nowrap z-[10] font-display">
                                {currentTime.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '')}
                            </span>
                        </div>
                    </div>
                )}

                <div className="divide-y divide-border/20">
                    {Array.from({ length: horaFin - horaInicio }).map((_, i) => {
                        const hour24 = horaInicio + i
                        const ampm = hour24 >= 12 ? 'PM' : 'AM'
                        const hour12 = hour24 % 12 || 12

                        const slot00 = `${hour12}:00 ${ampm}`
                        const slot30 = `${hour12}:30 ${ampm}`

                        return (
                            <div key={hour24} className="flex border-b border-border/20 last:border-0 min-h-[120px]"> {/* 60 * 2 */}
                                {/* Hour Label Column */}
                                <div className="w-14 md:w-20 flex flex-col items-end justify-start pt-2 pr-4 border-r border-border/20 bg-muted/20 shrink-0 mr-1">
                                    <span className="text-[11px] md:text-sm font-black text-foreground leading-none">{hour12}</span>
                                    <span className="text-[7px] md:text-[9px] font-black text-muted-foreground uppercase tracking-tighter mt-0.5">{ampm}</span>
                                </div>

                                {/* Slots Column */}
                                <div className="flex-1 flex flex-col">
                                    {[slot00, slot30].map((slot, index) => {
                                        const item = getCitaEnSlot(slot)
                                        let activeTimer = null
                                        let isEnProceso = false
                                        let isPorCobrar = false

                                        if (item && item.tipo === 'cita') {
                                            isEnProceso = item.data.estado === 'en_proceso'
                                            isPorCobrar = item.data.estado === 'por_cobrar'

                                            if (isEnProceso && item.data.timestamp_inicio_servicio) {
                                                const minTrasncurridos = Math.floor((new Date().getTime() - new Date(item.data.timestamp_inicio_servicio).getTime()) / 60000)
                                                const horasLabel = Math.floor(minTrasncurridos / 60)
                                                const minsLabel = minTrasncurridos % 60
                                                activeTimer = horasLabel > 0 ? `${horasLabel}H ${minsLabel}M` : `${minsLabel} MIN`
                                            } else if (isPorCobrar && item.data.duracion_real_minutos) {
                                                const horasLabel = Math.floor(item.data.duracion_real_minutos / 60)
                                                const minsLabel = item.data.duracion_real_minutos % 60
                                                activeTimer = horasLabel > 0 ? `${horasLabel}H ${minsLabel}M` : `${minsLabel} MIN`
                                            }
                                        }

                                        const cardBorder = item?.tipo === 'bloqueo' ? 'border-red-500/30 bg-red-50 dark:bg-[#16181D]/90' :
                                            item?.tipo === 'almuerzo' ? 'border-amber-500/30 bg-amber-50 dark:bg-[#16181D]/90' :
                                                isEnProceso ? 'border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)] bg-emerald-500/5' :
                                                    isPorCobrar ? 'border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.15)] bg-blue-500/5' :
                                                        item?.data?.estado === 'confirmada' ? 'border-yellow-500/40 bg-yellow-500/5' :
                                                            item?.data?.estado === 'finalizada' ? 'border-zinc-500/20 bg-zinc-500/5' :
                                                                item?.data?.estado === 'cancelada' ? 'border-red-500/40 bg-red-500/5' :
                                                                    'border-border/10 hover:border-border/20 bg-card/90'

                                        return (
                                            <div
                                                key={slot}
                                                className={`relative flex-1 flex items-center gap-2 transition-colors duration-200 ${item ? 'bg-transparent' : 'hover:bg-accent'} ${index === 0 ? 'border-b border-border/5' : ''}`}
                                                style={{ height: SLOT_HEIGHT }}
                                            >
                                                <div className="w-6 md:w-8 flex items-center justify-center shrink-0 opacity-30">
                                                    <span className="text-[7px] md:text-[9px] font-black text-slate-400">{index === 0 ? '00' : '30'}</span>
                                                </div>
                                                <div className="relative flex-1 h-full py-1 pr-1.5">
                                                    {item ? (
                                                        <TimelineAppointmentCard
                                                            item={item}
                                                            cardResetKey={cardResetKey}
                                                            longPressActive={longPressActive}
                                                            highlightedCitaId={highlightedCitaId}
                                                            handleDragStart={handleDragStart}
                                                            handleDragEnd={handleDragEnd}
                                                            handlePointerDown={handlePointerDown}
                                                            handlePointerMove={handlePointerMove}
                                                            handlePointerUp={handlePointerUp}
                                                            handlePointerCancel={handlePointerCancel}
                                                            activeTimer={activeTimer}
                                                            isEnProceso={isEnProceso}
                                                            isPorCobrar={isPorCobrar}
                                                            cardBorder={cardBorder}
                                                            getStatusColor={getStatusColor}
                                                            handleAtenderClick={handleAtenderClick}
                                                            handleDetailsClick={handleDetailsClick}
                                                            handleMoveClick={handleMoveClick}
                                                            handleCancelClick={handleCancelClick}
                                                            handleCheckoutClick={handleCheckoutClick}
                                                            actualizarEstadoDirecto={actualizarEstadoDirecto}
                                                            onUpdate={onUpdate}
                                                        />
                                                    ) : (
                                                        <div className="h-px w-4 bg-border/20 ml-1" />
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="shrink-0 bg-background border-t border-border/10 p-3 pb-safe">
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-2 text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] text-foreground/40">
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

                <div className="mt-3 flex gap-2">
                    {viewDate > todayLocalStr ? (
                        <div className="flex-1 border h-10 rounded-xl bg-muted/5 border-border/50 text-muted-foreground/15 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] cursor-not-allowed select-none">
                            <AlertCircle className="w-3.5 h-3.5 opacity-40" />
                            <span>Día Futuro — No disponible</span>
                        </div>
                    ) : (
                    <Button
                        onClick={() => setShowCorteTurno(true)}
                        disabled={loadingCorte}
                        className={cn(
                            "flex-1 border h-10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] gap-2 transition-all shadow-lg",
                            loadingCorte
                                ? "bg-muted/10 border-border/50 text-muted-foreground/20 cursor-default"
                                : corteExistente
                                    ? "bg-emerald-600/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-600/20 shadow-emerald-900/10 group/btn"
                                    : "bg-muted/30 hover:bg-muted/50 text-foreground border-border/50 shadow-2xl group/btn"
                        )}
                    >
                        {loadingCorte ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin opacity-50" />
                                <span className="opacity-50">Cargando...</span>
                            </>
                        ) : corteExistente ? (
                            <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 group-hover/btn:scale-110 transition-transform" />
                                Turno Cerrado
                            </>
                        ) : (
                            <>
                                <BarChart3 className="w-3.5 h-3.5 text-primary group-hover/btn:scale-110 transition-transform" />
                                Cerrar Turno
                            </>
                        )}
                    </Button>
                    )}
                </div>
            </div>

            {/* Hidden Ghost Card to reuse Modals logic */}
            {selectedCita && (
                <div className="hidden">
                    <CitaCard
                        cita={selectedCita}
                        currentTime={currentTime}
                        allCitas={citas}
                        onUpdate={() => { setSelectedCita(null); setActiveModal(null); onUpdate?.(); }}
                        onClose={() => { setSelectedCita(null); setActiveModal(null); }}
                        autoOpen={activeModal}
                        bloqueos={bloqueos}
                        almuerzoBarbero={almuerzoBarbero}
                        horarioSucursal={horarioSucursal}
                        servicios={allServicios}
                        barberos={allBarberos}
                    />
                </div>
            )}

            {/* Early Warning Dialog */}
            <Dialog open={showEarlyWarning} onOpenChange={setShowEarlyWarning}>
                <DialogContent className="bg-background border-border/50 text-foreground rounded-[2rem] sm:max-w-sm w-[95vw] max-h-[95vh] overflow-y-auto p-0 outline-none border">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-gold opacity-50" />
                    <DialogHeader className="flex flex-col items-center pt-6 px-6">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <Clock className="w-8 h-8 text-primary animate-pulse" />
                        </div>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight text-center">Atención Adelantada</DialogTitle>
                        <DialogDescription className="text-muted-foreground text-center text-sm">
                            Faltan unos minutos para esta cita. ¿Deseas comenzar el servicio ahora mismo?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 mt-4 p-8">
                        <Button onClick={confirmarAtencionTemprana} className="w-full bg-primary text-primary-foreground font-black uppercase tracking-widest py-6 rounded-2xl">
                            Sí, Atender Ahora
                        </Button>
                        <Button variant="ghost" onClick={() => setShowEarlyWarning(false)} className="w-full text-foreground/40 hover:text-foreground hover:bg-muted font-black uppercase rounded-2xl">
                            No, Esperar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Active Appointment Warning Dialog */}
            <Dialog open={showActiveWarning} onOpenChange={setShowActiveWarning}>
                <DialogContent className="bg-background border-border/50 text-foreground rounded-[2rem] sm:max-w-md w-[95vw] max-h-[95vh] overflow-y-auto p-0 outline-none border shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-red-600 opacity-50" />
                    <DialogHeader className="flex flex-col items-center pt-10 px-6">
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                            <AlertTriangle className="w-10 h-10 text-red-500 animate-pulse" />
                        </div>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center leading-none">
                            Servicio en Proceso
                        </DialogTitle>
                        <DialogDescription className="text-red-400/60 text-center text-sm mt-3 font-bold uppercase tracking-widest leading-relaxed">
                            No es posible iniciar un nuevo servicio <br /> sin finalizar el que está activo.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-8 space-y-4">
                        {citaActiva && (
                            <div className="p-6 bg-muted/30 rounded-[1.5rem] border border-border/50">
                                <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.3em] mb-2">Cita Activa</p>
                                <p className="text-xl font-black text-foreground uppercase italic">{citaActiva.cliente_nombre}</p>
                                <p className="text-[10px] font-bold text-primary mt-1 uppercase tracking-widest">{citaActiva.servicio_nombre}</p>
                            </div>
                        )}

                        <div className="flex flex-col gap-3 pt-2">
                            <Button
                                onClick={() => {
                                    setShowActiveWarning(false)
                                    if (citaActiva) {
                                        scrollAndHighlight(citaActiva.id)
                                    }
                                }}
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest py-7 rounded-2xl shadow-xl active:scale-[0.98] transition-all"
                            >
                                Gestionar Cita Activa
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setShowActiveWarning(false)}
                                className="w-full text-foreground/40 hover:text-foreground hover:bg-muted font-black uppercase tracking-widest py-6 rounded-2xl"
                            >
                                Entendido
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Confirm Move Modal */}
            <Dialog open={!!proposedMove} onOpenChange={(open) => { if (!open) { setProposedMove(null); setCardResetKey(k => k + 1); } }}>
                <DialogContent className="bg-background border-border/50 text-foreground rounded-t-[2rem] sm:rounded-[2rem] p-0 overflow-hidden shadow-2xl max-w-sm">
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary/50" />

                    <div className="p-6">
                        <DialogHeader className="flex flex-row items-center gap-4 mb-6">
                            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary shrink-0">
                                <RefreshCcw className="size-6" />
                            </div>
                            <div className="text-left">
                                <DialogTitle className="text-base font-black text-foreground uppercase tracking-tight">¿Confirmar Movimiento?</DialogTitle>
                                <DialogDescription className="text-xs font-medium text-muted-foreground">
                                    {proposedMove?.cita.cliente_nombre}
                                </DialogDescription>
                            </div>
                        </DialogHeader>

                        {displayMove && (
                            <div className="bg-muted rounded-2xl border border-border p-5 mb-6">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="text-center flex-1">
                                        <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest mb-1">De</p>
                                        <p className="text-lg font-black text-muted-foreground/40 line-through">
                                            {parseLocalTimestamp(displayMove.cita.timestamp_inicio_local || '').toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                        <ArrowRight className="text-primary w-5 h-5" />
                                    </div>
                                    <div className="text-center flex-1">
                                        <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">A</p>
                                        <p className="text-lg font-black text-primary">
                                            {new Date(displayMove.newStartTime).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <p className="text-[11px] font-medium text-slate-400 mb-6 leading-relaxed text-center">
                            El servicio mantendrá su duración original.
                        </p>

                        <DialogFooter className="flex flex-row gap-3 w-full">
                            <Button
                                variant="ghost"
                                onClick={() => { setProposedMove(null); setCardResetKey(k => k + 1) }}
                                className="flex-1 h-14 bg-muted text-foreground/40 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-border hover:bg-accent"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={confirmarMoverCita}
                                className="flex-[2] h-14 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 className="size-5" />
                                Confirmar y Mover
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* CORTE DE TURNO MODAL */}
            <Dialog open={showCorteTurno} onOpenChange={setShowCorteTurno}>
                <DialogContent className="bg-background border-border/50 text-foreground rounded-[2.5rem] sm:max-w-md w-[95vw] shadow-2xl p-0 overflow-hidden outline-none">
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary/50 opacity-50" />

                    <DialogHeader className="pt-10 px-8 pb-4">
                        <div className="flex items-center gap-4 mb-2">
                            <div className={cn(
                                "size-12 rounded-2xl flex items-center justify-center border shrink-0 transition-colors",
                                corteExistente 
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                                    : (viewDate < todayLocalStr)
                                        ? "bg-red-500/10 border-red-500/20 text-red-500"
                                        : "bg-primary/10 border-primary/20 text-primary"
                            )}>
                                {corteExistente ? <CheckCircle2 className="size-6" /> : (viewDate < todayLocalStr) ? <AlertCircle className="size-6" /> : <Wallet className="size-6" />}
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black uppercase tracking-tighter leading-none text-foreground">
                                    {corteExistente ? 'Turno Cerrado' : (viewDate < todayLocalStr) ? 'Cierre Retrasado' : 'Corte de Turno'}
                                </DialogTitle>
                                <DialogDescription className={cn(
                                    "text-[10px] uppercase tracking-[0.2em] font-black mt-2",
                                    corteExistente ? "text-emerald-500/60" : (viewDate < todayLocalStr) ? "text-red-500/60" : "text-muted-foreground/30"
                                )}>
                                    {corteExistente ? 'Resumen guardado correctamente' : (viewDate < todayLocalStr) ? 'Es necesario realizar este cierre' : 'Resumen financiero del día'}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="px-8 pb-8 space-y-6">
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className={cn(
                                "p-4 border rounded-2xl transition-colors",
                                corteExistente 
                                    ? "bg-emerald-500/5 border-emerald-500/10" 
                                    : "bg-muted/10 border-border/50"
                            )}>
                                <p className={cn(
                                    "text-[8px] font-black uppercase tracking-widest mb-1",
                                    corteExistente ? "text-emerald-500/40" : "text-muted-foreground/30"
                                )}>Total Bruto</p>
                                <div className="flex items-baseline gap-1">
                                    <span className={cn(
                                        "text-xl font-black",
                                        corteExistente ? "text-emerald-400" : "text-foreground"
                                    )}>${metrics.totalBruto}</span>
                                </div>
                            </div>
                            <div className={cn(
                                "p-4 border rounded-2xl transition-colors",
                                corteExistente 
                                    ? "bg-emerald-500/5 border-emerald-500/10" 
                                    : "bg-muted/10 border-border/50"
                            )}>
                                <p className={cn(
                                    "text-[8px] font-black uppercase tracking-widest mb-1",
                                    corteExistente ? "text-emerald-500/40" : "text-muted-foreground/30"
                                )}>Tus Cortes</p>
                                <div className="flex items-baseline gap-1">
                                    <span className={cn(
                                        "text-xl font-black",
                                        corteExistente ? "text-emerald-400" : "text-primary"
                                    )}>{metrics.totalCortes}</span>
                                    <span className="text-[10px] font-bold text-muted-foreground/20 uppercase">und</span>
                                </div>
                            </div>
                            <div className={cn(
                                "col-span-2 p-5 border rounded-2xl flex items-center justify-between transition-colors",
                                corteExistente 
                                    ? "bg-emerald-500/10 border-emerald-500/20" 
                                    : "bg-primary/5 border-primary/10"
                            )}>
                                <div>
                                    <p className={cn(
                                        "text-[8px] font-black uppercase tracking-widest mb-1",
                                        corteExistente ? "text-emerald-500/60" : "text-primary"
                                    )}>Tu Comisión ({metrics.comision_porcentaje}%)</p>
                                    <p className={cn(
                                        "text-2xl font-black leading-none",
                                        corteExistente ? "text-emerald-400" : "text-primary"
                                    )}>${metrics.comision}</p>
                                </div>
                                <div className={cn(
                                    "w-12 h-12 rounded-full flex items-center justify-center",
                                    corteExistente ? "bg-emerald-500/10" : "bg-primary/10"
                                )}>
                                    <TrendingUp className={cn(
                                        "w-6 h-6",
                                        corteExistente ? "text-emerald-500" : "text-primary"
                                    )} />
                                </div>
                            </div>
                        </div>

                        {/* Warning or Success Area */}
                        {metrics.pendientes.length > 0 ? (
                            <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-2xl flex gap-4 items-start">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-red-500 uppercase tracking-tight mb-1">Acción Requerida</p>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        Tienes <span className="text-foreground font-bold">{metrics.pendientes.length} citas pendientes</span> de finalizar o cobrar. Debes gestionarlas antes de cerrar el turno.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className={cn(
                                "p-5 border rounded-2xl flex gap-4 items-start transition-colors",
                                corteExistente
                                    ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.05)]"
                                    : "bg-emerald-500/5 border-emerald-500/20"
                            )}>
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                    corteExistente ? "bg-emerald-500/20" : "bg-emerald-500/10"
                                )}>
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-emerald-500 uppercase tracking-tight mb-1">
                                        {corteExistente ? 'Corte Realizado' : 'Turno Limpio'}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        {corteExistente 
                                            ? 'Este turno ya ha sido cerrado y los datos están sincronizados.' 
                                            : 'Todas las citas de hoy han sido procesadas correctamente. Puedes proceder con el cierre.'}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-3 pt-4">
                            <Button
                                disabled={metrics.pendientes.length > 0 || loadingCorte}
                                onClick={async () => {
                                    if (isEarlyClosure && !corteExistente) {
                                        setShowEarlyCloseAlert(true)
                                        return
                                    }
                                    try {
                                        setLoadingCorte(true)
                                        const insertPayload = {
                                            barbero_id: barbero.id,
                                            sucursal_id: barbero.sucursal_id,
                                            fecha_corte: viewDate,
                                            monto_bruto: metrics.totalBruto,
                                            comision_barbero: metrics.comision,
                                            total_servicios: metrics.totalCortes,
                                            tipo: 'diario',
                                            created_at: corteExistente?.created_at || new Date().toISOString()
                                        }
                                        const { error } = await supabase
                                            .from('cortes_turno' as any)
                                            .upsert(insertPayload as any)
                                        if (error) throw error
                                        setCorteExistente(insertPayload)
                                        toast.success(corteExistente ? "Corte Actualizado" : "Turno Cerrado Correctamente", {
                                            description: "El resumen ha sido guardado en el sistema.",
                                            icon: <CircleDollarSign className="w-5 h-5 text-primary" />
                                        })
                                        setShowCorteTurno(false)
                                    } catch (err: any) {
                                        console.error('Error saving shift closing:', err)
                                        toast.error("Error al Guardar Corte", {
                                            description: err.message || "No se pudo persistir el cierre de turno."
                                        })
                                    } finally {
                                        setLoadingCorte(false)
                                    }
                                }}
                                className={cn(
                                    "w-full h-16 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl",
                                    metrics.pendientes.length > 0
                                        ? "bg-muted text-foreground/20 border border-border cursor-not-allowed"
                                        : corteExistente
                                            ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-900/20"
                                            : "bg-primary text-black hover:bg-primary/90 shadow-primary/20"
                                )}
                            >
                                {loadingCorte ? 'Cargando...' : metrics.pendientes.length > 0 ? 'Cierre Bloqueado' : corteExistente ? 'Actualizar Corte' : 'Confirmar Corte y Salir'}
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={() => setShowCorteTurno(false)}
                                className="w-full text-foreground/20 hover:text-foreground hover:bg-muted font-black uppercase tracking-widest text-[9px] py-4 rounded-xl"
                            >
                                Regresar a la Agenda
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Early Closure Alert Dialog */}
            <AlertDialog open={showEarlyCloseAlert} onOpenChange={setShowEarlyCloseAlert}>
                <AlertDialogContent className="bg-background border border-border/50 rounded-3xl shadow-2xl shadow-primary/10 max-w-md">
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                                <AlertTriangle className="size-6 text-amber-500" />
                            </div>
                            <div>
                                <AlertDialogTitle className="text-foreground font-black uppercase tracking-widest text-base">
                                    Cierre Anticipado
                                </AlertDialogTitle>
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/70 mt-0.5">
                                    Aún no es la hora de cierre
                                </p>
                            </div>
                        </div>
                        <AlertDialogDescription className="text-muted-foreground text-xs leading-relaxed">
                            Estás intentando cerrar el turno antes de la hora programada de cierre
                            ({closingTimeStr}). Aún pueden llegar más citas o estar pendientes por
                            gestionar. ¿Deseas confirmar el cierre de todas formas?
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 my-2 flex items-center gap-4">
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Hora actual</span>
                            <span className="text-2xl font-black text-foreground tabular-nums">
                                {currentTime.getHours().toString().padStart(2, '0')}:{currentTime.getMinutes().toString().padStart(2, '0')}
                            </span>
                        </div>
                        <div className="flex-1 h-[1px] bg-amber-500/20 relative">
                            <div className="absolute inset-y-0 right-0 flex items-center">
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                            </div>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">Cierre programado</span>
                            <span className="text-2xl font-black text-amber-500 tabular-nums">{closingTimeStr}</span>
                        </div>
                    </div>

                    <AlertDialogFooter className="flex gap-2 mt-2">
                        <AlertDialogCancel
                            className="flex-1 h-12 rounded-2xl bg-muted border border-border text-foreground/60 font-black text-[10px] uppercase tracking-widest hover:bg-accent hover:text-foreground"
                            onClick={() => setShowEarlyCloseAlert(false)}
                        >
                            Esperar al cierre
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="flex-1 h-12 rounded-2xl bg-amber-500 text-black font-black text-[10px] uppercase tracking-widest hover:bg-amber-400 shadow-lg shadow-amber-500/20"
                            onClick={async () => {
                                setShowEarlyCloseAlert(false)
                                try {
                                    setLoadingCorte(true)
                                    const insertPayload = {
                                        barbero_id: barbero.id,
                                        sucursal_id: barbero.sucursal_id,
                                        fecha_corte: viewDate,
                                        monto_bruto: metrics.totalBruto,
                                        comision_barbero: metrics.comision,
                                        total_servicios: metrics.totalCortes,
                                        tipo: 'diario',
                                        created_at: corteExistente?.created_at || new Date().toISOString()
                                    }
                                    const { error } = await supabase
                                        .from('cortes_turno' as any)
                                        .upsert(insertPayload as any)
                                    if (error) throw error
                                    setCorteExistente(insertPayload)
                                    toast.success("Turno Cerrado Correctamente", {
                                        description: "El resumen ha sido guardado en el sistema.",
                                        icon: <CircleDollarSign className="w-5 h-5 text-primary" />
                                    })
                                    setShowCorteTurno(false)
                                } catch (err: any) {
                                    console.error('Error saving shift closing:', err)
                                    toast.error("Error al Guardar Corte", {
                                        description: err.message || "No se pudo persistir el cierre de turno."
                                    })
                                } finally {
                                    setLoadingCorte(false)
                                }
                            }}
                        >
                            Confirmar cierre anticipado
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    )
})
