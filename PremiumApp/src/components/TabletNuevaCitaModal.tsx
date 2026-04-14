import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useBusinessLabels } from '@/hooks/useBusinessLabels'
import { createClient } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { cn, getHermosilloMins, getHermosilloDateStr, formatToHermosilloISO, parse12hToMins, formato12h, parseLocalTimestamp } from '@/lib/utils'

import { ClientAutocomplete } from './ClientAutocomplete'
import {
    Store,
    MessageCircle,
    Phone,
    User,
    Scissors,
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Clock,
    ArrowRight,
    History,
    X,
    CheckCircle2,
    Search,
    RefreshCcw,
    AlertTriangle
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Servicio {
    id: string | number
    nombre: string
    precio: number
    duracion_minutos: number
}

interface TabletNuevaCitaModalProps {
    isOpen: boolean
    onClose: () => void
    profesionalId: string
    sucursalId?: string
    horarioSucursalProps?: any
    citasDelDia: any[] // Array of CitaDesdeVista
    onCitaCreada: () => void
    /** Pre-loaded from parent to skip sub-fetch on open */
    bloqueosDelDia?: any[]
    /** Pre-loaded from parent to skip sub-fetch on open */
    almuerzoProfesionalProps?: any
    /** Pre-loaded from parent to skip fetch on open */
    serviciosProp?: Servicio[]
}

export function TabletNuevaCitaModal({ isOpen, onClose, profesionalId, sucursalId, horarioSucursalProps, citasDelDia, onCitaCreada, bloqueosDelDia = [], almuerzoProfesionalProps = null, serviciosProp = [] }: TabletNuevaCitaModalProps) {
    const labels = useBusinessLabels()
    const [loading, setLoading] = useState(false)
    const [servicios, setServicios] = useState<Servicio[]>(serviciosProp)
    const [error, setError] = useState('')
    const [showPastConfirm, setShowPastConfirm] = useState(false)

    // Form state
    const [nombre, setNombre] = useState('')
    const [clienteId, setClienteId] = useState<string | null>(null)
    const [originalTelefono, setOriginalTelefono] = useState<string | null>(null)
    const [telefono, setTelefono] = useState('')
    const [servicioId, setServicioId] = useState('')
    const [horaInicio, setHoraInicio] = useState('')
    const [origen, setOrigen] = useState<'walkin' | 'whatsapp' | 'telefono'>('walkin')
    const contentRef = useRef<HTMLDivElement>(null)

    const getHoyStr = () => {
        return getHermosilloDateStr(new Date())
    }

    const [fecha, setFecha] = useState(getHoyStr())
    const [citasParaFecha, setCitasParaFecha] = useState<any[]>(citasDelDia)
    
    // Sincronizar con las citas que vienen del padre (AgendaTimeline)
    useEffect(() => {
        if (citasDelDia) {
            const filtered = profesionalId ? citasDelDia.filter((c: any) => String(c.barbero_id) === String(profesionalId)) : citasDelDia
            console.log("🔄 [TabletNuevaCitaModal] Sincronizando citasDelDia:", filtered.length)
            setCitasParaFecha(filtered)
        }
    }, [citasDelDia, profesionalId])

    const [bloqueosParaFecha, setBloqueosParaFecha] = useState<any[]>(bloqueosDelDia)
    const [almuerzoProfesional, setAlmuerzoProfesional] = useState<any>(almuerzoProfesionalProps)
    const [horarioSucursal, setHorarioSucursal] = useState<any>(horarioSucursalProps || null)
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Keep in sync if parent updates these
    useEffect(() => { setBloqueosParaFecha(bloqueosDelDia) }, [bloqueosDelDia])
    useEffect(() => { if (almuerzoProfesionalProps !== null) setAlmuerzoProfesional(almuerzoProfesionalProps) }, [almuerzoProfesionalProps])

    const selectedService = useMemo(() =>
        servicios.find(s => String(s.id) === String(servicioId)),
        [servicios, servicioId])

    useEffect(() => {
        if (!isOpen) return

        const fetchDatosDia = async () => {
            setIsRefreshing(true)
            const supabase = createClient()

            // Citas: Solo hacer fetch si el padre no proporcionó datos pre-cargados
            if (citasDelDia.length === 0) {
                try {
                    const { data: citasData } = await supabase.from('vista_citas_app')
                        .select('*')
                        .eq('fecha_cita_local', fecha)
                        .neq('estado', 'cancelada')

                    if (citasData) {
                        const filtered = profesionalId ? citasData.filter((c: any) => String(c.barbero_id) === String(profesionalId)) : citasData
                        setCitasParaFecha(filtered)
                    }
                } catch (err) {
                    console.error("Error refreshing appointments:", err)
                }
            }

            // Only fetch bloqueos/almuerzo if not pre-loaded from parent (optimization)
            if (bloqueosDelDia.length === 0) {
                const [bloqueosRes, profesionalRes] = await Promise.all([
                    supabase.from('bloqueos').select('*').gte('fecha_inicio', `${fecha}T00:00:00`).lte('fecha_inicio', `${fecha}T23:59:59`),
                    profesionalId ? supabase.from('barberos').select('bloqueo_almuerzo').eq('id', profesionalId).single() : Promise.resolve({ data: null } as any),
                ])

                if (bloqueosRes.data) {
                    setBloqueosParaFecha(bloqueosRes.data.filter((b: any) => !b.barbero_id || String(b.barbero_id) === String(profesionalId)))
                }
                if (profesionalRes.data) setAlmuerzoProfesional(profesionalRes.data.bloqueo_almuerzo)
            }

            // Sucursal horario: use prop if available
            if (!horarioSucursal && sucursalId) {
                const sucursalRes = await supabase.from('sucursales').select('horario_apertura').eq('id', sucursalId).single()
                if ((sucursalRes as any).data) setHorarioSucursal((sucursalRes as any).data.horario_apertura)
            } else if (horarioSucursalProps) {
                setHorarioSucursal(horarioSucursalProps)
            }

            setIsRefreshing(false)
        }

        fetchDatosDia()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fecha, isOpen, profesionalId]) // Elimino citasDelDia de deps para evitar bucles si el padre cambia pero no necesitamos refrescar nosotros mismos

    // formato12h and parse12hToMins are now imported from '@/lib/utils'

    // Custom Dropdown State
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    // Date Navigation
    const shiftFecha = useCallback((days: number) => {
        const current = new Date(`${fecha}T12:00:00-07:00`)
        current.setDate(current.getDate() + days)
        setFecha(current.toISOString().split('T')[0])
    }, [fecha])

    const getRelativeLabel = useCallback((fechaStr: string) => {
        if (fechaStr === getHoyStr()) return 'HOY'

        const target = new Date(`${fechaStr}T12:00:00-07:00`)
        const hoy = new Date(`${getHoyStr()}T12:00:00-07:00`)

        const diffTime = target.getTime() - hoy.getTime()
        const diffDays = Math.round(diffTime / (1000 * 3600 * 24))

        if (diffDays === 1) return 'MAÑANA'
        if (diffDays === -1) return 'AYER'
        return target.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }, [getHoyStr])

    const dropdownRef = useRef<HTMLDivElement>(null)
    const dateInputRef = useRef<HTMLInputElement>(null)

    // Double Tap State for Mobile compatibility
    const lastTap = useRef<number>(0)
    const handleDoubleTap = useCallback(() => {
        const now = Date.now()
        const DOUBLE_PRESS_DELAY = 300
        if (now - lastTap.current < DOUBLE_PRESS_DELAY) {
            setFecha(getHoyStr())
        }
        lastTap.current = now
    }, [getHoyStr])

    // Click outside handler para el Dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    useEffect(() => {
        if (!isOpen) return

        // Prellenar hora inicial a la próxima media hora
        const ahora = new Date()
        ahora.setMinutes(ahora.getMinutes() >= 30 ? 60 : 30)
        const horaStr = ahora.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        setHoraInicio(horaStr)

        // Solo hacer fetch si el padre no proporcionó los servicios pre-cargados
        if (servicios.length > 0) return

        const fetchServicios = async () => {
            try {
                const res = await fetch('/api/servicios')
                if (!res.ok) throw new Error('Error al cargar servicios')
                const data = await res.json()
                if (data.ok) setServicios(data.data)
            } catch (err) {
                console.error(err)
                setError('No se pudieron cargar los servicios. Usa Supabase directo en fallback.')
            }
        }

        fetchServicios()
    }, [isOpen])

    const resetForm = useCallback(() => {
        setNombre('')
        setClienteId(null)
        setTelefono('')
        setServicioId('')
        setOrigen('walkin')
        setError('')
        setFecha(getHoyStr())
    }, [getHoyStr])

    const handleSubmit = useCallback(async (e?: React.FormEvent, isConfirmedPast = false) => {
        if (e) e.preventDefault()
        setError('')

        if (!nombre || !servicioId || !horaInicio) {
            setError('Nombre, Servicio y Hora son requeridos.')
            return
        }

        // --- VALIDACIÓN DE PASADO ---
        const ahora = new Date()
        const TZ_OFFSET = '-07:00'
        const selectedDateTime = new Date(`${fecha}T${horaInicio}:00${TZ_OFFSET}`)

        // Si el tiempo seleccionado es antes que 'ahora' y no está confirmado, mostrar modal
        if (selectedDateTime < ahora && !isConfirmedPast) {
            setShowPastConfirm(true)
            return
        }

        setLoading(true)
        try {
            // --- ACTUALIZACIÓN DE PERFIL DE CLIENTE ---
            // Si el cliente existe y el teléfono ha sido modificado (y no es la leyenda de vacío)
            if (clienteId && telefono !== (originalTelefono || "") && telefono !== "Sin registro de numero celular") {
                const supabase = createClient()
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const updateQuery = (supabase as any).from('clientes').update({ telefono: telefono || null }).eq('id', clienteId)
                const { error: updateError } = await updateQuery

                if (updateError) {
                    console.error('⚠️ [Sync] Error al actualizar el perfil del cliente:', updateError)
                    // No bloqueamos la cita por un error en el perfil, pero lo registramos
                } else {
                    console.log('✅ [Sync] Perfil del cliente actualizado con éxito')
                }
            }

            // Construir el timestamp combinando el día (local) con la hora seleccionada
            // Forzamos el uso de la zona local de Hermosillo Sonora México agregando el offset.
            const fechaStr = fecha // YYYY-MM-DD
            const TZ_OFFSET = '-07:00'
            const timestampCompleto = `${fechaStr}T${horaInicio}:00${TZ_OFFSET}`

            // Encontrar duración del servicio seleccionado
            const duracion = selectedService ? selectedService.duracion_minutos : 30 // Fallback genérico

            // Calcular timestamp final sumando duración
            const fechaInicioObj = new Date(timestampCompleto)
            const fechaFinObj = new Date(fechaInicioObj.getTime() + duracion * 60000)

            // --- VALIDACIÓN DE COLISIONES ---
            const nStartMs = fechaInicioObj.getTime()
            const nEndMs = fechaFinObj.getTime()

            const colisionProhibida = citasParaFecha.find((c: any) => {
                const cancelados = ['cancelada', 'no_show']
                if (cancelados.includes(c.estado)) return false

                const cStart = parseLocalTimestamp(c.timestamp_inicio_local || '').getTime()
                // Bloquear solo si tienen exactamente la misma hora de inicio
                return nStartMs === cStart
            })

            if (colisionProhibida) {
                const hCita = new Date(colisionProhibida.timestamp_inicio_local).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true })
                setError(`Conflicto de horario: Ya existe una cita de ${colisionProhibida.cliente_nombre} de ${hCita} a ${colisionProhibida.hora_fin_local || ''}.`)
                setLoading(false)
                return
            }

            // --- VALIDACIÓN DE BLOQUEOS ---
            const enBloqueo = bloqueosParaFecha.some(b => {
                const bStart = new Date(b.timestamp_inicio || b.fecha_inicio).getTime()
                const bEnd = new Date(b.timestamp_fin || b.fecha_fin).getTime()
                return (nStartMs < bEnd && nEndMs > bStart)
            })

            if (enBloqueo) {
                setError("El horario seleccionado está bloqueado administrativamente.")
                setLoading(false)
                return
            }

            const timestampFinCompleto = formatToHermosilloISO(fechaFinObj)

            // API Payload
            const payload = {
                barbero_id: profesionalId,
                cliente_id: clienteId,
                cliente_nombre: nombre,
                cliente_telefono: telefono === "Sin registro de numero celular" ? null : telefono,
                servicio_id: servicioId,
                timestamp_inicio_local: timestampCompleto,
                timestamp_fin_local: timestampFinCompleto,
                duracion_estimada: duracion,
                estado: 'confirmada', // Walk-ins entran confirmados directamente
                ...(sucursalId ? { sucursal_id: sucursalId } : {}),
                origen: origen
            }

            const res = await fetch('/api/citas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const json = await res.json()

            if (!res.ok || !json.ok) {
                throw new Error(json.message || json.error || 'Error al crear la cita')
            }

            // Exito
            resetForm()
            // Immediate closure and notification to parent
            onCitaCreada()
            onClose()

        } catch (err: any) {
            setError(err.message || 'Error de conexión. Revisa la disponibilidad de ese horario.')
        } finally {
            setLoading(false)
        }
    }, [
        nombre, servicioId, horaInicio, fecha, clienteId, telefono, originalTelefono, 
        origen, selectedService, citasParaFecha, bloqueosParaFecha, profesionalId, 
        sucursalId, onCitaCreada, onClose, resetForm
    ])

    // Handlers
    const handleClose = useCallback(() => {
        onClose()
    }, [onClose])

    // Reset when modal closes (after animation) or when it opens
    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => {
                resetForm()
            }, 300)
            return () => clearTimeout(timer)
        }
    }, [isOpen, resetForm])

    // Horarios para generar botones (ajustado al horario de la sucursal) - MEMOIZED for performance
    const slotsParaCita = useMemo(() => {
        const slots = []
        const isToday = fecha === getHoyStr()

        // Determinar día de la semana para el horario de sucursal
        const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
        const targetDate = new Date(`${fecha}T12:00:00-07:00`)
        const indiceDia = targetDate.getDay()
        const nombreDia = dias[indiceDia]

        let horaApertura = 8
        let horaCierre = 20

        if (horarioSucursal && horarioSucursal[nombreDia]) {
            const hA = horarioSucursal[nombreDia].apertura
            const hC = horarioSucursal[nombreDia].cierre
            if (hA) {
                horaApertura = parseInt(hA.split(':')[0], 10) - 2
                if (horaApertura < 0) horaApertura = 0
            }
            if (hC) {
                const parts = hC.split(':')
                horaCierre = parseInt(parts[0], 10) + 2
                if (parseInt(parts[1], 10) === 0) {
                    // Si cierra a las 19:00, la horaCierre base era 19, extendida es 20.
                    // Pero queremos permitir citas QUE EMPIECEN a las 19:30 si extendemos 1 hora?
                    // El requerimiento dice "mostrar una hora antes y despues".
                    // Si cierra a las 19:00, permitimos slots hasta las 20:00.
                }
                if (horaCierre > 23) horaCierre = 23
            }
        } else if (horarioSucursal) {
            return []
        }

        // La partición de horas es fija de 30 minutos (el usuario prefiere ignorar la duración del servicio para mostrar disponibilidad)
        const duracionSlotMin = 30

        const getSlotStatus = (start: Date) => {
            const ahora = new Date()
            const nStartMs = start.getTime()

            // Calculate effective end time for the *proposed* appointment based on selected service duration
            const proposedServiceDuration = selectedService ? selectedService.duracion_minutos : 30;
            const nCDurBlocks = Math.max(1, Math.floor(proposedServiceDuration / 30));
            const nEndMs = nStartMs + (nCDurBlocks * 30 * 60000); // Effective end time for the proposed slot

            // 1. Citas (Appointments)
            const citaOcupada = citasParaFecha.find(c => {
                const cancelados = ['cancelada', 'no_show']
                if (cancelados.includes(c.estado)) return false

                const cStart = parseLocalTimestamp(c.timestamp_inicio_local || '').getTime()
                // Validar solo por coincidencia de inicio del slot (independiente de duración)
                return nStartMs === cStart
            })

            const estadosFinalizados = ['completada', 'finalizada', 'cobrada', 'por_cobrar']
            if (citaOcupada) {
                if (estadosFinalizados.includes(citaOcupada.estado) && start < ahora) return 'finalizada'
                return 'ocupado'
            }

            // 2. Bloqueos manuales
            const bloqueado = bloqueosParaFecha.some(b => {
                const bStart = new Date(b.timestamp_inicio || b.fecha_inicio).getTime()
                const bEnd = new Date(b.timestamp_fin || b.fecha_fin).getTime()
                return (nStartMs < bEnd && nEndMs > bStart)
            })
            if (bloqueado) return 'bloqueado'

            // 3. Almuerzo
            if (almuerzoProfesional && almuerzoProfesional.inicio && almuerzoProfesional.fin) {
                const aStart = new Date(`${fecha}T${almuerzoProfesional.inicio}:00-07:00`).getTime()
                const aEnd = new Date(`${fecha}T${almuerzoProfesional.fin}:00-07:00`).getTime()
                if (nStartMs < aEnd && nEndMs > aStart) return 'bloqueado'
            }

            // 4. Past check
            if (start < ahora && fecha === getHoyStr()) return 'past'

            return 'libre'
        }

        for (let h = horaApertura; h <= horaCierre; h++) {
            const hourValue = `${h.toString().padStart(2, '0')}:00`
            const h12 = h % 12 || 12
            const ampm = h >= 12 ? 'PM' : 'AM'
            const label = `${h12}:00 ${ampm}`

            const slotStart = new Date(`${fecha}T${hourValue}:00-07:00`)
            const slotEnd = new Date(slotStart.getTime() + duracionSlotMin * 60000)
            const status = getSlotStatus(slotStart)

            slots.push({ value: hourValue, label, status })

            const halfHourValue = `${h.toString().padStart(2, '0')}:30`
            const halfLabel = `${h12}:30 ${ampm}`
            const halfSlotStart = new Date(`${fecha}T${halfHourValue}:00-07:00`)
            const halfSlotEnd = new Date(halfSlotStart.getTime() + duracionSlotMin * 60000)

            let isWithinClosing = true
            if (horarioSucursal && horarioSucursal[nombreDia]) {
                const hC = horarioSucursal[nombreDia].cierre
                const [cierreH, cierreM] = hC.split(':').map(Number)
                const extendedCierreH = cierreH + 2
                // Permitimos slot de :30 si la hora es menor al cierre extendido, 
                // o si es igual al cierre extendido y tiene al menos 30min de margen (aunque 30 es el final)
                if (h > extendedCierreH || (h === extendedCierreH && cierreM < 30 && cierreH === extendedCierreH)) isWithinClosing = false
                // Simplificado: si h es < horaCierre (que ya es cierre+1), permitimos el :30
                if (h > horaCierre) isWithinClosing = false
            }

            if (isWithinClosing) {
                const halfStatus = getSlotStatus(halfSlotStart)
                slots.push({ value: halfHourValue, label: halfLabel, status: halfStatus })
            }
        }
        return slots
    }, [fecha, citasParaFecha, bloqueosParaFecha, almuerzoProfesional, horarioSucursal, selectedService, getHoyStr])

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent 
                initialFocus={contentRef as any}
                showCloseButton={false}
                className="bg-background border-border text-foreground rounded-[2rem] w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[92vh] overflow-hidden p-0 outline-none border flex flex-col duration-150 data-closed:zoom-out-100 data-closed:fade-out-0"
            >
                <div ref={contentRef} tabIndex={-1} className="outline-none" />
                {/* Status Bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-amber-600 z-50 shrink-0" />


                <DialogHeader className="px-5 sm:px-6 py-3 sm:py-4 border-b border-border/50 bg-card/40 flex flex-row items-center justify-between space-y-0 relative z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 shadow-inner">
                            <CalendarIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tighter text-foreground font-display">
                                Añadir {labels.appointment}
                            </h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div className="h-0.5 w-4 bg-primary rounded-full" />
                                <p className="text-[8px] text-primary/60 font-black uppercase tracking-widest">Manual</p>
                            </div>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClose}
                        className="w-12 h-12 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 hover:border-border/20 transition-all shrink-0 group"
                    >
                        <X className="w-8 h-8 group-hover:scale-110 transition-transform" />
                    </Button>
                </DialogHeader>

                <div className="p-3 sm:p-4 space-y-3 sm:space-y-3 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                    {/* Errores */}
                    {error && (
                        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                            <span className="font-bold uppercase tracking-widest text-[9px] text-red-400">{error}</span>
                        </div>
                    )}

                    {/* Selector de Origen - Centered and small */}
                    <div className="flex justify-center shrink-0">
                        <div className="flex bg-muted p-1 rounded-xl border border-border w-full max-w-md">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setOrigen('walkin')}
                                className={cn(
                                    "flex-1 h-9 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all gap-2",
                                    origen === 'walkin' ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                                )}
                            >
                                <Store className="w-4 h-4" />
                                Local
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setOrigen('whatsapp')}
                                className={cn(
                                    "flex-1 h-9 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all gap-2",
                                    origen === 'whatsapp' ? 'bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                                )}
                            >
                                <MessageCircle className="w-4 h-4" />
                                WP
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setOrigen('telefono')}
                                className={cn(
                                    "flex-1 h-9 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all gap-2",
                                    origen === 'telefono' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                                )}
                            >
                                <Phone className="w-4 h-4" />
                                Llamada
                            </Button>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 items-start">
                        <div className="space-y-4">
                            {/* Cliente Input */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-primary/60 uppercase tracking-widest ml-2 block">Nombre del Cliente</Label>
                                <ClientAutocomplete
                                    value={nombre}
                                    sucursalId={sucursalId}
                                    onChange={(val) => {
                                        setNombre(val)
                                        if (clienteId) {
                                            setClienteId(null)
                                            setTelefono("")
                                            setOriginalTelefono(null)
                                        }
                                    }}
                                    onSelect={(cliente) => {
                                        setNombre(cliente.nombre)
                                        setClienteId(cliente.id)
                                        setOriginalTelefono(cliente.telefono)
                                        setTelefono(cliente.telefono || "Sin registro de numero celular")
                                    }}
                                    placeholder="Nombre del Cliente"
                                />
                            </div>

                            {/* Teléfono Input */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-primary/60 uppercase tracking-widest ml-1">
                                    Teléfono <span className="text-muted-foreground/50">(Opcional)</span>
                                </Label>
                                <div className="group relative flex items-center">
                                    <Phone className="absolute left-4 w-4 h-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        type="tel"
                                        value={telefono}
                                        onFocus={() => {
                                            if (telefono === "Sin registro de numero celular") setTelefono("")
                                        }}
                                        onBlur={() => {
                                            if (telefono === "" && !originalTelefono && clienteId) {
                                                setTelefono("Sin registro de numero celular")
                                            }
                                        }}
                                        onChange={(e) => setTelefono(e.target.value)}
                                        className={cn(
                                            "pl-11 h-12 bg-muted border-border rounded-2xl text-sm font-bold focus-visible:ring-primary/50 focus-visible:bg-card/40 transition-all",
                                            telefono === "Sin registro de numero celular" ? "text-amber-500/40 italic font-normal" : "text-foreground placeholder:text-muted-foreground/30"
                                        )}
                                        placeholder="Teléfono del Cliente"
                                    />
                                    {clienteId && (telefono !== (originalTelefono || "") && (telefono !== "Sin registro de numero celular" && telefono !== "")) && (
                                        <div className="absolute -bottom-6 left-2 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                                            <span className="text-[9px] font-bold text-amber-500/80 uppercase tracking-tight">
                                                Se actualizará este dato en el perfil del cliente
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Servicio Selector */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-primary/60 uppercase tracking-widest ml-1">Servicio</Label>
                                <Select value={servicioId} onValueChange={(val) => val && setServicioId(val)}>
                                    <SelectTrigger className="h-10 bg-muted border-border rounded-2xl text-sm font-semibold focus:ring-primary/50 focus:bg-card/40 transition-all px-4">
                                        <div className="flex items-center gap-3 w-full overflow-hidden">
                                            <Scissors className="w-4 h-4 text-primary shrink-0" />
                                            {selectedService ? (
                                                <div className="flex items-center justify-between flex-1 truncate pr-2">
                                                    <span className="truncate">{selectedService.nombre}</span>
                                                    <span className="text-primary font-bold ml-2 shrink-0">${selectedService.precio}</span>
                                                </div>
                                            ) : (
                                                <SelectValue placeholder="Selecciona el servicio" className="text-foreground/40" />
                                            )}
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="bg-background border-border text-foreground rounded-2xl w-[var(--radix-select-trigger-width)] min-w-[240px] p-1">
                                        {servicios.map(s => (
                                            <SelectItem
                                                key={s.id}
                                                value={s.id.toString()}
                                                className="focus:bg-primary/10 focus:text-primary rounded-xl py-3 px-3 transition-colors group"
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="text-xs sm:text-sm font-semibold truncate group-data-[state=checked]:text-primary transition-colors">
                                                        {s.nombre}
                                                    </span>
                                                    <Badge variant="outline" className="text-[9px] font-bold bg-muted border-border text-muted-foreground ml-2 shrink-0">
                                                        ${s.precio}
                                                    </Badge>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Fecha y Día */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-primary/60 uppercase tracking-widest ml-1 block truncate">Fecha</Label>
                                    <Popover>
                                        <PopoverTrigger
                                            className={cn(
                                                "w-full h-10 justify-start text-left font-bold bg-muted border border-border rounded-2xl gap-3 text-xs sm:text-sm transition-all hover:bg-muted/80 hover:border-border/20 flex items-center px-4",
                                                !fecha && "text-muted-foreground/50"
                                            )}
                                        >
                                            <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
                                            <span className="truncate">
                                                {fecha ? format(new Date(`${fecha}T12:00:00`), "eee, d 'de' MMM", { locale: es }) : "Elegir fecha"}
                                            </span>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-background border-border rounded-2xl overflow-hidden shadow-2xl" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={new Date(`${fecha}T12:00:00`)}
                                                onSelect={(date) => date && setFecha(format(date, "yyyy-MM-dd"))}
                                                initialFocus
                                                locale={es}
                                                className="bg-transparent text-foreground"
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-primary/60 uppercase tracking-widest text-center block truncate">Acceso Rápido</Label>
                                    <div className="flex items-center justify-between bg-foreground/5 h-10 rounded-2xl border border-primary/10 bg-primary/5 px-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => shiftFecha(-1)}
                                            className="h-8 w-8 text-primary/60 hover:text-primary hover:bg-foreground/10 rounded-xl transition-all"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="text-foreground text-[9px] sm:text-[10px] font-black uppercase tracking-tight flex-1 text-center select-none cursor-pointer hover:text-primary transition-colors" onClick={() => setFecha(getHoyStr())}>
                                            {getRelativeLabel(fecha)}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => shiftFecha(1)}
                                            className="h-8 w-8 text-primary/60 hover:text-primary hover:bg-foreground/10 rounded-xl transition-all"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                        {/* Horarios */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-2">
                                <Label className="text-[10px] font-bold text-primary/60 uppercase tracking-widest block truncate">
                                    Hora: <span className="text-primary font-bold ml-1">{formato12h(horaInicio)}</span>
                                </Label>
                                <div className="flex items-center gap-2">
                                    {isRefreshing && <RefreshCcw className="w-3 h-3 text-primary animate-spin opacity-40" />}
                                    <Badge variant="outline" className="text-[8px] font-black bg-primary/5 border-primary/20 text-primary/60 uppercase tracking-tighter rounded-full px-2 py-0.5">
                                        {slotsParaCita.filter(s => s.status === 'libre').length} LIBRES
                                    </Badge>
                                </div>
                            </div>

                            <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 overflow-visible">
                                {slotsParaCita.length > 0 ? (
                                    slotsParaCita.map(slot => {
                                        const isPast = slot.status === 'past'
                                        const isOccupied = slot.status === 'ocupado'
                                        const isBlocked = slot.status === 'bloqueado'
                                        const isFinalized = slot.status === 'finalizada'
                                        const isSelected = horaInicio === slot.value
                                        // 'past' sigue seleccionable para registro retroactivo
                                        const isDisabled = isOccupied || isBlocked || isFinalized

                                        return (
                                            <Button
                                                key={slot.value}
                                                variant="outline"
                                                disabled={isDisabled}
                                                onClick={() => setHoraInicio(slot.value)}
                                                className={cn(
                                                    "h-11 sm:h-12 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center border transition-all active:scale-[0.98] group relative px-0 overflow-hidden",
                                                    // Ocupado por cita activa (futura/en curso): rojo
                                                    isOccupied && "bg-red-500/5 text-red-500 border-red-500/20 opacity-100 shadow-none",
                                                    // Cita ya finalizada/cobrada en el pasado: verde apagado, inhabilitado
                                                    isFinalized && "bg-emerald-500/5 text-emerald-600/60 border-emerald-500/15 opacity-70 cursor-not-allowed",
                                                    // Pasado sin cita: atenuado pero seleccionable
                                                    isPast && !isFinalized && "opacity-60 bg-muted border-border/50 text-muted-foreground",
                                                    // Bloqueado manual
                                                    isBlocked && "bg-muted text-muted-foreground/40 border-border/50 opacity-50",
                                                    // Libre disponible
                                                    !isDisabled && !isPast && "bg-muted border-border text-muted-foreground hover:text-foreground hover:bg-muted/80",
                                                    // Seleccionado
                                                    isSelected && !isDisabled && "bg-primary/20 text-primary border-primary/50",
                                                )}
                                            >
                                                <span className={cn(
                                                    "text-xs tracking-tighter leading-none font-black mb-0.5 z-10",
                                                    isOccupied ? "text-red-500" : isFinalized ? "text-emerald-600/70" : ""
                                                )}>
                                                    {slot.label.split(' ')[0]}
                                                </span>
                                                <span className={cn(
                                                    "text-[5px] sm:text-[6px] uppercase tracking-tighter font-black transition-colors z-10",
                                                    isOccupied ? "text-red-500/80" : isFinalized ? "text-emerald-600/60" : "opacity-20"
                                                )}>
                                                    {isOccupied ? 'OCUPADO' : isFinalized ? 'HECHO' : isBlocked ? 'BLOQUEADO' : isPast ? 'PASADO' : 'LIBRE'}
                                                </span>
                                            </Button>
                                        )
                                    })
                                ) : (
                                    <div className="col-span-full py-10 bg-muted rounded-[1.5rem] border border-dashed border-border flex flex-col items-center justify-center gap-3">
                                        <Clock className="w-8 h-8 text-muted-foreground/30" />
                                        <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em]">Sin Disponibilidad</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Botones de acción - Aligned with Primary Theme */}
                        <div className="pt-3 border-t border-border flex flex-col-reverse sm:flex-row gap-3">
                            <Button
                                variant="ghost"
                                onClick={handleClose}
                                className="h-12 sm:flex-1 bg-muted text-muted-foreground rounded-xl font-black uppercase tracking-widest text-[9px] hover:text-foreground hover:bg-muted/80 transition-all border border-border"
                            >
                                <X className="w-4 h-4 mr-2" />
                                Cancelar
                            </Button>
                            
                            <Button
                                onClick={(e) => handleSubmit(e)}
                                disabled={loading}
                                className={cn(
                                    "h-12 sm:flex-[2] rounded-xl font-black uppercase tracking-tight text-[13px] transition-all",
                                    loading 
                                        ? 'bg-primary/20 text-black/40 cursor-not-allowed' 
                                        : 'bg-gradient-to-r from-primary to-amber-500 text-black shadow-lg shadow-primary/20 active:scale-[0.98]'
                                )}
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <RefreshCcw className="w-4 h-4 animate-spin" />
                                        <span>Procesando...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5" />
                                        <span>Confirmar Agendado</span>
                                    </div>
                                )}
                            </Button>
                        </div>
                    </div>


                {/* Confirmación Retroactiva Nested Dialog */}
                {showPastConfirm && (
                    <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
                        <div className="absolute inset-0 bg-background/95 dark:bg-black/95" onClick={() => setShowPastConfirm(false)} />
                        <div className="relative bg-card border border-border rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 w-full max-w-[calc(100%-2rem)] sm:max-w-sm shadow-xl">
                            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-8 mx-auto border border-amber-500/20 shadow-inner">
                                <History className="w-10 h-10 text-amber-500" />
                            </div>
                            <h3 className="text-2xl font-black text-foreground text-center mb-4 uppercase tracking-tighter">Cita Retroactiva</h3>
                            <p className="text-muted-foreground text-[11px] font-bold text-center mb-10 leading-relaxed uppercase tracking-widest">
                                Estás agendando una cita para una hora que ya pasó. <span className="text-foreground">¿Deseas registrarla de todas formas?</span>
                            </p>
                            <div className="flex flex-col gap-3 sm:gap-4">
                                <Button
                                    onClick={() => {
                                        setShowPastConfirm(false)
                                        handleSubmit(undefined, true)
                                    }}
                                    className="w-full h-12 sm:h-14 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black uppercase tracking-widest rounded-xl sm:rounded-2xl active:scale-[0.98] shadow-xl shadow-amber-900/10"
                                >
                                    Confirmar Registro
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowPastConfirm(false)}
                                    className="w-full h-12 sm:h-14 bg-muted text-muted-foreground font-black uppercase tracking-widest rounded-xl sm:rounded-2xl"
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
