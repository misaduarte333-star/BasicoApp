'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { getHermosilloDateStr, getHermosilloMins, getMinsFromHermosilloString } from '@/lib/utils'
import type { KPIs, CitaDesdeVista, Barbero, Sucursal, Bloqueo } from '@/lib/types'
import { useBusinessLabels } from '@/hooks/useBusinessLabels'

export default function AdminDashboard() {
    const { sucursalId } = useAuth()
    const { businessName, location, professionals } = useBusinessLabels()
    const [kpis, setKpis] = useState<KPIs>({
        citasHoy: 0,
        completadas: 0,
        ingresos: 0,
        noShows: 0
    })
    const [loading, setLoading] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date())

    const supabase = createClient()

    const [appointmentsToday, setAppointmentsToday] = useState<CitaDesdeVista[]>([])
    const [barberos, setBarberos] = useState<Barbero[]>([])
    const [bloqueosToday, setBloqueosToday] = useState<Bloqueo[]>([])

    const cargarDatos = useCallback(async () => {
        if (!sucursalId) return
        
        try {
            const hoy = getHermosilloDateStr()
            const startOfDay = `${hoy}T00:00:00-07:00`
            const endOfDay = `${hoy}T23:59:59-07:00`

            const [citasRes, barberosRes, bloqueosRes] = await Promise.all([
                supabase.from('citas_desde_vistas').select('*').eq('sucursal_id', sucursalId).gte('timestamp_inicio', startOfDay).lte('timestamp_inicio', endOfDay) as any,
                supabase.from('barberos').select('*').eq('sucursal_id', sucursalId).eq('activo', true).order('estacion_id') as any,
                supabase.from('bloqueos').select('*').eq('sucursal_id', sucursalId).gte('timestamp_inicio', startOfDay).lte('timestamp_inicio', endOfDay) as any
            ])

            if (citasRes.data) setAppointmentsToday(citasRes.data as CitaDesdeVista[])
            if (barberosRes.data) setBarberos(barberosRes.data)
            if (bloqueosRes.data) setBloqueosToday(bloqueosRes.data)

            // Calculate KPIs
            const completadas = citasRes.data?.filter((c: any) => c.estado === 'finalizada').length || 0
            const ingresos = citasRes.data?.filter((c: any) => c.estado === 'finalizada').reduce((acc: number, c: any) => acc + (c.monto_pagado || c.servicio_precio || 0), 0) || 0
            const noShows = citasRes.data?.filter((c: any) => c.estado === 'no_show').length || 0
            const total = citasRes.data?.length || 0

            setKpis({
                citasHoy: total,
                completadas,
                ingresos,
                noShows
            })

        } catch (error) {
            console.error('Error al cargar datos del dashboard:', error)
        } finally {
            setLoading(false)
        }
    }, [sucursalId, supabase])

    useEffect(() => {
        cargarDatos()
        const interval = setInterval(cargarDatos, 30000)
        return () => clearInterval(interval)
    }, [cargarDatos])

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    const derivedBarberStatuses = useMemo(() => {
        const nowMins = getHermosilloMins(currentTime)
        
        return barberos.map(barber => {
            // Un profesional está ocupado si tiene una cita 'en_proceso' o 'por_cobrar' ahora mismo
            const citaActiva = appointmentsToday.find(c => 
                c.barbero_id === barber.id && 
                (c.estado === 'en_proceso' || c.estado === 'por_cobrar')
            )

            // Un profesional está en descanso si hay un bloqueo vigente
            const bloqueoActivo = bloqueosToday.find(b => {
                const start = getMinsFromHermosilloString(b.timestamp_inicio)
                const end = getMinsFromHermosilloString(b.timestamp_fin)
                return b.barbero_id === barber.id && nowMins >= start && nowMins < end
            })

            return {
                ...barber,
                currentStatus: citaActiva ? 'ocupado' : (bloqueoActivo ? 'descanso' : 'disponible'),
                currentClient: citaActiva?.cliente_nombre || null
            }
        })
    }, [barberos, appointmentsToday, bloqueosToday, currentTime])

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Panel de Control</h1>
                    <p className="text-muted-foreground mt-1">Resumen general de {businessName}</p>
                </div>
                <div className="glass-card px-6 py-3 flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-2xl font-bold tabular-nums">
                            {currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest">
                            {currentTime.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                    </div>
                </div>
            </header>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Citas Hoy" value={kpis.citasHoy} icon="calendar" color="purple" />
                <KPICard title="Completadas" value={kpis.completadas} icon="check" color="green" />
                <KPICard title="Ingresos" value={`$${kpis.ingresos.toLocaleString()}`} icon="money" color="blue" />
                <KPICard title="No-Shows" value={kpis.noShows} icon="x" color="red" />
            </div>

            {/* Professional Status */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-foreground">Estado de {professionals}</h2>
                    <div className="flex gap-2">
                        <StatusBadge color="green" label="Disponible" />
                        <StatusBadge color="blue" label="Ocupado" />
                        <StatusBadge color="amber" label="Descanso" />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {derivedBarberStatuses.map(barber => (
                        <div key={barber.id} className="p-4 rounded-xl bg-surface border border-border/50 hover:border-primary/20 transition-all">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    {barber.estacion_id}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold truncate">{barber.nombre}</p>
                                    <p className="text-xs text-muted-foreground">{location} {barber.estacion_id}</p>
                                </div>
                            </div>
                            <div className={`
                                py-2 px-3 rounded-lg text-xs font-bold text-center
                                ${barber.currentStatus === 'disponible' ? 'bg-green-500/10 text-green-500' : ''}
                                ${barber.currentStatus === 'ocupado' ? 'bg-blue-500/10 text-blue-500' : ''}
                                ${barber.currentStatus === 'descanso' ? 'bg-amber-500/10 text-amber-500' : ''}
                            `}>
                                {barber.currentStatus === 'disponible' ? 'LIBRE' : 
                                 barber.currentStatus === 'ocupado' ? `EN CITA: ${barber.currentClient}` : 'EN DESCANSO'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function KPICard({ title, value, icon, color }: { title: string, value: string | number, icon: string, color: string }) {
    return (
        <div className="glass-card p-6 flex items-start justify-between group hover:border-primary/30 transition-all">
            <div>
                <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">{title}</p>
                <p className="text-3xl font-bold mt-2">{value}</p>
            </div>
            <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-400 group-hover:scale-110 transition-transform`}>
                {icon === 'calendar' && <span className="material-symbols-outlined">calendar_today</span>}
                {icon === 'check' && <span className="material-symbols-outlined">check_circle</span>}
                {icon === 'money' && <span className="material-symbols-outlined">payments</span>}
                {icon === 'x' && <span className="material-symbols-outlined">cancel</span>}
            </div>
        </div>
    )
}

function StatusBadge({ color, label }: { color: string, label: string }) {
    return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/30 border border-border">
            <div className={`size-2 rounded-full bg-${color}-500`} />
            <span className="text-[10px] font-bold uppercase text-muted-foreground">{label}</span>
        </div>
    )
}
