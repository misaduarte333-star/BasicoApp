'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Cliente } from '@/lib/types'
import {
    Search,
    UserPlus,
    MessageSquare,
    Calendar,
    TrendingUp,
    MoreVertical,
    Phone,
    Mail,
    Edit2,
    History,
    Trash2,
    AlertCircle,
    Users,
    Plus,
    Clock,
    UserCheck,
    ArrowRight
} from 'lucide-react'
import { KPICard } from '@/components/KPICard'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function ClientesPage() {
    const { sucursalId, loading: authLoading } = useAuth()
    const [clientes, setClientes] = useState<Cliente[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [showConfirmEditDialog, setShowConfirmEditDialog] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isNewClient, setIsNewClient] = useState(false)
    const [currentTime, setCurrentTime] = useState(new Date())

    const supabase = createClient()

    const cargarClientes = useCallback(async () => {
        if (!sucursalId) return
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('clientes')
                .select('*')
                .eq('sucursal_id', sucursalId)
                .order('ultima_cita', { ascending: false })

            if (error) throw error
            setClientes(data || [])
        } catch (err: any) {
            console.error('Error cargando clientes:', err.message || JSON.stringify(err, Object.getOwnPropertyNames(err)))
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        if (authLoading || !sucursalId) return
        cargarClientes()
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [cargarClientes, sucursalId, authLoading])
    
    const formattedDate = currentTime.toLocaleDateString('es-MX', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
    }).replace(/^\w/, (c) => c.toUpperCase())

    const formattedTime = currentTime.toLocaleTimeString('es-MX', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
    })

    const filteredClientes = clientes.filter(c =>
        c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.telefono?.includes(searchQuery) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const kpis = {
        total: clientes.length,
        activos: clientes.filter(c => c.total_citas > 3).length, // Clientes recurrentes
        nuevosHoy: clientes.filter(c => {
            const date = new Date(c.created_at)
            const today = new Date()
            return date.toDateString() === today.toDateString()
        }).length
    }

    const handleSaveCliente = async () => {
        if (!selectedCliente) return

        setIsSaving(true)
        try {
            if (isNewClient) {
                const { error } = await (supabase
                    .from('clientes') as any)
                    .insert({
                        sucursal_id: sucursalId,
                        nombre: selectedCliente.nombre,
                        telefono: selectedCliente.telefono,
                        email: selectedCliente.email,
                        notas_internas: selectedCliente.notas_internas,
                        total_citas: 0
                    })

                if (error) throw error
            } else {
                const { error } = await (supabase
                    .from('clientes') as any)
                    .update({
                        nombre: selectedCliente.nombre,
                        telefono: selectedCliente.telefono,
                        email: selectedCliente.email,
                        notas_internas: selectedCliente.notas_internas
                    })
                    .eq('id', selectedCliente.id)

                if (error) throw error
            }

            setShowEditModal(false)
            setShowConfirmEditDialog(false)
            cargarClientes()
        } catch (err) {
            console.error('Error guardando cliente:', err)
            alert('Error al guardar cambios')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteCliente = async () => {
        if (!selectedCliente) return
        setIsDeleting(true)
        try {
            const { error } = await supabase
                .from('clientes')
                .delete()
                .eq('id', selectedCliente.id)

            if (error) throw error

            setShowDeleteDialog(false)
            setShowEditModal(false)
            cargarClientes()
        } catch (err) {
            console.error('Error eliminando cliente:', err)
            alert('No se pudo eliminar el cliente. Verifique que no tenga citas asociadas.')
        } finally {
            setIsDeleting(false)
        }
    }

    const openNewClientModal = () => {
        setIsNewClient(true)
        setSelectedCliente({
            id: '',
            nombre: '',
            telefono: '',
            email: '',
            notas_internas: '',
            total_citas: 0,
            ultima_cita: null,
            created_at: new Date().toISOString()
        } as Cliente)
        setShowEditModal(true)
    }

    const openEditClientModal = (cliente: Cliente) => {
        setIsNewClient(false)
        setSelectedCliente({ ...cliente })
        setShowEditModal(true)
    }

    return (
        <div className="relative min-h-full bg-background selection:bg-primary selection:text-primary-foreground">
            <div className="space-y-8 pb-10">
                {/* Header Section */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                            <Users className="size-3.5 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">CRM & FIDELIZACIÓN</span>
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic text-foreground">
                                Gestión de <span className="text-primary">Clientes</span>
                            </h1>
                            <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest opacity-70">
                                Base de datos centralizada y análisis de recurrencia
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="hidden lg:flex flex-col items-end px-6 border-r border-border/50">
                            <span className="text-foreground font-black text-2xl tracking-tighter leading-none uppercase font-display">
                                {formattedTime}
                            </span>
                            <span className="text-primary text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                                {formattedDate}
                            </span>
                        </div>
                        <Button 
                            onClick={openNewClientModal}
                            className="bg-primary text-primary-foreground font-black uppercase tracking-tighter shadow-xl shadow-primary/20 h-14 px-8 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all group"
                        >
                            <UserPlus className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
                            Registrar Nuevo Cliente
                        </Button>
                    </div>
                </header>

                {/* KPI Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <KPICard
                        title="Base de Datos"
                        value={kpis.total.toString()}
                        icon={<Users />}
                        subtitle="Total de clientes registrados"
                        color="blue"
                    />
                    <KPICard
                        title="Clientes VIP"
                        value={kpis.activos.toString()}
                        icon={<UserCheck />}
                        subtitle="Más de 3 visitas registradas"
                        color="amber"
                    />
                    <KPICard
                        title="Nuevos Clientes"
                        value={kpis.nuevosHoy.toString()}
                        icon={<Plus />}
                        subtitle="Registros realizados hoy"
                        trend={{ value: 12, isPositive: true }}
                        color="green"
                    />
                </div>

                {/* Search and Filters */}
                <div className="p-1 rounded-3xl bg-muted/30 border border-border/50 backdrop-blur-xl">
                    <div className="relative group overflow-hidden rounded-2xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground group-focus-within:text-primary transition-all duration-300" />
                        <Input
                            placeholder="Buscar por nombre, teléfono o correo electrónico..."
                            className="pl-12 w-full bg-transparent border-none text-foreground placeholder:text-muted-foreground/30 focus:ring-0 transition-all rounded-2xl h-14 text-lg font-bold"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    </div>
                </div>
                {/* Clients Table Card */}
                <div className="p-1 rounded-[2.5rem] bg-muted/20 border border-border/50 overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border/50 hover:bg-transparent bg-muted/50">
                                    <TableHead className="text-muted-foreground font-black uppercase text-[10px] tracking-widest py-6 px-8">Identidad Cliente</TableHead>
                                    <TableHead className="text-muted-foreground font-black uppercase text-[10px] tracking-widest py-6">Canal de Contacto</TableHead>
                                    <TableHead className="text-muted-foreground font-black uppercase text-[10px] tracking-widest py-6">Frecuencia</TableHead>
                                    <TableHead className="text-muted-foreground font-black uppercase text-[10px] tracking-widest py-6">Historial</TableHead>
                                    <TableHead className="text-right text-muted-foreground font-black uppercase text-[10px] tracking-widest py-6 px-8">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array(5).fill(null).map((_, i) => (
                                        <TableRow key={i} className="border-border/50">
                                            <TableCell colSpan={5} className="py-10 px-8">
                                                <div className="flex items-center gap-4 animate-pulse">
                                                    <div className="size-12 rounded-2xl bg-muted" />
                                                    <div className="space-y-2 flex-1">
                                                        <div className="h-4 bg-muted rounded w-1/4" />
                                                        <div className="h-3 bg-muted rounded w-1/6" />
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredClientes.length === 0 ? (
                                    <TableRow className="border-border/50">
                                        <TableCell colSpan={5} className="py-32 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-20">
                                                <Users className="size-16" />
                                                <p className="font-black uppercase tracking-[0.3em] text-sm italic">
                                                    No se encontraron coincidencias
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredClientes.map((cliente) => (
                                    <TableRow key={cliente.id} className="border-border/50 hover:bg-muted/50 transition-all group">
                                        <TableCell className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                                                    <span className="text-sm font-black text-primary group-hover:text-primary-foreground">
                                                        {cliente.nombre.slice(0, 2).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-base font-black text-foreground uppercase tracking-tight group-hover:translate-x-1 transition-transform">
                                                        {cliente.nombre}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground font-black tracking-widest uppercase mt-0.5">
                                                        ID REF: {cliente.id.slice(0, 8)}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2.5 text-foreground/80">
                                                    <Phone className="size-3.5 text-primary" />
                                                    <span className="text-xs font-black tracking-tight">{cliente.telefono || 'SIN TELÉFONO'}</span>
                                                </div>
                                                {cliente.email && (
                                                    <div className="flex items-center gap-2.5 text-muted-foreground">
                                                        <Mail className="size-3.5" />
                                                        <span className="text-[10px] font-bold">{cliente.email}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-2">
                                                    <History className="size-3 text-primary" />
                                                    <span className="text-[10px] font-black text-primary uppercase">
                                                        {cliente.total_citas} SERVICIOS
                                                    </span>
                                                </div>
                                                {cliente.total_citas >= 5 && (
                                                    <div className="size-5 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                                        <span className="text-[8px] font-black text-amber-500">VIP</span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="size-3 text-muted-foreground" />
                                                    <span className="text-xs text-foreground font-black uppercase italic">
                                                        {cliente.ultima_cita ? new Date(cliente.ultima_cita).toLocaleDateString('es-MX', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        }) : 'PENDIENTE'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 pl-5">
                                                    <Clock className="size-3 text-muted-foreground/50" />
                                                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                                                        {cliente.ultima_cita ? new Date(cliente.ultima_cita).toLocaleTimeString('es-MX', {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        }) : '--:--'}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right px-8">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-10 rounded-xl hover:bg-primary hover:text-primary-foreground group/btn border border-transparent hover:border-primary/20 transition-all duration-300"
                                                onClick={() => openEditClientModal(cliente)}
                                            >
                                                <Edit2 className="size-4 group-hover/btn:scale-110 transition-transform" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

            {/* Edit Modal */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent className="max-w-2xl bg-background border-border/50 text-foreground p-0 overflow-hidden rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                    <DialogHeader className="p-8 border-b border-border/50 bg-muted/30">
                        <div className="flex items-center gap-4">
                            <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Users className="size-7 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <DialogTitle className="text-2xl font-black font-display text-foreground tracking-tight uppercase italic">
                                    {isNewClient ? 'Nuevo Registro' : 'Expediente Cliente'}
                                </DialogTitle>
                                <DialogDescription className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">
                                    {isNewClient ? 'Alta de cliente en sistema CRM' : 'Información detallada y preferencias de servicio'}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {selectedCliente && (
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2.5">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Nombre Completo</label>
                                    <Input
                                        className="bg-muted/20 border-border/50 focus:border-primary/50 text-foreground rounded-2xl h-14 font-bold text-lg"
                                        value={selectedCliente.nombre}
                                        onChange={e => setSelectedCliente({ ...selectedCliente, nombre: e.target.value })}
                                        placeholder="Ej. Juan Pérez"
                                        required
                                    />
                                </div>
                                <div className="space-y-2.5">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Teléfono Móvil</label>
                                    <Input
                                        className="bg-muted/20 border-border/50 focus:border-primary/50 text-foreground rounded-2xl h-14 font-black tracking-widest text-lg"
                                        value={selectedCliente.telefono || ''}
                                        onChange={e => setSelectedCliente({ ...selectedCliente, telefono: e.target.value })}
                                        placeholder="+52 000 000 0000"
                                    />
                                </div>
                                <div className="space-y-2.5 md:col-span-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Correo Electrónico</label>
                                    <Input
                                        type="email"
                                        className="bg-muted/20 border-border/50 focus:border-primary/50 text-foreground rounded-2xl h-14 font-bold"
                                        value={selectedCliente.email || ''}
                                        onChange={e => setSelectedCliente({ ...selectedCliente, email: e.target.value })}
                                        placeholder="ejemplo@dominio.com"
                                    />
                                </div>
                                <div className="space-y-2.5 md:col-span-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Notas de Perfil & Preferencias</label>
                                    <textarea
                                        className="w-full bg-muted/20 border border-border/50 focus:border-primary/50 text-foreground rounded-3xl p-5 min-h-[140px] text-base outline-none transition-all placeholder:text-muted-foreground/20 font-medium resize-none"
                                        placeholder="Estilo de corte preferido, productos que utiliza, frecuencia, temas de conversación..."
                                        value={selectedCliente.notas_internas || ''}
                                        onChange={e => setSelectedCliente({ ...selectedCliente, notas_internas: e.target.value })}
                                    />
                                </div>
                            </div>

                            {!isNewClient && (
                                <div className="grid grid-cols-2 gap-4 p-6 rounded-[2rem] bg-muted/30 border border-border/50">
                                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-background/50 border border-border/30">
                                        <TrendingUp className="size-5 text-primary mb-2" />
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Total Servicios</p>
                                        <p className="text-3xl font-black text-foreground font-display">{selectedCliente.total_citas}</p>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-background/50 border border-border/30">
                                        <Calendar className="size-5 text-primary mb-2" />
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Alta Sistema</p>
                                        <p className="text-lg font-black text-foreground uppercase tracking-tighter">
                                            {new Date(selectedCliente.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <DialogFooter className="md:flex !justify-between items-center gap-4 pt-4 border-t border-border/50">
                                <div className="flex gap-2">
                                    {!isNewClient && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="rounded-2xl h-14 px-6 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 font-black uppercase tracking-widest text-[10px] gap-2 transition-all"
                                            onClick={() => setShowDeleteDialog(true)}
                                        >
                                            <Trash2 className="size-4" />
                                            Eliminar
                                        </Button>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="rounded-2xl h-14 px-8 text-muted-foreground hover:text-foreground font-black uppercase tracking-widest text-[10px] transition-all"
                                        onClick={() => setShowEditModal(false)}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="button"
                                        disabled={isSaving}
                                        onClick={() => isNewClient ? handleSaveCliente() : setShowConfirmEditDialog(true)}
                                        className="bg-primary text-primary-foreground rounded-2xl h-14 px-10 font-black uppercase tracking-[0.1em] text-[10px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all group"
                                    >
                                        {isSaving ? 'Guardando...' : isNewClient ? (
                                            <>Crear Perfil <Plus className="size-4 ml-2" /></>
                                        ) : (
                                            <>Guardar Cambios <ArrowRight className="size-4 ml-2 group-hover:translate-x-1 transition-transform" /></>
                                        )}
                                    </Button>
                                </div>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="bg-background border-border/50 text-foreground rounded-[2.5rem] p-10 max-w-lg shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                    <AlertDialogHeader className="space-y-4">
                        <div className="size-16 rounded-3xl bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-2">
                            <AlertCircle className="size-8 text-red-500" />
                        </div>
                        <AlertDialogTitle className="text-3xl font-black text-foreground uppercase tracking-tight italic">
                            ¿Eliminar Cliente?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground text-base font-medium leading-relaxed">
                            Esta acción es irreversible y afectará permanentemente el historial de servicios de este cliente.
                            <br /><br />
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 font-black uppercase text-[10px] tracking-widest">
                                <AlertCircle className="size-3" /> Peligro: Acción Destructiva
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-4 mt-8 pt-6 border-t border-border/50">
                        <AlertDialogCancel className="bg-muted/50 border-border/50 text-foreground hover:bg-muted rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[10px] transition-all">
                            Mejor no
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteCliente}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white border-none rounded-2xl h-14 px-10 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-red-600/20 transition-all hover:scale-[1.02] active:scale-95"
                        >
                            {isDeleting ? (
                                <Clock className="size-4 animate-spin" />
                            ) : (
                                'Sí, Eliminar Permanentemente'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Confirmation Dialog */}
            <AlertDialog open={showConfirmEditDialog} onOpenChange={setShowConfirmEditDialog}>
                <AlertDialogContent className="bg-background border-border/50 text-foreground rounded-[2.5rem] p-10 max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                    <AlertDialogHeader className="space-y-4">
                        <div className="size-16 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 mb-2">
                            <Edit2 className="size-8 text-primary" />
                        </div>
                        <AlertDialogTitle className="text-3xl font-black text-foreground uppercase tracking-tight italic">
                            ¿Confirmar Cambios?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground text-base font-medium leading-relaxed">
                            Estás a punto de actualizar la información esencial del cliente. Esto afectará los registros históricos y futuros envíos de notificaciones.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-4 mt-8 pt-6 border-t border-border/50">
                        <AlertDialogCancel className="bg-muted/50 border-border/50 text-foreground hover:bg-muted rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[10px] transition-all">
                            Regresar a editar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleSaveCliente}
                            disabled={isSaving}
                            className="bg-primary text-primary-foreground border-none rounded-2xl h-14 px-10 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
                        >
                            {isSaving ? (
                                <Clock className="size-4 animate-spin" />
                            ) : (
                                'Confirmar y Guardar Cambios'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            </div>
        </div>
    )
}
