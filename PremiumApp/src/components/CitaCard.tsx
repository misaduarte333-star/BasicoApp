import { useState, useEffect, memo, useMemo, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import type { CitaDesdeVista, EstadoCita } from '@/lib/types'
import { cn, getHermosilloMins, getHermosilloDateStr, formatToHermosilloISO, parse12hToMins, formato12h, parseLocalTimestamp } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import dynamic from 'next/dynamic'

const CheckOutModal = dynamic(() => import('./CheckOutModal').then(m => m.CheckOutModal), { ssr: false })
import {
    Play,
    RotateCcw,
    RefreshCcw,
    X,
    PlayCircle,
    CreditCard,
    Trash2,
    Calendar as CalendarIcon,
    Clock,
    User,
    CheckCircle2,
    History,
    Info,
    ChevronRight,
    MessageSquare,
    AlertTriangle,
    AlertCircle,
    StickyNote,
    UserCheck,
    Timer,
    CalendarClock,
    Store,
    MessageCircle as MessageCircleIcon,
    Phone
} from 'lucide-react'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Edit2, Check, Scissors, User as UserIcon, DollarSign, Banknote, Landmark, Timer as TimerIcon } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Servicio, Barbero } from '@/lib/types'

// Fuera del componente: evita recrear el objeto en cada render
const ESTADO_CONFIG: Record<string, { bg: string; border: string; accent: string; badgeVariant: 'outline'; label: string; badgeClass: string }> = {
    confirmada:  { bg: 'bg-card', border: 'border-border', accent: 'border-l-yellow-500',  badgeVariant: 'outline', label: 'Confirmada',   badgeClass: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/30' },
    en_espera:   { bg: 'bg-card', border: 'border-border', accent: 'border-l-yellow-500',  badgeVariant: 'outline', label: 'En Sucursal',  badgeClass: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/30' },
    en_proceso:  { bg: 'bg-card', border: 'border-border', accent: 'border-l-emerald-500', badgeVariant: 'outline', label: 'En Proceso',   badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    por_cobrar:  { bg: 'bg-card', border: 'border-border', accent: 'border-l-blue-500',    badgeVariant: 'outline', label: 'Por Cobrar',   badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    finalizada:  { bg: 'bg-card', border: 'border-border', accent: 'border-l-zinc-400',    badgeVariant: 'outline', label: 'Finalizada',   badgeClass: 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20' },
    cancelada:   { bg: 'bg-card', border: 'border-border', accent: 'border-l-red-500',     badgeVariant: 'outline', label: 'Cancelada',    badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
    no_show:     { bg: 'bg-card', border: 'border-border', accent: 'border-l-red-500',     badgeVariant: 'outline', label: 'No Show',      badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
}
const ESTADO_CONFIG_FALLBACK = { bg: 'bg-card', border: 'border-border', accent: 'border-l-slate-500', badgeVariant: 'outline' as const, label: '', badgeClass: 'bg-slate-500/10 text-slate-500 dark:text-slate-400' }

const DIAS_CITA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

interface CitaCardProps {
    cita: CitaDesdeVista
    onUpdate?: () => void
    onClose?: () => void
    isHighlighted?: boolean
    style?: React.CSSProperties
    currentTime: Date
    allCitas: CitaDesdeVista[]
    autoOpen?: 'move' | 'cancel' | 'details' | 'checkout' | null
    onCheckout?: (cita: CitaDesdeVista) => void
    bloqueos?: any[]
    almuerzoBarbero?: any
    horarioSucursal?: any
    /** Pre-loaded from parent to avoid per-card fetches */
    servicios?: Servicio[]
    /** Pre-loaded from parent to avoid per-card fetches */
    barberos?: Barbero[]
}

export const CitaCard = memo(function CitaCard({
    cita,
    onUpdate,
    onClose,
    isHighlighted,
    style,
    currentTime,
    allCitas,
    autoOpen,
    onCheckout,
    bloqueos = [],
    almuerzoBarbero = null,
    horarioSucursal,
    servicios: serviciosProp = [],
    barberos: barberosProp = [],
}: CitaCardProps) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
        if (autoOpen === 'details') setShowDetails(true)
        if (autoOpen === 'move') setShowMove(true)
        if (autoOpen === 'cancel') setShowCancel(true)
        if (autoOpen === 'checkout') setShowCheckout(true)
    }, [autoOpen, cita.id]) // Depend on cita.id too in case the same ghost card is reused for different appointments

    // Preload CheckOutModal bundle as soon as cita is ready for payment
    // so the first click on "Cobrar" doesn't stall waiting for the JS chunk
    useEffect(() => {
        if (cita.estado === 'por_cobrar') {
            import('./CheckOutModal')
        }
    }, [cita.estado])

    // States
    const [loading, setLoading] = useState(false)
    const [showEarlyWarning, setShowEarlyWarning] = useState(false)
    const [showActiveWarning, setShowActiveWarning] = useState(false)
    const [citaActiva, setCitaActiva] = useState<CitaDesdeVista | null>(null)
    const [showDetails, setShowDetails] = useState(autoOpen === 'details')
    const [showMove, setShowMove] = useState(false)
    const [showCancel, setShowCancel] = useState(false)
    const [showCheckout, setShowCheckout] = useState(false)
    const [showLateWarning, setShowLateWarning] = useState(false)
    const [newHour, setNewHour] = useState('')
    const [agreedCancel, setAgreedCancel] = useState(false)

    // Checkout states
    const [montoFinal, setMontoFinal] = useState<number>(cita.servicio_precio || 0)
    const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo')
    const [notasCrm, setNotasCrm] = useState('')
    const [isEditing, setIsEditing] = useState(false)
    const [nombreEdit, setNombreEdit] = useState(cita.cliente_nombre)
    const [telefonoEdit, setTelefonoEdit] = useState(cita.cliente_telefono || '')

    const [servicioEdit, setServicioEdit] = useState(cita.servicio_id)
    const [precioEdit, setPrecioEdit] = useState(cita.servicio_precio || 0)
    const [barberoEdit, setBarberoEdit] = useState(cita.barbero_id)
    const [notasEdit, setNotasEdit] = useState(cita.notas || '')

    // Use pre-loaded data from parent (avoids N+1 fetches); fall back to local fetch only if not provided
    const [allServicios, setAllServicios] = useState<Servicio[]>(serviciosProp)
    const [allBarberos, setAllBarberos] = useState<Barbero[]>(barberosProp)

    const supabase = useMemo(() => createClient(), [])

    // Sync state when cita prop changes (important due to parent synchronization)
    useEffect(() => {
        if (!isEditing) {
            setNombreEdit(cita.cliente_nombre)
            setTelefonoEdit(cita.cliente_telefono || '')
            setServicioEdit(cita.servicio_id)
            setPrecioEdit(cita.servicio_precio || 0)
            setBarberoEdit(cita.barbero_id)
            setNotasEdit(cita.notas || '')
        }
    }, [cita.id, isEditing])

    // Keep local copies in sync when parent updates the pre-loaded arrays
    useEffect(() => { if (serviciosProp.length > 0) setAllServicios(serviciosProp) }, [serviciosProp])
    useEffect(() => { if (barberosProp.length > 0) setAllBarberos(barberosProp) }, [barberosProp])

    // Fallback: only fetch if parent did not provide data (e.g. standalone usage)
    useEffect(() => {
        if (serviciosProp.length > 0 && barberosProp.length > 0) return
        const loadDeps = async () => {
            try {
                const [servs, barbs] = await Promise.all([
                    serviciosProp.length === 0 ? supabase.from('servicios').select('*').eq('activo', true) : Promise.resolve({ data: null }),
                    barberosProp.length === 0 ? supabase.from('barberos').select('*').eq('activo', true) : Promise.resolve({ data: null }),
                ])
                if (servs.data) setAllServicios(servs.data)
                if (barbs.data) setAllBarberos(barbs.data)
            } catch (err) {
                console.error('Error loading deps in CitaCard (fallback):', err)
            }
        }
        loadDeps()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const actualizarEstado = async (nuevoEstado: EstadoCita) => {
        if (loading) return

        // VALIDACIÓN: ¿Hay otra cita en proceso?
        if (nuevoEstado === 'en_proceso') {
            const citaEnCurso = allCitas.find(c => c.estado === 'en_proceso' && c.id !== cita.id)
            if (citaEnCurso) {
                setCitaActiva(citaEnCurso)
                setShowActiveWarning(true)
                setShowEarlyWarning(false)
                return
            }
        }

        setLoading(true)

        // Close all modals immediately for UI responsiveness
        setShowLateWarning(false)
        setShowCancel(false)
        setShowCheckout(false)
        setShowMove(false)

        try {
            const payload: any = { estado: nuevoEstado }

            // Set timestamp_inicio_servicio when Atender is clicked
            if (nuevoEstado === 'en_proceso') {
                payload.timestamp_inicio_servicio = new Date().toISOString()
            }

            // Set timestamp_fin_local_servicio and duration when Finalizar Corte is clicked
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
                console.error('❌ Error API:', body)
                alert(`Error en Base de Datos: ${body.message}`)
                setLoading(false)
                return
            }

            if (onUpdate) {
                onUpdate()
            } else {
                window.location.reload()
            }
        } catch (err: any) {
            console.error('💥 CRASH TECNICO:', err)
            alert(`Error de Conexión: ${err.message || 'Error desconocido'}`)
        } finally {
            setLoading(false)
        }
    }

    const liquidarCita = async () => {
        // Redundant, handled by CheckOutModal
    }

    const moverCita = async () => {
        if (!newHour || loading) return

        setLoading(true)
        try {
            const [hours, minutes] = newHour.split(':').map(Number)
            const oldInicio = parseLocalTimestamp(cita.timestamp_inicio_local || '')
            const oldFin = parseLocalTimestamp(cita.timestamp_fin_local || '')
            const duration = oldFin.getTime() - oldInicio.getTime()

            // Asignar la hora sobre el día de la cita usando Hermosillo TZ
            const fechaStr = getHermosilloDateStr(oldInicio)
            const newInicio = new Date(`${fechaStr}T${newHour}:00-07:00`)
            const newFin = new Date(newInicio.getTime() + duration)

            // --- VALIDACIÓN DE COLISIONES ROBUSTA (30-min block based) ---
            const nStart = newInicio.getTime()
            const nCDur = Math.round(duration / 60000)
            const nCDurBlocks = Math.max(1, Math.floor(nCDur / 30))
            const nEndEffective = nStart + (nCDurBlocks * 30 * 60000)

            const colisionProhibida = allCitas.find((c: CitaDesdeVista) => {
                // Exclusión por ID (Robusta)
                if (c.id && cita.id && String(c.id) === String(cita.id)) return false
                
                // Solo colisionar con citas del mismo barbero
                if (c.barbero_id && cita.barbero_id && String(c.barbero_id) !== String(cita.barbero_id)) return false

                const cancelados = ['cancelada', 'no_show']
                if (cancelados.includes(c.estado)) return false

                const cStart = parseLocalTimestamp(c.timestamp_inicio_local || '').getTime()
                const cEndOriginal = parseLocalTimestamp(c.timestamp_fin_local || '').getTime()
                const cDur = Math.round((cEndOriginal - cStart) / 60000)
                const cDurBlocks = Math.max(1, Math.floor(cDur / 30))
                const cEndEffective = cStart + (cDurBlocks * 30 * 60000)

                // Interval Overlap con duraciones efectivas de 30m
                const overlaps = (nStart < cEndEffective && nEndEffective > cStart)
                return overlaps
            })

            if (colisionProhibida) {
                toast.error("Horario no disponible", {
                    description: `Ya existe una cita ${colisionProhibida.estado.replace('_', ' ')} en este horario.`,
                    icon: <AlertCircle className="w-5 h-5 text-red-500" />
                })
                setLoading(false)
                return
            }

            // --- VALIDACIÓN DE BLOQUEOS ---
            const enBloqueo = bloqueos.some(b => {
                const bStart = new Date(b.timestamp_inicio || b.fecha_inicio).getTime()
                const bEnd = new Date(b.timestamp_fin || b.fecha_fin).getTime()
                return (nStart < bEnd && nEndEffective > bStart)
            })

            if (enBloqueo) {
                toast.error("Horario Bloqueado", {
                    description: "Este horario está bloqueado administrativamente.",
                    icon: <AlertCircle className="w-5 h-5 text-red-500" />
                })
                setLoading(false)
                return
            }

            const res = await fetch(`/api/citas/${cita.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    timestamp_inicio_local: formatToHermosilloISO(newInicio),
                    timestamp_fin_local: formatToHermosilloISO(newFin),
                }),
            })

            if (!res.ok) {
                const body = await res.json()
                throw new Error(body.message)
            }

            onUpdate?.()
            setShowMove(false)
        } catch (err: any) {
            console.error('Error moving appointment:', err)
            alert('Error al mover la cita')
        } finally {
            setLoading(false)
        }
    }

    const guardarTodo = async () => {
        if (loading) return
        if (!nombreEdit.trim()) {
            toast.error("El nombre es requerido")
            return
        }

        setLoading(true)
        try {
            // Recalcular timestamp_fin basado en el servicio seleccionado para mantener la duración correcta
            const selectedService = allServicios.find(s => s.id === servicioEdit)
            const durationMin = selectedService?.duracion_minutos || 30 // Duración por defecto si no se encuentra
            
            const start = parseLocalTimestamp(cita.timestamp_inicio_local || '')
            const newFin = new Date(start.getTime() + durationMin * 60000)

            const res = await fetch(`/api/citas/${cita.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cliente_nombre: nombreEdit,
                    cliente_telefono: telefonoEdit,
                    servicio_id: servicioEdit,
                    // servicio_precio no es una columna real en 'citas', se deriva del servicio en la vista.
                    // Se quita de aquí para evitar confusiones, el precio se actualizará al cambiar el servicio_id.
                    barbero_id: barberoEdit,
                    notas: notasEdit,
                    timestamp_fin: newFin.toISOString()
                }),
            })

            if (!res.ok) {
                const body = await res.json()
                throw new Error(body.message)
            }

            toast.success("Cita actualizada")
            setIsEditing(false)
            onUpdate?.()
        } catch (err: any) {
            console.error('Error updating appointment:', err)
            toast.error("Error al actualizar la cita")
        } finally {
            setLoading(false)
        }
    }



    const config = ESTADO_CONFIG[cita.estado] || { ...ESTADO_CONFIG_FALLBACK, label: cita.estado }

    const citaStartTime = parseLocalTimestamp(cita.timestamp_inicio_local || '')
    const minutosDiferencia = Math.floor((currentTime.getTime() - citaStartTime.getTime()) / 60000)
    const minHastaCita = -minutosDiferencia
    const esNoShow = minutosDiferencia > 15
    const isEarly = minHastaCita >= 30

    const isEnSucursal = cita.estado === 'en_espera'
    const isTiempoCorto = cita.estado === 'confirmada' && minHastaCita >= 0 && minHastaCita <= 15
    const hasUpdatedAt = cita.updated_at && cita.created_at && new Date(cita.updated_at).getTime() > new Date(cita.created_at).getTime() + 60000
    const isReprogramada = hasUpdatedAt && cita.estado === 'confirmada'

    const hasNextSoon = useMemo(() => allCitas.some(c => {
        if (c.id === cita.id || c.estado === 'cancelada' || c.estado === 'finalizada') return false
        const start = parseLocalTimestamp(c.timestamp_inicio_local || '')
        return start > citaStartTime && (start.getTime() - currentTime.getTime()) < 30 * 60 * 1000
    }), [allCitas, cita.id, citaStartTime, currentTime])

    const horaInicio = mounted ? citaStartTime.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true }) : '--:--'
    const horaFin = mounted ? new Date(cita.timestamp_fin_local || '').toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true }) : '--:--'

    // Horarios para generar botones (ajustado al horario de la sucursal) - MEMOIZED for parity with Nueva Cita
    const slotsParaCita = useMemo(() => {
        const slots = []
        const fechaCita = parseLocalTimestamp(cita.timestamp_inicio_local || '').toLocaleDateString('en-CA')

        // Determinar día de la semana para el horario de sucursal
        const targetDate = new Date(`${fechaCita}T12:00:00-07:00`)
        const indiceDia = targetDate.getDay()
        const nombreDia = DIAS_CITA[indiceDia]

        let horaApertura = 8
        let horaCierre = 20

        if (horarioSucursal && horarioSucursal[nombreDia]) {
            const hA = horarioSucursal[nombreDia].apertura
            const hC = horarioSucursal[nombreDia].cierre
            if (hA) {
                horaApertura = parseInt(hA.split(':')[0], 10) - 1
                if (horaApertura < 0) horaApertura = 0
            }
            if (hC) {
                const parts = hC.split(':')
                horaCierre = parseInt(parts[0], 10) + 1
                if (horaCierre > 23) horaCierre = 23
            }
        }

        const duracionSlotMin = 30
        const duracionCitaActual = Math.round((parseLocalTimestamp(cita.timestamp_fin_local || '').getTime() - parseLocalTimestamp(cita.timestamp_inicio_local || '').getTime()) / 60000)

        const getSlotStatus = (start: Date, end: Date) => {
            const ahora = new Date()
            const nStartMs = start.getTime()
            const nEndMs = end.getTime()

            // 1. Identificar si este slot pertenece a la CITA ACTUAL (la que estamos moviendo)
            const nCStart = parseLocalTimestamp(cita.timestamp_inicio_local || '').getTime()
            const nCEndOriginal = parseLocalTimestamp(cita.timestamp_fin_local || '').getTime()
            const nCDur = Math.round((nCEndOriginal - nCStart) / 60000)
            const nCDurBlocks = Math.max(1, Math.floor(nCDur / 30))
            const nCEndEffective = nCStart + (nCDurBlocks * 30 * 60000)

            const isThisCitaActual = (nStartMs < nCEndEffective && nEndMs > nCStart)
            
            if (isThisCitaActual) return 'actual'

            // 2. Colisión con otras citas (Interval overlap con duración efectiva de 30m)
            const ocupadoPorCita = allCitas.find(c => {
                // Exclusión por ID (Robusta)
                if (c.id != null && cita.id != null && String(c.id) === String(cita.id)) return false
                
                // Seguridad: Solo colisionar con citas del mismo barbero
                if (c.barbero_id && cita.barbero_id && String(c.barbero_id) !== String(cita.barbero_id)) return false

                if (['cancelada', 'no_show'].includes(c.estado)) return false

                const cStart = parseLocalTimestamp(c.timestamp_inicio_local || '').getTime()
                const cEndOriginal = parseLocalTimestamp(c.timestamp_fin_local || '').getTime()
                const cDur = Math.round((cEndOriginal - cStart) / 60000)
                const cDurBlocks = Math.max(1, Math.floor(cDur / 30))
                const cEndEffective = cStart + (cDurBlocks * 30 * 60000)

                // Interval Overlap
                return (nStartMs < cEndEffective && nEndMs > cStart)
            })

            if (ocupadoPorCita) return 'ocupado'

            // 3. Past check
            const esFechaHoy = getHermosilloDateStr(parseLocalTimestamp(cita.timestamp_inicio_local || '')) === getHermosilloDateStr(ahora)
            if (start < ahora && esFechaHoy) return 'past'

            // 4. Bloqueos manuales
            const isBlocked = bloqueos.some(b => {
                const bStart = new Date(b.timestamp_inicio || b.fecha_inicio).getTime()
                const bEnd = new Date(b.timestamp_fin || b.fecha_fin).getTime()
                return (nStartMs < bEnd && nEndMs > bStart)
            })
            if (isBlocked) return 'bloqueado'

            if (almuerzoBarbero && almuerzoBarbero.inicio && almuerzoBarbero.fin) {
                const aStart = new Date(`${fechaCita}T${almuerzoBarbero.inicio}:00-07:00`).getTime()
                const aEnd = new Date(`${fechaCita}T${almuerzoBarbero.fin}:00-07:00`).getTime()
                if (start.getTime() < aEnd && end.getTime() > aStart) return 'bloqueado'
            }

            return 'libre'
        }

        for (let h = horaApertura; h <= horaCierre; h++) {
            const hourValue = `${h.toString().padStart(2, '0')}:00`
            const h12 = h % 12 || 12
            const ampm = h >= 12 ? 'PM' : 'AM'
            const label = `${h12}:00 ${ampm}`

            const slotStart = new Date(`${fechaCita}T${hourValue}:00-07:00`)
            const slotEnd = new Date(slotStart.getTime() + duracionSlotMin * 60000)
            slots.push({ value: hourValue, label, status: getSlotStatus(slotStart, slotEnd) })

            const halfHourValue = `${h.toString().padStart(2, '0')}:30`
            const halfLabel = `${h12}:30 ${ampm}`
            const halfSlotStart = new Date(`${fechaCita}T${halfHourValue}:00-07:00`)
            const halfSlotEnd = new Date(halfSlotStart.getTime() + duracionSlotMin * 60000)

            let isWithinClosing = true
            if (horarioSucursal && horarioSucursal[nombreDia]) {
                const hC = horarioSucursal[nombreDia].cierre
                const [cierreH] = hC.split(':').map(Number)
                if (h > cierreH + 1) isWithinClosing = false
            }

            if (isWithinClosing) {
                slots.push({ value: halfHourValue, label: halfLabel, status: getSlotStatus(halfSlotStart, halfSlotEnd) })
            }
        }
        return slots
    }, [cita.timestamp_inicio_local, cita.timestamp_fin_local, allCitas, bloqueos, almuerzoBarbero, horarioSucursal])

    const isAnyModalOpen = showDetails || showMove || showCancel || showCheckout || showLateWarning || showEarlyWarning
    const isInProcess = cita.estado === 'en_proceso' || cita.estado === 'por_cobrar'

    // Timer logic for the active service
    const [elapsedMinutes, setElapsedMinutes] = useState(0)

    useEffect(() => {
        if (cita.estado === 'en_proceso' && cita.timestamp_inicio_servicio) {
            const calculateElapsed = () => {
                const start = new Date(cita.timestamp_inicio_servicio!).getTime()
                const now = new Date().getTime()
                setElapsedMinutes(Math.max(0, Math.floor((now - start) / 60000)))
            }

            calculateElapsed() // Run once immediately
            const interval = setInterval(calculateElapsed, 60000) // Update every minute

            return () => clearInterval(interval)
        } else if (cita.estado === 'por_cobrar' && cita.duracion_real_minutos !== undefined && cita.duracion_real_minutos !== null) {
            setElapsedMinutes(cita.duracion_real_minutos)
        }
    }, [cita.estado, cita.timestamp_inicio_servicio, cita.duracion_real_minutos])

    return (
        <Card
            className={cn(
                "relative md:rounded-[1.5rem] border-l-[4px] bg-card border-border overflow-hidden transition-all duration-700 hover:bg-muted/50 group animate-fade-in",
                config.bg,
                config.border,
                config.accent,
                (isHighlighted || isInProcess) ? 'shadow-[0_10px_30px_rgba(234,179,8,0.1)] border-primary/20' : 'border-border',
                isHighlighted ? 'z-10' : 'z-0'
            )}
            style={style}
        >
            {/* Interior Glow Overlay for active items */}
            {(isHighlighted || isInProcess) && (
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            )}

            <CardContent className="p-3 md:p-4">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 md:gap-8 text-foreground relative z-10">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 md:gap-4 mb-1.5 md:mb-3">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-muted border border-border flex items-center justify-center shrink-0 shadow-xl group-hover:border-primary/40 transition-colors duration-500">
                                <span className="text-sm md:text-xl font-black text-primary font-display group-hover:scale-105 transition-transform">{cita.cliente_nombre.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-xs md:text-lg font-black text-foreground truncate tracking-tight font-display uppercase leading-none">
                                    {cita.cliente_nombre}
                                </h3>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5 md:mt-1">
                                    <Badge variant={config.badgeVariant} className={cn("text-[8px] md:text-[9px] uppercase font-black tracking-[0.1em]", config.badgeClass)}>
                                        {config.label}
                                    </Badge>

                                    {isEnSucursal && (
                                        <Badge className="bg-emerald-500 text-primary-foreground animate-pulse flex items-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.5)] text-[8px] md:text-[9px] uppercase font-black">
                                            <UserCheck className="w-2.5 h-2.5" />
                                            En sucursal
                                        </Badge>
                                    )}

                                    {isTiempoCorto && (
                                        <Badge variant="outline" className="border-amber-500/50 text-amber-500 animate-pulse flex items-center gap-1 bg-amber-500/10 text-[8px] md:text-[9px] uppercase font-black">
                                            <Timer className="w-2.5 h-2.5" />
                                            En {minHastaCita} min
                                        </Badge>
                                    )}
                                    <div className="h-0.5 w-0.5 rounded-full bg-foreground/20" />
                                    <span className="text-[9px] font-black text-primary uppercase tracking-[0.1em]">
                                        {cita.servicio_nombre}
                                    </span>
                                </div>

                                {(cita.estado === 'en_proceso' || cita.estado === 'por_cobrar') && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className={cn(
                                            "flex items-center gap-1.5 px-2 py-1 rounded-md border",
                                            cita.estado === 'en_proceso' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                        )}>
                                            <Timer className={cn("w-3 h-3", cita.estado === 'en_proceso' && "animate-pulse")} />
                                            <span className="text-[10px] font-black tracking-widest leading-none">
                                                {elapsedMinutes} MIN
                                            </span>
                                        </div>
                                        {cita.estado === 'por_cobrar' && (
                                            <span className="text-[8px] uppercase tracking-widest text-blue-400/60 font-bold">Tiempo Final</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-foreground/40 font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-[7px] md:text-[8px]">
                            <div className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-1 md:py-1.5 bg-muted rounded-lg md:rounded-xl border border-border shadow-inner group-hover:border-primary/20 transition-colors">
                                <Clock className="w-3 h-3 text-primary" />
                                <span className="text-foreground tracking-[0.05em] md:tracking-[0.1em]">{horaInicio} — {horaFin}</span>
                            </div>
                            {cita.notas && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/5 rounded-xl border border-blue-500/20 max-w-[200px] md:max-w-[300px]">
                                    <StickyNote className="w-3 h-3 text-blue-400" />
                                    <span className="text-blue-400 truncate tracking-normal italic opacity-80 text-[8px] md:text-[9px]">{cita.notas}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 md:gap-3 shrink-0">
                        {(cita.estado === 'confirmada' || cita.estado === 'finalizada') && (
                            <>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        if (loading) return
                                        if (esNoShow) {
                                            setShowLateWarning(true)
                                        } else if (isEarly) {
                                            setShowEarlyWarning(true)
                                        } else {
                                            actualizarEstado('en_proceso')
                                        }
                                    }}
                                    disabled={loading || cita.estado === 'finalizada'}
                                    className={cn(
                                        "h-auto py-2.5 px-4 font-black text-[9px] uppercase tracking-[0.1em] shadow-xl transition-all flex items-center gap-2 active:scale-95",
                                        cita.estado === 'finalizada' 
                                            ? "hidden" 
                                            : (esNoShow
                                                ? "bg-amber-500 text-primary-foreground hover:bg-amber-400 border-amber-300 shadow-[0_5px_15px_rgba(245,158,11,0.2)] animate-pulse"
                                                : "bg-gradient-gold text-primary-foreground hover:scale-[1.02] border border-primary/20 shadow-[0_5px_15px_rgba(234,179,8,0.15)]")
                                    )}
                                >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    {esNoShow ? 'Tardío' : 'Atender'}
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowMove(true)}
                                    className="h-auto py-2.5 px-3 bg-muted border-border text-foreground/60 hover:text-foreground hover:bg-accent text-[9px] font-black uppercase tracking-[0.1em]"
                                >
                                    <CalendarClock className="w-3.5 h-3.5" />
                                    Mover
                                </Button>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setShowCancel(true)}
                                    disabled={loading}
                                    className="h-9 w-9 bg-red-500/5 border-red-500/20 text-red-400 hover:text-red-400 hover:bg-red-500/10"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </>
                        )}

                        {isEnSucursal && (
                            <Button
                                size="lg"
                                onClick={() => actualizarEstado('en_proceso')}
                                disabled={loading}
                                className="h-auto py-4 px-6 rounded-2xl bg-primary/10 border-2 border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground shadow-[0_10px_40px_rgba(234,179,8,0.2)] transition-all flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em]"
                            >
                                <PlayCircle className="w-5 h-5" />
                                Confirmar Inicio
                            </Button>
                        )}

                        {cita.estado === 'en_proceso' && (
                            <Button
                                size="lg"
                                onClick={() => actualizarEstado('por_cobrar')}
                                disabled={loading}
                                className="h-auto py-4 px-6 rounded-2xl bg-blue-600 text-primary-foreground hover:bg-blue-500 shadow-[0_15px_40px_rgba(59,130,246,0.3)] border-2 border-blue-400/50 text-[11px] font-black uppercase tracking-[0.2em]"
                            >
                                <Scissors className="w-5 h-5" />
                                Finalizar
                            </Button>
                        )}

                        {cita.estado === 'por_cobrar' && (
                            <Button
                                size="lg"
                                onClick={() => onCheckout ? onCheckout(cita) : setShowCheckout(true)}
                                disabled={loading}
                                className="h-auto py-4 px-6 rounded-2xl bg-emerald-500 text-primary-foreground hover:bg-emerald-400 shadow-[0_20px_50px_rgba(16,185,129,0.3)] border-2 border-emerald-300 text-[11px] font-black uppercase tracking-[0.2em]"
                            >
                                <CreditCard className="w-5 h-5" />
                                Cobrar
                            </Button>
                        )}

                        {!isInProcess && (
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setShowDetails(true)}
                                className="h-9 w-9 bg-muted border-border text-foreground/30 hover:text-foreground"
                            >
                                <Info className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>

            {/* MODALS using shadcn/ui Dialog */}

            {/* Early Warning Dialog */}
            <Dialog open={showEarlyWarning} onOpenChange={(open) => { setShowEarlyWarning(open); if (!open) onClose?.(); }}>
                <DialogContent className="bg-background border-border text-foreground rounded-[2rem] sm:max-w-sm w-[95vw] max-h-[95vh] overflow-y-auto p-0 outline-none border">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-gold opacity-50" />
                    <DialogHeader className="flex flex-col items-center pt-6">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <Clock className="w-8 h-8 text-primary animate-pulse" />
                        </div>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight text-center">Atención Adelantada</DialogTitle>
                        <DialogDescription className="text-foreground/60 text-center text-sm">
                            Faltan <strong>{minHastaCita} minutos</strong> para esta cita. ¿Deseas comenzar el servicio ahora mismo?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 mt-4 p-6">
                        <Button onClick={() => { setShowEarlyWarning(false); actualizarEstado('en_proceso') }} className="w-full bg-gradient-gold text-black font-black uppercase tracking-widest py-6">
                            Sí, Atender Ahora
                        </Button>
                        <Button variant="ghost" onClick={() => setShowEarlyWarning(false)} className="w-full text-foreground/40 hover:text-foreground hover:bg-muted font-black uppercase">
                            No, Esperar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Active Appointment Warning Dialog */}
            <Dialog open={showActiveWarning} onOpenChange={(open) => { setShowActiveWarning(open); if (!open) onClose?.(); }}>
                <DialogContent className="bg-background border-red-500/20 text-foreground rounded-[2rem] sm:max-w-md w-[95vw] max-h-[95vh] overflow-y-auto p-0 outline-none border shadow-[0_0_50px_rgba(239,68,68,0.15)]">
                    <div className="absolute top-0 left-0 w-full h-1 bg-red-600 opacity-50" />
                    <DialogHeader className="flex flex-col items-center pt-10 px-6">
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                            <AlertTriangle className="w-10 h-10 text-red-500 animate-pulse" />
                        </div>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center leading-none">
                            Servicio en Proceso
                        </DialogTitle>
                        <DialogDescription className="text-red-400/60 text-center text-sm mt-3 font-bold uppercase tracking-widest leading-relaxed">
                            No es posible iniciar un nuevo servicio <br/> sin finalizar el que está activo.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-8 space-y-4">
                        {citaActiva && (
                            <div className="p-6 bg-muted/30 rounded-[1.5rem] border border-border">
                                <p className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.3em] mb-2">Cita Activa</p>
                                <p className="text-xl font-black text-foreground uppercase italic">{citaActiva.cliente_nombre}</p>
                                <p className="text-[10px] font-bold text-primary mt-1 uppercase tracking-widest">{citaActiva.servicio_nombre}</p>
                            </div>
                        )}

                        <div className="flex flex-col gap-3 pt-2">
                            <Button
                                onClick={() => {
                                    setShowActiveWarning(false)
                                    // In CitaCard (upcoming list), we just close and expect the user 
                                    // to see it highlighted in the timeline if it's visible.
                                    // If we had a global store or context, we could trigger the scroll here too.
                                }}
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest py-7 rounded-2xl shadow-xl active:scale-[0.98] transition-all"
                            >
                                Entendido
                            </Button>

                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Details Dialog */}
            <Dialog open={showDetails} onOpenChange={(open) => { setShowDetails(open); if (!open) onClose?.(); }}>
                <DialogContent showCloseButton={false} className="bg-background border-border text-foreground rounded-[2rem] sm:max-w-md w-[95vw] max-h-[95vh] overflow-hidden p-0 outline-none border shadow-2xl flex flex-col">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-gold z-50 shrink-0" />

                    {/* Header — mismo estilo que otros modales */}
                    <DialogHeader className="px-5 py-3 border-b border-border/50 bg-card/20 shrink-0 relative z-10 flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                                <Info className="w-5 h-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                                <DialogTitle className="text-lg font-black uppercase tracking-tighter text-foreground font-display leading-none">
                                    Detalles de la Cita
                                </DialogTitle>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <User className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                                    <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary/70 font-bold text-[10px] px-1.5 py-0 h-4 truncate">
                                        {cita.cliente_nombre}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            {!isEditing ? (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsEditing(true)}
                                    className="h-9 w-9 rounded-xl border border-border bg-muted text-muted-foreground hover:text-primary hover:bg-muted/80 transition-all"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                            ) : (
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            setIsEditing(false)
                                            setNombreEdit(cita.cliente_nombre)
                                            setTelefonoEdit(cita.cliente_telefono || '')
                                            setServicioEdit(cita.servicio_id)
                                            setPrecioEdit(cita.servicio_precio || 0)
                                            setBarberoEdit(cita.barbero_id)
                                            setNotasEdit(cita.notas || '')
                                        }}
                                        className="h-9 w-9 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={guardarTodo}
                                        disabled={loading}
                                        className="h-9 w-9 rounded-xl border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                    >
                                        <Check className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setShowDetails(false); onClose?.() }}
                                className="w-12 h-12 rounded-xl bg-muted border border-border text-foreground/60 hover:text-foreground hover:bg-muted/80 transition-all shrink-0 group"
                            >
                                <X className="w-7 h-7 group-hover:scale-110 transition-transform" />
                            </Button>
                        </div>
                    </DialogHeader>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-none sm:scrollbar-thin">
                    <div className="p-4 space-y-3">
                        {/* Cliente Section */}
                        <div className="p-5 bg-muted rounded-2xl border border-border relative overflow-hidden">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.4em] mb-3 flex items-center gap-1.5">
                                <User className="w-3 h-3" />
                                Cliente
                            </p>
                            {!isEditing ? (
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h2 className="text-base font-black text-foreground font-display uppercase tracking-tight italic truncate">
                                            {cita.cliente_nombre}
                                        </h2>
                                        {cita.cliente_telefono ? (
                                            <p className="text-[11px] font-bold text-primary mt-1 tracking-widest font-mono flex items-center gap-1.5">
                                                <Phone className="w-3 h-3 opacity-60 shrink-0" />
                                                {cita.cliente_telefono}
                                            </p>
                                        ) : (
                                            <p className="text-[9px] font-bold text-muted-foreground/50 mt-1 uppercase tracking-widest italic">Sin teléfono registrado</p>
                                        )}
                                    </div>
                                    {/* Origen badge */}
                                    <div className="shrink-0">
                                        {cita.origen === 'walkin' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-widest">
                                                <Store className="w-2.5 h-2.5" />
                                                Local
                                            </span>
                                        )}
                                        {cita.origen === 'whatsapp' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#25D366]/10 border border-[#25D366]/20 text-[9px] font-black text-[#25D366] uppercase tracking-widest">
                                                <MessageCircleIcon className="w-2.5 h-2.5" />
                                                WhatsApp
                                            </span>
                                        )}
                                        {cita.origen === 'telefono' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[9px] font-black text-blue-500 uppercase tracking-widest">
                                                <Phone className="w-2.5 h-2.5" />
                                                Llamada
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Nombre</Label>
                                        <Input
                                            value={nombreEdit}
                                            onChange={(e) => setNombreEdit(e.target.value)}
                                            className="bg-background/40 border-border text-foreground font-black uppercase tracking-widest"
                                            placeholder="Nombre del cliente"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Teléfono</Label>
                                        <Input
                                            value={telefonoEdit}
                                            onChange={(e) => setTelefonoEdit(e.target.value)}
                                            className="bg-background/40 border-border text-primary font-mono tracking-widest"
                                            placeholder="Teléfono (opcional)"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Servicio y Barbero */}
                            <div className="p-5 bg-muted rounded-2xl border border-border relative overflow-hidden col-span-2 sm:col-span-1">
                                {!isEditing ? (
                                    <>
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.4em] mb-3 flex items-center gap-1.5">
                                            <Scissors className="w-3 h-3" />
                                            Servicio
                                        </p>
                                        <p className="text-sm font-black text-foreground uppercase tracking-tight italic leading-tight">
                                            {cita.servicio_nombre}
                                        </p>
                                        <div className="flex items-baseline gap-3 mt-1.5">
                                            <p className="text-2xl font-black text-primary flex items-baseline gap-1 tabular-nums">
                                                <span className="text-xs opacity-50">$</span>
                                                {cita.servicio_precio}
                                            </p>
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                                {cita.servicio_duracion} min
                                            </span>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-border/30">
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-1.5 flex items-center gap-1.5">
                                                <UserIcon className="w-3 h-3" />
                                                Barbero
                                            </p>
                                            <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                                                {cita.barbero_nombre}
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-black flex items-center gap-2">
                                                <Scissors className="w-3 h-3" />
                                                Servicio
                                            </Label>
                                            <Select value={servicioEdit} onValueChange={(val: string | null) => {
                                                if (val) {
                                                    setServicioEdit(val)
                                                    const s = allServicios.find(x => x.id === val)
                                                    if (s) setPrecioEdit(s.precio)
                                                }
                                            }}>
                                                <SelectTrigger className="bg-background/40 border-border text-foreground font-black uppercase tracking-widest h-10">
                                                    <SelectValue placeholder="Seleccionar servicio" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-background border-border text-foreground">
                                                    {allServicios.map(s => (
                                                        <SelectItem key={s.id} value={s.id} className="focus:bg-primary/20 focus:text-primary">
                                                            {s.nombre} - ${s.precio}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-black flex items-center gap-2">
                                                <DollarSign className="w-3 h-3" />
                                                Precio
                                            </Label>
                                            <Input
                                                type="number"
                                                value={precioEdit}
                                                onChange={(e) => setPrecioEdit(Number(e.target.value))}
                                                className="bg-background/40 border-border text-primary font-black tracking-widest h-10"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-black flex items-center gap-2">
                                                <UserIcon className="w-3 h-3" />
                                                Barbero
                                            </Label>
                                            <Select value={barberoEdit} onValueChange={(val: string | null) => {
                                                if (val) setBarberoEdit(val)
                                            }}>
                                                <SelectTrigger className="bg-background/40 border-border text-foreground font-black uppercase tracking-widest h-10">
                                                    <SelectValue placeholder="Seleccionar barbero" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-background border-border text-foreground">
                                                    {allBarberos.map(b => (
                                                        <SelectItem key={b.id} value={b.id} className="focus:bg-primary/20 focus:text-primary">
                                                            {b.nombre}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Horario */}
                            <div className="p-5 bg-muted rounded-2xl border border-border relative overflow-hidden col-span-2 sm:col-span-1">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.4em] mb-3 flex items-center gap-1.5">
                                    <Clock className="w-3 h-3" />
                                    Horario
                                </p>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                                    {cita.fecha_cita_local
                                        ? new Date(`${cita.fecha_cita_local}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
                                        : ''}
                                </p>
                                <p className="text-2xl font-black text-foreground tabular-nums leading-tight">
                                    {horaInicio.replace('.', '')}
                                </p>
                                <div className="mt-2 pt-2 border-t border-border/30">
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-1">Finaliza</p>
                                    <p className="text-[11px] font-bold text-foreground/70 uppercase tracking-widest tabular-nums">
                                        {horaFin.replace('.', '')}
                                    </p>
                                </div>
                                <div className="mt-2 pt-2 border-t border-border/30">
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-1 flex items-center gap-1">
                                        <TimerIcon className="w-2.5 h-2.5" />
                                        Duración estimada
                                    </p>
                                    <p className="text-sm font-black text-foreground tabular-nums">
                                        {cita.servicio_duracion}<span className="text-[9px] font-bold text-muted-foreground ml-1">min</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        {['finalizada', 'cobrada', 'completada'].includes(cita.estado) && !isEditing && (
                            <div className="p-6 bg-emerald-500/5 rounded-[1.5rem] border border-emerald-500/20">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.35em] mb-4 flex items-center gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    Resumen del Servicio
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-1">Cobrado</p>
                                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-baseline gap-1 tabular-nums">
                                            <span className="text-sm opacity-50">$</span>
                                            {cita.monto_pagado ?? cita.servicio_precio}
                                        </p>
                                        {cita.metodo_pago && (
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                                                {cita.metodo_pago === 'efectivo'
                                                    ? <Banknote className="w-3 h-3" />
                                                    : <Landmark className="w-3 h-3" />
                                                }
                                                {cita.metodo_pago}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-1">Duración</p>
                                        {(() => {
                                            const mins = cita.duracion_real_minutos
                                                ?? (cita.timestamp_inicio_servicio && cita.timestamp_fin_servicio
                                                    ? Math.round((parseLocalTimestamp(cita.timestamp_fin_servicio!).getTime() - parseLocalTimestamp(cita.timestamp_inicio_servicio!).getTime()) / 60000)
                                                    : null)
                                            return mins != null ? (
                                                <>
                                                    <p className="text-2xl font-black text-foreground tabular-nums">
                                                        {mins}<span className="text-sm font-bold text-muted-foreground ml-1">min</span>
                                                    </p>
                                                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-1 flex items-center justify-end gap-1">
                                                        <TimerIcon className="w-2.5 h-2.5" />
                                                        Real
                                                    </p>
                                                </>
                                            ) : (
                                                <p className="text-2xl font-black text-foreground tabular-nums">
                                                    {cita.servicio_duracion}<span className="text-sm font-bold text-muted-foreground ml-1">min</span>
                                                </p>
                                            )
                                        })()}
                                    </div>
                                </div>
                                {cita.notas_crm && (
                                    <div className="mt-3 pt-3 border-t border-emerald-500/15">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-1">Notas CRM</p>
                                        <p className="text-[11px] font-medium text-foreground/70 italic leading-relaxed">"{cita.notas_crm}"</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {(cita.notas || isEditing) && (
                            <div className={cn(
                                "p-6 rounded-[1.5rem] border transition-colors",
                                isEditing ? "bg-background/40 border-border" : "bg-blue-500/5 border-blue-500/10"
                            )}>
                                <p className={cn(
                                    "text-[8px] font-black uppercase tracking-[0.3em] mb-2 flex items-center gap-2",
                                    isEditing ? "text-muted-foreground" : "text-blue-500 dark:text-blue-400/60"
                                )}>
                                    <StickyNote className="w-2.5 h-2.5" />
                                    Notas
                                </p>
                                {!isEditing ? (
                                    <p className="text-[11px] font-medium text-blue-700 dark:text-blue-300 italic opacity-80 leading-relaxed">
                                        "{cita.notas}"
                                    </p>
                                ) : (
                                    <Textarea 
                                        value={notasEdit}
                                        onChange={(e) => setNotasEdit(e.target.value)}
                                        placeholder="Escribe notas aquí..."
                                        className="bg-transparent border-none text-[12px] text-foreground p-0 focus-visible:ring-0 min-h-[60px] resize-none font-medium italic"
                                    />
                                )}
                            </div>
                        )}
                    </div>
                    </div>{/* end flex-1 scroll wrapper */}
                </DialogContent>
            </Dialog>

            {/* Move/Reschedule Dialog */}
            <Dialog open={showMove} onOpenChange={(open) => { setShowMove(open); if (!open) onClose?.(); }}>
                <DialogContent showCloseButton={false} className="bg-background border-border text-foreground rounded-[2rem] p-0 overflow-hidden shadow-2xl w-[95vw] sm:max-w-lg max-h-[96vh] flex flex-col border outline-none">
                    {/* Status Bar */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-gold z-50 shrink-0" />

                    {/* Decorative background light */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />

                    <DialogHeader className="px-6 sm:px-8 py-5 sm:py-6 border-b border-border/5 bg-background/40 flex flex-row items-center justify-between space-y-0 relative z-10 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 shadow-inner">
                                <CalendarIcon className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-foreground font-display">
                                    Reagendar Cita
                                </DialogTitle>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="h-1 w-6 bg-primary rounded-full shadow-[0_0_10px_rgba(245,200,66,0.5)]" />
                                    <p className="text-[9px] sm:text-[10px] text-primary/60 font-black uppercase tracking-[0.2em]">{cita.cliente_nombre}</p>
                                </div>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setShowMove(false); onClose?.(); }}
                            className="w-10 h-10 rounded-xl bg-foreground/5 border border-border/10 text-foreground/40 hover:text-foreground"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </DialogHeader>

                    <div className="p-6 flex-1 overflow-y-auto custom-scrollbar min-h-0 relative z-10">
                        <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 overflow-visible">
                            {slotsParaCita.map((slot) => {
                                const isSelected = newHour === slot.value
                                const isOcupado = slot.status === 'ocupado'
                                const isBloqueado = slot.status === 'bloqueado'
                                const isPast = slot.status === 'past'
                                const isActual = slot.status === 'actual'
                                const isTerminada = slot.status === 'finalizada'
                                // past es seleccionable para registro retroactivo; el resto no
                                const isDisabled = isOcupado || isBloqueado || isActual || isTerminada

                                return (
                                    <Button
                                        key={slot.value}
                                        variant="outline"
                                        disabled={isDisabled}
                                        onClick={() => setNewHour(slot.value)}
                                        className={cn(
                                            "h-11 sm:h-12 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center border transition-all active:scale-[0.98] group relative px-0 overflow-hidden",
                                            // Slot actual (donde ya está la cita): ámbar
                                            isActual && "bg-amber-500/10 text-amber-400 border-amber-500/30 opacity-80 cursor-not-allowed",
                                            // Ocupado activo (futura/en curso): rojo
                                            isOcupado && "bg-red-500/5 text-red-500 border-red-500/20 opacity-100 shadow-none",
                                            // Pasado con cita finalizada/cobrada: verde apagado inhabilitado
                                            isTerminada && "bg-emerald-500/5 text-emerald-600/60 border-emerald-500/15 opacity-70 cursor-not-allowed",
                                            // Pasado sin cita: atenuado pero seleccionable
                                            isPast && "opacity-60 bg-foreground/5 border-border/5 text-foreground/40",
                                            // Bloqueado manual
                                            isBloqueado && "bg-foreground/5 text-foreground/20 border-border/5 opacity-50",
                                            // Libre disponible
                                            !isDisabled && !isPast && "bg-foreground/5 border-border/10 text-foreground/40 hover:text-foreground hover:bg-foreground/10",
                                            // Seleccionado
                                            isSelected && !isDisabled && "bg-primary/20 text-primary border-primary/50 shadow-[0_0_20px_rgba(245,200,66,0.1)]",
                                        )}
                                    >
                                        <span className={cn(
                                            "text-xs tracking-tighter leading-none font-black mb-0.5 z-10",
                                            isOcupado ? "text-red-500" : isActual ? "text-amber-400" : isTerminada ? "text-emerald-600/70" : ""
                                        )}>
                                            {slot.label.split(' ')[0]}
                                        </span>
                                        <span className={cn(
                                            "text-[5px] sm:text-[6px] uppercase tracking-tighter font-black transition-colors z-10",
                                            isOcupado ? "text-red-500/80" : isActual ? "text-amber-400/80" : isTerminada ? "text-emerald-600/60" : "opacity-20"
                                        )}>
                                            {isActual ? 'ACTUAL' : isOcupado ? 'OCUPADO' : isTerminada ? 'HECHO' : isBloqueado ? 'BLOQUEADO' : isPast ? 'PASADO' : 'LIBRE'}
                                        </span>
                                    </Button>
                                )
                            })}
                        </div>
                    </div>

                    <DialogFooter className="px-6 sm:px-8 py-5 sm:py-6 border-t border-border/5 bg-background/40 relative z-10 shrink-0 flex flex-col-reverse sm:flex-row gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => { setShowMove(false); onClose?.(); }}
                            className="h-12 sm:h-14 sm:flex-1 bg-foreground/5 text-foreground/60 rounded-xl sm:rounded-2xl font-semibold text-sm hover:text-foreground hover:bg-foreground/10 transition-all border border-border/10"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={moverCita}
                            disabled={!newHour || loading}
                            className={cn(
                                "h-12 sm:h-14 sm:flex-[2] rounded-xl sm:rounded-2xl font-semibold text-sm transition-all",
                                !newHour || loading
                                    ? "bg-primary/50 text-primary-foreground/50"
                                    : "bg-primary text-primary-foreground hover:bg-amber-400 shadow-lg shadow-primary/20 active:scale-[0.98]"
                            )}
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <RefreshCcw className="w-4 h-4 animate-spin" />
                                    <span>Procesando...</span>
                                </div>
                            ) : (
                                <span>Confirmar Cambio</span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Checkout Modal Triggered Here */}
            <CheckOutModal
                key="checkout-modal"
                cita={cita}
                isOpen={showCheckout}
                onClose={() => { setShowCheckout(false); onClose?.(); }}
                onUpdate={onUpdate}
            />

            {/* Cancel Dialog */}
            <Dialog open={showCancel} onOpenChange={(open) => { setShowCancel(open); if (!open) onClose?.(); }}>
                <DialogContent className="bg-background border-red-500/20 text-foreground rounded-[2.5rem] sm:max-w-md w-[95vw] max-h-[95vh] overflow-y-auto p-0 outline-none border">
                    <DialogHeader className="flex flex-col items-center pt-6">
                        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                            <AlertTriangle className="w-10 h-10" />
                        </div>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">¿Confirmar Cancelación?</DialogTitle>
                        <DialogDescription className="text-sm font-bold text-foreground/30 uppercase tracking-widest text-center mt-2">
                            Esta acción liberará el espacio de <span className="text-foreground font-black">{cita.cliente_nombre}</span> permanentemente.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 mt-4">
                        <div
                            onClick={() => setAgreedCancel(!agreedCancel)}
                            className={cn(
                                "flex items-center gap-4 p-5 rounded-[1.5rem] border cursor-pointer transition-all",
                                agreedCancel ? "bg-red-500/10 border-red-500/30" : "bg-foreground/5 border-border/5"
                            )}
                        >
                            <div className={cn(
                                "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                                agreedCancel ? "bg-red-500 border-red-500" : "border-foreground/20"
                            )}>
                                {agreedCancel && <X className="w-4 h-4 text-primary-foreground" />}
                            </div>
                            <span className={cn("text-[10px] font-black uppercase tracking-widest transition-all", agreedCancel ? "text-red-400" : "text-foreground/40")}>
                                Entiendo las consecuencias
                            </span>
                        </div>

                        <div className="flex gap-4">
                            <Button variant="ghost" onClick={() => setShowCancel(false)} className="flex-1 py-6 bg-foreground/5 text-foreground/40 rounded-2xl font-black">REGRESAR</Button>
                            <Button
                                onClick={() => actualizarEstado('cancelada')}
                                disabled={loading || !agreedCancel}
                                className={cn("flex-1 py-6 rounded-2xl font-black", agreedCancel ? "bg-red-600 hover:bg-red-500 shadow-xl shadow-red-900/20" : "bg-foreground/5 text-foreground/10")}
                            >
                                {loading ? '...' : 'CANCELAR CITA'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Late Warning Dialog */}
            <Dialog open={showLateWarning} onOpenChange={(open) => { setShowLateWarning(open); if (!open) onClose?.(); }}>
                <DialogContent className="bg-background border-amber-500/20 text-foreground rounded-[2.5rem] sm:max-w-md w-[95vw] max-h-[95vh] overflow-y-auto p-0 outline-none border">
                    <div className="p-10 text-center bg-amber-500/5 border-b border-amber-500/10">
                        <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-amber-500/20">
                            <Timer className="w-10 h-10" />
                        </div>
                        <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-amber-500">Retraso Excesivo</DialogTitle>
                        <div className="mt-6 p-6 bg-background/60 rounded-[2rem] border border-amber-500/20 inline-flex flex-col items-center">
                            <span className="text-5xl font-black text-foreground font-display tracking-tighter">{minutosDiferencia}</span>
                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-2">MIN TARDE</span>
                        </div>
                    </div>
                    <div className="p-10 space-y-8">
                        <p className="text-sm font-bold text-foreground/40 leading-relaxed text-center">
                            El cliente ha superado el tiempo límite. <span className="text-foreground">¿Deseas atenderlo o reorganizar tu agenda?</span>
                        </p>
                        <div className="flex gap-4">
                            <Button variant="outline" onClick={() => { setShowLateWarning(false); setShowMove(true); }} className="flex-1 py-7 bg-foreground/5 border-border/5 text-foreground/40 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px]">
                                Mover
                            </Button>
                            <Button onClick={() => actualizarEstado('en_proceso')} className="flex-[1.5] py-7 bg-amber-600 text-primary-foreground rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-amber-500 shadow-2xl shadow-amber-900/20">
                                {loading ? '...' : 'Atender'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    )
})
