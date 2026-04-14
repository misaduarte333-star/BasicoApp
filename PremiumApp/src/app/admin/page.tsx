'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { getHermosilloDateStr, getHermosilloMins, getMinsFromHermosilloString } from '@/lib/utils'
import type { KPIs, CitaDesdeVista, Barbero, Sucursal, Bloqueo } from '@/lib/types'
import { useBusinessLabels } from '@/hooks/useBusinessLabels'

/* ─── Types ─────────────────────────────────────────────── */
type BarberWithStatus = Barbero & {
    currentStatus: 'disponible' | 'ocupado' | 'descanso'
    currentClient: string | null
}

/* ─── Status config ─────────────────────────────────────── */
const STATUS_CONFIG = {
    disponible: { label: 'Libre', bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', pulse: true },
    ocupado: { label: 'En cita', bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400', pulse: false },
    descanso: { label: 'Descanso', bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400', pulse: false },
} as const

/* ─── Greeting helper ───────────────────────────────────── */
function getGreeting(date: Date): string {
    const h = date.getHours()
    if (h < 12) return 'Buenos días'
    if (h < 19) return 'Buenas tardes'
    return 'Buenas noches'
}

/* ════════════════════════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
    const { sucursalId, loading: authLoading } = useAuth()
    const { businessName, location, professionals } = useBusinessLabels()

    const [kpis, setKpis] = useState<KPIs>({ citasHoy: 0, completadas: 0, ingresos: 0, noShows: 0 })
    const [loading, setLoading] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [appointmentsToday, setAppointmentsToday] = useState<CitaDesdeVista[]>([])
    const [barberos, setBarberos] = useState<Barbero[]>([])
    const [bloqueosToday, setBloqueosToday] = useState<Bloqueo[]>([])

    const supabase = createClient()

    /* Live clock */
    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(t)
    }, [])

    /* Data fetch */
    const cargarDatos = useCallback(async () => {
        if (!sucursalId) return
        try {
            const hoy = getHermosilloDateStr()
            const start = `${hoy}T00:00:00-07:00`
            const end = `${hoy}T23:59:59-07:00`

            const [citasRes, barberosRes, bloqueosRes] = await Promise.all([
                supabase.from('vista_citas_app').select('*').eq('sucursal_id', sucursalId).gte('timestamp_inicio_local', start).lte('timestamp_inicio_local', end) as any,
                supabase.from('barberos').select('*').eq('sucursal_id', sucursalId).eq('activo', true).order('estacion_id') as any,
                supabase.from('bloqueos').select('*').eq('sucursal_id', sucursalId).gte('fecha_inicio', start).lte('fecha_inicio', end) as any,
            ])

            if (citasRes.data) setAppointmentsToday(citasRes.data)
            if (barberosRes.data) setBarberos(barberosRes.data)
            if (bloqueosRes.data) setBloqueosToday(bloqueosRes.data)

            const citas = citasRes.data ?? []
            setKpis({
                citasHoy: citas.length,
                completadas: citas.filter((c: any) => c.estado === 'finalizada').length,
                ingresos: citas.filter((c: any) => c.estado === 'finalizada').reduce((s: number, c: any) => s + (c.monto_pagado || c.servicio_precio || 0), 0),
                noShows: citas.filter((c: any) => c.estado === 'no_show').length,
            })
        } catch (e) {
            console.error('Error cargando dashboard:', e)
        } finally {
            setLoading(false)
        }
    }, [sucursalId, supabase])

    useEffect(() => {
        // Wait for auth initialization to complete and sucursalId to be available
        if (authLoading || !sucursalId) return

        cargarDatos()
        const t = setInterval(cargarDatos, 30_000)
        return () => clearInterval(t)
    }, [cargarDatos, authLoading, sucursalId])

    /* Derived barber statuses */
    const barberStatuses = useMemo<BarberWithStatus[]>(() => {
        const nowMins = getHermosilloMins(currentTime)
        return barberos.map(b => {
            const citaActiva = appointmentsToday.find(c =>
                c.barbero_id === b.id && (c.estado === 'en_proceso' || c.estado === 'por_cobrar')
            )
            const bloqueoActivo = bloqueosToday.find(bl => {
                const s = getMinsFromHermosilloString(bl.fecha_inicio)
                const e = getMinsFromHermosilloString(bl.fecha_fin)
                return bl.barbero_id === b.id && nowMins >= s && nowMins < e
            })
            return {
                ...b,
                currentStatus: citaActiva ? 'ocupado' : bloqueoActivo ? 'descanso' : 'disponible',
                currentClient: citaActiva?.cliente_nombre ?? null,
            }
        })
    }, [barberos, appointmentsToday, bloqueosToday, currentTime])

    /* Upcoming appointments (next 3 pending/confirmed) */
    const upcomingCitas = useMemo(() => {
        const nowMins = getHermosilloMins(currentTime)
        return appointmentsToday
            .filter((c: any) => {
                const cMins = getMinsFromHermosilloString(c.timestamp_inicio)
                return cMins > nowMins && (c.estado === 'pendiente' || c.estado === 'confirmada')
            })
            .sort((a: any, b: any) =>
                getMinsFromHermosilloString(a.timestamp_inicio) - getMinsFromHermosilloString(b.timestamp_inicio)
            )
            .slice(0, 4)
    }, [appointmentsToday, currentTime])

    /* Completion rate */
    const completionRate = kpis.citasHoy > 0 ? Math.round((kpis.completadas / kpis.citasHoy) * 100) : 0
    const availableCount = barberStatuses.filter(b => b.currentStatus === 'disponible').length
    const busyCount = barberStatuses.filter(b => b.currentStatus === 'ocupado').length

    /* ── Render ── */
    return (
        <div className="space-y-6">

            {/* ── KPI CARDS ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard
                    title="Citas Hoy"
                    value={loading ? '—' : kpis.citasHoy}
                    sub={`${kpis.citasHoy - kpis.completadas} pendientes`}
                    icon="calendar_today"
                    color="purple"
                    loading={loading}
                />
                <KPICard
                    title="Completadas"
                    value={loading ? '—' : kpis.completadas}
                    sub={`${completionRate}% del día`}
                    icon="check_circle"
                    color="emerald"
                    loading={loading}
                />
                <KPICard
                    title="Ingresos"
                    value={loading ? '—' : `$${kpis.ingresos.toLocaleString('es-MX')}`}
                    sub="servicios finalizados"
                    icon="payments"
                    color="gold"
                    loading={loading}
                />
                <KPICard
                    title="No-Shows"
                    value={loading ? '—' : kpis.noShows}
                    sub={kpis.noShows > 0 ? 'requieren atención' : 'sin incidencias'}
                    icon="cancel"
                    color="red"
                    loading={loading}
                />
            </div>

            {/* ── BOTTOM GRID: Staff + Upcoming ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

                {/* Staff Status — 2/3 */}
                <div className="xl:col-span-2 rounded-2xl border border-border/60 bg-card overflow-hidden">
                    {/* Card header */}
                    <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    group
                                </span>
                            </div>
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
                                    Estado de {professionals}
                                </h2>
                                <p className="text-[10px] text-muted-foreground">
                                    {barberStatuses.length} profesionales activos
                                </p>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="hidden sm:flex items-center gap-2">
                            {(['disponible', 'ocupado', 'descanso'] as const).map(s => (
                                <div key={s} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/30 border border-border/40">
                                    <div className={`size-1.5 rounded-full ${STATUS_CONFIG[s].dot}`} />
                                    <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                                        {STATUS_CONFIG[s].label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Staff grid */}
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {loading
                            ? Array.from({ length: 4 }).map((_, i) => <BarberSkeleton key={i} />)
                            : barberStatuses.map(barber => <BarberCard key={barber.id} barber={barber} location={location} />)
                        }
                        {!loading && barberStatuses.length === 0 && (
                            <div className="col-span-2 py-8 text-center">
                                <span className="material-symbols-outlined text-3xl text-muted-foreground/30">group_off</span>
                                <p className="text-sm text-muted-foreground mt-2">Sin {professionals} registrados</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Upcoming Appointments — 1/3 */}
                <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                    <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2.5">
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                                schedule
                            </span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-wider text-foreground">Próximas Citas</h2>
                            <p className="text-[10px] text-muted-foreground">siguientes en agenda</p>
                        </div>
                    </div>

                    <div className="p-4 space-y-2.5">
                        {loading
                            ? Array.from({ length: 3 }).map((_, i) => <AppointmentSkeleton key={i} />)
                            : upcomingCitas.length > 0
                                ? upcomingCitas.map((c: any, i: number) => (
                                    <AppointmentRow key={c.id ?? i} cita={c} />
                                ))
                                : (
                                    <div className="py-8 text-center">
                                        <span className="material-symbols-outlined text-3xl text-muted-foreground/30">event_available</span>
                                        <p className="text-sm text-muted-foreground mt-2">Sin citas pendientes</p>
                                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">¡Todo al día por ahora!</p>
                                    </div>
                                )
                        }
                    </div>

                    {/* Summary footer */}
                    <div className="px-5 py-3 border-t border-border/40 bg-muted/20">
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <p className="text-base font-black text-foreground">{kpis.citasHoy}</p>
                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total</p>
                            </div>
                            <div>
                                <p className="text-base font-black text-emerald-400">{kpis.completadas}</p>
                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Hechas</p>
                            </div>
                            <div>
                                <p className="text-base font-black text-red-400">{kpis.noShows}</p>
                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">N-Shows</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}

/* ════════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════ */

/* ── KPI Card ── */
const KPI_COLOR: Record<string, { ring: string; icon: string; glow: string }> = {
    purple: { ring: 'bg-violet-500/10', icon: 'text-violet-400', glow: 'shadow-[0_0_20px_-8px_rgba(139,92,246,0.3)]' },
    emerald: { ring: 'bg-emerald-500/10', icon: 'text-emerald-400', glow: 'shadow-[0_0_20px_-8px_rgba(52,211,153,0.3)]' },
    gold: { ring: 'bg-primary/10', icon: 'text-primary', glow: 'shadow-[0_0_20px_-8px_rgba(212,175,55,0.3)]' },
    red: { ring: 'bg-red-500/10', icon: 'text-red-400', glow: 'shadow-[0_0_20px_-8px_rgba(239,68,68,0.3)]' },
}

function KPICard({ title, value, sub, icon, color, loading }:
    { title: string; value: string | number; sub: string; icon: string; color: string; loading: boolean }) {
    const c = KPI_COLOR[color] ?? KPI_COLOR.purple
    return (
        <div className={`rounded-2xl border border-border/60 bg-card p-5 flex flex-col gap-3 transition-all hover:border-border ${c.glow}`}>
            <div className="flex items-start justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
                <div className={`size-9 rounded-xl ${c.ring} flex items-center justify-center`}>
                    <span className={`material-symbols-outlined text-[18px] ${c.icon}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                        {icon}
                    </span>
                </div>
            </div>
            {loading ? (
                <div className="h-8 w-20 rounded-lg bg-muted/50 animate-pulse" />
            ) : (
                <p className="text-3xl font-black tracking-tight text-foreground leading-none">{value}</p>
            )}
            <p className="text-[11px] text-muted-foreground leading-none">{sub}</p>
        </div>
    )
}

/* ── Barber Card ── */
function BarberCard({ barber, location }: { barber: BarberWithStatus; location: string }) {
    const cfg = STATUS_CONFIG[barber.currentStatus]
    const initials = barber.nombre.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()

    return (
        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/50 bg-background/40 hover:border-primary/20 hover:bg-muted/30 transition-all group">
            {/* Avatar */}
            <div className="relative shrink-0">
                <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-sm">
                    {initials}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full ${cfg.dot} border-2 border-card ${cfg.pulse ? 'animate-pulse' : ''}`} />
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
                <p className="font-black text-[13px] text-foreground truncate">{barber.nombre}</p>
                <p className="text-[10px] text-muted-foreground">{location} {barber.estacion_id}</p>
            </div>

            {/* Status badge */}
            <div className={`shrink-0 px-2.5 py-1 rounded-lg ${cfg.bg} flex items-center gap-1.5`}>
                <div className={`size-1.5 rounded-full ${cfg.dot}`} />
                <span className={`text-[9px] font-black uppercase tracking-wider ${cfg.text}`}>
                    {barber.currentStatus === 'ocupado' && barber.currentClient
                        ? barber.currentClient.split(' ')[0]
                        : cfg.label}
                </span>
            </div>
        </div>
    )
}

/* ── Appointment Row ── */
function AppointmentRow({ cita }: { cita: any }) {
    const timeStr = cita.timestamp_inicio
        ? new Date(cita.timestamp_inicio).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        : '—'
    const initials = (cita.cliente_nombre ?? '??').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()

    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/40 hover:border-primary/20 transition-all">
            {/* Time */}
            <div className="shrink-0 text-center bg-primary/8 border border-primary/15 rounded-lg px-2 py-1.5 min-w-[48px]">
                <p className="text-[13px] font-black text-primary leading-none">{timeStr}</p>
            </div>

            {/* Avatar */}
            <div className="size-8 rounded-lg bg-muted/60 border border-border/40 flex items-center justify-center text-[10px] font-black text-muted-foreground shrink-0">
                {initials}
            </div>

            {/* Details */}
            <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-foreground truncate">{cita.cliente_nombre ?? 'Cliente'}</p>
                <p className="text-[10px] text-muted-foreground truncate">{cita.servicio_nombre ?? 'Servicio'}</p>
            </div>
        </div>
    )
}

/* ── Skeletons ── */
function BarberSkeleton() {
    return (
        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/30 bg-background/20 animate-pulse">
            <div className="size-10 rounded-xl bg-muted/50 shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-3 w-28 rounded bg-muted/50" />
                <div className="h-2 w-16 rounded bg-muted/30" />
            </div>
            <div className="h-6 w-14 rounded-lg bg-muted/30 shrink-0" />
        </div>
    )
}

function AppointmentSkeleton() {
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30 animate-pulse">
            <div className="h-10 w-12 rounded-lg bg-muted/40 shrink-0" />
            <div className="size-8 rounded-lg bg-muted/30 shrink-0" />
            <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 rounded bg-muted/40" />
                <div className="h-2 w-16 rounded bg-muted/30" />
            </div>
        </div>
    )
}