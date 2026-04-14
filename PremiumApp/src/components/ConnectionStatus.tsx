'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export function ConnectionStatus() {
    const [status, setStatus] = useState<'loading' | 'connected' | 'error' | 'demo'>('loading')
    const [message, setMessage] = useState('')
    const [details, setDetails] = useState<any>(null)

    useEffect(() => {
        const checkConnection = async () => {
            const supabase = createClient()

            // Check if we are in demo mode (client-side check in lib/supabase.ts)
            // We can infer this if the client is essentially a mock, but let's try a real query.
            // If the query fails with a specific "Demo mode" error or similar, we know.
            // Actually, let's just try to fetch the sucursal or services.

            try {
                const start = performance.now()
                // Check basic connection
                const { data, error } = await (supabase.from('sucursales') as any).select('count').single()
                const end = performance.now()

                if (error) {
                    console.error('Supabase Connection Error:', error)
                    if (error.message?.includes('Demo mode')) {
                        setStatus('demo')
                        setMessage('Modo Demo (Sin Conexión)')
                    } else {
                        setStatus('error')
                        setMessage(`Error de Conexión: ${error.message}`)
                        setDetails(error)
                    }
                } else {
                    // Connection successful, let's get some stats to help debugging
                    const { count: citasCount } = await (supabase.from('citas') as any).select('*', { count: 'exact', head: true })

                    setStatus('connected')
                    setMessage(`Conectado (${(end - start).toFixed(0)}ms) • ${citasCount} citas encontradas`)
                }
            } catch (err: any) {
                console.error('Connection Exception:', err)
                setStatus('error')
                setMessage(`Error Inesperado: ${err.message}`)
            }
        }

        checkConnection()
    }, [])

    if (status === 'loading') return (
        <div className="fixed bottom-4 left-4 z-[9999] p-1.5 bg-muted/80 backdrop-blur-md rounded-full border border-border animate-pulse">
            <div className="w-2 h-2 rounded-full bg-slate-500" />
        </div>
    )

    return (
        <div className={`
            fixed bottom-4 left-4 z-[9999] px-3 py-2 rounded-full shadow-2xl border backdrop-blur-xl transition-all duration-500 flex items-center gap-2 group hover:px-4
            ${status === 'connected' ? 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10' : ''}
            ${status === 'error' ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10' : ''}
            ${status === 'demo' ? 'bg-amber-500/5 border-primary/20 hover:bg-amber-500/10' : ''}
        `}>
            <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75
                    ${status === 'connected' ? 'bg-emerald-400' : ''}
                    ${status === 'error' ? 'bg-red-400' : ''}
                    ${status === 'demo' ? 'bg-amber-400' : ''}
                `}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2
                    ${status === 'connected' ? 'bg-emerald-500' : ''}
                    ${status === 'error' ? 'bg-red-500' : ''}
                    ${status === 'demo' ? 'bg-primary' : ''}
                `}></span>
            </span>

            <span className={`text-[10px] font-black uppercase tracking-widest hidden group-hover:block transition-all
                ${status === 'connected' ? 'text-emerald-400/70' : ''}
                ${status === 'error' ? 'text-red-400/70' : ''}
                ${status === 'demo' ? 'text-amber-400/70' : ''}
            `}>
                {status === 'connected' ? 'En línea' : status === 'demo' ? 'Demo' : 'Error'}
            </span>

            {/* Subtle dot label for non-hover state */}
            <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-tighter group-hover:hidden">
                {status === 'connected' ? 'OK' : '!!'}
            </span>
        </div>
    )
}
