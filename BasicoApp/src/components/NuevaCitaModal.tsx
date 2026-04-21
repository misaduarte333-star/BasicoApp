'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { APP_TIMEZONE } from '@/lib/timezone'
import type { Servicio } from '@/lib/types'

// ─── Tipos ─────────────────────────────────────────────────────────────────

interface ClienteSugerido {
    nombre: string
    telefono: string
}

interface SlotInfo {
    hora: string          // "10:00"
    label: string         // "10:00 am"
    estado: 'disponible' | 'ocupado' | 'pasado' | 'fuera'
    citaId?: string
}

interface NuevaCitaModalProps {
    sucursalId: string
    barberoId: string
    horaInicio: number   // hora de apertura del profesional (ej. 9)
    horaFin: number      // hora de cierre del profesional (ej. 20)
    citasHoy: { timestamp_inicio: string; timestamp_fin: string; id: string }[]
    currentTime: Date
    onClose: () => void
    onSuccess: () => void
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt12(hora: string) {
    const [h, m] = hora.split(':').map(Number)
    const ampm = h >= 12 ? 'pm' : 'am'
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

function generarSlotsDia(horaInicio: number, horaFin: number, duracion: number): string[] {
    const slots: string[] = []
    for (let h = horaInicio; h < horaFin; h++) {
        for (let m = 0; m < 60; m += duracion) {
            if (h * 60 + m + duracion <= horaFin * 60) {
                slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
            }
        }
    }
    return slots
}

function slotOcupado(
    slotHora: string,
    duracion: number,
    citasHoy: { timestamp_inicio: string; timestamp_fin: string; id: string }[],
    todayStr: string
): string | undefined {
    const slotStart = new Date(`${todayStr}T${slotHora}:00-07:00`).getTime()
    const slotEnd = slotStart + duracion * 60_000

    return citasHoy.find(c => {
        const cStart = new Date(c.timestamp_inicio).getTime()
        const cEnd = new Date(c.timestamp_fin).getTime()
        // Se superpone si el slot empieza antes de que acabe la cita y el slot termina después de que empieza
        return slotStart < cEnd && slotEnd > cStart
    })?.id
}

// ─── Componente ─────────────────────────────────────────────────────────────

export function NuevaCitaModal({
    sucursalId,
    barberoId,
    horaInicio,
    horaFin,
    citasHoy,
    currentTime,
    onClose,
    onSuccess,
}: NuevaCitaModalProps) {
    const [supabase] = useState(() => createClient())

    // Form state
    const [clienteInput, setClienteInput] = useState('')
    const [telefono, setTelefono] = useState('')
    const [servicioId, setServicioId] = useState('')
    const [slotSeleccionado, setSlotSeleccionado] = useState('')

    // Data
    const [servicios, setServicios] = useState<Servicio[]>([])
    const [sugerencias, setSugerencias] = useState<ClienteSugerido[]>([])
    const [showSugerencias, setShowSugerencias] = useState(false)

    // UI state
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isMounted, setIsMounted] = useState(false)

    const inputRef = useRef<HTMLInputElement>(null)
    const sugerenciasRef = useRef<HTMLDivElement>(null)

    useEffect(() => { setIsMounted(true) }, [])

    // Cargar servicios de la sucursal
    useEffect(() => {
        if (!sucursalId) return
        ;(async () => {
            const { data } = await supabase
                .from('servicios')
                .select('*')
                .eq('sucursal_id', sucursalId)
                .eq('activo', true)
                .order('nombre')
            if (data) setServicios(data)
        })()
    }, [sucursalId, supabase])

    // Autocompletar clientes únicos de la sucursal
    const buscarClientes = useCallback(async (q: string) => {
        if (q.length < 2) { setSugerencias([]); return }
        const { data } = await supabase
            .from('citas')
            .select('cliente_nombre, cliente_telefono')
            .eq('sucursal_id', sucursalId)
            .ilike('cliente_nombre', `%${q}%`)
            .order('created_at', { ascending: false })
            .limit(20)

        if (!data) return
        // Deduplicar por nombre
        const vistos = new Set<string>()
        const unicos: ClienteSugerido[] = []
        for (const r of data) {
            if (!vistos.has(r.cliente_nombre)) {
                vistos.add(r.cliente_nombre)
                unicos.push({ nombre: r.cliente_nombre, telefono: r.cliente_telefono || '' })
            }
        }
        setSugerencias(unicos)
        setShowSugerencias(true)
    }, [sucursalId, supabase])

    useEffect(() => {
        const t = setTimeout(() => buscarClientes(clienteInput), 300)
        return () => clearTimeout(t)
    }, [clienteInput, buscarClientes])

    // Cerrar sugerencias al hacer clic fuera
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                sugerenciasRef.current &&
                !sugerenciasRef.current.contains(e.target as Node) &&
                !inputRef.current?.contains(e.target as Node)
            ) {
                setShowSugerencias(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // ─── Slots dinámicos ────────────────────────────────────────────────────
    const servicioSeleccionado = servicios.find(s => s.id === servicioId)
    const duracionServicio = servicioSeleccionado?.duracion_minutos ?? 60
    const INTERVALO_GRID = 60 // El grid visual SIEMPRE se muestra de 1 hora en 1 hora
    const todayStr = currentTime.toLocaleDateString('en-CA', { timeZone: APP_TIMEZONE })

    const currentHour = parseInt(
        currentTime.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false, timeZone: APP_TIMEZONE }), 10
    )
    const currentMinute = parseInt(
        currentTime.toLocaleTimeString('en-US', { minute: '2-digit', timeZone: APP_TIMEZONE }), 10
    )

