'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Sucursal, HorarioApertura } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { 
    Settings, 
    Save, 
    Clock, 
    MapPin, 
    Phone, 
    CheckCircle2, 
    AlertCircle,
    Building2,
    Calendar,
    ChevronRight,
    Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { useBusinessLabels } from '@/hooks/useBusinessLabels'

export default function ConfiguracionPage() {
    const { sucursalId } = useAuth()
    const labels = useBusinessLabels()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [sucursal, setSucursal] = useState<Sucursal | null>(null)
    const [formData, setFormData] = useState({
        nombre: '',
        direccion: '',
        telefono_whatsapp: '',
        activa: true
    })
    const [horario, setHorario] = useState<HorarioApertura>({
        lunes: { apertura: '09:00', cierre: '20:00' },
        martes: { apertura: '09:00', cierre: '20:00' },
        miercoles: { apertura: '09:00', cierre: '20:00' },
        jueves: { apertura: '09:00', cierre: '20:00' },
        viernes: { apertura: '09:00', cierre: '20:00' },
        sabado: { apertura: '10:00', cierre: '18:00' },
        domingo: { apertura: '10:00', cierre: '14:00' }
    })

    const supabase = createClient()

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        cargarConfiguracion()
        return () => clearInterval(timer)
    }, [])

    const cargarConfiguracion = async () => {
        if (!sucursalId) return
        try {
            const { data, error } = await (supabase
                .from('sucursales') as any)
                .select('*')
                .eq('id', sucursalId)
                .single()

            if (error) {
                console.error('Error loading config:', error)
                setFormData({
                    nombre: labels.businessName || 'Mi Negocio',
                    direccion: 'Av. Principal #123, Hermosillo, Sonora',
                    telefono_whatsapp: '5216621234567',
                    activa: true
                })
            } else if (data) {
                setSucursal(data)
                setFormData({
                    nombre: data.nombre,
                    direccion: data.direccion || '',
                    telefono_whatsapp: data.telefono_whatsapp,
                    activa: data.activa
                })
                if (data.horario_apertura) {
                    setHorario(data.horario_apertura)
                }
            }
        } catch (err) {
            console.error('Supabase connection error:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const updateData = {
                nombre: formData.nombre,
                direccion: formData.direccion,
                telefono_whatsapp: formData.telefono_whatsapp,
                horario_apertura: horario,
                activa: formData.activa
            }

            if (sucursal) {
                const { error } = await (supabase
                    .from('sucursales') as any)
                    .update(updateData as any)
                    .eq('id', sucursal.id)

                if (error) throw error
            }

            toast.success('Configuración guardada', {
                description: 'Los cambios se han aplicado correctamente.'
            })
        } catch (err) {
            console.error('Error saving:', err)
            toast.error('Error al guardar', {
                description: 'No se pudieron guardar los cambios. Intenta de nuevo.'
            })
        } finally {
            setSaving(false)
        }
    }

    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const

    const updateHorario = (dia: string, campo: 'apertura' | 'cierre', valor: string) => {
        setHorario(prev => ({
            ...prev,
            [dia]: {
                ...prev[dia as keyof HorarioApertura],
                [campo]: valor
            }
        }))
    }

    if (loading) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                    <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-muted-foreground font-medium animate-pulse uppercase tracking-widest text-xs">Cargando configuración...</p>
            </div>
        )
    }
    return (
        <div className="relative min-h-full bg-background selection:bg-primary selection:text-black transition-colors duration-300">
            <div className="space-y-6 lg:space-y-8 selection:bg-primary selection:text-black">
                {/* Header (Desktop Only) - Compact Elite Style */}
                <header className="hidden lg:flex h-16 px-0 items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-20 border-b border-border mb-4 font-display">
                    <div className="flex items-center gap-3 text-foreground">
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 transition-all hover:scale-105">
                            <Settings className="text-primary w-4 h-4 shadow-lg shadow-primary/20" />
                        </div>
                        <h2 className="text-lg font-black tracking-tighter uppercase italic">Ajustes del Sistema</h2>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Time & Date - Premium Compact Style */}
                        <div className="bg-muted/90 backdrop-blur-xl border border-border rounded-xl px-4 py-1.5 flex items-center gap-4 shadow-2xl hover:border-primary/30 transition-all group">
                            <div className="flex flex-col items-end text-foreground text-right">
                                <p className="text-xs font-black tracking-tighter tabular-nums leading-tight">
                                    {currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </p>
                                <p className="text-[9px] text-primary font-black uppercase tracking-[0.1em] leading-tight">
                                    {currentTime.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, (c) => c.toUpperCase())}
                                </p>
                            </div>
                            <div className="h-6 w-[1px] bg-border group-hover:bg-primary/20 transition-colors" />
                            <Clock className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>

                        <Button 
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-gradient-to-r from-[#D4AF37] to-[#F1C40F] hover:from-[#B8860B] hover:to-[#D4AF37] text-black font-black uppercase tracking-tighter shadow-lg shadow-gold/20 h-10 px-6 rounded-xl"
                        >
                            <Save className={cn("w-4 h-4 mr-2", saving && "animate-spin")} />
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </div>
                </header>

                {/* Mobile Header */}
                <div className="lg:hidden flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Settings className="text-primary w-4 h-4" />
                        </div>
                        <h2 className="text-lg font-black tracking-tighter uppercase italic text-foreground">Ajustes</h2>
                    </div>
                    <Button 
                        onClick={handleSave}
                        disabled={saving}
                        size="sm"
                        className="bg-primary text-black font-black uppercase tracking-tighter h-8 rounded-lg text-[10px]"
                    >
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    </Button>
                </div>

                <form id="config-form" onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-6 lg:space-y-8">
                        {/* General Information Card */}
                        <Card className="glass-card border-none bg-card/60 overflow-hidden relative group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="p-6 lg:p-8 space-y-8">
                                <div className="flex items-center gap-4 border-b border-border pb-6">
                                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                                        <Building2 className="text-primary w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black tracking-tighter uppercase italic text-foreground leading-none">Datos de la Sucursal</h3>
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1.5 group-hover:text-primary/50 transition-colors">Identidad y ubicación principal</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest ml-1">Nombre Comercial</Label>
                                        <Input
                                            type="text"
                                            value={formData.nombre}
                                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                            className="bg-muted border-border text-foreground focus:border-primary/50 h-11 px-4 rounded-xl transition-all"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest ml-1">WhatsApp de Contacto</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                                            <Input
                                                type="tel"
                                                value={formData.telefono_whatsapp}
                                                onChange={(e) => setFormData({ ...formData, telefono_whatsapp: e.target.value })}
                                                className="bg-muted border-border text-foreground focus:border-primary/50 h-11 pl-11 pr-4 rounded-xl transition-all font-mono"
                                                placeholder="521..."
                                            />
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 space-y-2">
                                        <Label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest ml-1">Dirección Física</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-4 w-4 h-4 text-muted-foreground" />
                                            <Textarea
                                                value={formData.direccion}
                                                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                                                className="bg-muted border-border text-foreground focus:border-primary/50 min-h-[100px] pl-11 pr-4 py-3 rounded-xl transition-all"
                                                placeholder="Calle, Número, Colonia, Ciudad..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10 group/switch transition-all hover:bg-primary/10">
                                    <div className="flex items-center gap-3">
                                        <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                                            <CheckCircle2 className="text-primary w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-tight text-foreground leading-none">Sucursal Activa</p>
                                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter mt-1">Habilitar/Deshabilitar reservas online</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={formData.activa}
                                        onCheckedChange={(checked) => setFormData({ ...formData, activa: checked })}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                </div>

                            </div>
                        </Card>

                        {/* Store Hours Card */}
                        <Card className="glass-card border-none bg-card/60 overflow-hidden relative group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="p-6 lg:p-8 space-y-8">
                                <div className="flex items-center gap-4 border-b border-border pb-6">
                                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                                        <Calendar className="text-primary w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black tracking-tighter uppercase italic text-foreground leading-none">Horario de Atención</h3>
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1.5 group-hover:text-primary/50 transition-colors">Disponibilidad semanal del negocio</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {dias.map((dia) => (
                                        <div key={dia} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition-all group/day">
                                            <span className="text-xs font-black uppercase tracking-widest text-foreground/70 group-hover/day:text-primary transition-colors mb-2 sm:mb-0 w-24">{dia}</span>
                                            <div className="flex items-center gap-3">
                                                <div className="relative flex-1 sm:flex-none">
                                                    <Input
                                                        type="time"
                                                        value={horario[dia as keyof HorarioApertura]?.apertura || ''}
                                                        onChange={(e) => updateHorario(dia, 'apertura', e.target.value)}
                                                        className="bg-background border-border text-foreground focus:border-primary/40 h-9 px-3 rounded-lg text-xs w-full sm:w-32 transition-all font-mono"
                                                    />
                                                </div>
                                                <span className="text-[10px] font-black text-muted-foreground uppercase italic">al</span>
                                                <div className="relative flex-1 sm:flex-none">
                                                    <Input
                                                        type="time"
                                                        value={horario[dia as keyof HorarioApertura]?.cierre || ''}
                                                        onChange={(e) => updateHorario(dia, 'cierre', e.target.value)}
                                                        className="bg-background border-border text-foreground focus:border-primary/40 h-9 px-3 rounded-lg text-xs w-full sm:w-32 transition-all font-mono"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar Area */}
                    <div className="space-y-6 lg:space-y-8">
                        {/* Actions Card - Sticky on Desktop */}
                        <Card className="glass-card border-none bg-card/60 p-6 lg:p-8 sticky top-24 overflow-hidden group">
                            <div className="absolute top-0 right-0 size-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
                            
                            <div className="relative">
                                <h3 className="text-sm font-black tracking-widest uppercase italic text-foreground mb-4">Mantenimiento</h3>
                                <p className="text-[11px] text-muted-foreground font-medium leading-relaxed mb-8 border-l-2 border-primary/20 pl-4 py-1">
                                    Asegúrate de revisar todos los horarios antes de guardar. Estos cambios afectan la visibilidad en tiempo real para tus clientes.
                                </p>

                                <div className="space-y-4">
                                    <div className="p-4 rounded-2xl bg-muted border border-border space-y-4">
                                        <div className="flex items-center justify-between border-b border-border pb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Base de Datos</span>
                                            </div>
                                            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest italic">Online</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-border pb-3">
                                            <div className="flex items-center gap-2 text-muted-foreground font-medium text-[10px] uppercase tracking-widest">
                                                <ChevronRight className="w-2.5 h-2.5 text-primary" />
                                                Versión
                                            </div>
                                            <span className="text-[10px] text-foreground font-black tracking-widest">v2.4.0</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-muted-foreground font-medium text-[10px] uppercase tracking-widest">
                                                <ChevronRight className="w-2.5 h-2.5 text-primary" />
                                                ID Nodo
                                            </div>
                                            <span className="text-[10px] text-muted-foreground font-mono font-bold tracking-tighter">SUC-782</span>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                                        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                                        <p className="text-[9px] text-amber-500/80 font-bold uppercase tracking-tight leading-relaxed">
                                            Los cambios en el horario afectarán las citas ya programadas si estas quedan fuera del nuevo rango.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </form>
            </div>
        </div>
    )
}
