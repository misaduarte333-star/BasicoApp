'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { CitaConRelaciones, EstadoCita } from '@/lib/types'
import { APP_TIMEZONE } from '@/lib/timezone'
import { CobroModal } from './CobroModal'

/**
 * Propiedades del componente CitaCard
 */
interface CitaCardProps {
    cita: CitaConRelaciones
    onUpdate?: () => void
    isHighlighted?: boolean
    style?: React.CSSProperties
}

/**
 * Tarjeta individual para mostrar la información de una cita.
 * Flujo de estados: confirmada → en_proceso → finalizada (vía modal de cobro)
 * No Show: → cancelada
 */
export function CitaCard({ cita, onUpdate, isHighlighted, style }: CitaCardProps) {
    const [loading, setLoading] = useState(false)
    const [showCobro, setShowCobro] = useState(false)
    const [supabase] = useState(() => createClient())

    /**
     * Actualiza el estado de la cita en Supabase
     */
    const actualizarEstado = async (nuevoEstado: EstadoCita) => {
        setLoading(true)
        try {
            const { error } = await (supabase.from('citas') as any)
                .update({
                    estado: nuevoEstado,
                    updated_at: new Date().toISOString()
                })
                .eq('id', cita.id)

            if (error) {
                console.error('Error updating status:', error)
            }
            onUpdate?.()
        } catch (err) {
            console.error('Failed to update:', err)
        } finally {
            setLoading(false)
        }
    }

    const getStatusConfig = () => {
        switch (cita.estado) {
            case 'confirmada':
                return {
                    bg: 'from-blue-600/90 to-blue-700/90',
                    border: 'border-blue-500/30',
                    badge: 'status-confirmed',
                    label: 'Confirmada'
                }
            case 'en_proceso':
                return {
                    bg: 'from-emerald-600/90 to-emerald-700/90',
                    border: 'border-emerald-500/30',
                    badge: 'status-in-progress',
                    label: 'En Proceso'
                }
            case 'finalizada':
                return {
                    bg: 'from-slate-600/90 to-slate-700/90',
                    border: 'border-slate-500/30',
                    badge: 'status-completed',
                    label: 'Finalizada'
                }
            case 'cancelada':
                return {
                    bg: 'from-red-600/90 to-red-700/90',
                    border: 'border-red-500/30',
                    badge: 'status-cancelled',
                    label: 'Cancelada'
                }
            default:
                return {
                    bg: 'from-slate-600/90 to-slate-700/90',
                    border: 'border-slate-500/30',
                    badge: 'status-completed',
                    label: cita.estado
                }
        }
    }

    const config = getStatusConfig()
    const horaInicio = new Date(cita.timestamp_inicio).toLocaleTimeString('es-MX', {
        hour: '2-digit', minute: '2-digit', timeZone: APP_TIMEZONE
    })
    const horaFin = new Date(cita.timestamp_fin).toLocaleTimeString('es-MX', {
        hour: '2-digit', minute: '2-digit', timeZone: APP_TIMEZONE
    })

    return (
        <>
            <div
                className={`
                    rounded-2xl p-3.5 md:p-5 backdrop-blur-sm border animate-slide-in
                    bg-gradient-to-r ${config.bg} ${config.border}
                    ${isHighlighted ? 'ring-2 ring-white/30 shadow-lg shadow-emerald-500/20' : ''}
                    transition-all duration-300 hover:scale-[1.01]
                `}
                style={style}
            >
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3 md:gap-4">
                    {/* Left: Client Info */}
                    <div className="flex-1 min-w-0 w-full">
                        <div className="flex items-center gap-2.5 mb-2">
                            {/* Avatar */}
                            <div className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                <span className="text-base md:text-xl font-bold text-white/90">
                                    {cita.cliente_nombre.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-base md:text-xl font-bold text-foreground truncate">
                                    {cita.cliente_nombre}
                                </h3>
                                <div className="flex items-center gap-1.5 text-white/80">
                                    <span className={`status-badge text-[9px] md:text-xs px-2 py-0.5 ${config.badge}`}>
                                        {config.label}
                                    </span>
                                    {cita.origen === 'walkin' && (
                                        <span className="status-badge text-[9px] md:text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                            Walk-in
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Service & Time */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-white/70 text-[11px] md:text-sm mt-2.5">
                            <div className="flex items-center gap-1">
                                <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                                </svg>
                                <span className="truncate max-w-[120px] sm:max-w-none">{cita.servicio?.nombre || 'Servicio'}</span>
                                <span className="text-white/40">•</span>
                                <span>{cita.servicio?.duracion_minutos || 30}m</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{horaInicio} - {horaFin}</span>
                            </div>
                            {cita.monto_pagado && (
                                <div className="flex items-center gap-1 text-emerald-300 font-bold">
                                    <span>💵</span>
                                    <span>${cita.monto_pagado.toLocaleString('es-MX')}</span>
                                    {cita.metodo_pago && (
                                        <span className="text-white/50 font-normal">({cita.metodo_pago})</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {cita.notas && (
                            <p className="mt-2 text-[10px] md:text-sm text-white/50 italic line-clamp-1">
                                📝 {cita.notas}
                            </p>
                        )}
                    </div>

                    {/* Right/Bottom: Action Buttons */}
                    <div className="flex flex-row sm:flex-col gap-2 shrink-0 w-full sm:w-auto mt-1 sm:mt-0">

                        {/* confirmada → Iniciar o No Show */}
                        {cita.estado === 'confirmada' && (
                            <>
                                <button
                                    onClick={() => actualizarEstado('en_proceso')}
                                    disabled={loading}
                                    className="bg-white text-emerald-600 hover:bg-white/90 rounded-lg font-bold flex-1 sm:flex-none text-[11px] md:text-sm px-3 py-2 flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                                >
                                    {loading ? (
                                        <div className="spinner w-3 h-3 md:w-4 md:h-4" />
                                    ) : (
                                        <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    )}
                                    Iniciar
                                </button>
                                <button
                                    onClick={() => actualizarEstado('cancelada')}
                                    disabled={loading}
                                    className="bg-red-500/20 hover:bg-red-500/30 text-white border border-red-500/30 rounded-lg flex-1 sm:flex-none text-[11px] md:text-sm px-3 py-2 flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                    No Show
                                </button>
                            </>
                        )}

                        {/* en_proceso → Cobrar (abre modal) */}
                        {cita.estado === 'en_proceso' && (
                            <button
                                onClick={() => setShowCobro(true)}
                                disabled={loading}
                                className="bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-bold flex-1 sm:flex-none text-[11px] md:text-sm px-3 py-2 flex items-center justify-center gap-1.5 transition-colors shadow-md"
                            >
                                {loading ? (
                                    <div className="spinner w-3 h-3 md:w-4 md:h-4" />
                                ) : (
                                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                )}
                                Cobrar
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de cobro */}
            {showCobro && (
                <CobroModal
                    cita={cita}
                    onClose={() => setShowCobro(false)}
                    onSuccess={() => { onUpdate?.() }}
                />
            )}
        </>
    )
}