    const slots: SlotInfo[] = generarSlotsDia(horaInicio, horaFin, INTERVALO_GRID).map(hora => {
        const [h, m] = hora.split(':').map(Number)
        const isPast = h < currentHour || (h === currentHour && m <= currentMinute)
        // Revisamos si el espacio está ocupado tomando en cuenta la duración REAL del servicio
        const ocupadaId = slotOcupado(hora, duracionServicio, citasHoy, todayStr)
        return {
            hora,
            label: fmt12(hora),
            estado: isPast ? 'pasado' : ocupadaId ? 'ocupado' : 'disponible',
            citaId: ocupadaId,
        }
    })

    // ─── Submit ─────────────────────────────────────────────────────────────
    const handleGuardar = async () => {
        if (!clienteInput.trim()) { setError('Ingresa el nombre del cliente'); return }
        if (!servicioId) { setError('Selecciona un servicio'); return }
        if (!slotSeleccionado) { setError('Selecciona un horario'); return }

        setLoading(true)
        setError(null)

        try {
            const inicio = new Date(`${todayStr}T${slotSeleccionado}:00-07:00`)
            const fin = new Date(inicio.getTime() + duracionServicio * 60_000)

            const { error: dbErr } = await (supabase.from('citas') as any).insert([{
                sucursal_id: sucursalId,
                barbero_id: barberoId,
                servicio_id: servicioId,
                cliente_nombre: clienteInput.trim(),
                cliente_telefono: telefono.trim() || '',
                timestamp_inicio: inicio.toISOString(),
                timestamp_fin: fin.toISOString(),
                origen: 'manual',
                estado: 'confirmada',
                notas: null,
            }])

            if (dbErr) throw dbErr
            onSuccess()
            onClose()
        } catch (err: any) {
            setError(err?.message ?? 'Error al guardar la cita')
        } finally {
            setLoading(false)
        }
    }

