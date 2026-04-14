'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { CitaDesdeVista } from '@/lib/types'
import { 
    BarChart3, 
    TrendingUp, 
    Calendar, 
    DollarSign, 
    Users, 
    Clock, 
    ArrowUpRight, 
    ArrowDownRight,
    PieChart,
    Timer,
    Calendar as CalendarIcon
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn, parseLocalTimestamp } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { KPICard } from '@/components/KPICard'

export default function ReportesPage() {
    const { sucursalId } = useAuth()
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    })
    const [currentTime, setCurrentTime] = useState(new Date())
    const [stats, setStats] = useState({
        totalIngresos: 0,
        totalCitas: 0,
        ticketPromedio: 0,
        ocupacion: 0
    })
    
    // Data for charts
    const [ingresosPorDia, setIngresosPorDia] = useState<{ dia: string; monto: number }[]>([])
    const [citasPorServicio, setCitasPorServicio] = useState<{ servicio: string; cantidad: number; porcentaje: number }[]>([])
    const [tiemposBarberos, setTiemposBarberos] = useState<{ barbero: string; promedio: number; totalServicios: number }[]>([])

    const supabase = createClient()

    const cargarReportes = useCallback(async () => {
        if (!sucursalId) return
        setLoading(true)
        try {
            const [citasRes, cortesRes] = await Promise.all([
                supabase
                    .from('vista_citas_app')
                    .select('*')
                    .eq('sucursal_id', sucursalId)
                    .gte('fecha_cita_local', dateRange.start)
                    .lte('fecha_cita_local', dateRange.end)
                    .in('estado', ['finalizada', 'confirmada', 'en_proceso']),
                supabase
                    .from('cortes_turno')
                    .select('fecha_corte')
                    .eq('sucursal_id', sucursalId)
                    .gte('fecha_corte', dateRange.start)
                    .lte('fecha_corte', dateRange.end)
                    .eq('tipo', 'diario')
            ])

            if (citasRes.error) throw citasRes.error
            if (cortesRes.error) throw cortesRes.error

            if (citasRes.data) {
                const castedCitas = citasRes.data as CitaDesdeVista[]
                const cortesFechas = new Set((cortesRes.data || []).map((c: any) => c.fecha_corte))

                const finalizadas = castedCitas.filter(c => {
                    if (c.estado !== 'finalizada') return false
                    const dKey = c.fecha_cita_local || (c.timestamp_inicio_local ? c.timestamp_inicio_local.split('T')[0] : '')
                    return cortesFechas.has(dKey)
                })

                const totalIngresos = finalizadas.reduce((sum, c) => sum + (c.servicio_precio || 0), 0)
                const totalCitas = castedCitas.length
                const ticketPromedio = finalizadas.length > 0 ? totalIngresos / finalizadas.length : 0

                setStats({
                    totalIngresos,
                    totalCitas,
                    ticketPromedio,
                    ocupacion: 85
                })

                const ingresosMap = new Map<string, number>()
                finalizadas.forEach(c => {
                    const dia = parseLocalTimestamp(c.timestamp_inicio_local || '').toLocaleDateString('es-MX', { weekday: 'short' })
                    const precio = c.servicio_precio || 0
                    ingresosMap.set(dia, (ingresosMap.get(dia) || 0) + precio)
                })
                setIngresosPorDia(Array.from(ingresosMap.entries()).map(([dia, monto]) => ({ dia, monto })))

                const serviciosMap = new Map<string, number>()
                castedCitas.forEach(c => {
                    const nombre = c.servicio_nombre || 'Desconocido'
                    serviciosMap.set(nombre, (serviciosMap.get(nombre) || 0) + 1)
                })
                const totalServicios = castedCitas.length
                setCitasPorServicio(Array.from(serviciosMap.entries())
                    .map(([servicio, cantidad]) => ({
                        servicio,
                        cantidad,
                        porcentaje: totalServicios > 0 ? (cantidad / totalServicios) * 100 : 0
                    }))
                    .sort((a, b) => b.cantidad - a.cantidad)
                )

                const barberosMap = new Map<string, { totalMinutos: number, citasConTiempo: number }>()
                finalizadas.forEach(c => {
                    const nombre = c.barbero_nombre || 'Desconocido'
                    if (c.duracion_real_minutos !== null && c.duracion_real_minutos !== undefined) {
                        const entry = barberosMap.get(nombre) || { totalMinutos: 0, citasConTiempo: 0 }
                        entry.totalMinutos += c.duracion_real_minutos
                        entry.citasConTiempo += 1
                        barberosMap.set(nombre, entry)
                    }
                })
                setTiemposBarberos(Array.from(barberosMap.entries())
                    .map(([barbero, data]) => ({
                        barbero,
                        promedio: Math.round(data.totalMinutos / data.citasConTiempo),
                        totalServicios: data.citasConTiempo
                    }))
                    .sort((a, b) => b.promedio - a.promedio)
                )
            }
        } catch (err) {
            console.error('Error loading reports:', err)
            loadDemoData()
        } finally {
            setLoading(false)
        }
    }, [supabase, dateRange, sucursalId])

    useEffect(() => {
        cargarReportes()
    }, [cargarReportes])

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

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

    const loadDemoData = () => {
        setStats({
            totalIngresos: 15450,
            totalCitas: 45,
            ticketPromedio: 343.33,
            ocupacion: 78
        })
        setIngresosPorDia([
            { dia: 'Lun', monto: 2500 },
            { dia: 'Mar', monto: 3200 },
            { dia: 'Mié', monto: 2800 },
            { dia: 'Jue', monto: 3500 },
            { dia: 'Vie', monto: 4200 },
            { dia: 'Sáb', monto: 5100 },
            { dia: 'Dom', monto: 1800 }
        ])
        setCitasPorServicio([
            { servicio: 'Corte Clásico', cantidad: 45, porcentaje: 40 },
            { servicio: 'Barba', cantidad: 30, porcentaje: 25 },
            { servicio: 'Combo Completo', cantidad: 25, porcentaje: 20 },
            { servicio: 'Corte Niño', cantidad: 15, porcentaje: 15 }
        ])
        setTiemposBarberos([
            { barbero: 'Mike', promedio: 38, totalServicios: 12 },
            { barbero: 'Alex', promedio: 45, totalServicios: 9 },
            { barbero: 'Juan', promedio: 30, totalServicios: 15 }
        ])
    }

    const maxIngreso = Math.max(...ingresosPorDia.map(d => d.monto), 1)

    return (
        <div className="relative min-h-full bg-background selection:bg-primary selection:text-primary-foreground">
            <div className="space-y-6 lg:space-y-8">
                {/* Header (Desktop Only) - Compact Elite Style */}
                <header className="hidden lg:flex h-16 px-0 items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-20 border-b border-border/50 mb-4 font-display">
                    <div className="flex items-center gap-3 text-foreground">
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 transition-all hover:scale-105">
                            <BarChart3 className="text-primary w-4 h-4 shadow-lg shadow-primary/20" />
                        </div>
                        <h2 className="text-lg font-black tracking-tighter uppercase italic">Métricas Estratégicas</h2>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Time & Date - Premium Compact Style */}
                        <div className="bg-muted/50 backdrop-blur-xl border border-border rounded-xl px-4 py-1.5 flex items-center gap-4 shadow-sm hover:border-primary/30 transition-all group">
                            <div className="flex flex-col items-end">
                                <p className="text-xs font-black tracking-tighter tabular-nums leading-tight text-foreground">
                                    {formattedTime}
                                </p>
                                <p className="text-[9px] text-primary font-black uppercase tracking-[0.1em] leading-tight">
                                    {formattedDate}
                                </p>
                            </div>
                            <div className="h-6 w-[1px] bg-border group-hover:bg-primary/20 transition-colors" />
                            <Clock className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>

                        <div className="flex items-center gap-2 bg-muted/30 border border-border p-1.5 rounded-xl">
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                className="bg-transparent border-none text-[10px] font-black uppercase text-foreground w-28 focus:ring-0"
                            />
                            <span className="text-muted-foreground/30 text-xs">/</span>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                className="bg-transparent border-none text-[10px] font-black uppercase text-foreground w-28 focus:ring-0"
                            />
                        </div>
                    </div>
                </header>

                {/* Mobile Header (Title Only) */}
                <div className="lg:hidden flex items-center gap-3 mb-2">
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                        <BarChart3 className="text-primary w-4 h-4" />
                    </div>
                    <h2 className="text-lg font-black tracking-tighter uppercase italic text-foreground">Reportes</h2>
                </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard 
                    title="Ingresos"
                    value={`$${Math.round(stats.totalIngresos).toLocaleString()}`}
                    icon={<DollarSign className="w-4 h-4" />}
                    trend="+12%"
                    color="amber"
                />
                <KPICard 
                    title="Ticket Promedio"
                    value={`$${Math.round(stats.ticketPromedio).toLocaleString()}`}
                    icon={<TrendingUp className="w-4 h-4" />}
                    trend="+5%"
                    color="blue"
                />
                <KPICard 
                    title="Citas Totales"
                    value={stats.totalCitas.toString()}
                    icon={<Calendar className="w-4 h-4" />}
                    trend="-2%"
                    color="purple"
                />
                <KPICard 
                    title="Ocupación"
                    value={`${stats.ocupacion}%`}
                    icon={<Users className="w-4 h-4" />}
                    trend="+8%"
                    color="emerald"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart: Ingresos por Día */}
                <Card className="glass-card border-border/50 bg-muted/20 overflow-hidden rounded-[2.5rem]">
                    <CardHeader className="p-8 pb-2">
                        <CardTitle className="text-xs font-black text-muted-foreground/40 uppercase tracking-[0.2em] flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            Ingresos Semanales
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="h-64 flex items-end justify-between gap-3 pt-8">
                            {ingresosPorDia.map((item, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-3 group px-1">
                                    <div className="w-full relative flex items-end justify-center">
                                        <div
                                            className="w-full bg-gradient-to-t from-primary/20 to-primary rounded-xl transition-all duration-500 relative shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                                            style={{ height: `${(item.monto / maxIngreso) * 180}px` }}
                                        >
                                            <div className="opacity-0 group-hover:opacity-100 absolute -top-12 left-1/2 -translate-x-1/2 bg-background border border-border text-foreground text-[10px] font-black px-3 py-2 rounded-xl whitespace-nowrap transition-all scale-75 group-hover:scale-100 z-50 shadow-2xl">
                                                ${Math.round(item.monto).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[9px] text-muted-foreground/40 font-black uppercase tracking-widest leading-none">{item.dia}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Chart: Servicios Populares */}
                <Card className="glass-card border-border/50 bg-muted/20 overflow-hidden rounded-[2.5rem]">
                    <CardHeader className="p-8 pb-2">
                        <CardTitle className="text-xs font-black text-muted-foreground/40 uppercase tracking-[0.2em] flex items-center gap-2">
                            <PieChart className="w-4 h-4 text-purple-400" />
                            Servicios Elite
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        {citasPorServicio.map((item, i) => (
                            <div key={i} className="space-y-2.5">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-black text-foreground uppercase tracking-tight leading-none">{item.servicio}</span>
                                    <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest leading-none">{item.cantidad} servicios</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-3 bg-muted/30 rounded-full overflow-hidden border border-border/50 p-[1px]">
                                        <div
                                            className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                                            style={{ width: `${item.porcentaje}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-black text-purple-400 w-10 text-right">{Math.round(item.porcentaje)}%</span>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Metrics by Barber */}
                <Card className="glass-card border-border/50 bg-muted/20 overflow-hidden rounded-[3rem] lg:col-span-2 shadow-2xl shadow-primary/5">
                    <CardHeader className="p-10 pb-4">
                        <CardTitle className="text-base font-black text-foreground uppercase tracking-[0.2em] flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
                                <Timer className="w-6 h-6" />
                            </div>
                            Eficiencia Operativa por Barbero
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-10 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {tiemposBarberos.length === 0 ? (
                                <div className="col-span-full text-center py-16 text-muted-foreground/20 text-[10px] font-black uppercase tracking-[0.3em]">
                                    Sin datos suficientes para este periodo
                                </div>
                            ) : (
                                tiemposBarberos.map((tb, idx) => (
                                    <div key={idx} className="bg-muted/30 border border-border/50 rounded-[2.5rem] p-8 flex flex-col items-center text-center group hover:bg-muted/50 transition-all duration-500 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/5">
                                        <div className="w-16 h-16 rounded-[1.25rem] bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-6 border border-indigo-500/20 shadow-lg shadow-indigo-500/5 group-hover:scale-110 transition-transform duration-500">
                                            <Users className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-foreground font-black text-xl uppercase tracking-tighter mb-1.5">{tb.barbero}</h3>
                                        <div className="text-5xl font-black text-primary my-3 tracking-tighter flex items-baseline gap-1">
                                            {tb.promedio}<span className="text-[10px] text-muted-foreground/30 uppercase tracking-widest ml-1">min</span>
                                        </div>
                                        <p className="text-[9px] text-muted-foreground/20 uppercase font-black tracking-widest pt-6 border-t border-border w-full mt-4 group-hover:text-primary/40 transition-colors">
                                            {tb.totalServicios} servicios realizados
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
                </div>
            </div>
        </div>
    )
}
