'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { CitaConRelaciones } from '@/lib/types'
import { APP_TIMEZONE } from '@/lib/timezone'

interface CobroModalProps {
    cita: CitaConRelaciones | null
    onClose: () => void
    onSuccess: () => void
}

type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia'

const METODOS: { id: MetodoPago; label: string; icon: string; color: string }[] = [
    { id: 'efectivo',      label: 'Efectivo',      icon: '💵', color: 'from-emerald-600 to-emerald-700' },
    { id: 'tarjeta',       label: 'Tarjeta',        icon: '💳', color: 'from-blue-600 to-blue-700' },
    { id: 'transferencia', label: 'Transferencia',  icon: '📲', color: 'from-purple-600 to-purple-700' },
]

/**
 * Modal de cobro: muestra resumen del servicio, permite elegir método de pago
 * y registra la cita como finalizada con monto y método en la base de datos.
 */
export function CobroModal({ cita, onClose, onSuccess }: CobroModalProps) {
    const [metodo, setMetodo] = useState<MetodoPago | null>(null)
    const [monto, setMonto] = useState<string>(cita?.servicio?.precio?.toString() ?? '')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [supabase] = useState(() => createClient())

    if (!cita) return null

    const precio = cita.servicio?.precio ?? 0
    const montoNum = parseFloat(monto) || 0

    const horaInicio = new Date(cita.timestamp_inicio).toLocaleTimeString('es-MX', {
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: APP_TIMEZONE
    })

    const handleCobrar = async () => {
        if (!metodo) { setError('Selecciona un método de pago'); return }
        if (montoNum <= 0) { setError('El monto debe ser mayor a 0'); return }

        setLoading(true)
        setError(null)

        try {
            const { error: dbError } = await (supabase.from('citas') as any)
                .update({
                    estado: 'finalizada',
                    monto_pagado: montoNum,
                    metodo_pago: metodo,
                    timestamp_fin_servicio: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', cita.id)

            if (dbError) {
                console.error('Error al finalizar cita:', dbError)
                setError('Error al registrar el cobro. Intenta de nuevo.')
                return
            }

            onSuccess()
            onClose()
        } catch (err) {
            console.error('Error inesperado:', err)
            setError('Error inesperado. Intenta de nuevo.')
        } finally {
            setLoading(false)
        }
    }

    return (
        /* Overlay */
        <div
            className="fixed inset-0 z-[999] flex items-end justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            {/* Modal — bottom sheet en mobile, centrado en desktop */}
            <div className="
                relative w-full sm:max-w-md sm:mb-8 sm:mx-4
                bg-slate-900 border border-slate-700/60
                rounded-t-3xl sm:rounded-3xl
                shadow-2xl shadow-black/60
                overflow-hidden
                animate-slide-in
                max-h-[92dvh] flex flex-col
            ">
                {/* Drag handle — solo mobile */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
                    <div className="w-10 h-1 rounded-full bg-slate-600" />
                </div>

                {/* Header gradient */}
                <div className="h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 shrink-0" />

                {/* Scrollable content */}
                <div className="overflow-y-auto overscroll-contain flex-1">
                    <div className="p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                    {/* Title */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-white leading-tight">Registro de Cobro</h2>
                                <p className="text-xs text-slate-400">Finalizar servicio</p>
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

                    {/* Service Summary Card */}
                    <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-4 mb-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-500 flex items-center justify-center shrink-0 text-lg font-black text-white">
                                {cita.cliente_nombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-white truncate">{cita.cliente_nombre}</p>
                                <p className="text-xs text-slate-400">{horaInicio} · {cita.servicio?.nombre ?? 'Servicio'}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-700/40">
                            <span className="text-sm text-slate-400">Precio del servicio</span>
                            <span className="text-2xl font-black text-emerald-400">${precio.toLocaleString('es-MX')}</span>
                        </div>
                    </div>

                    {/* Monto */}
                    <div className="mb-5">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Monto a cobrar
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</span>
                            <input
                                type="number"
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-4 py-3 text-xl font-black text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                min="0"
                                step="0.01"
                            />
                        </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                            Método de pago
                        </label>
                        <div className="grid grid-cols-3 gap-2.5">
                            {METODOS.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setMetodo(m.id)}
                                    className={`
                                        relative flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 transition-all duration-200 active:scale-95
                                        ${metodo === m.id
                                            ? `bg-gradient-to-b ${m.color} border-white/30 shadow-lg scale-[1.02]`
                                            : 'bg-slate-800/60 border-slate-700/50 hover:border-slate-600'
                                        }
                                    `}
                                >
                                    {metodo === m.id && (
                                        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                                            <svg className="w-2.5 h-2.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                    <span className="text-2xl leading-none">{m.icon}</span>
                                    <span className={`text-[11px] font-bold leading-tight text-center ${metodo === m.id ? 'text-white' : 'text-slate-400'}`}>
                                        {m.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleCobrar}
                            disabled={loading || !metodo}
                            className={`
                                flex-[2] py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95
                                ${metodo && !loading
                                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                }
                            `}
                        >
                            {loading ? (
                                <div className="spinner w-4 h-4" />
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Cobrar y Finalizar
                                </>
                            )}
                        </button>
                    </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