    // ─── JSX ────────────────────────────────────────────────────────────────
    return (
        <div
            className="fixed inset-0 z-[999] flex items-end justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className="
                relative w-full sm:max-w-lg sm:mb-8 sm:mx-4
                bg-slate-900 border border-slate-700/60
                rounded-t-3xl sm:rounded-3xl
                shadow-2xl shadow-black/60
                max-h-[95dvh] flex flex-col
                animate-slide-in
            ">
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-0 sm:hidden shrink-0">
                    <div className="w-10 h-1 rounded-full bg-slate-600" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white leading-tight">Nueva Cita</h2>
                            <p className="text-[10px] text-slate-400">
                                {currentTime.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: APP_TIMEZONE })}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Scrollable form */}
                <div className="overflow-y-auto overscroll-contain flex-1 px-5 py-4 space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">

                    {/* Cliente */}
                    <div className="relative">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Cliente
                        </label>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <input
                                ref={inputRef}
                                type="text"
                                value={clienteInput}
                                onChange={e => { setClienteInput(e.target.value); setShowSugerencias(true) }}
                                onFocus={() => clienteInput.length >= 2 && setShowSugerencias(true)}
                                placeholder="Nombre del cliente..."
                                className="w-full bg-slate-800 border border-slate-700 focus:border-purple-500 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none transition-colors"
                            />
                        </div>

                        {/* Dropdown de sugerencias */}
                        {showSugerencias && sugerencias.length > 0 && (
                            <div
                                ref={sugerenciasRef}
                                className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden max-h-44 overflow-y-auto"
                            >
                                {sugerencias.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            setClienteInput(s.nombre)
                                            setTelefono(s.telefono)
                                            setShowSugerencias(false)
                                        }}
                                        className="w-full text-left px-4 py-2.5 hover:bg-slate-700 transition-colors flex items-center justify-between gap-2"
                                    >
                                        <span className="text-sm text-white font-medium">{s.nombre}</span>
                                        {s.telefono && (
                                            <span className="text-[10px] text-slate-400 font-mono shrink-0">{s.telefono}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Teléfono */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Teléfono <span className="font-normal normal-case text-slate-600">(opcional)</span>
                        </label>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <input
                                type="tel"
                                value={telefono}
                                onChange={e => setTelefono(e.target.value)}
                                placeholder="+52 555 000 0000"
                                className="w-full bg-slate-800 border border-slate-700 focus:border-purple-500 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* Servicio */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Servicio
                        </label>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            <select
                                value={servicioId}
                                onChange={e => { setServicioId(e.target.value); setSlotSeleccionado('') }}
                                className="w-full appearance-none bg-slate-800 border border-slate-700 focus:border-purple-500 rounded-xl pl-9 pr-8 py-2.5 text-sm text-white focus:outline-none transition-colors"
                            >
                                <option value="">Seleccionar servicio...</option>
                                {servicios.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.nombre} — {s.duracion_minutos}min · ${s.precio.toLocaleString('es-MX')}
                                    </option>
                                ))}
                            </select>
                            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>

                        {servicioSeleccionado && (
                            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400">
                                <span className="text-purple-400 font-bold">${servicioSeleccionado.precio.toLocaleString('es-MX')}</span>
                                <span>·</span>
                                <span>{servicioSeleccionado.duracion_minutos} min</span>
                            </div>
                        )}
                    </div>

                    {/* Slots de tiempo (siempre visibles, asumen 60 min por defecto) */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Horario disponible
                        </label>

                        {/* Leyenda de slots */}
                        <div className="flex items-center gap-3 mb-2.5 text-[9px] text-slate-500">
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-sm bg-purple-500/30 border border-purple-500/60" />
                                Disponible
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-sm bg-slate-700/60 border border-slate-600/40" />
                                Pasado
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-sm bg-red-500/20 border border-red-500/40" />
                                Ocupado
                            </span>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {slots.map(slot => {
                                const isSelected = slotSeleccionado === slot.hora
                                const disabled = slot.estado === 'ocupado' // Only disable if actually occupied!

                                let cls = ''
                                if (isSelected) {
                                    cls = 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/30 scale-[1.04]'
                                } else if (slot.estado === 'ocupado') {
                                    cls = 'bg-red-500/10 border-red-500/30 text-red-400/70 cursor-not-allowed'
                                } else if (slot.estado === 'pasado') {
                                    cls = 'bg-slate-800/40 border-slate-700/30 text-slate-400 hover:bg-slate-700/60 active:scale-95 cursor-pointer'
                                } else {
                                    cls = 'bg-purple-500/10 border-purple-500/40 text-purple-300 hover:bg-purple-500/25 hover:border-purple-400 active:scale-95 cursor-pointer'
                                }

                                return (
                                    <button
                                        key={slot.hora}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => setSlotSeleccionado(slot.hora)}
                                        className={`
                                            relative flex flex-col items-center py-2.5 px-1 rounded-xl border-2
                                            text-center transition-all duration-150 text-[11px] font-bold
                                            ${cls}
                                        `}
                                    >
                                        {slot.label}
                                        {slot.estado === 'ocupado' && (
                                            <span className="text-[8px] font-normal text-red-400/60 leading-none mt-0.5">Ocupado</span>
                                        )}
                                        {isSelected && (
                                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center">
                                                <svg className="w-2 h-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>

                        {slots.every(s => s.estado !== 'disponible') && (
                            <p className="text-xs text-amber-400/80 mt-2 text-center">
                                No hay horarios disponibles para hoy
                            </p>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Resumen + Acción */}
                    {slotSeleccionado && servicioSeleccionado && (
                        <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-3.5">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Resumen</p>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-white font-semibold truncate">{clienteInput || '—'}</span>
                                <span className="text-purple-400 font-bold shrink-0 ml-2">{fmt12(slotSeleccionado)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                                <span>{servicioSeleccionado.nombre}</span>
                                <span>{servicioSeleccionado.duracion_minutos} min · ${servicioSeleccionado.precio.toLocaleString('es-MX')}</span>
                            </div>
                        </div>
                    )}

                    {/* Botones */}
                    <div className="flex gap-3 pt-1">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleGuardar}
                            disabled={loading || !clienteInput.trim() || !servicioId || !slotSeleccionado}
                            className={`
                                flex-[2] py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95
                                ${!loading && clienteInput.trim() && servicioId && slotSeleccionado
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20'
                                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                }
                            `}
                        >
                            {loading
                                ? <div className="spinner w-4 h-4" />
                                : <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Agendar Cita
                                </>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
