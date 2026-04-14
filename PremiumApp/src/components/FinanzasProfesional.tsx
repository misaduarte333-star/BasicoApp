'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { 
    TrendingUp, 
    Plus, 
    DollarSign, 
    Calendar as CalendarIcon,
    AlertTriangle,
    Target,
    CheckCircle2,
    Trash2,
    Clock,
    ArrowUpRight,
    Calculator,
    Edit2,
    Check,
    CalendarDays,
    ChevronLeft,
    Wallet
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { format, startOfMonth, endOfMonth as endOfMonthDate } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Barbero as Profesional, Gasto } from '@/lib/types'
import { useBusinessLabels } from '@/hooks/useBusinessLabels'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface FinanzasProfesionalProps {
    profesional: Profesional
    onBack: () => void
}

export function FinanzasProfesional({ profesional, onBack }: FinanzasProfesionalProps) {
    const labels = useBusinessLabels()
    const [gastos, setGastos] = useState<Gasto[]>([])
    const [loading, setLoading] = useState(true)
    const [income, setIncome] = useState(0)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingGasto, setEditingGasto] = useState<Gasto | null>(null)
    
    // Form state
    const [descripcion, setDescripcion] = useState('')
    const [monto, setMonto] = useState('')
    const [fechaPago, setFechaPago] = useState<Date | null>(null)
    const [esRecurrente, setEsRecurrente] = useState(false)
    const [pagado, setPagado] = useState(false)
    const [frecuencia, setFrecuencia] = useState<'mensual' | 'semanal' | 'diario' | 'anual'>('mensual')
    const [metaCortes, setMetaCortes] = useState<string>(profesional.meta_cortes_mensual?.toString() || '100')

    const supabase = createClient()

    const fetchGastos = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('gastos')
                .select('*')
                .eq('barbero_id', profesional.id)
                .order('fecha_pago', { ascending: true })
            
            if (error) throw error
            setGastos(data || [])
        } catch (error) {
            console.error('Error fetching habits:', error)
            toast.error('Error al cargar gastos personales')
        } finally {
            setLoading(false)
        }
    }

    const fetchIncome = async () => {
        try {
            // Use same date format as Tablet Dashboard for consistency
            const startStr = format(startOfMonth(new Date()), 'yyyy-MM-dd')
            const endStr = format(endOfMonthDate(new Date()), 'yyyy-MM-dd')

            console.log(`📡 Fetching barber income for range: ${startStr} to ${endStr}`)

            const { data, error } = await supabase
                .from('vista_citas_app')
                .select('*')
                .eq('barbero_id', profesional.id)
                .eq('estado', 'finalizada')
                .gte('fecha_cita_local', startStr)
                .lte('fecha_cita_local', endStr)

            if (error) {
                console.error('❌ Supabase error fetching income:', JSON.stringify(error, null, 2))
                throw error
            }
            
            // If the view doesn't have comision_barbero, use the percentage from profesional profile
            const totalCommission = data?.reduce((sum, cita: any) => {
                const precio = cita.monto_pagado || cita.servicio_precio || 0
                const comision = cita.comision_barbero || (precio * (profesional.comision_porcentaje || 50) / 100)
                return sum + comision
            }, 0) || 0

            console.log(`💰 Calculated monthly income: ${totalCommission}`)
            setIncome(totalCommission)
        } catch (error: any) {
            console.error('❌ Detailed error fetching income:', error?.message || error)
        }
    }

    useEffect(() => {
        fetchGastos()
        fetchIncome()
    }, [profesional.id])

    const resetForm = () => {
        setDescripcion('')
        setMonto('')
        setFechaPago(new Date())
        setEsRecurrente(false)
        setFrecuencia('mensual')
        setPagado(false)
        setEditingGasto(null)
    }

    const handleEditClick = (gasto: Gasto) => {
        setEditingGasto(gasto)
        setDescripcion(gasto.descripcion)
        setMonto(gasto.monto.toString())
        setFechaPago(new Date(gasto.fecha_pago))
        setEsRecurrente(gasto.es_recurrente)
        setFrecuencia((gasto.frecuencia as any) || 'mensual')
        setPagado(gasto.pagado)
        setIsDialogOpen(true)
    }

    const handleSaveGasto = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!descripcion || !monto) return

        const gastoData = {
            barbero_id: profesional.id,
            sucursal_id: profesional.sucursal_id,
            descripcion,
            monto: parseFloat(monto),
            fecha_pago: fechaPago?.toISOString() || new Date().toISOString(),
            es_recurrente: esRecurrente,
            frecuencia: esRecurrente ? frecuencia : null,
            pagado: pagado
        }

        try {
            if (editingGasto) {
                const { error } = await (supabase.from('gastos') as any)
                    .update(gastoData)
                    .eq('id', editingGasto.id)
                if (error) throw error
                toast.success('Gasto actualizado')
            } else {
                const { error } = await (supabase.from('gastos') as any)
                    .insert([gastoData])
                if (error) throw error
                toast.success('Gasto registrado')
            }
            setIsDialogOpen(false)
            resetForm()
            fetchGastos()
        } catch (error) {
            console.error('Error saving gasto:', error)
            toast.error('Error al guardar el gasto')
        }
    }

    const handlePayGasto = async (id: string) => {
        try {
            const { error } = await (supabase.from('gastos') as any)
                .update({ pagado: true })
                .eq('id', id)
            
            if (error) throw error
            toast.success('Gasto marcado como PAGADO')
            fetchGastos()
        } catch (error) {
            console.error('Error paying gasto:', error)
            toast.error('Error al procesar el pago')
        }
    }

    const handleDeleteGasto = async (id: string) => {
        if (!confirm('¿Eliminar este gasto?')) return
        try {
            const { error } = await supabase.from('gastos').delete().eq('id', id)
            if (error) throw error
            toast.success('Gasto eliminado')
            fetchGastos()
        } catch (error) {
            console.error('Error deleting gasto:', error)
            toast.error('Error al eliminar')
        }
    }

    const handleUpdateMeta = async () => {
        try {
            const val = parseInt(metaCortes)
            const { error } = await (supabase.from('barberos') as any)
                .update({ meta_cortes_mensual: val })
                .eq('id', profesional.id)
            if (error) throw error
            toast.success('Meta actualizada')
        } catch (error) {
            console.error('Error updating meta:', error)
        }
    }

    // Calculations
    const metrics = useMemo(() => {
        const totalExpenses = gastos.reduce((sum, g) => sum + g.monto, 0)
        const totalPaid = gastos.filter(g => g.pagado).reduce((sum, g) => sum + g.monto, 0)
        const allPaid = gastos.length > 0 && gastos.every(g => g.pagado)
        
        const remaining = Math.max(0, totalExpenses - income)
        const profit = Math.max(0, income - totalExpenses)
        const progress = totalExpenses > 0 ? Math.min(100, (income / totalExpenses) * 100) : 100
        
        const comisionProfesional = profesional?.comision_porcentaje || 50
        const incomePerCut = 200 * (comisionProfesional / 100)
        const cutsNeeded = incomePerCut > 0 ? Math.ceil(remaining / incomePerCut) : 0

        return { totalExpenses, totalPaid, allPaid, remaining, profit, progress, cutsNeeded, incomePerCut }
    }, [gastos, income, profesional])

    const [isMounted, setIsMounted] = useState(false)
    useEffect(() => { 
        setIsMounted(true)
        setFechaPago(new Date())
    }, [])

    if (!isMounted) return null

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header de Navegación - Exact match with Metrics Dashboard */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onBack}
                        className="w-12 h-12 rounded-2xl bg-muted hover:bg-accent text-foreground/70 border border-border active:scale-95 transition-all shadow-sm"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                                <Wallet className="w-4 h-4 text-emerald-500" />
                            </div>
                            <h1 className="text-xl md:text-2xl font-black font-display tracking-tight uppercase text-foreground">Mis Finanzas</h1>
                        </div>
                        <p className="text-[10px] text-foreground/30 font-black uppercase tracking-[0.3em] mt-1.5 ml-11">Gestión de Gastos y Metas del {labels.professional}</p>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-3 bg-foreground/2 border border-foreground/5 p-3 rounded-2xl">
                    <div className="text-right mr-3">
                        <p className="text-[9px] font-black text-foreground/20 uppercase tracking-widest leading-none mb-1">Sesión Activa</p>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-tight leading-none">{profesional?.nombre}</p>
                    </div>
                    <div className="h-8 w-[1px] bg-foreground/10" />
                    <Badge variant="outline" className="bg-emerald-500/5 text-emerald-500 border-emerald-500/20 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest select-none">
                        Online
                    </Badge>
                </div>
            </div>

            {/* Meta control and new expense section - refined to be secondary */}
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-card border border-border p-8 rounded-[2.5rem] relative overflow-hidden group">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 shadow-inner">
                        <Calculator className="text-primary w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-foreground uppercase tracking-tight leading-none">
                            Punto de <span className="text-primary">Equilibrio</span>
                        </h2>
                        <p className="text-foreground/20 text-[9px] font-black uppercase tracking-[0.3em] mt-2">
                            Análisis de Gastos y Metas
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <Label className="text-[10px] text-foreground/30 uppercase font-black mb-1">Meta de Cortes</Label>
                        <div className="flex items-center gap-2">
                            <Input 
                                type="number" 
                                value={metaCortes} 
                                onChange={(e) => setMetaCortes(e.target.value)}
                                className="w-20 h-8 bg-foreground/5 border-foreground/10 text-xs text-center font-black"
                            />
                            <Button size="sm" variant="outline" className="h-8 border-primary/20 text-primary hover:bg-primary/10" onClick={handleUpdateMeta}>
                                <Target className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                    
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger
                            render={
                                <Button className="bg-primary text-black font-black uppercase tracking-tighter shadow-lg shadow-primary/20 h-11 px-6 rounded-xl">
                                    <Plus className="w-5 h-5 mr-2" />
                                    Nuevo Gasto
                                </Button>
                            }
                        />
                        <DialogContent className="bg-background border-border text-foreground">
                            <form onSubmit={handleSaveGasto} className="space-y-6 p-2">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-black uppercase text-primary">
                                        {editingGasto ? 'Editar Gasto' : 'Registrar Gasto Personal'}
                                    </DialogTitle>
                                    <DialogDescription className="text-foreground/40 uppercase text-[10px] font-bold">
                                        Detalla tus salidas de dinero para calcular tu punto de equilibrio
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-foreground/30">Descripción</Label>
                                        <Input 
                                            value={descripcion} 
                                            onChange={(e) => setDescripcion(e.target.value)}
                                            placeholder="Ej: Renta, Comida, Insumos"
                                            className="bg-muted border-border"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-foreground/30">Monto (MXN)</Label>
                                            <Input 
                                                type="number"
                                                value={monto}
                                                onChange={(e) => setMonto(e.target.value)}
                                                placeholder="0.00"
                                                className="bg-muted border-border"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-foreground/30">Fecha de Pago</Label>
                                            <div className="relative">
                                                <Input 
                                                    type="date"
                                                    value={fechaPago ? format(fechaPago, 'yyyy-MM-dd') : ''}
                                                    onChange={(e) => setFechaPago(new Date(e.target.value + 'T12:00:00'))}
                                                    className="bg-muted border-border text-xs"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-foreground/30">Es Recurrente?</Label>
                                            <div className="flex items-center gap-2 h-10">
                                                <Switch checked={esRecurrente} onCheckedChange={setEsRecurrente} />
                                                <span className="text-[10px] text-foreground/40 font-bold uppercase">{esRecurrente ? 'SÍ' : 'NO'}</span>
                                            </div>
                                        </div>
                                        {esRecurrente && (
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-foreground/30">Frecuencia</Label>
                                                <Select value={frecuencia} onValueChange={(val: any) => setFrecuencia(val)}>
                                                    <SelectTrigger className="bg-muted border-border text-xs h-10">
                                                        <SelectValue placeholder="Frecuencia" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-background border-border text-foreground">
                                                        <SelectItem value="diario">Diario</SelectItem>
                                                        <SelectItem value="semanal">Semanal</SelectItem>
                                                        <SelectItem value="mensual">Mensual</SelectItem>
                                                        <SelectItem value="anual">Anual</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-2">
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted border border-border">
                                            <div className="space-y-0.5">
                                                <Label className="text-[10px] font-black uppercase text-foreground">¿Ya está pagado?</Label>
                                                <p className="text-[9px] text-foreground/30 uppercase">Marca si ya realizaste el desembolso</p>
                                            </div>
                                            <Switch checked={pagado} onCheckedChange={setPagado} />
                                        </div>
                                    </div>
                                </div>

                                <DialogFooter className="gap-2">
                                    <Button type="button" variant="ghost" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" className="bg-primary text-black font-black uppercase shadow-lg shadow-primary/20">
                                        {editingGasto ? 'Actualizar' : 'Guardar Gasto'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="relative p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl overflow-hidden group">
                    <CardContent className="p-0">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400/50">Ingresos (Comisión)</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-foreground">${income.toLocaleString()}</span>
                            <span className="text-[10px] text-foreground/20 uppercase font-black">Este Mes</span>
                        </div>
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <DollarSign className="w-16 h-16 text-emerald-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="relative p-6 bg-red-500/10 border border-red-500/20 rounded-3xl overflow-hidden group">
                    <CardContent className="p-0">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-red-400/50">Gastos Registrados</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-black text-foreground">${metrics.totalExpenses.toLocaleString()}</span>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[8px] border-red-500/30 text-red-400 uppercase font-bold">
                                    {gastos.length} Items ({gastos.filter(g => g.pagado).length} Pagados)
                                </Badge>
                                <span className="text-[10px] text-foreground/40 font-bold uppercase tracking-tighter">
                                    Liquidado: ${metrics.totalPaid.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className={`relative p-6 rounded-3xl overflow-hidden group ${metrics.remaining === 0 && metrics.allPaid ? 'bg-emerald-500/10 border-emerald-500/30 shadow-emerald-500/10' : 'bg-primary/10 border-primary/30 shadow-primary/5'}`}>
                    <CardContent className="p-0 relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-2 rounded-lg border ${metrics.remaining === 0 && metrics.allPaid ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-primary/20 text-primary border-primary/30'}`}>
                                {metrics.remaining === 0 && metrics.allPaid ? <TrendingUp className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${metrics.remaining === 0 && metrics.allPaid ? 'text-emerald-400/70' : 'text-primary/70'}`}>
                                {metrics.remaining === 0 && metrics.allPaid ? 'Ganancia Libre (Profit)' : 'Meta p/ Punto Equilibrio'}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-black text-foreground">
                                ${metrics.remaining === 0 && metrics.allPaid ? metrics.profit.toLocaleString() : metrics.remaining.toLocaleString()}
                            </span>
                            
                            {gastos.length === 0 ? (
                                <div className="space-y-2 mt-2">
                                    <p className="text-sm font-black text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                                        <CheckCircle2 className="w-4 h-4" /> Sin gastos registrados
                                    </p>
                                    <div className="bg-emerald-500/10 p-2 rounded-md border border-emerald-500/20">
                                        <p className="text-[10px] font-medium text-emerald-400/80 leading-relaxed uppercase tracking-tight">
                                            Aún no has registrado compromisos este mes.
                                            <br />
                                            <span className="text-foreground font-bold">Todo tu ingreso es ganancia: ${metrics.profit.toLocaleString()}</span>
                                        </p>
                                    </div>
                                </div>
                            ) : metrics.remaining > 0 ? (
                                <div className="space-y-2 mt-2">
                                    <p className="text-xs font-black text-primary flex items-center gap-1.5 uppercase tracking-wide">
                                        <Clock className="w-4 h-4" /> Faltan ~{metrics.cutsNeeded} servicios por realizar
                                    </p>
                                    <div className="bg-card/20 p-2 rounded-md border border-foreground/5">
                                        <p className="text-[10px] font-medium text-foreground/50 leading-relaxed uppercase tracking-tight">
                                            Basado en servicio <span className="text-foreground font-bold">Base $200</span>
                                            <br />
                                            Ingreso real por servicio ({profesional.comision_porcentaje}%): <span className="text-primary font-bold">${metrics.incomePerCut}</span>
                                        </p>
                                    </div>
                                </div>
                            ) : !metrics.allPaid ? (
                                <div className="space-y-2 mt-2">
                                    <p className="text-xs font-black text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
                                        <AlertTriangle className="w-4 h-4" /> ¡Ingresos suficientes! Falta pagar gastos
                                    </p>
                                    <div className="bg-amber-500/10 p-2 rounded-md border border-amber-500/20">
                                        <p className="text-[10px] font-medium text-amber-400/80 leading-relaxed uppercase tracking-tight">
                                            Has generado lo necesario para cubrir tus gastos, pero aún tienes facturas pendientes de pago en tu lista.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2 mt-2">
                                    <p className="text-sm font-black text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                                        <CheckCircle2 className="w-4 h-4" /> ¡Punto de equilibrio superado!
                                    </p>
                                    <div className="bg-emerald-500/10 p-2 rounded-md border border-emerald-500/20">
                                        <p className="text-[10px] font-medium text-emerald-400/80 leading-relaxed uppercase tracking-tight">
                                            Todos tus gastos mensuales han sido cubiertos y liquidados.
                                            <br />
                                            <span className="text-foreground font-bold">Dinero libre para ti: ${metrics.profit.toLocaleString()}</span>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Progress Bar */}
                        <div className="mt-4 space-y-1.5">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                                <span className={metrics.remaining === 0 && metrics.allPaid ? "text-emerald-400" : "text-foreground/40"}>Progreso Financiero</span>
                                <span className={metrics.remaining === 0 && metrics.allPaid ? "text-emerald-400" : "text-foreground"}>
                                    {metrics.remaining === 0 && metrics.allPaid ? 'OBJETIVO CUMPLIDO' : `${Math.round(metrics.progress)}%`}
                                </span>
                            </div>
                            <Progress value={metrics.progress} className={`h-2 bg-muted ${metrics.remaining === 0 && metrics.allPaid ? '[&>div]:bg-emerald-500' : ''}`} />
                        </div>
                    </CardContent>
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        {metrics.remaining === 0 && metrics.allPaid ? <TrendingUp className="w-16 h-16 text-emerald-400" /> : <ArrowUpRight className="w-16 h-16 text-primary" />}
                    </div>
                </Card>
            </div>

            {/* Expenses List */}
            <Card className="bg-card/40 border-foreground/5 rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-foreground/5 bg-foreground/5 py-4">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground/80 flex items-center gap-2">
                        Lista de Gastos Personales
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-foreground/5 border-b border-foreground/5">
                                <tr>
                                    <th className="px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30">Concepto</th>
                                    <th className="px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30 text-center">Frecuencia</th>
                                    <th className="px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30 text-center">Estado</th>
                                    <th className="px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30 text-right">Monto</th>
                                    <th className="px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-foreground/5">
                                {gastos.map((gasto) => (
                                    <tr key={gasto.id} className="hover:bg-foreground/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-foreground uppercase tracking-tight">{gasto.descripcion}</span>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <CalendarDays className="w-3 h-3 text-foreground/20" />
                                                    <span className="text-[10px] text-foreground/20 font-medium uppercase tracking-tighter">
                                                        {format(new Date(gasto.fecha_pago), 'PPP', { locale: es })}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {gasto.es_recurrente ? (
                                                <Badge className="bg-primary/10 text-primary border-primary/20 text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                                                    {gasto.frecuencia}
                                                </Badge>
                                            ) : (
                                                <span className="text-[10px] text-foreground/20 font-bold uppercase tracking-widest">Puntual</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {gasto.pagado ? (
                                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[8px] font-black uppercase tracking-widest">PAGADO</Badge>
                                            ) : (
                                                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[8px] font-black uppercase tracking-widest">PENDIENTE</Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-black text-foreground">${gasto.monto.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {!gasto.pagado && (
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="h-8 px-2 border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 flex items-center gap-1 text-[10px] font-black uppercase"
                                                        onClick={() => handlePayGasto(gasto.id)}
                                                    >
                                                        <Check className="w-3 h-3" /> PAGAR
                                                    </Button>
                                                )}
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    className="h-8 w-8 border-border bg-muted text-foreground/40 hover:text-primary hover:border-primary/40 hover:bg-primary/10"
                                                    onClick={() => handleEditClick(gasto)}
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    className="h-8 w-8 border-red-500/20 bg-red-500/5 text-red-400 hover:text-red-300 hover:border-red-500/40 hover:bg-red-500/10"
                                                    onClick={() => handleDeleteGasto(gasto.id)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {gastos.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-foreground/20 uppercase font-black tracking-widest text-[10px]">
                                            Sin gastos registrados este mes
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
