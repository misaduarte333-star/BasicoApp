'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useBusinessLabels } from '@/hooks/useBusinessLabels'
import type { Servicio } from '@/lib/types'
import { 
    Plus, 
    Scissors, 
    Clock, 
    Trash2, 
    Edit2, 
    Layers
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function ServiciosPage() {
    const { sucursalId, loading: authLoading } = useAuth()
    const { businessType } = useBusinessLabels()
    const [servicios, setServicios] = useState<Servicio[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingServicio, setEditingServicio] = useState<Servicio | null>(null)
    const [currentTime, setCurrentTime] = useState(new Date())

    const supabase = createClient()

    const cargarServicios = useCallback(async () => {
        if (!sucursalId) return
        try {
            const { data, error } = await supabase
                .from('servicios')
                .select('*')
                .eq('sucursal_id', sucursalId)
                .order('precio', { ascending: true })

            if (error) {
                console.error('Error loading services:', error)
                setServicios(getDemoServices())
            } else {
                setServicios(data || [])
            }
        } catch (err) {
            console.error('Supabase not configured:', err)
            setServicios(getDemoServices())
        } finally {
            setLoading(false)
        }
    }, [supabase, sucursalId])

    useEffect(() => {
        if (authLoading || !sucursalId) return
        cargarServicios()
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [cargarServicios, authLoading, sucursalId])

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

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este servicio?')) return

        try {
            const res = await fetch(`/api/servicios/${id}`, { method: 'DELETE' })
            if (!res.ok && res.status !== 204) {
                const body = await res.json()
                throw new Error(body.message || 'Error al eliminar')
            }
            toast.success('Servicio eliminado correctamente')
            cargarServicios()
        } catch (err: any) {
            console.error('Error deleting:', err)
            toast.error('Error al eliminar: ' + err.message)
        }
    }

    const handleEdit = (servicio: Servicio) => {
        setEditingServicio(servicio)
        setShowModal(true)
    }

    const handleNew = () => {
        setEditingServicio(null)
        setShowModal(true)
    }

    const toggleActivo = async (servicio: Servicio) => {
        try {
            const res = await fetch(`/api/servicios/${servicio.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activo: !servicio.activo }),
            })
            if (!res.ok) {
                const body = await res.json()
                throw new Error(body.message)
            }
            cargarServicios()
        } catch (err: any) {
            console.error('Error toggling:', err)
            setServicios(servicios.map(s =>
                s.id === servicio.id ? { ...s, activo: !s.activo } : s
            ))
        }
    }

    return (
        <div className="relative min-h-full bg-background selection:bg-primary selection:text-black transition-colors duration-300">
            <div className="space-y-6 lg:space-y-8 selection:bg-primary selection:text-black">
                {/* Header (Desktop Only) - Compact Elite Style */}
                <header className="hidden lg:flex h-16 px-0 items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-20 border-b border-border mb-4 font-display">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8962E] flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                            <Layers className="w-7 h-7 text-black" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tighter text-foreground leading-none">
                                Panel de <span className="text-gradient-gold italic">Servicios</span>
                            </h1>
                            <p className="text-muted-foreground mt-1 text-xs font-bold uppercase tracking-widest opacity-70">
                                Catálogo y precios de {businessType?.toLowerCase() || 'servicios'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Live Clock & Date */}
                        <div className="hidden lg:flex flex-col items-end mr-4">
                            <span className="text-foreground font-black text-xl tracking-tighter leading-none uppercase">
                                {formattedTime}
                            </span>
                            <span className="text-primary text-[10px] font-bold uppercase tracking-[0.2em]">
                                {formattedDate}
                            </span>
                        </div>

                        <Button 
                            onClick={handleNew}
                            className="bg-gradient-to-r from-[#D4AF37] to-[#F1C40F] hover:from-[#B8860B] hover:to-[#D4AF37] text-black font-bold uppercase tracking-tighter shadow-lg shadow-gold/20 h-11 px-6 rounded-xl"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Nuevo Servicio
                        </Button>
                    </div>
                </header>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-muted h-64 animate-pulse rounded-2xl border border-border" />
                    ))}
                </div>
            ) : servicios.length === 0 ? (
                <Card className="glass-card border-dashed border-border bg-transparent py-20">
                    <CardContent className="flex flex-col items-center text-center">
                        <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-6">
                            <Scissors className="size-8 text-muted-foreground/20" />
                        </div>
                        <h3 className="text-xl font-black text-foreground uppercase tracking-tight">No hay servicios</h3>
                        <p className="text-muted-foreground text-sm mt-2 max-w-xs">Comienza agregando los servicios que ofreces en tu {businessType?.toLowerCase() || 'negocio'}.</p>
                        <Button onClick={handleNew} variant="outline" className="mt-8 border-primary/50 text-primary hover:bg-primary/10 rounded-xl uppercase tracking-widest text-[10px] font-black">
                            Crear primer servicio
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {servicios.map((servicio) => (
                        <Card 
                            key={servicio.id}
                            className={cn(
                                "glass-card border-border transition-all duration-300 hover:scale-[1.02] hover:border-primary/20 group relative overflow-hidden",
                                !servicio.activo && "opacity-60 grayscale"
                            )}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
                            
                            <CardHeader className="flex flex-row items-start justify-between pb-2">
                                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                                    <Scissors className="size-6 text-primary shadow-glow-gold" />
                                </div>
                                <Switch 
                                    checked={servicio.activo}
                                    onCheckedChange={() => toggleActivo(servicio)}
                                    className="data-[state=checked]:bg-primary"
                                />
                            </CardHeader>
                            
                            <CardContent className="space-y-4">
                                <div>
                                    <h3 className="text-xl font-black text-foreground uppercase tracking-tighter group-hover:text-primary transition-colors">
                                        {servicio.nombre}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Clock className="size-3 text-muted-foreground" />
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                            {servicio.duracion_minutos} MINUTOS
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-end justify-between pt-4 border-t border-border">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-foreground font-display">
                                            ${Math.round(servicio.precio)}
                                        </span>
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">MXN</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(servicio)}
                                            className="size-9 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
                                        >
                                            <Edit2 className="size-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(servicio.id)}
                                            className="size-9 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {showModal && (
                <ServicioModal
                    servicio={editingServicio}
                    onClose={() => setShowModal(false)}
                    onSave={() => {
                        setShowModal(false)
                        cargarServicios()
                    }}
                />
            )}
            </div>
        </div>
    )
}

// Demo data
function getDemoServices(): Servicio[] {
    return [
        {
            id: '1',
            sucursal_id: '1',
            nombre: 'Corte Clásico',
            duracion_minutos: 40,
            precio: 250,
            activo: true,
            created_at: new Date().toISOString()
        },
        {
            id: '2',
            sucursal_id: '1',
            nombre: 'Barba',
            duracion_minutos: 30,
            precio: 150,
            activo: true,
            created_at: new Date().toISOString()
        },
        {
            id: '3',
            sucursal_id: '1',
            nombre: 'Combo Completo',
            duracion_minutos: 60,
            precio: 350,
            activo: true,
            created_at: new Date().toISOString()
        }
    ]
}

// Modal Component
function ServicioModal({
    servicio,
    onClose,
    onSave
}: {
    servicio: Servicio | null
    onClose: () => void
    onSave: () => void
}) {
    const { sucursalId } = useAuth()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        nombre: servicio?.nombre || '',
        duracion_minutos: servicio?.duracion_minutos?.toString() || '30',
        precio: servicio?.precio?.toString() || '',
        activo: servicio?.activo ?? true
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const payload: any = {
                nombre: formData.nombre,
                duracion_minutos: parseInt(formData.duracion_minutos),
                precio: parseFloat(formData.precio),
                activo: formData.activo
            }

            // Include sucursal_id for new services
            if (!servicio) {
                payload.sucursal_id = sucursalId
            }

            const url = servicio ? `/api/servicios/${servicio.id}` : '/api/servicios'
            const method = servicio ? 'PATCH' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const body = await res.json()
                throw new Error(body.message || 'Error al guardar')
            }

            toast.success(servicio ? 'Servicio actualizado' : 'Servicio creado')
            onSave()
        } catch (err: any) {
            console.error('Error saving:', err)
            toast.error('Error: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="glass-card border-border bg-card/95 text-foreground max-w-md rounded-[2rem] p-0 overflow-hidden">
                <div className="bg-gradient-to-br from-primary/20 to-transparent p-6 border-b border-border">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black font-display text-primary tracking-tight uppercase">
                            {servicio ? 'Editar Servicio' : 'Nuevo Servicio'}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">
                            {servicio ? 'Modifica los parámetros del servicio' : 'Agrega un nuevo servicio al catálogo'}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="nombre" className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Nombre del Servicio</Label>
                        <Input
                            id="nombre"
                            type="text"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            className="bg-muted border-border focus:border-primary/50 text-foreground rounded-xl h-11"
                            placeholder="Ej: Corte Degradado"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Duración</Label>
                            <select
                                value={formData.duracion_minutos}
                                onChange={(e) => setFormData({ ...formData, duracion_minutos: e.target.value })}
                                className="w-full bg-muted border border-border focus:border-primary/50 text-foreground rounded-xl h-11 px-3 outline-none transition-all text-sm appearance-none"
                            >
                                <option value="15" className="bg-card">15 min</option>
                                <option value="30" className="bg-card">30 min</option>
                                <option value="40" className="bg-card">40 min</option>
                                <option value="45" className="bg-card">45 min</option>
                                <option value="60" className="bg-card">60 min</option>
                                <option value="90" className="bg-card">90 min</option>
                                <option value="120" className="bg-card">120 min</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="precio" className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Precio (MXN)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold">$</span>
                                <Input
                                    id="precio"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.precio}
                                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                                    className="bg-muted border-border focus:border-primary/50 text-foreground rounded-xl h-11 pl-8 font-display font-bold"
                                    placeholder="250"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted border border-border">
                        <div className="space-y-0.5">
                            <Label htmlFor="activo-modal" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest cursor-pointer">Estado del Servicio</Label>
                            <p className="text-[9px] text-muted-foreground/60 uppercase font-bold tracking-tight">Disponible para los clientes</p>
                        </div>
                        <Switch 
                            id="activo-modal"
                            checked={formData.activo}
                            onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                            className="data-[state=checked]:bg-primary"
                        />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 mt-8">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={onClose}
                            className="rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted font-black uppercase tracking-widest text-[10px]"
                        >
                            Cancelar
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={loading}
                            className="bg-gradient-to-r from-[#D4AF37] to-[#F1C40F] hover:from-[#B8860B] hover:to-[#D4AF37] text-black font-black uppercase tracking-widest text-[10px] px-8 rounded-xl shadow-lg shadow-gold/20"
                        >
                            {loading && <div className="spinner w-4 h-4 mr-2" />}
                            {servicio ? 'Guardar Cambios' : 'Crear Servicio'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
