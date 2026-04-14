'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import type { CitaDesdeVista } from '@/lib/types'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    AreaChart,
    Area,
    PieChart,
    Pie
} from 'recharts'
import {
    ChevronLeft,
    BarChart3,
    TrendingUp,
    Timer,
    CheckCircle2,
    Target,
    AlertCircle,
    DollarSign,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Zap,
    Clock,
    Scissors
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { cn } from '@/lib/utils'

export default function TabletReportesPage() {
    const router = useRouter()
    const [barbero, setBarbero] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState<'hoy' | 'semana' | 'mes' | 'año'>('semana')
    const [citas, setCitas] = useState<CitaDesdeVista[]>([])
    const [cortes, setCortes] = useState<any[]>([])
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [activeRange, setActiveRange] = useState({ start: '', end: '' })
    const [legibleRange, setLegibleRange] = useState('')

    // Auth Check
    useEffect(() => {
        const checkAuth = async () => {
            const sessionStr = localStorage.getItem('profesional_session')
            if (!sessionStr) {
                router.push('/tablet/login')
                return
            }
            try {
                const session = JSON.parse(sessionStr)
                setBarbero(session)
                setLoading(false)
            } catch (e) {
                console.error('❌ Session parse error:', e)
                router.push('/tablet/login')
            }
        }
        checkAuth()
    }, [router])

    const fetchReportData = useCallback(async () => {
        if (!barbero) return
        setIsRefreshing(true)
        const supabase = createClient()

        let startDate = ''
        let endDate = ''

        const hoy = new Date()
        const hoyStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Hermosillo',
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(hoy) // YYYY-MM-DD local

        if (dateRange === 'hoy') {
            startDate = hoyStr
            endDate = hoyStr
        } else if (dateRange === 'semana') {
            const d = new Date()
            const day = d.getDay()
            const diff = d.getDate() - day + (day === 0 ? -6 : 1)
            const monday = new Date(d.setDate(diff))
            startDate = monday.toLocaleDateString('en-CA')
            const sunday = new Date(monday)
            sunday.setDate(monday.getDate() + 6)
            endDate = sunday.toLocaleDateString('en-CA')
        } else if (dateRange === 'mes') {
            const firstDay = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
            startDate = firstDay.toLocaleDateString('en-CA')
            const lastDay = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
            endDate = lastDay.toLocaleDateString('en-CA')
        } else if (dateRange === 'año') {
            const firstDay = new Date(hoy.getFullYear(), 0, 1)
            startDate = firstDay.toLocaleDateString('en-CA')
            const lastDay = new Date(hoy.getFullYear(), 11, 31)
            endDate = lastDay.toLocaleDateString('en-CA')
        }

        setActiveRange({ start: startDate, end: endDate })

        // Calculate Legible Range
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        const formatLegible = (dateStr: string) => {
            const [y, m, d] = dateStr.split('-').map(Number)
            const date = new Date(y, m - 1, d)
            const dayName = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][date.getDay()]
            return `${dayName} ${d} de ${months[m - 1]}`
        }

        if (dateRange === 'hoy') {
            setLegibleRange(formatLegible(startDate))
        } else if (dateRange === 'semana') {
            setLegibleRange(`${formatLegible(startDate)} - ${formatLegible(endDate)}`)
        } else if (dateRange === 'mes') {
            const [y, m] = startDate.split('-').map(Number)
            const monthLong = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][m - 1]
            setLegibleRange(`${monthLong} de ${y}`)
        } else if (dateRange === 'año') {
            const [y] = startDate.split('-').map(Number)
            setLegibleRange(`Año ${y}`)
        }

        const { data, error } = await supabase
            .from('vista_citas_app')
            .select('*')
            .eq('barbero_id', barbero.id)
            .eq('estado', 'finalizada')
            .gte('fecha_cita_local', startDate)
            .lte('fecha_cita_local', endDate)
            .order('timestamp_inicio_local', { ascending: true })

        if (data) setCitas(data as CitaDesdeVista[])

        // Fetch Cortes
        const { data: cortesData } = await supabase
            .from('cortes_turno' as any)
            .select('*')
            .eq('barbero_id', barbero.id)
            .gte('fecha_corte', startDate)
            .lte('fecha_corte', endDate)
            .order('fecha_corte', { ascending: true })

        if (cortesData) setCortes(cortesData)

        setIsRefreshing(false)
    }, [barbero, dateRange])

    useEffect(() => {
        if (!loading && barbero) {
            fetchReportData()
        }
    }, [loading, barbero, fetchReportData])

    // Advanced Calculations
    const metrics = useMemo(() => {
        // Solo tomamos citas finalizadas de días que tengan un corte de turno registrado
        const finalizadas = citas.filter(c => {
            if (c.estado !== 'finalizada') return false
            const dKey = c.fecha_cita_local || (c.timestamp_inicio_local ? c.timestamp_inicio_local.split('T')[0] : '')
            // Verificar si este día fue cerrado
            return cortes.some(corte => corte.fecha_corte === dKey && corte.tipo === 'diario')
        })

        // Finances
        const cash = finalizadas.filter(c => c.metodo_pago === 'efectivo').reduce((acc, c) => acc + (c.monto_pagado || c.servicio_precio || 0), 0)
        const transfer = finalizadas.filter(c => c.metodo_pago === 'transferencia').reduce((acc, c) => acc + (c.monto_pagado || c.servicio_precio || 0), 0)
        const card = finalizadas.filter(c => c.metodo_pago === 'tarjeta').reduce((acc, c) => acc + (c.monto_pagado || c.servicio_precio || 0), 0)
        const total = cash + transfer + card

        // Performance Time
        const withTime = finalizadas.filter(c => c.duracion_real_minutos !== null && c.duracion_real_minutos !== undefined)
        const globalAvgReal = withTime.length > 0
            ? Math.round(withTime.reduce((acc, c) => acc + (c.duracion_real_minutos || 0), 0) / withTime.length)
            : 0

        const globalAvgEst = withTime.length > 0
            ? Math.round(withTime.reduce((acc, c) => acc + (c.servicio_duracion || 0), 0) / withTime.length)
            : 0

        // Service Breakdown
        const serviceMap: Record<string, { totalReal: number, totalEst: number, countWithTime: number, totalCount: number, totalMoney: number }> = {}
        finalizadas.forEach(c => {
            const name = c.servicio_nombre || 'General'
            if (!serviceMap[name]) serviceMap[name] = { totalReal: 0, totalEst: 0, countWithTime: 0, totalCount: 0, totalMoney: 0 }

            serviceMap[name].totalMoney += (c.monto_pagado || c.servicio_precio || 0)
            serviceMap[name].totalCount += 1

            if (c.duracion_real_minutos) {
                serviceMap[name].totalReal += c.duracion_real_minutos
                serviceMap[name].totalEst += c.servicio_duracion || 0
                serviceMap[name].countWithTime += 1
            }
        })

        const serviceStats = Object.entries(serviceMap).map(([name, data]) => ({
            name,
            avgReal: data.countWithTime > 0 ? Math.round(data.totalReal / data.countWithTime) : 0,
            avgEst: data.countWithTime > 0 ? Math.round(data.totalEst / data.countWithTime) : 0,
            count: data.totalCount, // Now shows total services
            countWithTime: data.countWithTime, // Added this field
            income: data.totalMoney,
            efficiency: data.countWithTime > 0 ? Math.round((data.totalEst / data.totalReal) * 100) : 100
        })).sort((a, b) => b.income - a.income)

        // Trends (by day)
        const dayMap: Record<string, { name: string, total: number, count: number }> = {}
        const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

        if (dateRange === 'semana' && activeRange.start) {
            // Initialize week days
            const start = new Date(activeRange.start + 'T12:00:00')
            for (let i = 0; i < 7; i++) {
                const cur = new Date(start)
                cur.setDate(start.getDate() + i)
                const dKey = cur.toLocaleDateString('en-CA')
                dayMap[dKey] = { name: days[cur.getDay()], total: 0, count: 0 }
            }
        }

        finalizadas.forEach(c => {
            const dKey = c.fecha_cita_local || ''
            if (!dKey) return
            if (!dayMap[dKey]) {
                const d = new Date(dKey + 'T12:00:00')
                dayMap[dKey] = { name: d.getDate().toString(), total: 0, count: 0 }
            }
            dayMap[dKey].total += (c.monto_pagado || c.servicio_precio || 0)
            dayMap[dKey].count += 1
        })

        const chartData = Object.entries(dayMap).map(([date, data]) => ({
            date,
            label: data.name,
            total: data.total,
            count: data.count
        })).sort((a, b) => a.date.localeCompare(b.date))

        // Payment Distribution
        const paymentData = [
            { name: 'Efectivo', value: cash, color: '#3b82f6' },
            { name: 'Transferencia', value: transfer + card, color: '#a855f7' }
        ].filter(p => p.value > 0)

        const comision_porcentaje = barbero?.comision_porcentaje ?? 50
        const comision_estimada = total * (comision_porcentaje / 100)

        // Corte Analysis Data
        const getCortesData = () => {
            if (!activeRange.start || dateRange === 'hoy') return []

            const today = new Date()
            today.setHours(0, 0, 0, 0)

            if (dateRange === 'semana') {
                const days = []
                const start = new Date(activeRange.start + 'T12:00:00')
                for (let i = 0; i < 7; i++) {
                    const d = new Date(start)
                    d.setDate(d.getDate() + i)
                    
                    const dNormalized = new Date(d)
                    dNormalized.setHours(0, 0, 0, 0)
                    const isToday = today.getTime() === dNormalized.getTime()
                    const isFuture = dNormalized > today

                    const iso = d.toISOString().split('T')[0]
                    const corte = cortes.find(c => c.fecha_corte === iso)
                    days.push({
                        label: d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }),
                        monto: corte ? corte.comision_barbero : null,
                        bruto: corte ? corte.monto_bruto : null,
                        servicios: corte ? corte.total_servicios : null,
                        realizado: !!corte,
                        esActual: isToday,
                        esFutura: isFuture
                    })
                }
                return days
            }

            if (dateRange === 'mes') {
                const weeks = []
                const start = new Date(activeRange.start + 'T12:00:00')
                const end = new Date(activeRange.end + 'T12:00:00')
                
                let current = new Date(start)
                let weekNum = 1
                while (current <= end) {
                    const weekStart = new Date(current)
                    const weekEnd = new Date(current)
                    weekEnd.setDate(weekEnd.getDate() + 6)
                    if (weekEnd > end) weekEnd.setTime(end.getTime())

                    const wsNormalized = new Date(weekStart)
                    wsNormalized.setHours(0, 0, 0, 0)
                    const weNormalized = new Date(weekEnd)
                    weNormalized.setHours(23, 59, 59, 999)

                    const esSemanaActual = today >= wsNormalized && today <= weNormalized
                    const esSemanaFutura = today < wsNormalized

                    const weekCortes = cortes.filter(c => {
                        const d = new Date(c.fecha_corte + 'T12:00:00')
                        return d >= weekStart && d <= weekEnd
                    })

                    const allDaysInWeekProcessed = (() => {
                        const daysInWeek = Math.round((weekEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
                        return weekCortes.length >= daysInWeek
                    })()

                    weeks.push({
                        label: `Semana ${weekNum}`,
                        periodo: `${weekStart.getDate()} - ${weekEnd.getDate()} ${weekEnd.toLocaleDateString('es-MX', { month: 'short' })}`,
                        monto: weekCortes.length > 0 ? weekCortes.reduce((acc, c) => acc + c.comision_barbero, 0) : null,
                        bruto: weekCortes.length > 0 ? weekCortes.reduce((acc, c) => acc + c.monto_bruto, 0) : null,
                        servicios: weekCortes.reduce((acc, c) => acc + c.total_servicios, 0),
                        realizado: weekCortes.length > 0,
                        completo: allDaysInWeekProcessed,
                        esActual: esSemanaActual,
                        esFutura: esSemanaFutura
                    })

                    current.setDate(current.getDate() + 7)
                    weekNum++
                }
                return weeks
            }

            if (dateRange === 'año') {
                const months = []
                const year = new Date(activeRange.start + 'T12:00:00').getFullYear()
                const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
                for (let m = 0; m < 12; m++) {
                    const monthStart = new Date(year, m, 1)
                    const monthEnd = new Date(year, m + 1, 0)

                    const msNorm = new Date(monthStart)
                    msNorm.setHours(0, 0, 0, 0)
                    const meNorm = new Date(monthEnd)
                    meNorm.setHours(23, 59, 59, 999)

                    const esMesActual = today >= msNorm && today <= meNorm
                    const esMesFuturo = today < msNorm

                    const startIso = monthStart.toLocaleDateString('en-CA')
                    const endIso = monthEnd.toLocaleDateString('en-CA')

                    const monthCortes = cortes.filter(c => c.fecha_corte >= startIso && c.fecha_corte <= endIso)

                    months.push({
                        label: monthNames[m],
                        periodo: `${monthStart.getDate()} - ${monthEnd.getDate()} ${monthNames[m].slice(0, 3)}`,
                        monto: monthCortes.length > 0 ? monthCortes.reduce((acc, c) => acc + c.comision_barbero, 0) : null,
                        bruto: monthCortes.length > 0 ? monthCortes.reduce((acc, c) => acc + c.monto_bruto, 0) : null,
                        servicios: monthCortes.reduce((acc, c) => acc + c.total_servicios, 0),
                        realizado: monthCortes.length > 0,
                        completo: !esMesActual && !esMesFuturo,
                        esActual: esMesActual,
                        esFutura: esMesFuturo
                    })
                }
                return months
            }
            return []
        }

        const cortesAnálisis = getCortesData()

        return {
            total,
            count: finalizadas.length,
            comision_porcentaje: barbero?.comision_porcentaje ?? 50,
            comision_estimada: total * ((barbero?.comision_porcentaje ?? 50) / 100),
            paymentData,
            chartData,
            serviceStats,
            globalAvgEst,
            globalAvgReal,
            cortesAnálisis
        }
    }, [citas, cortes, barbero, dateRange, activeRange])

    if (loading) return null

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/30">
            {/* Background elements */}
            <div className="fixed top-0 left-0 w-full h-1 bg-gradient-brand z-[60]" />

            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/95 border-b border-border/10 px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="w-10 h-10 rounded-2xl bg-foreground/5 hover:bg-foreground/10 text-foreground/70 border border-border active:scale-95 transition-all"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-blue-500" />
                            <h1 className="text-xl md:text-2xl font-black font-display tracking-tight uppercase">Dashboard Pro</h1>
                        </div>
                        <p className="text-[10px] text-foreground/30 font-black uppercase tracking-[0.3em] mt-0.5">Métricas de {barbero?.nombre}</p>
                    </div>
                </div>

                <div className="flex bg-muted p-1 rounded-2xl border border-border/10">
                    {(['hoy', 'semana', 'mes', 'año'] as const).map((r) => (
                        <Button
                            key={r}
                            variant="ghost"
                            onClick={() => setDateRange(r)}
                            className={cn(
                                "h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                dateRange === r
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                    : "text-foreground/40 hover:text-foreground hover:bg-foreground/5"
                            )}
                        >
                            {r}
                        </Button>
                    ))}
                </div>

                <div className="hidden md:flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2 bg-foreground/5 px-4 py-2 rounded-xl border border-border">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground/70">
                            {legibleRange}
                        </span>
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-tighter text-foreground/20">
                        {dateRange !== 'hoy' && "Datos recuperados hasta hoy"}
                    </span>
                </div>
            </header>

            {/* Mobile Range Indicator */}
            <div className="md:hidden bg-primary/10 border-b border-border px-6 py-3 flex flex-col gap-1">
                 <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-blue-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-foreground/50">
                        Periodo: <span className="text-foreground/90">{legibleRange}</span>
                    </span>
                 </div>
                 <span className="text-[7px] font-bold uppercase tracking-tighter text-foreground/20">
                    {dateRange !== 'hoy' && "Información acumulada hasta el día de hoy"}
                 </span>
            </div>

            <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 lg:p-12 relative z-10">
                <AnimatePresence mode="wait">
                    {isRefreshing ? (
                        <motion.div
                            key="loader"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-40"
                        >
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-foreground/5 border-t-blue-500 rounded-full animate-spin" />
                                <BarChart3 className="absolute inset-0 m-auto w-6 h-6 text-blue-500/50" />
                            </div>
                            <p className="mt-6 text-[10px] text-foreground/20 font-black uppercase tracking-[0.4em] animate-pulse">Sincronizando analítica</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-[1600px] mx-auto space-y-8 pb-20"
                        >
                            {/* Top row KPIs - Compacted to single row on LG */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                                <KPICard
                                    title="Ingresos Totales"
                                    value={`$${metrics.total.toLocaleString()}`}
                                    subtitle="Periodo acumulado"
                                    icon={<DollarSign className="w-5 h-5" />}
                                    color="blue"
                                />
                                <KPICard
                                    title={`Mi Comisión (${metrics.comision_porcentaje}%)`}
                                    value={`$${metrics.comision_estimada.toLocaleString()}`}
                                    subtitle="Estimado acumulado"
                                    icon={<Wallet className="w-5 h-5" />}
                                    color="purple"
                                />
                                <KPICard
                                    title="Servicios"
                                    value={metrics.count.toString()}
                                    subtitle="Finalizados con éxito"
                                    icon={<CheckCircle2 className="w-5 h-5" />}
                                    color="emerald"
                                />
                                <KPICard
                                    title="Promedio Real"
                                    value={`${metrics.globalAvgReal}m`}
                                    subtitle={`vs ${metrics.globalAvgEst}m estimado`}
                                    icon={<Timer className="w-5 h-5" />}
                                    color="amber"
                                    status={metrics.globalAvgReal > metrics.globalAvgEst ? "warning" : "success"}
                                />
                                <KPICard
                                    title="Eficiencia"
                                    value={`${metrics.globalAvgEst > 0 ? Math.round((metrics.globalAvgEst / metrics.globalAvgReal) * 100) : 100}%`}
                                    subtitle="Aprovechamiento de tiempo"
                                    icon={<TrendingUp className="w-5 h-5" />}
                                    color="purple"
                                />
                            </div>

                            {/* Main Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                 <Card className="lg:col-span-2 bg-card border-border/10 rounded-[2rem] overflow-hidden group flex flex-col">
                                    <CardHeader className="p-8 border-b border-border/10 bg-foreground/5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-lg font-black uppercase tracking-widest text-foreground/90">Análisis de Cortes</CardTitle>
                                                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-foreground/20">
                                                    {dateRange === 'semana' ? 'Desglose diario por cierres confirmados' : dateRange === 'año' ? 'Resumen mensual del año' : 'Desglose semanal de actividad'}
                                                </CardDescription>
                                            </div>
                                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
                                                <BarChart3 className="w-6 h-6" />
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0 flex-1 overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="border-border/5 hover:bg-transparent">
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-foreground/20 px-8 h-12">{dateRange === 'semana' ? 'Día' : dateRange === 'año' ? 'Mes' : 'Semana'}</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-foreground/20 h-12">Estado / Periodo</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-foreground/20 h-12 text-right px-8">Tu Comisión</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {metrics.cortesAnálisis.length === 0 ? (
                                                     <TableRow>
                                                        <TableCell colSpan={3} className="h-40 text-center">
                                                            <div className="flex flex-col items-center gap-2 opacity-20">
                                                                <AlertCircle className="w-8 h-8" />
                                                                <p className="text-[10px] font-black uppercase tracking-widest">Sin datos de corte para este periodo</p>
                                                            </div>
                                                        </TableCell>
                                                     </TableRow>
                                                ) : metrics.cortesAnálisis.map((item: any, i: number) => (
                                                    <TableRow key={i} className={cn("border-border/5 hover:bg-foreground/[0.01] transition-colors h-16", item.esActual && "bg-primary/5 hover:bg-primary/10 relative")}>
                                                        <TableCell className="px-8 flex flex-col justify-center h-16 relative">
                                                            {item.esActual && (
                                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                                                            )}
                                                            <div className="flex items-center gap-2">
                                                                <span className={cn("text-xs font-black uppercase", item.esActual ? "text-primary" : "text-foreground")}>{item.label}</span>
                                                                {item.esActual && <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[8px] font-black uppercase tracking-widest animate-pulse">Actual</span>}
                                                            </div>
                                                            {item.periodo && <span className="text-[9px] font-bold text-foreground/20 uppercase tracking-tighter mt-0.5">{item.periodo}</span>}
                                                        </TableCell>
                                                        <TableCell>
                                                            {item.esFutura ? (
                                                                <div className="flex items-center gap-2 opacity-40">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{dateRange === 'semana' ? 'Aún no llega' : dateRange === 'año' ? 'Próximos meses' : 'Próximos días'}</span>
                                                                </div>
                                                            ) : item.realizado ? (
                                                                <div className="flex items-center gap-2">
                                                                    <div className={cn(
                                                                        "w-1.5 h-1.5 rounded-full",
                                                                        item.completo !== false ? "bg-emerald-500" : "bg-amber-500"
                                                                    )} />
                                                                    <span className={cn("text-[10px] font-black uppercase tracking-widest", item.completo !== false ? "text-foreground/60" : "text-amber-500/80")}>
                                                                        {item.completo !== false ? 'Corte Finalizado' : 'Corte Parcial/Pendiente'}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 opacity-40">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest italic">Corte no realizado</span>
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right px-8">
                                                            <span className={cn(
                                                                "text-sm font-black italic",
                                                                (item.realizado || item.esActual) && !item.esFutura ? "text-primary" : "text-foreground/10"
                                                            )}>
                                                                {(item.realizado || (!item.esFutura && item.monto > 0)) ? `$${(item.monto || 0).toLocaleString()}` : '$0'}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>

                                 <Card className="bg-card border-border/10 rounded-[2rem] overflow-hidden">
                                    <CardHeader className="p-8 border-b border-border/10">
                                        <CardTitle className="text-lg font-black uppercase tracking-widest text-foreground/90 text-center text-ellipsis">Métodos de Pago</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-8 flex flex-col items-center justify-center h-[350px]">
                                        <div className="h-full w-full relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={metrics.paymentData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={80}
                                                        outerRadius={100}
                                                        paddingAngle={10}
                                                        dataKey="value"
                                                        animationDuration={0}
                                                        isAnimationActive={false}
                                                    >
                                                        {metrics.paymentData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                <span className="text-[10px] font-black text-foreground/20 uppercase tracking-widest">Total</span>
                                                <span className="text-3xl font-black font-display text-foreground">${metrics.total.toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-6 mt-4">
                                            {metrics.paymentData.map((p, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                                    <span className="text-[10px] font-black uppercase text-foreground/60">{p.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Detailed Service Analytics — hidden on 'año' view */}
                            {dateRange !== 'año' && <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 px-2">
                                        <div className="h-1 w-8 bg-primary rounded-full" />
                                        <h2 className="text-sm font-black text-foreground/50 uppercase tracking-[0.4em] font-display">Análisis Detallado por Servicio</h2>
                                        <div className="flex-1 h-[1px] bg-foreground/5" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {metrics.serviceStats.length === 0 ? (
                                            <div className="col-span-full py-20 text-center border border-dashed border-border/10 rounded-[2rem] bg-foreground/[0.01]">
                                                <Zap className="w-12 h-12 text-foreground/5 mx-auto mb-4" />
                                                <p className="text-foreground/20 font-black uppercase tracking-[0.2em] text-xs">Aún no hay datos detallados registrados</p>
                                            </div>
                                        ) : metrics.serviceStats.map((s, idx) => {
                                            const isOver = s.avgReal > s.avgEst
                                            const diff = Math.abs(s.avgReal - s.avgEst)

                                            return (
                                                <motion.div
                                                    key={idx}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: idx * 0.1 }}
                                                     className="bg-foreground/[0.03] border border-border/5 rounded-[2rem] p-6 hover:bg-foreground/[0.05] transition-all group overflow-hidden relative"
                                                >
                                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                        <Scissors className="w-20 h-20" />
                                                    </div>

                                                    <div className="flex justify-between items-start mb-6">
                                                        <div className="flex flex-col gap-1">
                                                            <h3 className="text-base font-black text-foreground group-hover:text-primary transition-colors uppercase tracking-tight">{s.name}</h3>
                                                            <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">
                                                                {s.count} total • {s.countWithTime} con tiempo
                                                            </p>
                                                        </div>
                                                        <div className="bg-foreground/5 px-3 py-1.5 rounded-xl border border-border">
                                                            <span className="text-xs font-black text-foreground">${s.income.toLocaleString()}</span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-6">
                                                        <div className="flex justify-between items-end">
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] font-black text-foreground/20 uppercase tracking-widest mb-1">Target vs Real</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xl font-black font-display text-foreground/80">{s.avgEst}m</span>
                                                                    <div className="w-1 h-1 rounded-full bg-foreground/10" />
                                                                    <span className={cn(
                                                                        "text-xl font-black font-display",
                                                                        isOver ? "text-orange-400" : "text-emerald-400"
                                                                    )}>{s.avgReal}m</span>
                                                                </div>
                                                            </div>
                                                            <Badge variant="outline" className={cn(
                                                                "h-6 px-3 border-none",
                                                                isOver ? "bg-orange-400/10 text-orange-400" : "bg-emerald-400/10 text-emerald-400"
                                                            )}>
                                                                {isOver ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                                                                <span className="text-[9px] font-black uppercase">{isOver ? `+${diff}m` : 'Optimizado'}</span>
                                                            </Badge>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                                                <span className="text-foreground/20">Eficiencia de tiempo</span>
                                                                <span className={isOver ? "text-orange-400" : "text-emerald-400"}>{s.efficiency}%</span>
                                                            </div>
                                                            <Progress
                                                                value={Math.min(100, s.efficiency)}
                                                                className="h-1.5 bg-foreground/5"
                                                                indicatorClassName={isOver ? "bg-orange-400" : "bg-emerald-400"}
                                                            />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>}

                            {/* Detailed CRM Log — hidden on 'año' view */}
                            {dateRange !== 'año' &&
                            <div className="mt-12 space-y-6">
                                <div className="flex items-center gap-4 px-2">
                                    <div className="h-1 w-8 bg-purple-500 rounded-full" />
                                    <h2 className="text-sm font-black text-foreground/50 uppercase tracking-[0.4em] font-display">Log Detallado y Notas CRM</h2>
                                    <div className="flex-1 h-[1px] bg-foreground/5" />
                                </div>

                                <Card className="bg-card border-border/10 rounded-[2rem] overflow-hidden">
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader className="bg-foreground/[0.02]">
                                                    <TableRow className="hover:bg-transparent border-border/10">
                                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-foreground/30 h-14 px-6">Cliente / Fecha</TableHead>
                                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-foreground/30 h-14">Servicio</TableHead>
                                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-foreground/30 h-14 text-right">Monto</TableHead>
                                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-foreground/30 h-14">Tiempo Real</TableHead>
                                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-foreground/30 h-14 px-6">Observaciones CRM</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {citas.map((cita) => (
                                                        <TableRow key={cita.id} className="border-border/10 hover:bg-foreground/[0.02] transition-colors">
                                                            <TableCell className="px-6 py-4">
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-black text-foreground/90 uppercase tracking-tight">{cita.cliente_nombre}</span>
                                                                    <span className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">
                                                                        {new Date(cita.fecha_cita_local + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="bg-blue-500/5 border-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-widest h-5">
                                                                    {cita.servicio_nombre}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right font-black text-emerald-400 text-xs px-4">
                                                                ${(cita.monto_pagado || cita.servicio_precio || 0).toLocaleString()}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex flex-col">
                                                                    <span className={cn(
                                                                        "text-xs font-black font-display",
                                                                        cita.duracion_real_minutos ? "text-foreground/80" : "text-foreground/10"
                                                                    )}>
                                                                        {cita.duracion_real_minutos ? `${cita.duracion_real_minutos} min` : '--'}
                                                                    </span>
                                                                    <span className="text-[9px] font-bold text-foreground/20 uppercase">Est: {cita.servicio_duracion}m</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="px-6 py-4">
                                                                <div className="flex flex-col gap-2 max-w-md">
                                                                    {cita.notas_crm && (
                                                                        <div className="group relative">
                                                                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg blur opacity-25 group-hover:opacity-40 transition" />
                                                                            <div className="relative bg-muted border border-primary/20 rounded-lg p-3">
                                                                                <div className="flex items-center gap-2 mb-1">
                                                                                    <div className="w-1 h-1 rounded-full bg-primary" />
                                                                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary">Nota CRM</span>
                                                                                </div>
                                                                                <p className="text-[11px] text-foreground/70 font-medium leading-relaxed">{cita.notas_crm}</p>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {cita.notas && (
                                                                        <div className="bg-muted/30 border border-border/10 rounded-lg p-3">
                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                <div className="w-1 h-1 rounded-full bg-foreground/20" />
                                                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-foreground/30">Nota Interna</span>
                                                                            </div>
                                                                            <p className="text-[11px] text-foreground/40 italic leading-relaxed">"{cita.notas}"</p>
                                                                        </div>
                                                                    )}
                                                                    {!cita.notas_crm && !cita.notas && (
                                                                        <span className="text-[9px] font-black uppercase tracking-widest text-foreground/10 italic">Sin observaciones</span>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                    {citas.length === 0 && (
                                                        <TableRow>
                                                            <TableCell colSpan={5} className="h-40 text-center">
                                                                <div className="flex flex-col items-center gap-2 opacity-20">
                                                                    <Zap className="w-8 h-8" />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest">Sin registros disponibles</span>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Mobile Bottom Footer fix */}
            <div className="md:hidden h-20 w-full" />
        </div>
    )
}

interface KPICardProps {
    title: string
    value: string
    subtitle: string
    icon: React.ReactNode
    color: 'blue' | 'emerald' | 'amber' | 'purple'
    status?: 'success' | 'warning'
    trend?: string
}

function KPICard({ title, value, subtitle, icon, color, status, trend }: KPICardProps) {
    const variants = {
        blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    }
    const colorStyles = variants[color] || ""

    return (
        <Card className="bg-card border-border/10 rounded-2xl overflow-hidden group hover:bg-foreground/5 transition-all duration-500">
            <CardContent className="p-3 md:p-4">
                <div className="flex justify-between items-start mb-2">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center border", colorStyles)}>
                        {React.cloneElement(icon as any, { className: "w-3.5 h-3.5" })}
                    </div>
                    {trend && (
                        <div className="flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded-md text-emerald-500 text-[8px] font-black">
                            <ArrowUpRight className="w-2.5 h-2.5" />
                            {trend}
                        </div>
                    )}
                </div>
                <div className="space-y-0.5">
                    <p className="text-[8px] font-black text-foreground/30 uppercase tracking-[.15em] leading-tight">{title}</p>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xl md:text-2xl font-black font-display text-foreground tracking-tight">{value}</span>
                        {status === 'warning' && <AlertCircle className="w-3 h-3 text-orange-400" />}
                    </div>
                    <p className="text-[8px] font-bold text-foreground/15 uppercase tracking-wider truncate">{subtitle}</p>
                </div>
            </CardContent>
        </Card>
    )
}
