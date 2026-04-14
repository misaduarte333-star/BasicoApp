'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useSearchParams, useRouter } from 'next/navigation'
import { useBusinessLabels } from '@/hooks/useBusinessLabels'
import type { CitaDesdeVista, EstadoCita, Servicio, Barbero } from '@/lib/types'
import { ClientAutocomplete } from '@/components/ClientAutocomplete'
import { 
    AlertTriangle, 
    Plus, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    Users,
    TrendingUp,
    DollarSign,
    RefreshCw,
    Play,
    Check,
    Edit,
    Trash2,
    Calendar as CalendarIcon
} from 'lucide-react'
import { cn, getHermosilloDateStr, getMinsFromHermosilloString } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { KPICard } from '@/components/KPICard'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2 } from 'lucide-react'

function CitasContent() {
    const { sucursalId } = useAuth()
    const { professional } = useBusinessLabels()
    // ... (rest of the state remains the same)
    const [mounted, setMounted] = useState(false)
    const [citas, setCitas] = useState<CitaDesdeVista[]>([])
    const [loading, setLoading] = useState(true)
    const [filtroFecha, setFiltroFecha] = useState('') 
    const [filtroEstado, setFiltroEstado] = useState<EstadoCita | 'todas'>('todas')
    const [debugMsg, setDebugMsg] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingCita, setEditingCita] = useState<CitaDesdeVista | null>(null)
    const [initialOrigen, setInitialOrigen] = useState<'whatsapp' | 'walkin'>('whatsapp')
    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    const searchParams = useSearchParams()
    const router = useRouter()

    useEffect(() => {
        if (mounted && searchParams) {
            const action = searchParams.get('action')
            if (action === 'agenda-manual') {
                handleNewCita('whatsapp')
                router.replace('/admin/citas') 
            } else if (action === 'walk-in') {
                handleNewCita('walkin')
                router.replace('/admin/citas') 
            }
        }
    }, [mounted, searchParams, router])

    const handleNewCita = (origen: 'whatsapp' | 'walkin' = 'whatsapp') => {
        setEditingCita(null)
        setInitialOrigen(origen)
        setShowModal(true)
    }

    const handleEditCita = (cita: CitaDesdeVista) => {
        setEditingCita(cita)
        setInitialOrigen(cita.origen as any)
        setShowModal(true)
    }

    const handleDeleteCita = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta cita?')) return
        try {
            const res = await fetch(`/api/citas/${id}`, { method: 'DELETE' })
            if (!res.ok && res.status !== 204) {
                const body = await res.json()
                throw new Error(body.message || 'Error al eliminar')
            }
            cargarCitas()
        } catch (err: any) {
            alert('Error al eliminar: ' + err.message)
        }
    }

    const handleStatusChange = async (cardita: CitaDesdeVista, newStatus: EstadoCita) => {
        try {
            const res = await fetch(`/api/citas/${cardita.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: newStatus }),
            })
            if (!res.ok) {
                const body = await res.json()
                throw new Error(body.message)
            }
            cargarCitas()
        } catch (err: any) {
            console.error('Error updating status:', err)
        }
    }

    const [supabase] = useState(() => createClient())

    useEffect(() => {
        const today = new Date()
        const localIsoDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Hermosillo',
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(today) 
        setFiltroFecha(localIsoDate)
        setMounted(true)
    }, [])

    const cargarCitas = useCallback(async (isInitialLoad = false) => {
        if (!filtroFecha || !sucursalId) return

        if (isInitialLoad) setLoading(true)
        setDebugMsg('Cargando...')
        try {
            let query = (supabase
                .from('vista_citas_app') as any)
                .select('*')
                .eq('sucursal_id', sucursalId)
                .eq('fecha_cita_local', filtroFecha)
                .order('timestamp_inicio_local', { ascending: true })

            if (filtroEstado !== 'todas') {
                query = query.eq('estado', filtroEstado)
            }

            const { data, error } = await query

            if (error) {
                console.error('Error Supabase:', error.message || JSON.stringify(error, Object.getOwnPropertyNames(error)))
                setDebugMsg(`Error: ${error.message || JSON.stringify(error)}`)
                setCitas([])
            } else {
                if (!data || data.length === 0) {
                    setDebugMsg('No hay citas encontradas.')
                    setCitas([])
                } else {
                    setDebugMsg(`Datos cargados: ${data.length} citas`)
                    setCitas(data)
                }
            }
        } catch (err: any) {
            console.error('Catch Error:', err)
            setDebugMsg(`Catch Error: ${err.message}`)
            setCitas(getDemoCitas(filtroFecha))
        } finally {
            if (isInitialLoad) setLoading(false)
        }
    }, [supabase, filtroFecha, filtroEstado, sucursalId])

    useEffect(() => {
        if (mounted && filtroFecha && sucursalId) {
            cargarCitas(true) 

            const channel = supabase.channel('citas-page-changes')
                .on(
                    'postgres_changes' as any,
                    { event: '*', schema: 'public', table: 'citas' },
                    () => {
                        console.log('Realtime update received on CitasPage')
                        cargarCitas() 
                    }
                )
                .subscribe()

            return () => {
                supabase.removeChannel(channel)
            }
        }
    }, [mounted, filtroFecha, filtroEstado, sucursalId, cargarCitas, supabase])

    if (!mounted) {
        return <div className="p-8 text-foreground">Cargando aplicación...</div>
    }

    return (
        <div className="relative min-h-full bg-background selection:bg-primary selection:text-black p-4 lg:p-8">
            <div className="max-w-[1600px] mx-auto space-y-6 lg:space-y-8">
                {/* Header (Desktop Only) - Compact Elite Style */}
                <header className="hidden lg:flex items-center justify-between font-display">
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-border mt-1 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]">
                            <Users className="text-primary w-6 h-6" />
                        </div>
                        <div className="space-y-0.5">
                            <h2 className="text-2xl font-black tracking-tight uppercase italic text-foreground">Gestión de Citas</h2>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">Panel de Control de Agenda</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Time & Date - Premium Compact Style */}
                        <div className="bg-muted/30 backdrop-blur-xl border border-border/50 rounded-2xl px-5 py-2 flex items-center gap-5 shadow-sm group hover:border-primary/30 transition-all duration-500">
                            <div className="flex flex-col items-end text-foreground text-right">
                                <p className="text-sm font-black tracking-tight tabular-nums leading-none mb-1">
                                    {currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </p>
                                <p className="text-[9px] text-primary font-black uppercase tracking-[0.1em] leading-none">
                                    {currentTime.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, (c) => c.toUpperCase())}
                                </p>
                            </div>
                            <div className="h-8 w-[1px] bg-border/50 group-hover:bg-primary/20 transition-colors" />
                            <div className="size-8 rounded-xl bg-background flex items-center justify-center border border-border group-hover:border-primary/20 transition-all">
                                <Clock className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                        </div>

                        <Button 
                            onClick={() => handleNewCita('whatsapp')}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-wider shadow-lg shadow-primary/20 h-11 px-6 rounded-2xl text-[11px] transition-all hover:scale-[1.02] active:scale-95"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Nueva Cita
                        </Button>
                    </div>
                </header>

                {/* Mobile Header */}
                <div className="lg:hidden flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Users className="text-primary w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-black tracking-tight uppercase italic text-foreground">Citas</h2>
                    </div>
                    <Button 
                        size="icon"
                        onClick={() => handleNewCita('whatsapp')}
                        className="rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    >
                        <Plus className="w-5 h-5" />
                    </Button>
                </div>

                {/* Stats Summary - Added for Elite Experience */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard 
                        title="Total Hoy"
                        value={citas.length}
                        icon={<CalendarIcon className="w-4 h-4" />}
                        color="amber"
                        subtitle="Citas programadas"
                    />
                    <KPICard 
                        title="Confirmadas"
                        value={citas.filter(c => c.estado === 'confirmada').length}
                        icon={<CheckCircle2 className="w-4 h-4" />}
                        color="blue"
                        subtitle="Pendientes de atención"
                    />
                    <KPICard 
                        title="Finalizadas"
                        value={citas.filter(c => c.estado === 'finalizada').length}
                        icon={<Check className="w-4 h-4" />}
                        color="green"
                        subtitle="Servicios completados"
                    />
                    <KPICard 
                        title="Canceladas"
                        value={citas.filter(c => ['cancelada', 'no_show'].includes(c.estado)).length}
                        icon={<XCircle className="w-4 h-4" />}
                        color="red"
                        subtitle="Inasistencias / Canceladas"
                    />
                </div>

            {/* Filters */}
            <Card className="glass-card border-border">
                <div className="p-4 flex flex-col sm:flex-row items-end gap-4 overflow-x-auto">
                    <div className="w-full sm:w-auto space-y-1.5">
                        <label className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] ml-1">Fecha de Agenda</label>
                        <div className="relative group/input">
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary group-focus-within/input:scale-110 transition-transform" />
                            <Input
                                type="date"
                                value={filtroFecha}
                                onChange={(e) => setFiltroFecha(e.target.value)}
                                className="bg-muted border-border focus:border-primary/50 transition-all rounded-xl h-10"
                            />
                        </div>
                    </div>
                    <div className="w-full sm:w-auto space-y-1.5">
                        <label className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] ml-1">Estado de Cita</label>
                        <Select
                            value={filtroEstado}
                            onValueChange={(val) => setFiltroEstado(val as EstadoCita | 'todas')}
                        >
                            <SelectTrigger className="w-full sm:w-[200px] bg-muted border-border text-foreground focus:ring-primary/20 rounded-xl h-10">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border text-popover-foreground rounded-xl">
                                <SelectItem value="todas">Todas las Citas</SelectItem>
                                <SelectItem value="confirmada">Confirmadas</SelectItem>
                                <SelectItem value="en_espera">En Espera</SelectItem>
                                <SelectItem value="en_proceso">En Proceso</SelectItem>
                                <SelectItem value="finalizada">Finalizadas</SelectItem>
                                <SelectItem value="cancelada">Canceladas</SelectItem>
                                <SelectItem value="no_show">No Show</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button 
                        onClick={() => cargarCitas(true)}
                        variant="secondary"
                        className="w-full sm:w-auto h-10 px-6 font-black uppercase tracking-wider bg-muted/50 hover:bg-muted text-foreground border border-border/50 transition-all rounded-xl"
                    >
                        <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                        Actualizar
                    </Button>
                </div>
            </Card>

            {/* Table */}
            <Card className="glass-card border-border overflow-hidden rounded-2xl">
                {loading ? (
                    <div className="p-24 flex flex-col items-center justify-center space-y-6">
                        <div className="relative size-16">
                            <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
                            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                        <div className="space-y-1 text-center">
                            <p className="text-foreground font-black uppercase tracking-widest text-xs">Cargando Agenda</p>
                            <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-tight">Sincronizando con base de datos...</p>
                        </div>
                    </div>
                ) : citas.length === 0 ? (
                    <div className="p-24 text-center flex flex-col items-center">
                        <div className="size-20 rounded-full bg-muted flex items-center justify-center mb-6 border border-border group hover:border-primary/20 transition-all duration-500">
                            <CalendarIcon className="w-8 h-8 text-muted-foreground/30 group-hover:text-primary/40 transition-all" />
                        </div>
                        <p className="text-foreground font-black uppercase tracking-[0.2em] text-xs">Sin citas programadas</p>
                        <p className="text-muted-foreground text-[10px] uppercase font-bold mt-2 tracking-tight opacity-60">No se encontraron registros para los filtros seleccionados</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted border-b border-border">
                                <TableRow className="border-none hover:bg-transparent">
                                    <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-6 h-14">Horario</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-6 h-14">Información del Cliente</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-6 h-14 hidden md:table-cell">Detalle del Servicio</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-6 h-14 text-center">Estado</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-6 h-14 text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {citas.map((cita) => (
                                    <TableRow key={cita.id} className="border-border hover:bg-foreground/[0.02] transition-colors group">
                                        <TableCell className="px-6 py-5">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-foreground font-black text-sm tracking-tight">{cita.hora_cita_local || '--:--'}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3 h-3 text-primary/40" />
                                                    <span className="text-[9px] text-muted-foreground font-black uppercase tracking-tighter">{cita.fecha_cita_local}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-5">
                                            <div className="space-y-1">
                                                <p className="font-black text-foreground text-sm tracking-tight uppercase group-hover:text-primary transition-colors">{cita.cliente_nombre}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-muted-foreground font-mono tracking-wider">{cita.cliente_telefono}</span>
                                                    {cita.origen === 'whatsapp' && (
                                                        <Badge className="h-4 px-1.5 text-[8px] bg-emerald-500/10 text-emerald-500 border-none font-black uppercase tracking-widest">WA</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-5 hidden md:table-cell">
                                            <div className="space-y-1.5">
                                                <div className="text-[11px] text-foreground font-bold tracking-tight">
                                                    {cita.servicio_nombre || 'Servicio Personalizado'}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
                                                    <span className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.1em]">
                                                        {cita.barbero_nombre || `Sin ${professional.toLowerCase()}`}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-5 text-center">
                                            <Badge className={cn(
                                                "uppercase text-[9px] font-black tracking-[0.15em] px-2.5 py-1 border-none rounded-lg",
                                                cita.estado === 'confirmada' && "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                                                cita.estado === 'en_proceso' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse",
                                                cita.estado === 'finalizada' && "bg-muted text-muted-foreground border border-border/50",
                                                cita.estado === 'cancelada' && "bg-rose-500/10 text-rose-400 border border-rose-500/20",
                                                cita.estado === 'no_show' && "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                            )}>
                                                {cita.estado ? cita.estado.replace('_', ' ') : ' desconocida'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {cita.estado === 'confirmada' && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleStatusChange(cita, 'en_proceso')}
                                                        className="h-9 px-3 rounded-xl bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400 border border-emerald-500/10"
                                                        title="Iniciar Cita"
                                                    >
                                                        <Play className="w-3.5 h-3.5 mr-1.5" />
                                                        <span className="text-[9px] font-black uppercase">Iniciar</span>
                                                    </Button>
                                                )}
                                                {cita.estado === 'en_proceso' && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleStatusChange(cita, 'finalizada')}
                                                        className="h-9 px-3 rounded-xl bg-blue-500/5 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 border border-blue-500/10"
                                                        title="Finalizar Cita"
                                                    >
                                                        <Check className="w-3.5 h-3.5 mr-1.5" />
                                                        <span className="text-[9px] font-black uppercase">Terminar</span>
                                                    </Button>
                                                )}

                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleEditCita(cita)}
                                                    className="h-9 w-9 rounded-xl bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50 transition-all"
                                                    title="Editar"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>

                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleDeleteCita(cita.id)}
                                                    className="h-9 w-9 rounded-xl bg-rose-500/5 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 border border-rose-500/10 transition-all"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>

            {/* Modal */}
            {
                showModal && (
                    <CitaModal
                        cita={editingCita}
                        allCitas={citas}
                        onClose={() => setShowModal(false)}
                        onSave={() => {
                            setShowModal(false)
                            cargarCitas() 
                        }}
                        initialOrigen={initialOrigen}
                    />
                )
            }
            </div>
        </div>
    )
}

export default function CitasPage() {
    return (
        <Suspense fallback={<div className="p-8 text-foreground">Cargando aplicación...</div>}>
            <CitasContent />
        </Suspense>
    )
}

function getDemoCitas(fecha: string): CitaDesdeVista[] {
    const safeFecha = fecha || new Date().toISOString().split('T')[0]
    return [
        {
            id: '1',
            sucursal_id: '1',
            barbero_id: '1',
            servicio_id: '1',
            cliente_nombre: 'Carlos Mendoza',
            cliente_telefono: '+52 555 123 4567',
            timestamp_inicio: `${safeFecha}T10:00:00`,
            timestamp_fin: `${safeFecha}T10:40:00`,
            timestamp_inicio_local: `${safeFecha}T10:00:00`,
            timestamp_fin_local: `${safeFecha}T10:40:00`,
            origen: 'whatsapp',
            estado: 'en_proceso',
            notas: null,
            recordatorio_24h_enviado: true,
            recordatorio_1h_enviado: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            hora_cita_local: '10:00 AM',
            hora_fin_local: '10:40 AM',
            fecha_cita_local: safeFecha,
            servicio_nombre: 'Corte Clásico',
            servicio_precio: 250,
            barbero_nombre: 'Carlos H.',
            monto_pagado: null,
            metodo_pago: null,
            servicio_duracion: 40,
            notas_crm: '',
            cliente_id: null
        },
        {
            id: '2',
            sucursal_id: '1',
            barbero_id: '1',
            servicio_id: '2',
            cliente_nombre: 'Roberto García',
            cliente_telefono: '+52 555 987 6543',
            timestamp_inicio: `${safeFecha}T11:00:00`,
            timestamp_fin: `${safeFecha}T11:30:00`,
            timestamp_inicio_local: `${safeFecha}T11:00:00`,
            timestamp_fin_local: `${safeFecha}T11:30:00`,
            origen: 'whatsapp',
            estado: 'confirmada',
            notas: null,
            recordatorio_24h_enviado: true,
            recordatorio_1h_enviado: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            hora_cita_local: '11:00 AM',
            hora_fin_local: '11:30 AM',
            fecha_cita_local: safeFecha,
            servicio_nombre: 'Barba',
            servicio_precio: 150,
            barbero_nombre: 'Carlos H.',
            monto_pagado: null,
            metodo_pago: null,
            servicio_duracion: 30,
            notas_crm: '',
            cliente_id: null
        },
        {
            id: '3',
            sucursal_id: '1',
            barbero_id: '2',
            servicio_id: '3',
            cliente_nombre: 'Miguel Torres',
            cliente_telefono: '+52 555 456 7890',
            timestamp_inicio: `${safeFecha}T12:00:00`,
            timestamp_fin: `${safeFecha}T13:00:00`,
            timestamp_inicio_local: `${safeFecha}T12:00:00`,
            timestamp_fin_local: `${safeFecha}T13:00:00`,
            origen: 'walkin',
            estado: 'en_espera',
            notas: 'Cliente frecuente',
            recordatorio_24h_enviado: false,
            recordatorio_1h_enviado: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            hora_cita_local: '12:00 PM',
            hora_fin_local: '01:00 PM',
            fecha_cita_local: safeFecha,
            servicio_nombre: 'Combo Completo',
            servicio_precio: 350,
            barbero_nombre: 'Miguel L.',
            monto_pagado: null,
            metodo_pago: null,
            servicio_duracion: 60,
            notas_crm: 'Cliente frecuente',
            cliente_id: null
        }
    ]
}

function CitaModal({ cita, allCitas, onClose, onSave, initialOrigen }: {
    cita?: CitaDesdeVista | null
    allCitas: CitaDesdeVista[]
    onClose: () => void
    onSave: () => void
    initialOrigen?: 'whatsapp' | 'walkin'
}) {
    const { professional } = useBusinessLabels()
    const [loading, setLoading] = useState(false)
    const [servicios, setServicios] = useState<Servicio[]>([])
    const [barberos, setBarberos] = useState<Barbero[]>([])
    const [originalTelefono, setOriginalTelefono] = useState<string | null>(cita?.cliente_telefono || null)

    const extractLocalTime = (str: string) => {
        if (!str) return '10:00'
        // Extract HH:mm from "YYYY-MM-DD HH:mm:ss"
        const timePart = str.includes('T') ? str.split('T')[1] : str.split(' ')[1]
        return timePart?.substring(0, 5) || '10:00'
    }

    const extractLocalDate = (str?: string) => {
        if (!str) return getHermosilloDateStr(new Date())
        return str.split(' ')[0] || str.split('T')[0]
    }

    const [formData, setFormData] = useState<{
        cliente_id: string | null
        cliente_nombre: string
        cliente_telefono: string
        servicio_id: string
        barbero_id: string
        fecha: string
        hora: string
        horaFin: string
        notas: string
    }>({
        cliente_id: cita?.cliente_id || null,
        cliente_nombre: cita?.cliente_nombre || '',
        cliente_telefono: cita?.cliente_telefono || '',
        servicio_id: cita?.servicio_id || (cita ? 'custom' : ''), 
        barbero_id: cita?.barbero_id || '',
        fecha: extractLocalDate(cita?.timestamp_inicio_local),
        hora: cita?.timestamp_inicio_local ? extractLocalTime(cita.timestamp_inicio_local) : '10:00',
        horaFin: cita?.timestamp_fin_local ? extractLocalTime(cita.timestamp_fin_local) : '10:30',
        notas: cita?.notas || ''
    })

    const supabase = createClient()
    const { sucursalId: contextSucursalId } = useAuth()

    useEffect(() => {
        const loadDeps = async () => {
            if (!contextSucursalId) return
            const { data: servs } = await supabase.from('servicios').select('*').eq('activo', true).eq('sucursal_id', contextSucursalId)
            if (servs) setServicios(servs)

            const { data: barbs } = await supabase.from('barberos').select('*').eq('activo', true).eq('sucursal_id', contextSucursalId)
            if (barbs) setBarberos(barbs)
        }
        loadDeps()
    }, [contextSucursalId])

    useEffect(() => {
        if (formData.servicio_id && formData.hora) {
            const service = servicios.find(s => s.id === formData.servicio_id)
            if (service) {
                const startDate = new Date(`2000-01-01T${formData.hora}:00`)
                const endDate = new Date(startDate.getTime() + service.duracion_minutos * 60000)
                const hours = endDate.getHours().toString().padStart(2, '0')
                const minutes = endDate.getMinutes().toString().padStart(2, '0')
                setFormData(prev => ({
                    ...prev,
                    horaFin: `${hours}:${minutes}`
                }))
            }
        }
    }, [formData.servicio_id, formData.hora, servicios])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (formData.cliente_id && formData.cliente_telefono !== (originalTelefono || "") && formData.cliente_telefono !== "Sin registro de numero celular") {
                const updateQuery = (supabase as any).from('clientes').update({ telefono: formData.cliente_telefono || null }).eq('id', formData.cliente_id)
                await updateQuery
            }

            const TZ_OFFSET = '-07:00'
            const startISO = `${formData.fecha}T${formData.hora}:00${TZ_OFFSET}`
            const endISO = `${formData.fecha}T${formData.horaFin}:00${TZ_OFFSET}`

            const nStartMins = parseInt(formData.hora.split(':')[0]) * 60 + parseInt(formData.hora.split(':')[1])
            const nEndMins = parseInt(formData.horaFin.split(':')[0]) * 60 + parseInt(formData.horaFin.split(':')[1])

            const colisionProhibida = allCitas.find((c: CitaDesdeVista) => {
                if (cita && String(c.id).toLowerCase() === String(cita.id).toLowerCase()) return false
                if (formData.barbero_id && String(c.barbero_id) !== String(formData.barbero_id)) return false
                const cancelados = ['cancelada', 'no_show']
                if (cancelados.includes(c.estado)) return false

                const cStartMins = getMinsFromHermosilloString(c.timestamp_inicio_local ?? c.timestamp_inicio)
                const cEndOriginalMins = getMinsFromHermosilloString(c.timestamp_fin_local ?? c.timestamp_fin)
                
                const cDur = cEndOriginalMins - cStartMins
                const cDurBlocks = Math.max(1, Math.floor(cDur / 30))
                const cEndEffectiveMins = cStartMins + (cDurBlocks * 30)

                const nDur = nEndMins - nStartMins
                const nDurBlocks = Math.max(1, Math.floor(nDur / 30))
                const nEndEffectiveMins = nStartMins + (nDurBlocks * 30)

                return (nStartMins < cEndEffectiveMins && nEndEffectiveMins > cStartMins)
            })

            if (colisionProhibida) {
                toast.error(`Conflicto de horario`, {
                    description: `Coincide con una cita ${colisionProhibida.estado.replace('_', ' ')} del ${professional.toLowerCase()} ${colisionProhibida.barbero_nombre}.`
                })
                setLoading(false)
                return
            }

            const payload = {
                sucursal_id: contextSucursalId,
                cliente_id: formData.cliente_id,
                servicio_id: formData.servicio_id === 'custom' ? null : formData.servicio_id || null,
                barbero_id: formData.barbero_id || null,
                cliente_nombre: formData.cliente_nombre,
                cliente_telefono: formData.cliente_telefono,
                timestamp_inicio: startISO,
                timestamp_fin: endISO,
                origen: cita ? cita.origen : initialOrigen,
                estado: cita ? cita.estado : (initialOrigen === 'walkin' ? 'en_espera' : 'confirmada'),
                notas: formData.notas
            }

            const url = cita ? `/api/citas/${cita.id}` : '/api/citas'
            const method = cita ? 'PATCH' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const body = await res.json()
                throw new Error(body.message || 'Error al guardar')
            }

            toast.success(cita ? 'Cita actualizada' : 'Cita creada exitosamente')
            onSave()
        } catch (err) {
            console.error('Error saving cita:', err)
            toast.error('Error al guardar cita', {
                description: (err as any).message
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-lg bg-background border-border/50 text-foreground p-0 overflow-hidden rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <DialogHeader className="p-8 border-b border-border/50 bg-muted/30">
                    <div className="flex items-center gap-4">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Plus className="w-5 h-5 text-primary" />
                        </div>
                        <div className="space-y-0.5">
                            <DialogTitle className="text-xl font-black tracking-tight uppercase italic text-foreground">
                                {cita ? 'Editar Cita' : (initialOrigen === 'walkin' ? 'Nuevo Walk-in' : 'Nueva Cita')}
                            </DialogTitle>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">Complete los detalles del servicio</p>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-8 space-y-8 font-display">
                    {/* Cliente Section */}
                    <div className="space-y-5">
                        <div className="space-y-2.5">
                            <Label className="text-muted-foreground text-[10px] uppercase font-black tracking-[0.2em] ml-1">Información del Cliente</Label>
                            <ClientAutocomplete
                                value={formData.cliente_nombre}
                                sucursalId={contextSucursalId}
                                onChange={(val) => {
                                    const updates: any = { cliente_nombre: val }
                                    if (formData.cliente_id) {
                                        updates.cliente_id = null
                                        updates.cliente_telefono = ""
                                        setOriginalTelefono(null)
                                    }
                                    setFormData({ ...formData, ...updates })
                                }}
                                onSelect={(cliente) => {
                                    setFormData({
                                        ...formData,
                                        cliente_id: cliente.id,
                                        cliente_nombre: cliente.nombre,
                                        cliente_telefono: cliente.telefono || "Sin registro de numero celular"
                                    })
                                    setOriginalTelefono(cliente.telefono)
                                }}
                                placeholder="Nombre completo del cliente"
                                className="bg-muted/20 border-border/50 text-foreground placeholder:text-muted-foreground/30 focus:border-primary/50 rounded-xl h-12"
                            />
                        </div>
                        <div className="space-y-2.5">
                            <Label className="text-muted-foreground text-[10px] uppercase font-black tracking-[0.2em] ml-1">Número de Contacto</Label>
                            <Input
                                type="tel"
                                className={cn(
                                    "bg-muted/20 border-border/50 text-foreground placeholder:text-muted-foreground/30 focus:border-primary/50 h-12 rounded-xl transition-all",
                                    formData.cliente_telefono === "Sin registro de numero celular" && "text-muted-foreground italic opacity-60"
                                )}
                                placeholder="+52 000 000 0000"
                                value={formData.cliente_telefono}
                                onFocus={() => {
                                    if (formData.cliente_telefono === "Sin registro de numero celular") {
                                        setFormData({ ...formData, cliente_telefono: "" })
                                    }
                                }}
                                onBlur={() => {
                                    if (formData.cliente_telefono === "" && !originalTelefono && formData.cliente_id) {
                                        setFormData({ ...formData, cliente_telefono: "Sin registro de numero celular" })
                                    }
                                }}
                                onChange={e => setFormData({ ...formData, cliente_telefono: e.target.value })}
                            />
                            {formData.cliente_id && (formData.cliente_telefono !== (originalTelefono || "")) && (formData.cliente_telefono !== "Sin registro de numero celular" && formData.cliente_telefono !== "") && (
                                <div className="flex items-center gap-2.5 mt-3 text-amber-500 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                                    <AlertTriangle className="size-4 shrink-0" />
                                    <span className="text-[10px] font-black uppercase tracking-tight leading-tight">
                                        El número telefónico será actualizado en el perfil del cliente
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Detalle Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2.5">
                            <Label className="text-muted-foreground text-[10px] uppercase font-black tracking-[0.2em] ml-1">Servicio</Label>
                            <Select
                                value={formData.servicio_id || ''}
                                onValueChange={val => setFormData(prev => ({ ...prev, servicio_id: val || '' }))}
                            >
                                <SelectTrigger className="bg-muted/20 border-border/50 text-foreground focus:ring-primary/20 h-12 rounded-xl">
                                    <SelectValue placeholder="Seleccionar servicio..." />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border text-popover-foreground rounded-xl">
                                    <SelectItem value="custom" className="font-bold">Servicio Personalizado</SelectItem>
                                    {servicios.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.nombre} (${s.precio})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2.5">
                            <Label className="text-muted-foreground text-[10px] uppercase font-black tracking-[0.2em] ml-1">{professional} Asociado</Label>
                            <Select
                                value={formData.barbero_id || ''}
                                onValueChange={val => setFormData(prev => ({ ...prev, barbero_id: val || '' }))}
                            >
                                <SelectTrigger className="bg-muted/20 border-border/50 text-foreground focus:ring-primary/20 h-12 rounded-xl">
                                    <SelectValue placeholder={`${professional} asignado`} />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border text-popover-foreground rounded-xl">
                                    <SelectItem value="" className="font-bold">Automático / Cualquiera</SelectItem>
                                    {barberos.map(b => (
                                        <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Time Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2.5">
                            <Label className="text-muted-foreground text-[10px] uppercase font-black tracking-[0.2em] ml-1">Fecha de Reserva</Label>
                            <Input
                                type="date"
                                required
                                className="bg-muted/20 border-border/50 text-foreground focus:border-primary/50 h-12 rounded-xl"
                                value={formData.fecha}
                                onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2.5">
                                <Label className="text-muted-foreground text-[10px] uppercase font-black tracking-[0.2em] ml-1">Entrada</Label>
                                <Input
                                    type="time"
                                    required
                                    className="bg-muted/20 border-border/50 text-foreground focus:border-primary/50 h-12 rounded-xl px-3"
                                    value={formData.hora}
                                    onChange={e => setFormData({ ...formData, hora: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2.5">
                                <Label className="text-muted-foreground text-[10px] uppercase font-black tracking-[0.2em] ml-1">Salida</Label>
                                <Input
                                    type="time"
                                    required
                                    className="bg-muted/20 border-border/50 text-foreground focus:border-primary/50 h-12 rounded-xl px-3"
                                    value={formData.horaFin}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, horaFin: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <Label className="text-muted-foreground text-[10px] uppercase font-black tracking-[0.2em] ml-1">Notas Internas</Label>
                        <Textarea
                            className="bg-muted/20 border-border/50 text-foreground placeholder:text-muted-foreground/30 focus:border-primary/50 min-h-[100px] rounded-xl resize-none"
                            placeholder={`Información relevante para el ${professional.toLowerCase()}...`}
                            value={formData.notas}
                            onChange={e => setFormData({ ...formData, notas: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="flex-1 h-12 rounded-xl text-muted-foreground font-black uppercase tracking-widest hover:bg-muted/50 hover:text-foreground transition-all"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-2 grow-[2] h-12 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            {loading ? (
                                <Loader2 className="size-5 animate-spin" />
                            ) : (
                                cita ? 'Guardar Cambios' : 'Agendar Cita'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
