'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import { ThemeToggle } from '@/components/ThemeToggle'

import {
    Plus,
    BarChart3,
    Settings,
    Image as ImageIcon,
    LogOut,
    Bell,
    BellRing,
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    List,
    UserPlus,
    CheckCircle2,
    X,
    Volume2,
    VolumeX,
    LayoutDashboard,
    Scissors,
    History,
    AlertCircle,
    DollarSign,
    Maximize,
    Minimize,
    Wallet,
    TrendingDown,
    MoreVertical,
    User,
    Shield
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { CitaCard } from '@/components/CitaCard'
import { AgendaTimeline } from '@/components/AgendaTimeline'
import { FinanzasProfesional } from '@/components/FinanzasProfesional'
import type { CitaDesdeVista, Barbero as Profesional } from '@/lib/types'
import { useBusinessLabels } from '@/hooks/useBusinessLabels'
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

// Heavy components loaded dynamically for better mobile performance
const AgendaSemanalMensual = dynamic(() => import('@/components/AgendaSemanalMensual').then(mod => mod.AgendaSemanalMensual), {
    loading: () => <div className="p-8 flex justify-center"><div className="spinner w-8 h-8 border-slate-700 border-t-primary" /></div>
})

const TabletNuevaCitaModal = dynamic(() => import('@/components/TabletNuevaCitaModal').then(mod => mod.TabletNuevaCitaModal), {
    ssr: false
})

const CheckOutModal = dynamic(() => import('@/components/CheckOutModal').then(mod => mod.CheckOutModal), {
    ssr: false
})


export default function TabletDashboard() {
    const labels = useBusinessLabels()
    const router = useRouter()
    const [isMounted, setIsMounted] = useState(false)
    const [profesional, setProfesional] = useState<any>(null)
    const [citas, setCitas] = useState<any[]>([])
    const citasRef = useRef<any[]>([]) // Stable ref to avoid stale closure in cargarAgenda
    const agendaReloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null) // Debounce para evitar doble recarga
    const [loading, setLoading] = useState(false)
    const [currentTime, setCurrentTime] = useState<Date | null>(null)
    const [isCheckingAuth, setIsCheckingAuth] = useState(true)

    const [newApptAlert, setNewApptAlert] = useState<{ show: boolean, clientName: string }>({ show: false, clientName: '' })
    const [checkoutCita, setCheckoutCita] = useState<any>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [isAudioInitialized, setIsAudioInitialized] = useState(false)
    const [soundEnabled, setSoundEnabled] = useState(true)
    const [isFullscreen, setIsFullscreen] = useState(false)

    // Fullscreen logic
    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {})
        } else {
            document.exitFullscreen().catch(() => {})
        }
    }, [])

    // Track fullscreen state changes  
    useEffect(() => {
        const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
        document.addEventListener('fullscreenchange', onFsChange)
        return () => document.removeEventListener('fullscreenchange', onFsChange)
    }, [])

    // Fullscreen persistence: re-enter after lock/unlock, reload, tab-switch, or focus
    useEffect(() => {
        const requestFs = () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {})
            }
        }

        // Fullscreen requested ONLY on user interaction or visibility change to avoid security errors on mount

        // KEY: re-enter when screen is unlocked (visibility: hidden → visible)
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Small delay to let the browser finish unlock animation
                setTimeout(requestFs, 300)
            }
        }
        document.addEventListener('visibilitychange', onVisibilityChange)

        // Re-enter on pageshow (handles reload / back-cache)
        const onPageShow = () => requestFs()
        window.addEventListener('pageshow', onPageShow)

        // Re-enter when window gets focus (alt-tab, etc.)
        const onFocus = () => requestFs()
        window.addEventListener('focus', onFocus)

        // Fallback for fresh sessions: first user touch
        const onFirstInteraction = () => requestFs()
        window.addEventListener('touchstart', onFirstInteraction, { once: true, capture: true })
        window.addEventListener('click', onFirstInteraction, { once: true, capture: true })

        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange)
            window.removeEventListener('pageshow', onPageShow)
            window.removeEventListener('focus', onFocus)
            window.removeEventListener('touchstart', onFirstInteraction, { capture: true })
            window.removeEventListener('click', onFirstInteraction, { capture: true })
        }
    }, [])
    const [showSettings, setShowSettings] = useState(false)
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
    const [showMoreActions, setShowMoreActions] = useState(false)
    const [seccion, setSeccion] = useState<'agenda' | 'finanzas'>('agenda')

    // Agenda states
    const [vistaAgenda, setVistaAgenda] = useState<'hoy' | 'semana' | 'mes' | 'dia'>('hoy')
    const [fechaAgenda, setFechaAgenda] = useState<string>("") // Hydrated in useEffect
    const [citasAgenda, setCitasAgenda] = useState<CitaDesdeVista[]>([])
    const [bloqueosAgenda, setBloqueosAgenda] = useState<any[]>([])
    const [almuerzoProfesional, setAlmuerzoProfesional] = useState<any>(null)
    const [sucursal, setSucursal] = useState<any>(null)
    const [loadingAgenda, setLoadingAgenda] = useState(false)
    const lastTapAgenda = useRef<number>(0)
    const datePickerRef = useRef<HTMLInputElement>(null)
    const [citasPasadasPendientes, setCitasPasadasPendientes] = useState<number>(0)
    // Shared data lifted to page level to avoid per-CitaCard fetches
    const [allServicios, setAllServicios] = useState<any[]>([])
    const [allProfesionales, setAllProfesionales] = useState<any[]>([])

    // Keep citasRef in sync for stale-closure-safe comparisons (Vercel: advanced-event-handler-refs)
    useEffect(() => { citasRef.current = citas }, [citas])

    const shiftFechaAgenda = (days: number) => {
        if (!fechaAgenda) return
        const d = new Date(`${fechaAgenda}T12:00:00-07:00`)
        if (isNaN(d.getTime())) return
        const step = vistaAgenda === 'semana' ? days * 7 : days
        d.setDate(d.getDate() + step)
        setFechaAgenda(d.toLocaleDateString('en-CA'))
    }

    const getRelativeDateLabel = (dateStr: string) => {
        if (!isMounted || !dateStr) return '...'
        
        try {
            const hoy = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Hermosillo',
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).format(new Date())

            const target = new Date(`${dateStr}T12:00:00-07:00`)
            if (isNaN(target.getTime())) return dateStr

            if (vistaAgenda === 'semana') {
                const dayOfWeek = target.getDay() 
                const startOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
                const endOffset = startOffset + 6
                
                const startD = new Date(target)
                startD.setDate(target.getDate() + startOffset)
                const endD = new Date(target)
                endD.setDate(target.getDate() + endOffset)

                const startStr = startD.getDate()
                const endStr = `${endD.getDate()} ${endD.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')}`
                return `${startStr} - ${endStr}`
            }

            if (dateStr === hoy) return 'Hoy'

            const hoyObj = new Date(`${hoy}T12:00:00-07:00`)
            const diffTime = target.getTime() - hoyObj.getTime()
            const diffDays = Math.round(diffTime / (1000 * 3600 * 24))

            if (diffDays === 1) return 'Mañana'
            if (diffDays === -1) return 'Ayer'

            return target.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '').replace(',', '')
        } catch (e) {
            return dateStr
        }
    }

    const handleDoubleTapAgenda = () => {
        const now = Date.now()
        if (now - lastTapAgenda.current < 300) {
            setFechaAgenda(new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Hermosillo',
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).format(new Date()))
            setVistaAgenda('hoy')
        }
        lastTapAgenda.current = now
    }

    // Auto-Reset to Today logic (10s idle)
    useEffect(() => {
        if (fechaAgenda === new Date().toLocaleDateString('en-CA')) return

        const timer = setTimeout(() => {
            setFechaAgenda(new Date().toLocaleDateString('en-CA'))
            setVistaAgenda('hoy')
        }, 10000)

        const resetTimer = () => {
            clearTimeout(timer)
            // Re-start logic would happen on next render if date still != today
        }

        window.addEventListener('mousedown', resetTimer)
        window.addEventListener('touchstart', resetTimer)
        window.addEventListener('keydown', resetTimer)

        return () => {
            clearTimeout(timer)
            window.removeEventListener('mousedown', resetTimer)
            window.removeEventListener('touchstart', resetTimer)
            window.removeEventListener('keydown', resetTimer)
        }
    }, [fechaAgenda])

    const supabase = createClient()

    // Initialize Audio automatically on mount (no user tap required)
    const initializeAudio = useCallback(() => {
        if (isAudioInitialized || !audioRef) return
        try {
            const audio = new Audio('/notification/notification.mp3')
            audio.volume = 0.5
            audioRef.current = audio
            audio.play().then(() => {
                audio.pause()
                audio.currentTime = 0
                setIsAudioInitialized(true)
            }).catch(() => setIsAudioInitialized(true)) // mark initialized even if blocked
        } catch { setIsAudioInitialized(true) }
    }, [isAudioInitialized])

    // Persist sound preference to localStorage
    useEffect(() => {
        setIsMounted(true)
        const saved = localStorage.getItem('sound_enabled')
        if (saved !== null) setSoundEnabled(saved === 'true')

        initializeAudio()
    }, [initializeAudio])

    const toggleSound = useCallback((val: boolean) => {
        setSoundEnabled(val)
        localStorage.setItem('sound_enabled', String(val))
    }, [])

    // Unified Hydration & Auth/SWR Sync
    useEffect(() => {
        const syncSessionAndData = async () => {

            // 1. Initial hydration (browser only)
            const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('profesional_session') : null
            let currentProfesional: Profesional | null = null

            if (sessionStr) {
                try {
                    currentProfesional = JSON.parse(sessionStr)
                    setProfesional(currentProfesional)
                } catch (e) {
                    console.error('❌ Failed to parse session:', e)
                    localStorage.removeItem('profesional_session')
                }
            }

            // Also hydrate citas and dates
            if (typeof window !== 'undefined') {
                const cachedCitas = localStorage.getItem('cached_dashboard_citas')
                if (cachedCitas) setCitas(JSON.parse(cachedCitas))
            }

            const hoy = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Hermosillo',
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).format(new Date())

            setFechaAgenda(hoy)
            setCurrentTime(new Date())

            // 2. Auth Check: If NO session found -> REDIRECT
            if (!currentProfesional?.id) {
                console.warn(`⚠️ No ${labels.professional} ID found after hydration. Expelling...`)
                setIsCheckingAuth(false) // Unblock render before redirecting
                router.replace('/tablet/login')
                return
            }

            // 3. SWR: Validate against Supabase
            try {
                const bId = currentProfesional.id
                const { data, error } = await (supabase
                    .from('barberos')
                    .select('*')
                    .eq('id', bId)
                    .single() as any)

                if (error || !data) {
                    console.error('❌ Session validation failed:', error?.message || 'Not found')
                    // If it's a real 406 (Not Found), expel. Network errors are handled more gracefully.
                    if (error?.code === 'PGRST116') {
                        localStorage.removeItem('barbero_session')
                        router.replace('/tablet/login')
                        return
                    }
                }

                if (data && !data.activo) {
                    console.warn(`🚫 ${labels.professional} account is inactive. Expelling...`)
                    localStorage.removeItem('profesional_session')
                    router.replace('/tablet/login')
                    return
                }

                // Update cache if changed
                if (data) {
                    const hasChanged = data.nombre !== currentProfesional.nombre ||
                        data.estacion_id !== currentProfesional.estacion_id ||
                        data.activo !== currentProfesional.activo

                    if (hasChanged) {
                        const mergedProfesional = { ...currentProfesional, ...data }
                        setProfesional(mergedProfesional)
                        localStorage.setItem('profesional_session', JSON.stringify(mergedProfesional))
                    }
                }

                // SUCCESS: Only now we allow the dashboard to show

                // Fetch sucursal and other data in parallel
                if (currentProfesional.sucursal_id || (data && (data as any).sucursal_id)) {
                    const sId = ((data as any)?.sucursal_id || currentProfesional.sucursal_id) as string
                    const [sucursalRes, serviciosRes, profesionalesRes] = await Promise.all([
                        supabase.from('sucursales').select('*').eq('id', sId).single() as any,
                        supabase.from('servicios').select('*').eq('activo', true),
                        supabase.from('barberos').select('*').eq('activo', true),
                    ])
                    if (sucursalRes.data) setSucursal(sucursalRes.data)
                    if (serviciosRes.data) setAllServicios(serviciosRes.data || [])
                    if (profesionalesRes.data) setAllProfesionales(profesionalesRes.data || [])
                } else {
                    const [serviciosRes, profesionalesRes] = await Promise.all([
                        supabase.from('servicios').select('*').eq('activo', true),
                        supabase.from('barberos').select('*').eq('activo', true),
                    ])
                    setAllServicios(serviciosRes.data || [])
                    setAllProfesionales(profesionalesRes.data || [])
                }

            } catch (err) {
                console.error('🔥 Critical auth sync error:', err)
            } finally {
                setIsCheckingAuth(false)
            }
        }

        syncSessionAndData()
    }, [router, supabase])

    const checkPastPending = useCallback(async (profesionalId: string) => {
        try {
            const hoy = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Hermosillo',
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).format(new Date())
            
            // Using multiple .neq is safer than .not('in') as some client versions omit parentheses
            const { count, error } = await supabase
                .from('vista_citas_app')
                .select('*', { count: 'exact', head: true })
                .eq('barbero_id', profesionalId)
                .lt('fecha_cita_local', hoy)
                .neq('estado', 'finalizada')
                .neq('estado', 'cancelada')
                .neq('estado', 'no_show')
                
            if (error) throw error;
            if (count !== null) {
                setCitasPasadasPendientes(count)
            }
        } catch (err) {
            console.error('⚠️ Error checking past pending appointments:', err)
        }
    }, [supabase])

    useEffect(() => {
        if (profesional?.id) {
            checkPastPending(profesional.id)
            
            // Sync lunch break separately once per profesional change
            const fetchStatic = async () => {
                const { data } = await supabase
                    .from('barberos')
                    .select('bloqueo_almuerzo')
                    .eq('id', profesional.id)
                    .single()
                if (data) setAlmuerzoProfesional((data as any).bloqueo_almuerzo)
            }
            fetchStatic()
        }
    }, [profesional?.id, checkPastPending, supabase])

    const cargarAgenda = useCallback(async (isInitialLoad = false) => {
        if (!profesional?.id) return

        // Debounce: si ya hay una recarga pendiente en <400ms, cancelarla y reprogramar
        // Evita el doble fetch cuando onCitaCreada + realtime subscription disparan simultáneamente
        if (!isInitialLoad) {
            if (agendaReloadTimerRef.current) clearTimeout(agendaReloadTimerRef.current)
            await new Promise<void>(resolve => {
                agendaReloadTimerRef.current = setTimeout(resolve, 400)
            })
        }

        if (isInitialLoad) setLoading(true)
        if (isInitialLoad) setLoadingAgenda(true)

        const syncTimelineDate = fechaAgenda
        const syncVista = vistaAgenda

        let startStr = syncTimelineDate
        let endStr = syncTimelineDate

        const d = new Date(`${syncTimelineDate}T12:00:00-07:00`)
        if (syncVista === 'semana') {
            const dayNum = d.getDay()
            const diff = d.getDate() - dayNum + (dayNum === 0 ? -6 : 1)
            const startD = new Date(d.setDate(diff))
            startStr = startD.toLocaleDateString('en-CA')
            const endD = new Date(startD)
            endD.setDate(endD.getDate() + 6)
            endStr = endD.toLocaleDateString('en-CA')
        } else if (syncVista === 'mes') {
            const starD = new Date(d.getFullYear(), d.getMonth(), 1)
            startStr = starD.toLocaleDateString('en-CA')
            const endD = new Date(d.getFullYear(), d.getMonth() + 1, 0)
            endStr = endD.toLocaleDateString('en-CA')
        }

        try {
            const [citasRes, bloqueosRes] = await Promise.all([
                supabase
                    .from('vista_citas_app')
                    .select('*')
                    .eq('barbero_id', profesional.id)
                    .gte('fecha_cita_local', startStr)
                    .lte('fecha_cita_local', endStr)
                    .neq('estado', 'cancelada')
                    .order('timestamp_inicio_local', { ascending: true }),
                supabase
                    .from('bloqueos')
                    .select('*')
                    .eq('barbero_id', profesional.id)
                    .gte('fecha_inicio', `${startStr}T00:00:00-07:00`)
                    .lte('fecha_inicio', `${endStr}T23:59:59-07:00`)
            ])

            if (citasRes.error) throw citasRes.error
            if (bloqueosRes.error) throw bloqueosRes.error

            const citasData = (citasRes.data as CitaDesdeVista[]) || []
            setCitasAgenda(citasData)
            setBloqueosAgenda(bloqueosRes.data || [])

            // UNIFICATION: Update the summary "citas" (Today) if relevant
            const hoy = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Hermosillo',
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).format(new Date())
            if (startStr <= hoy && endStr >= hoy) {
                const totalHoy = (syncVista === 'hoy' || syncVista === 'dia') && syncTimelineDate === hoy
                    ? citasData
                    : citasData.filter(c => c.fecha_cita_local === hoy)

                // Only update if actually different to prevent unnecessary re-renders (SWR)
                const prevIds = citasRef.current.map((c: any) => c.id + c.estado).join(',')
                const nextIds = totalHoy.map((c: any) => c.id + c.estado).join(',')
                if (prevIds !== nextIds) {
                    setCitas(totalHoy)
                    localStorage.setItem('cached_dashboard_citas', JSON.stringify(totalHoy))
                }
            }
        } catch (err: any) {
            // Supabase errors are non-serializable objects, extract message directly
            const errMsg = err?.message ?? err?.error_description ?? JSON.stringify(err) ?? 'Unknown error'
            const errCode = err?.code ?? err?.status ?? 'N/A'
            const errHint = err?.hint ?? ''
            console.error(`❌ Error loading dashboard data: [${errCode}] ${errMsg} ${errHint ? '- Hint: ' + errHint : ''}`)
        } finally {
            setLoadingAgenda(false)
            setLoading(false)
        }
    }, [supabase, profesional, vistaAgenda, fechaAgenda]) // citas intentionally excluded to avoid infinite loop

    // Specific refresh for today only (useful for inserts/SWR)
    const cargarCitas = useCallback(async () => {
        await cargarAgenda(false)
    }, [cargarAgenda])

    useEffect(() => {
        if (profesional) cargarAgenda(true)
    }, [cargarAgenda]) // cargarAgenda already captures profesional/vistaAgenda/fechaAgenda

    useEffect(() => {
        if (!profesional) return

        const channelName = labels?.professional 
            ? `citas-${labels.professional.toLowerCase()}-${profesional.id}`
            : `citas-profesional-${profesional.id}`

        const channel = supabase
            .channel(channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'citas', filter: `barbero_id=eq.${profesional.id}` }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newCita = payload.new as any
                    if (audioRef.current && soundEnabled) audioRef.current.play().catch(e => console.log('Audio playback failed:', e))
                    setNewApptAlert({ show: true, clientName: newCita.cliente_nombre || 'Nuevo Cliente' })
                    setTimeout(() => setNewApptAlert(prev => ({ ...prev, show: false })), 5000)
                }
                cargarAgenda()
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [cargarAgenda, supabase, profesional, labels.professional, soundEnabled])

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 60000)
        return () => clearInterval(interval)
    }, [])

    const totalDinero = useMemo(() => citas
        .filter(c => c.estado === 'finalizada')
        .reduce((acc, current) => acc + (current.monto_pagado ?? current.servicio_precio ?? 0), 0), [citas])

    const citasPendientes = useMemo(() => citas.filter(c => ['confirmada', 'en_espera', 'en_proceso', 'por_cobrar'].includes(c.estado)), [citas])
    const citasActivas = useMemo(() =>
        citas
            .filter(c => c.estado === 'en_proceso' || c.estado === 'por_cobrar')
            .sort((a, b) => {
                // en_proceso always first
                if (a.estado === 'en_proceso' && b.estado !== 'en_proceso') return -1
                if (a.estado !== 'en_proceso' && b.estado === 'en_proceso') return 1
                return 0
            }),
        [citas]
    )
    const totalServicios = useMemo(() => citas.filter(c => c.estado === 'finalizada').length, [citas])
    const citasSiguientes = useMemo(() => citasPendientes.filter((c: CitaDesdeVista) => c.estado !== 'en_proceso' && c.estado !== 'por_cobrar'), [citasPendientes])

    // Performance: limit initial render to 3 cards, expand on demand
    const CITAS_INICIAL = 3
    const [showAllCitas, setShowAllCitas] = useState(false)
    const citasVisibles = useMemo(
        () => showAllCitas ? citasSiguientes : citasSiguientes.slice(0, CITAS_INICIAL),
        [citasSiguientes, showAllCitas]
    )

    // Stable empty array to avoid re-renders when bloqueosAgenda is []
    const stableBloqueos = useMemo(() => bloqueosAgenda, [bloqueosAgenda])

    const [showMobileAppointments, setShowMobileAppointments] = useState(false)
    const [isNewCitaModalOpen, setIsNewCitaModalOpen] = useState(false)

    // If we have NO profesional and we are checking auth, we will redirect soon.
    // Don't show the heavy skeleton to avoid "flash" if not logged in.
    if (isCheckingAuth && !profesional) {
        return <div className="min-h-screen bg-background" />
    }

    if (!isMounted || isCheckingAuth) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-12 overflow-hidden relative">
                <div className="absolute inset-0 z-0 bg-radial-at-t from-primary/10 via-transparent to-transparent opacity-50"></div>
                <div className="relative z-10 animate-scale-in flex flex-col items-center">
                    <div className="w-28 h-28 md:w-36 md:h-36 rounded-[2.5rem] bg-card border border-border flex items-center justify-center mb-10 mx-auto shadow-[0_0_60px_rgba(245,200,66,0.05)] relative group overflow-hidden">
                        <div className="absolute inset-0 rounded-[2.5rem] border border-primary animate-ping opacity-20" />
                        <Shield className="relative z-10 w-12 h-12 text-primary/80" strokeWidth={1.2} />
                    </div>
                    <div className="space-y-6 max-w-xs transition-all duration-1000">
                        <div className="space-y-2">
                            <h2 className="text-xl md:text-2xl font-black text-foreground uppercase tracking-[0.2em] font-display">Business App</h2>
                            <p className="text-[10px] font-black text-foreground/20 uppercase tracking-[0.4em]">Panel del {labels.professional}</p>
                        </div>
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-48 md:w-56 h-1 bg-foreground/5 rounded-full overflow-hidden p-0 relative">
                                <motion.div
                                    initial={{ x: "-100%" }}
                                    animate={{ x: "100%" }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-primary to-transparent"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                                <p className="text-[9px] font-black text-primary/40 uppercase tracking-[0.3em]">Sincronizando sistema</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!profesional) return null

    return (
        <div className="h-[100dvh] bg-background text-foreground flex flex-col overflow-hidden font-sans relative selection:bg-primary selection:text-black transition-colors duration-300">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 bg-radial-at-tl from-primary/5 via-transparent to-transparent opacity-40" />
            <div className="absolute inset-0 z-0 vignette-overlay opacity-30" />

            {newApptAlert.show && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    className="fixed top-24 right-6 z-[99999] pointer-events-none"
                >
                    <div className="bg-card backdrop-blur-2xl border border-primary/50 text-foreground px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/30 relative">
                            <BellRing className="w-6 h-6 text-primary animate-bounce" />
                            <div className="absolute inset-0 rounded-2xl border border-primary animate-ping opacity-20" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mb-1">Nueva {labels.appointment}</span>
                            <span className="text-lg font-black tracking-tight text-foreground uppercase leading-tight">{newApptAlert.clientName}</span>
                            <div className="flex items-center gap-2 mt-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] font-black text-emerald-500/80 uppercase tracking-widest">Sincronizado ahora</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {seccion === 'agenda' && (
            <header className="bg-background/80 backdrop-blur-xl border-b border-border px-4 md:px-8 py-3 md:py-5 shrink-0 z-50 relative shadow-xl">

                <div className="flex items-start justify-between max-w-[1920px] mx-auto gap-3">

                    <div className="flex items-start gap-2 md:gap-4 group">
                        <div className="relative scale-75 md:scale-90 mt-1 hidden sm:block">
                            <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-lg group-hover:bg-primary/10 transition-all duration-700" />
                            <div className="relative inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-card border border-border shadow-2xl overflow-hidden group-hover:border-primary/50 transition-colors duration-500">
                                <User className="w-8 h-8 text-primary/60" strokeWidth={1.5} />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 md:gap-3 animate-slide-in">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-3">
                                <h1 className="text-base md:text-2xl font-black text-foreground tracking-tight uppercase font-display truncate max-w-[60px] sm:max-w-[150px] md:max-w-none leading-none">
                                    {profesional?.nombre.split(' ')[0] || labels.professional}
                                </h1>
                                <div className="h-1 w-8 bg-primary/20 rounded-full hidden md:block" />
                            </div>

                             <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-2 md:px-3 py-0.5 md:py-1 gap-1.5 md:gap-2 rounded-lg">
                                    <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(245,200,66,0.6)]" />
                                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">{citasPendientes.length} P</span>
                                </Badge>
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 px-2 md:px-3 py-0.5 md:py-1 gap-1.5 md:gap-2 rounded-lg">
                                    <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">{totalServicios} C</span>
                                </Badge>
                                <Badge variant="outline" className="bg-muted text-foreground/70 border-border px-2 md:px-3 py-0.5 md:py-1 rounded-lg">
                                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">${totalDinero}</span>
                                </Badge>
                                {citasPasadasPendientes > 0 && (
                                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30 px-2 md:px-3 py-0.5 md:py-1 gap-1.5 md:gap-2 rounded-lg animate-pulse hidden xs:flex">
                                        <History className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">{citasPasadasPendientes}</span>
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 md:gap-6 shrink-0 mt-2">
                        <div className="hidden lg:flex items-center gap-8 px-6 py-3 bg-muted rounded-2xl border border-border shadow-inner">
                            <div className="flex gap-4 md:gap-8 mr-auto">
                                <div className="text-center">
                                    <p className="text-[7px] font-black text-foreground/20 uppercase tracking-[0.2em] mb-0.5">Servicios</p>
                                    <div className="flex items-center gap-1 justify-center">
                                        <span className="text-sm font-black text-foreground leading-none font-display">{totalServicios}</span>
                                        <span className="text-[7px] text-foreground/20 font-bold">/ {citas.length}</span>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-[7px] font-black text-foreground/20 uppercase tracking-[0.2em] mb-0.5">Caja Hoy</p>
                                    <p className="text-sm font-black text-primary leading-none font-display tracking-tight">${totalDinero}</p>
                                </div>
                            </div>
                        </div>

                        <div className="text-right hidden sm:block">
                            <p className="text-sm md:text-base font-black text-foreground tabular-nums tracking-tighter font-display leading-none">
                                {currentTime ? currentTime.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase() : '--:--'}
                            </p>
                            <p className="text-[6px] md:text-[7px] text-foreground/20 font-black uppercase tracking-[0.3em] mt-1">{labels.location} #{profesional?.estacion_id || '0'}</p>
                        </div>

                        <div className="flex items-center gap-1.5 md:gap-2 pl-2 md:pl-4 border-l border-border relative">
                            {/* Secondary Desktop Actions */}
                            <div className="hidden md:flex items-center gap-1.5 md:gap-2">
                                <Button
                                    size="icon"
                                    onClick={toggleFullscreen}
                                    className="w-8 h-8 bg-muted text-foreground/50 border-border hover:bg-accent hover:text-accent-foreground shadow-none shrink-0"
                                    title={isFullscreen ? "Salir" : "Pantalla Completa"}
                                >
                                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                                </Button>
                                <Link
                                    href="/tablet/galeria"
                                    title="Galería"
                                    className={cn(
                                        buttonVariants({ variant: "outline", size: "icon" }),
                                        "w-8 h-8 bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20 shadow-none p-0 flex items-center justify-center shrink-0"
                                    )}
                                >
                                    <ImageIcon className="w-4 h-4" />
                                </Link>
                                <Button
                                    size="icon"
                                    onClick={() => setShowSettings(true)}
                                    className="w-8 h-8 bg-muted text-foreground/40 border-border hover:bg-accent hover:text-accent-foreground shadow-none shrink-0"
                                    title="Configuración"
                                >
                                    <Settings className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Main Actions (Always Visible) */}
                            <ThemeToggle />
                            <Button
                                size="icon"
                                onClick={() => setIsNewCitaModalOpen(true)}
                                className="w-9 h-9 md:w-10 md:h-10 bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 shadow-none shrink-0"
                                title={`Nueva ${labels.appointment}`}
                            >
                                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                            </Button>

                            <Link
                                href="/tablet/reportes"
                                title="Métricas"
                                className={cn(
                                    buttonVariants({ variant: "outline", size: "icon" }),
                                    "w-9 h-9 md:w-10 md:h-10 bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 shadow-none p-0 flex items-center justify-center shrink-0"
                                )}
                            >
                                <BarChart3 className="w-4 h-4 md:w-5 md:h-5" />
                            </Link>

                            <Button
                                size="icon"
                                onClick={() => setSeccion(seccion === 'agenda' ? 'finanzas' : 'agenda')}
                                className={cn(
                                    "w-9 h-9 md:w-10 md:h-10 transition-all shadow-none shrink-0",
                                    seccion === 'agenda' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20" : "bg-primary text-black scale-110"
                                )}
                                title="Mis Finanzas"
                            >
                                <DollarSign className="w-4 h-4 md:w-5 md:h-5" />
                            </Button>

                            <Button
                                size="icon"
                                onClick={() => setShowLogoutConfirm(true)}
                                className="w-9 h-9 md:w-10 md:h-10 bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 shadow-none shrink-0"
                                title="Cerrar Sesión"
                            >
                                <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                            </Button>

                            {/* Mobile More Actions Toggle */}
                            <div className="md:hidden relative">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setShowMoreActions(!showMoreActions)}
                                    className={cn(
                                        "w-9 h-9 rounded-full transition-all shrink-0",
                                        showMoreActions ? "bg-foreground/10 text-foreground" : "text-foreground/40 hover:text-foreground"
                                    )}
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </Button>

                                <AnimatePresence>
                                    {showMoreActions && (
                                        <>
                                            <motion.div 
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.1 }}
                                                onClick={() => setShowMoreActions(false)}
                                                className="fixed inset-0 z-[100] bg-black/20"
                                            />
                                            <motion.div
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.1, ease: "easeOut" }}
                                                className="absolute right-0 top-11 z-[101] w-48 bg-popover border border-border rounded-2xl shadow-xl p-2 overflow-hidden"
                                            >
                                                <div className="flex flex-col gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => { toggleFullscreen(); setShowMoreActions(false); }}
                                                    >
                                                        {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Pantalla Completa</span>
                                                    </Button>
                                                    
                                                    <Link
                                                        href="/tablet/galeria"
                                                        onClick={() => setShowMoreActions(false)}
                                                        className="flex items-center gap-3 w-full h-11 px-3 text-foreground/70 hover:text-foreground hover:bg-foreground/5 rounded-xl transition-colors"
                                                    >
                                                        <ImageIcon className="w-4 h-4 text-amber-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Galería</span>
                                                    </Link>

                                                    <Link
                                                        href="/tablet/reportes"
                                                        onClick={() => setShowMoreActions(false)}
                                                        className="flex items-center gap-3 w-full h-11 px-3 text-foreground/70 hover:text-foreground hover:bg-foreground/5 rounded-xl transition-colors"
                                                    >
                                                        <BarChart3 className="w-4 h-4 text-blue-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Métricas</span>
                                                    </Link>

                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => { setShowSettings(true); setShowMoreActions(false); }}
                                                        className="w-full justify-start gap-3 h-11 text-foreground/70 hover:text-foreground hover:bg-foreground/5 rounded-xl px-3"
                                                    >
                                                        <Settings className="w-4 h-4" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Configuración</span>
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            )}

            <main className="flex-1 overflow-hidden p-0 lg:p-3 xl:p-4 relative z-10 flex flex-col">
                {seccion === 'agenda' && (
                    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-3 xl:gap-4 max-w-[2000px] mx-auto w-full">
                        <div className={`lg:col-span-8 h-full flex flex-col min-h-0 relative bg-background dark:bg-transparent ${showMobileAppointments ? 'hidden lg:flex' : 'flex'}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0 px-3 lg:px-3 pt-3 lg:pt-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-1 w-6 bg-primary/40 rounded-full" />
                                    <h2 className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] font-display">Cronograma General</h2>
                                </div>

                                <div className="flex items-center gap-1 w-full sm:w-auto">
                                    <div
                                        onClick={handleDoubleTapAgenda}
                                        className={cn(
                                            "flex items-center bg-muted rounded-xl border transition-all h-[34px] overflow-hidden group/nav shrink-0",
                                            vistaAgenda === 'hoy' || vistaAgenda === 'dia' ? 'border-primary/30 bg-primary/5' : 'border-border'
                                        )}
                                    >
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => { e.stopPropagation(); shiftFechaAgenda(-1); }}
                                            className="w-7 h-full text-muted-foreground/70 hover:text-primary hover:bg-foreground/5 transition-colors shrink-0 rounded-none shadow-none"
                                        >
                                            <ChevronLeft className="w-3 h-3" />
                                        </Button>

                                        <div className="px-2 flex flex-col items-center justify-center min-w-[55px] sm:min-w-[70px] select-none shrink-0 cursor-pointer">
                                            <span className={cn(
                                                "text-[8px] font-black uppercase tracking-widest leading-none",
                                                (vistaAgenda === 'hoy' || vistaAgenda === 'dia') ? 'text-primary' : 'text-muted-foreground'
                                            )}>
                                                {getRelativeDateLabel(fechaAgenda)}
                                            </span>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => { e.stopPropagation(); shiftFechaAgenda(1); }}
                                            className="w-7 h-full text-muted-foreground/70 hover:text-primary hover:bg-foreground/5 transition-colors shrink-0 rounded-none shadow-none"
                                        >
                                            <ChevronRight className="w-3 h-3" />
                                        </Button>
                                    </div>

                                    <Button
                                        onClick={() => setVistaAgenda('semana')}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest whitespace-nowrap transition-colors h-[34px] flex items-center shrink-0 shadow-none border",
                                            vistaAgenda === 'semana' ? 'bg-primary/20 text-primary border-primary/30' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                                        )}
                                    >
                                        Semana
                                    </Button>
                                    <Button
                                        onClick={() => setVistaAgenda('mes')}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest whitespace-nowrap transition-colors h-[34px] flex items-center shrink-0 shadow-none border",
                                            vistaAgenda === 'mes' ? 'bg-primary/20 text-primary border-primary/30' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                                        )}
                                    >
                                        Mes
                                    </Button>

                                    <div
                                        onClick={() => datePickerRef.current?.showPicker()}
                                        className="relative flex items-center justify-center bg-muted hover:bg-muted/80 transition-colors rounded-lg border border-border w-[34px] h-[34px] cursor-pointer group/cal shrink-0"
                                    >
                                        <CalendarIcon className="w-3 h-3 text-muted-foreground group-hover/cal:text-primary transition-colors" />
                                        <input
                                            ref={datePickerRef}
                                            type="date"
                                            value={fechaAgenda}
                                            onChange={(e) => {
                                                setFechaAgenda(e.target.value);
                                                setVistaAgenda('dia')
                                            }}
                                            className="absolute inset-0 opacity-0 pointer-events-none"
                                            style={{ colorScheme: 'dark' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 lg:border border-border overflow-hidden relative group transition-all duration-700 hover:border-border/50">
                                {loadingAgenda ? (
                                    <div className="flex flex-col w-full h-full p-6 space-y-4 animate-pulse">
                                        <div className="h-8 w-1/3 bg-foreground/5 rounded-xl ml-auto" />
                                        <div className="flex-1 border border-border rounded-2xl bg-foreground/[0.02]" />
                                        <div className="h-10 w-full bg-foreground/5 rounded-xl" />
                                    </div>
                                ) : (
                                    <div className="w-full h-full animate-fade-in relative z-10 flex flex-col">
                                        {(vistaAgenda === 'hoy' || vistaAgenda === 'dia') ? (
                                                <AgendaTimeline
                                                citas={citasAgenda}
                                                bloqueos={bloqueosAgenda}
                                                almuerzoBarbero={almuerzoProfesional}
                                                horarioSucursal={sucursal?.horario_apertura}
                                                currentTime={currentTime!}
                                                fechaBase={fechaAgenda}
                                                barbero={profesional}
                                                onUpdate={() => cargarAgenda()}
                                                allServicios={allServicios}
                                                allBarberos={allProfesionales}
                                            />
                                        ) : (
                                            <div className="p-4 pt-6 h-full overflow-y-auto custom-scrollbar">
                                                <AgendaSemanalMensual citas={citasAgenda} bloqueos={bloqueosAgenda} almuerzoBarbero={almuerzoProfesional} fecha={fechaAgenda} vista={vistaAgenda} onUpdate={() => cargarAgenda()} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="lg:hidden fixed bottom-24 right-5 z-[100] flex flex-col gap-4">
                                <Button
                                    size="icon"
                                    onClick={() => setIsNewCitaModalOpen(true)}
                                    className="w-14 h-14 rounded-full bg-background/60 backdrop-blur-xl border border-primary/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-primary hover:bg-background/80 hover:border-primary/40"
                                >
                                    <UserPlus className="w-6 h-6" />
                                </Button>
                                <div className="relative">
                                    <Button
                                        size="icon"
                                        onClick={() => setShowMobileAppointments(true)}
                                        className="w-14 h-14 rounded-full bg-background/40 backdrop-blur-xl border border-border shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-primary hover:bg-background/60 hover:border-primary/30"
                                    >
                                        <List className="w-6 h-6" />
                                    </Button>
                                    {citasSiguientes.length > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[9px] font-black border-2 border-background pointer-events-none">
                                            {citasSiguientes.length}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className={`lg:col-span-4 flex flex-col h-full min-h-0 relative transition-all duration-500 ${showMobileAppointments ? 'translate-y-0 opacity-100 z-50' : 'hidden lg:flex'}`}>
                            <div className="lg:hidden flex items-center justify-between p-6 bg-background/90 border-b border-border sticky top-0 z-[60]">
                                <div className="flex items-center gap-4">
                                    <div className="h-1 w-6 bg-primary rounded-full" />
                                    <h2 className="text-xs font-black text-foreground uppercase tracking-[0.3em] font-display">Agenda del Día</h2>
                                </div>
                                <button onClick={() => setShowMobileAppointments(false)} className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center text-foreground/70 hover:bg-foreground/20 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 lg:p-0 custom-scrollbar space-y-4 lg:space-y-6 pb-24 lg:pb-4 bg-muted/40 lg:bg-transparent min-h-0 relative overflow-x-hidden">
                                {citasActivas.length > 0 && (
                                    <div className="animate-slide-in relative group space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-1 w-6 lg:w-8 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                            <h2 className="text-[9px] lg:text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.3em] font-display">
                                                {citasActivas.some(c => c.estado === 'en_proceso') ? 'Atendiendo Ahora' : 'Por Cobrar'}
                                            </h2>
                                        </div>
                                        {citasActivas.map((cita) => (
                                            <div key={cita.id} className="relative">
                                                {citasActivas.length > 1 && (
                                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] mb-1.5 pl-1 text-emerald-600 dark:text-emerald-400">
                                                        {cita.estado === 'en_proceso' ? '▶ En Servicio' : '💳 Por Cobrar'}
                                                    </p>
                                                )}
                                                <div className="relative">
                                                    <div className={`absolute -inset-4 rounded-[2.5rem] lg:rounded-[3rem] blur-2xl opacity-40 pointer-events-none ${cita.estado === 'en_proceso' ? 'bg-emerald-500/5' : 'bg-blue-500/5'}`} />
                                                    <CitaCard
                                                        cita={cita}
                                                        onUpdate={cargarCitas}
                                                        onCheckout={(c) => setCheckoutCita(c)}
                                                        isHighlighted
                                                        currentTime={currentTime!}
                                                        allCitas={citasActivas}
                                                        bloqueos={stableBloqueos}
                                                        almuerzoBarbero={almuerzoProfesional}
                                                        horarioSucursal={sucursal}
                                                        servicios={allServicios}
                                                        barberos={allProfesionales}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex flex-col flex-1">
                                    <div className="flex items-center justify-between mb-4 lg:mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-1 w-6 lg:w-8 bg-primary/40 rounded-full" />
                                            <h2 className="text-[9px] lg:text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] font-display">Próximas Citas ({citasSiguientes.length})</h2>
                                        </div>
                                    </div>

                                    {loading ? (
                                        <div className="bg-muted/40 p-8 flex flex-col items-center justify-center border border-border rounded-[2rem] shadow-2xl backdrop-blur-sm">
                                            <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                                            <p className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] animate-pulse">Actualizando...</p>
                                        </div>
                                    ) : citasSiguientes.length === 0 ? (
                                        <div className="bg-card p-10 text-center border border-border shadow-sm rounded-[2rem] group transition-all duration-700">
                                            <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-6 border border-border text-muted-foreground/40 shadow-inner">
                                                <CheckCircle2 className="w-8 h-8" />
                                            </div>
                                            <p className="text-muted-foreground font-black uppercase tracking-[0.2em] text-[10px]">Sin más citas</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-3 lg:gap-4">
                                            {citasVisibles.map((cita: CitaDesdeVista, index: number) => (
                                                <div
                                                    key={cita.id}
                                                    className={`animate-slide-in ${index === 0 ? '' : index === 1 ? 'delay-100' : 'delay-200'}`}
                                                >
                                                    <CitaCard
                                                        cita={cita}
                                                        onUpdate={cargarCitas}
                                                        currentTime={currentTime!}
                                                        allCitas={citasActivas}
                                                        bloqueos={stableBloqueos}
                                                        almuerzoBarbero={almuerzoProfesional}
                                                        horarioSucursal={sucursal}
                                                        servicios={allServicios}
                                                        barberos={allProfesionales}
                                                    />
                                                </div>
                                            ))}
                                            {citasSiguientes.length > CITAS_INICIAL && (
                                                <button
                                                    onClick={() => setShowAllCitas(v => !v)}
                                                    className="w-full py-2.5 rounded-2xl border border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
                                                >
                                                    {showAllCitas
                                                        ? 'Mostrar menos'
                                                        : `Ver ${citasSiguientes.length - CITAS_INICIAL} más`}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {seccion === 'finanzas' && profesional && (
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 scroll-smooth bg-background">
                        <div className="max-w-7xl mx-auto">
                            <FinanzasProfesional 
                                profesional={profesional} 
                                onBack={() => setSeccion('agenda')}
                            />
                        </div>
                    </div>
                )}
            </main>

            {checkoutCita && (
                <CheckOutModal
                    cita={checkoutCita}
                    isOpen={!!checkoutCita}
                    onClose={() => setCheckoutCita(null)}
                    onUpdate={() => setTimeout(cargarCitas, 300)}
                />
            )}

            <TabletNuevaCitaModal
                isOpen={isNewCitaModalOpen}
                onClose={() => setIsNewCitaModalOpen(false)}
                profesionalId={profesional.id}
                sucursalId={profesional.sucursal_id || ''}
                horarioSucursalProps={sucursal?.horario_apertura}
                citasDelDia={citas}
                onCitaCreada={() => cargarAgenda()}
                bloqueosDelDia={bloqueosAgenda}
                almuerzoProfesionalProps={almuerzoProfesional}
                serviciosProp={allServicios}
            />

            <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogContent className="bg-background border-border p-0 overflow-hidden shadow-2xl max-w-sm rounded-t-[2rem] sm:rounded-[2rem]">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-amber-600" />
                    <div className="p-6">
                        <DialogHeader className="flex flex-row items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center border border-border text-foreground/40">
                                <Settings className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <DialogTitle className="text-base font-black text-foreground uppercase tracking-tight">Configuración</DialogTitle>
                                <DialogDescription className="text-xs font-medium text-foreground/30">Preferencias del sistema</DialogDescription>
                            </div>
                        </DialogHeader>
                        <div className="space-y-6">
                            <div>
                                <p className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.3em] mb-4">Notificaciones</p>
                                <div className="bg-foreground/5 rounded-2xl border border-border p-5">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                                                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-foreground leading-tight">Sonido de alerta</p>
                                                <p className="text-[10px] text-foreground/40">Al agendar una nueva cita</p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={soundEnabled}
                                            onCheckedChange={toggleSound}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="mt-8">
                            <Button
                                onClick={() => setShowSettings(false)}
                                className="w-full h-14 bg-foreground/5 text-foreground/60 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-border hover:bg-foreground/10"
                            >
                                Listo
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
                <DialogContent className="bg-background border-red-500/20 p-0 overflow-hidden shadow-2xl max-w-sm rounded-[2rem]">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-600" />
                    <div className="p-8">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-400 mx-auto mb-6">
                            <LogOut className="w-8 h-8" />
                        </div>
                        <DialogHeader className="text-center mb-6">
                            <DialogTitle className="text-lg font-black text-foreground uppercase tracking-tight text-center">¿Cerrar Sesión?</DialogTitle>
                            <DialogDescription className="text-xs text-foreground/40 text-center leading-relaxed mt-2">
                                Se eliminará la sesión local. Necesitarás ingresar tu acceso nuevamente.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="flex flex-row gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 h-12 bg-foreground/5 text-foreground/40 rounded-xl font-black uppercase tracking-widest text-[9px] border border-border hover:bg-foreground/10"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => { localStorage.removeItem('profesional_session'); router.replace('/tablet/login'); }}
                                className="flex-[2] h-12 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-[0_4px_12px_rgba(239,68,68,0.3)] flex items-center justify-center gap-2"
                            >
                                <LogOut className="w-4 h-4" />
                                Sí, salir
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
