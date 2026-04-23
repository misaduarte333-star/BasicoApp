'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { APP_TIMEZONE, startOfDayISO, endOfDayISO } from '@/lib/timezone'
import { CitaCard } from '@/components/CitaCard'
import { AgendaTimeline } from '@/components/AgendaTimeline'
import { NuevaCitaModal } from '@/components/NuevaCitaModal'
import { useBusinessLabels } from '@/hooks/useBusinessLabels'
import type { CitaConRelaciones } from '@/lib/types'

/**
 * Tablero principal de la tablet del profesional.
 * Muestra las citas del profesional autenticado para el día en curso e incluye
 * suscripción en tiempo real a Supabase para actualizaciones instantáneas.
 */
export default function TabletDashboard() {
    const router = useRouter()
    const { logout } = useAuth()
    const { getLabel, location } = useBusinessLabels()
    const [profesional, setProfesional] = useState<{ id: string, nombre: string, estacion_id: number, sucursal_id?: string, horario_laboral?: any } | null>(null)
    const [citas, setCitas] = useState<CitaConRelaciones[]>([])
    const [loading, setLoading] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [activeTab, setActiveTab] = useState<'agenda' | 'citas'>('agenda')
    const [showNuevaCita, setShowNuevaCita] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const { theme, setTheme } = useTheme()

    useEffect(() => { setIsMounted(true) }, [])

    const [supabase] = useState(() => createClient())

    // Auth Check
    useEffect(() => {
        const sessionStr = sessionStorage.getItem('profesional_session')
        if (!sessionStr) {
            router.push('/')
            return
        }
        try {
            const session = JSON.parse(sessionStr)
            // session is { user: {...}, role: 'profesional' }
            if (session.user) {
                setProfesional(session.user)
            } else {
                setProfesional(session) // Fallback for direct user objects
            }
        } catch {
            router.push('/')
        }
    }, [router])

    /**
     * Recupera de la base de datos las citas programadas para el profesional activo
     * durante el día actual.
     */
    const cargarCitas = useCallback(async () => {
        if (!profesional?.id) return

        const inicioDelDia = startOfDayISO()
        const finDelDia = endOfDayISO()

        try {
            const { data, error } = await supabase
                .from('citas')
                .select(`
          *,
          servicio:servicios(*)
        `)
                .eq('barbero_id', profesional.id) // Filter by logged in professional
                .gte('timestamp_inicio', inicioDelDia)
                .lte('timestamp_inicio', finDelDia)
                .neq('estado', 'cancelada')
                .order('timestamp_inicio', { ascending: true })

            if (error) {
                console.error('Error loading appointments:', error)
                // Use demo data if Supabase not configured (and matches barber roughly)
                // In production we would just show empty or error
                setCitas([])
            } else {
                setCitas(data || [])
            }
        } catch (err) {
            console.error('Supabase not configured:', err)
            setCitas([])
        } finally {
            setLoading(false)
        }
    }, [supabase, profesional])

    // Load appointments and set up real-time subscription
    useEffect(() => {
        if (!profesional) return

        cargarCitas()

        // Real-time subscription
        const channel = supabase
            .channel(`citas-profesional-${profesional.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'citas',
                    filter: `barbero_id=eq.${profesional.id}` // Only listen for this professional
                },
                (payload) => {
                    console.log('Real-time change:', payload)
                    cargarCitas()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [cargarCitas, supabase, profesional])

    // Update current time every minute
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date())
        }, 60000)

        return () => clearInterval(interval)
    }, [])

    const citasActivas = citas.filter(c =>
        c.estado !== 'finalizada' && c.estado !== 'cancelada'
    )

    const citasCompletadas = citas.filter(c => c.estado === 'finalizada')
    const acumulado = citasCompletadas.reduce((acc, c) => acc + (c.monto_pagado || 0), 0)

    const citaEnProceso = citas.find(c => c.estado === 'en_proceso')
    const citasSiguientes = citasActivas.filter(c => c.estado !== 'en_proceso')

    const horarioTimeline = (() => {
        let inicio = 8
        let fin = 20

        if (profesional?.horario_laboral) {
            const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
            const diaActual = diasSemana[currentTime.getDay()]
            const horarioHoy = profesional.horario_laboral[diaActual]

            if (horarioHoy && horarioHoy.inicio && horarioHoy.fin) {
                inicio = parseInt(horarioHoy.inicio.split(':')[0], 10)
                fin = parseInt(horarioHoy.fin.split(':')[0], 10)
                const finMinutos = parseInt(horarioHoy.fin.split(':')[1] || '0', 10)
                if (finMinutos > 0) fin += 1
                if (isNaN(inicio) || isNaN(fin)) { inicio = 8; fin = 20 }
            }
        }

        // Expanded bounds strictly based on existing matching appointments
        citas.forEach(c => {
            const h = parseInt(new Date(c.timestamp_inicio).toLocaleTimeString('en-US', { hour: '2-digit', hour12: false, timeZone: APP_TIMEZONE }), 10)
            const hEnd = parseInt(new Date(c.timestamp_fin).toLocaleTimeString('en-US', { hour: '2-digit', hour12: false, timeZone: APP_TIMEZONE }), 10)
            const mEnd = parseInt(new Date(c.timestamp_fin).toLocaleTimeString('en-US', { minute: '2-digit', timeZone: APP_TIMEZONE }), 10)
            if (h < inicio) inicio = h
            if (hEnd > fin || (hEnd === fin && mEnd > 0)) fin = hEnd + 1
        })

        return { inicio, fin }
    })()

    return (
        <div className="min-h-screen flex flex-col bg-violet-50/60 dark:bg-slate-950 text-foreground overflow-x-hidden">
            {/* ═══════════════════════════════════════════════════════
                CAMBIO 2: Header completamente rediseñado — Propuesta A
                Fondo violeta sólido, stats integrados, tab dentro del header
            ═══════════════════════════════════════════════════════ */}
            <header className="bg-[#534AB7] dark:bg-[#0B0914] px-3 pt-3 pb-0 sticky top-0 z-50 border-b border-transparent dark:border-slate-800">
                {/* Fila superior: avatar + nombre + hora + botones */}
                <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-white/15 dark:bg-white/5 flex items-center justify-center shrink-0">
                        <svg className="w-[18px] h-[18px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[15px] font-medium text-white line-clamp-1">
                            {profesional?.nombre || 'Cargando...'}
                        </h1>
                        <p className="text-[10px] text-white/60 mt-0.5">
                            {location} {profesional?.estacion_id} · {currentTime.toLocaleDateString('es-MX', {
                                weekday: 'short', day: 'numeric', month: 'short', timeZone: APP_TIMEZONE
                            })} · {currentTime.toLocaleTimeString('es-MX', {
                                hour: '2-digit', minute: '2-digit', timeZone: APP_TIMEZONE
                            })}
                        </p>
                    </div>

                    {/* Botones: tema (móvil: toggle simple) + logout */}
                    <div className="flex items-center gap-1.5">
                        {isMounted && (
                            <>
                                {/* Móvil: ciclo claro/oscuro/auto */}
                                <button
                                    onClick={() => {
                                        if (theme === 'light') setTheme('dark')
                                        else if (theme === 'dark') setTheme('system')
                                        else setTheme('light')
                                    }}
                                    title={`Tema actual: ${theme === 'light' ? 'Claro' : theme === 'dark' ? 'Oscuro' : 'Auto'}`}
                                    className="md:hidden w-8 h-8 rounded-lg bg-white/12 dark:bg-white/5 flex items-center justify-center active:scale-90 transition-transform"
                                >
                                    {theme === 'light' && (
                                        <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                                        </svg>
                                    )}
                                    {theme === 'dark' && (
                                        <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                        </svg>
                                    )}
                                    {(theme === 'system' || !theme) && (
                                        <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                </button>

                                {/* Desktop: selector completo Claro/Oscuro/Auto */}
                                <div className="hidden md:flex bg-white/10 dark:bg-white/5 p-0.5 rounded-lg gap-0.5">
                                    {(['light', 'dark', 'system'] as const).map((t) => (
                                        <button key={t} onClick={() => setTheme(t)}
                                            className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-all ${theme === t ? 'bg-white text-violet-700 dark:bg-slate-700 dark:text-white' : 'text-white/55 hover:text-white/80'}`}>
                                            {t === 'light' ? 'Claro' : t === 'dark' ? 'Oscuro' : 'Auto'}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        <button
                            onClick={logout}
                            className="w-8 h-8 rounded-lg bg-white/12 dark:bg-white/5 flex items-center justify-center active:scale-90 transition-transform"
                            title="Cerrar Sesión"
                        >
                            <svg className="w-3.5 h-3.5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Stats — 2 tarjetas en grid */}
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                    <div className="bg-white/10 dark:bg-white/5 rounded-xl p-2.5">
                        <p className="text-[9px] text-white/55 font-medium uppercase tracking-widest">Citas hoy</p>
                        <p className="text-[19px] font-medium text-white leading-tight mt-0.5">{citas.length}</p>
                    </div>
                    <div className="bg-white/10 dark:bg-white/5 rounded-xl p-2.5">
                        <p className="text-[9px] text-white/55 font-medium uppercase tracking-widest">Acumulado</p>
                        <p className="text-[19px] font-medium text-teal-300 leading-tight mt-0.5">
                            ${acumulado.toLocaleString('es-MX')}
                        </p>
                    </div>
                </div>

                {/* Tab switcher — solo en móvil, integrado en el header */}
                <div className="flex md:hidden bg-white/10 dark:bg-white/5 rounded-t-xl p-1 gap-1">
                    <button
                        onClick={() => setActiveTab('agenda')}
                        className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg tracking-widest transition-all duration-200 ${activeTab === 'agenda' ? 'bg-white text-violet-700 dark:bg-slate-800 dark:text-white' : 'text-white/50'}`}
                    >
                        AGENDA
                    </button>
                    <button
                        onClick={() => setActiveTab('citas')}
                        className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg tracking-widest transition-all duration-200 ${activeTab === 'citas' ? 'bg-white text-violet-700 dark:bg-slate-800 dark:text-white' : 'text-white/50'}`}
                    >
                        CITAS{citasSiguientes.length > 0 && (
                            <span className="ml-1.5 text-[9px] bg-white/20 text-white rounded-full px-1.5 py-0.5">
                                {citasSiguientes.length}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-3.5 md:p-6 overflow-x-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6 max-w-7xl mx-auto">

                    {/* Timeline - Desktop (visible) or Mobile (hidden if not active) */}
                    <div className={`lg:col-span-1 h-[calc(100vh-230px)] md:h-[calc(100vh-200px)] lg:h-auto ${activeTab === 'agenda' ? 'block animate-fade-in' : 'hidden md:block'}`}>
                        <div className="bg-white dark:bg-[#0B0914] rounded-2xl shadow-sm p-4 h-full flex flex-col border border-violet-100 dark:border-slate-800/60">
                            <h2 className="text-base font-bold mb-4 hidden md:flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Línea del Tiempo
                            </h2>
                            <AgendaTimeline citas={citas} currentTime={currentTime} horaInicio={horarioTimeline.inicio} horaFin={horarioTimeline.fin} onUpdate={cargarCitas} />
                        </div>
                    </div>

                    {/* Appointments - Desktop (visible) or Mobile (hidden if not active) */}
                    <div className={`lg:col-span-2 space-y-5 md:space-y-6 ${activeTab === 'citas' ? 'block animate-fade-in' : 'hidden md:block'}`}>
                        {/* Current Appointment */}
                        {citaEnProceso && (
                            <div className="animate-slide-in">
                                <h2 className="text-sm md:text-lg font-bold mb-3 flex items-center gap-2 text-emerald-400">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-glow shadow-emerald-500/50" />
                                    AHORA EN PROCESO
                                </h2>
                                <CitaCard cita={citaEnProceso} onUpdate={cargarCitas} isHighlighted />
                            </div>
                        )}

                        {/* Upcoming Appointments */}
                        <div className="space-y-3.5">
                            <h2 className="text-sm md:text-lg font-bold mb-3 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                <svg className="w-5 h-5 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                PRÓXIMAS CITAS ({citasSiguientes.length})
                            </h2>

                            {loading ? (
                                <div className="glass-card p-12 flex items-center justify-center">
                                    <div className="spinner w-8 h-8" />
                                </div>
                            ) : citasSiguientes.length === 0 ? (
                                <div className="glass-card p-12 text-center">
                                    <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-muted-foreground/70">No hay más citas programadas</p>
                                </div>
                            ) : (
                                <div className="space-y-4 pb-20 md:pb-0">
                                    {citasSiguientes.map((cita, index) => (
                                        <CitaCard
                                            key={cita.id}
                                            cita={cita}
                                            onUpdate={cargarCitas}
                                            style={{ animationDelay: `${index * 100}ms` }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* FAB — Nueva Cita */}
            <button
                onClick={() => setShowNuevaCita(true)}
                className="fixed bottom-6 right-5 z-40 w-14 h-14 rounded-2xl bg-[#534AB7] shadow-xl shadow-violet-500/30 flex items-center justify-center active:scale-90 transition-transform hover:shadow-violet-500/50"
                title="Nueva Cita"
            >
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
            </button>

            {/* Modal nueva cita — portal al body */}
            {isMounted && showNuevaCita && profesional && createPortal(
                <NuevaCitaModal
                    sucursalId={profesional.sucursal_id ?? ''}
                    barberoId={profesional.id}
                    horaInicio={horarioTimeline.inicio}
                    horaFin={horarioTimeline.fin}
                    citasHoy={citas.map(c => ({ id: c.id, timestamp_inicio: c.timestamp_inicio, timestamp_fin: c.timestamp_fin }))}
                    currentTime={currentTime}
                    onClose={() => setShowNuevaCita(false)}
                    onSuccess={() => { setShowNuevaCita(false); cargarCitas() }}
                />,
                document.body
            )}
        </div>
    )
}


