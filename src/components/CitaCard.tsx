'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { CitaConRelaciones, EstadoCita } from '@/lib/types'
import { APP_TIMEZONE } from '@/lib/timezone'
import { CobroModal } from './CobroModal'

// ── Config de estilos por estado ────────────────────────────────────────────
const ESTADO_CONFIG = {
    en_proceso: {
        wrapper:  'bg-[#E1F5EE] border-[#1D9E75] dark:bg-emerald-950/40 dark:border-[#1D9E75]',
        name:     'text-[#04342C] dark:text-emerald-300',
        service:  'text-[#0F6E56] dark:text-emerald-400',
        time:     'text-[#5DCAA5] dark:text-emerald-500',
        badge:    'bg-[#9FE1CB] text-[#085041] dark:bg-emerald-900/80 dark:text-emerald-200',
        payBtn:   'bg-[#1D9E75] dark:bg-emerald-600 text-white',
        label:    'En proceso',
        icon:     'pay' as const,
    },
    confirmada: {
        wrapper:  'bg-[#EEEDFE] border-[#534AB7] dark:bg-indigo-950/40 dark:border-[#7F77DD]',
        name:     'text-[#26215C] dark:text-indigo-300',
        service:  'text-[#7F77DD] dark:text-indigo-400',
        time:     'text-[#AFA9EC] dark:text-indigo-500',
        badge:    'bg-[#CECBF6] text-[#3C3489] dark:bg-indigo-900/80 dark:text-indigo-200',
        payBtn:   'bg-[#534AB7] dark:bg-indigo-600 text-white',
        label:    'Confirmada',
        icon:     'play' as const,
    },
    finalizada: {
        wrapper:  'bg-[#F1EFE8] border-[#B4B2A9] dark:bg-slate-800/40 dark:border-slate-600',
        name:     'text-[#444441] dark:text-slate-300',
        service:  'text-[#888780] dark:text-slate-400',
        time:     'text-[#B4B2A9] dark:text-slate-500',
        badge:    'bg-[#D3D1C7] text-[#5F5E5A] dark:bg-slate-700 dark:text-slate-200',
        payBtn:   'bg-[#888780] dark:bg-slate-600 text-white',
        label:    'Finalizada',
        icon:     'check' as const,
    },
    cancelada: {
        wrapper:  'bg-[#FDE2E2] border-[#E53E3E] dark:bg-red-950/40 dark:border-[#E53E3E]',
        name:     'text-[#742A2A] dark:text-red-300',
        service:  'text-[#9B2C2C] dark:text-red-400',
        time:     'text-[#F56565] dark:text-red-500',
        badge:    'bg-[#FED7D7] text-[#822727] dark:bg-red-900/80 dark:text-red-200',
        payBtn:   'bg-[#E53E3E] dark:bg-red-600 text-white',
        label:    'Cancelada',
        icon:     'check' as const,
    }
} as const

type EstadoKey = keyof typeof ESTADO_CONFIG

function formatHora(iso: string) {
    return new Date(iso).toLocaleTimeString('es-MX', {
        hour: '2-digit', minute: '2-digit', timeZone: APP_TIMEZONE,
    })
}

function IconPay() {
    return (
        <svg className="w-[17px] h-[17px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
    )
}

function IconCheck() {
    return (
        <svg className="w-[17px] h-[17px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
    )
}

function IconPlay() {
    return (
        <svg className="w-[17px] h-[17px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    )
}

function IconCancel() {
    return (
        <svg className="w-[17px] h-[17px] text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
    )
}

interface CitaCardProps {
    cita: CitaConRelaciones
    onUpdate?: () => void
    isHighlighted?: boolean
    style?: React.CSSProperties
}

export function CitaCard({ cita, onUpdate, isHighlighted, style }: CitaCardProps) {
    const [loading, setLoading] = useState(false)
    const [showCobro, setShowCobro] = useState(false)
    const [supabase] = useState(() => createClient())

    let estadoRaw = (cita.estado ?? 'confirmada') as string
    if (estadoRaw === 'pendiente') estadoRaw = 'confirmada'
    
    const estado = estadoRaw as EstadoKey
    const cfg = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.confirmada
    const esFinalizada = estado === 'finalizada' || estado === 'cancelada'

    const actualizarEstado = async (nuevoEstado: EstadoCita) => {
        setLoading(true)
        try {
            const { error } = await (supabase.from('citas') as any)
                .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
                .eq('id', cita.id)
            if (!error) onUpdate?.()
        } catch (err) {
            console.error('Failed to update:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <div
                style={style}
                className={`flex items-center gap-2.5 border-l-[3px] rounded-r-[10px] px-3 py-2.5 transition-opacity duration-200 ${cfg.wrapper} ${esFinalizada ? 'opacity-70' : ''} ${isHighlighted ? 'ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/20' : ''}`}
            >
                <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-medium leading-tight ${cfg.name}`}>
                        {cita.cliente_nombre ?? '—'}
                    </p>
                    <p className={`text-[11px] mt-0.5 ${cfg.service}`}>
                        {cita.servicio?.nombre ?? '—'}
                    </p>
                    <p className={`text-[10px] mt-0.5 ${cfg.time}`}>
                        {formatHora(cita.timestamp_inicio)} — {formatHora(cita.timestamp_fin)}
                    </p>
                    
                    {cita.monto_pagado && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                            <span>💵 ${cita.monto_pagado.toLocaleString('es-MX')}</span>
                            {cita.metodo_pago && <span className="font-normal opacity-70">({cita.metodo_pago})</span>}
                        </div>
                    )}
                </div>

                <span className={`text-[10px] font-medium rounded-md px-2 py-1 shrink-0 ${cfg.badge}`}>
                    {cfg.label}
                </span>

                <div className="flex flex-col gap-1.5 shrink-0">
                    {estado === 'confirmada' && (
                        <>
                            <button
                                onClick={() => actualizarEstado('en_proceso')}
                                disabled={loading || esFinalizada}
                                title="Iniciar"
                                className={`w-9 h-9 rounded-lg flex items-center justify-center ${cfg.payBtn} active:scale-90 transition-transform disabled:opacity-50`}
                            >
                                {loading ? <div className="spinner w-4 h-4 border-white" /> : <IconPlay />}
                            </button>
                            <button
                                onClick={() => actualizarEstado('cancelada')}
                                disabled={loading || esFinalizada}
                                title="No Show"
                                className={`w-9 h-9 rounded-lg flex items-center justify-center border border-red-500/30 hover:bg-red-500/10 active:scale-90 transition-transform disabled:opacity-50`}
                            >
                                <IconCancel />
                            </button>
                        </>
                    )}
                    {estado === 'en_proceso' && (
                        <button
                            onClick={() => setShowCobro(true)}
                            disabled={loading || esFinalizada}
                            title="Cobrar"
                            className={`w-9 h-9 rounded-lg flex items-center justify-center ${cfg.payBtn} active:scale-90 transition-transform disabled:opacity-50`}
                        >
                            <IconPay />
                        </button>
                    )}
                    {esFinalizada && (
                        <button
                            disabled
                            title={estado === 'cancelada' ? 'Cita cancelada' : 'Cita finalizada'}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center ${cfg.payBtn} disabled:opacity-80`}
                        >
                            <IconCheck />
                        </button>
                    )}
                </div>
            </div>

            {showCobro && (
                <CobroModal
                    cita={cita}
                    onClose={() => setShowCobro(false)}
                    onSuccess={() => { onUpdate?.(); setShowCobro(false); }}
                />
            )}
        </>
    )
}
