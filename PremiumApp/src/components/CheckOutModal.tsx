'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import type { CitaDesdeVista, EstadoCita } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
    ShoppingCart,
    CheckCircle2,
    X,
    Banknote,
    Landmark,
    FileText,
    User,
    Check
} from 'lucide-react'

interface CheckOutModalProps {
    cita: CitaDesdeVista
    isOpen: boolean
    onClose: () => void
    onUpdate?: () => void
}

export function CheckOutModal({ cita, isOpen, onClose, onUpdate }: CheckOutModalProps) {
    const [loading, setLoading] = useState(false)
    const [montoFinal, setMontoFinal] = useState(cita.servicio_precio || 0)
    const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo')
    const [notasCrm, setNotasCrm] = useState('')
    const contentRef = useRef<HTMLDivElement>(null)

    // Reset fields when modal opens
    useEffect(() => {
        if (isOpen) {
            setMontoFinal(cita.servicio_precio || 0)
            setNotasCrm('')
            setMetodoPago('efectivo')
        }
    }, [isOpen, cita.servicio_precio])

    const liquidarCita = async () => {
        if (loading) return
        setLoading(true)

        try {
            const res = await fetch(`/api/citas/${cita.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    estado: 'finalizada' as EstadoCita,
                    monto_pagado: montoFinal,
                    metodo_pago: metodoPago,
                    notas_crm: notasCrm,
                }),
            })

            if (!res.ok) {
                const body = await res.json()
                throw new Error(body.message)
            }

            onClose()
            onUpdate?.()
        } catch (err: any) {
            console.error('Error in checkout:', err)
            alert('Error al procesar el cobro')
        } finally {
            setLoading(false)
        }
    }

    const suggestedAmounts = useMemo(() => [
        cita.servicio_precio || 0,
        (cita.servicio_precio || 0) + 50,
        (cita.servicio_precio || 0) + 100
    ], [cita.servicio_precio])

    const paymentMethods = [
        { id: 'efectivo' as const, label: 'Efectivo', icon: Banknote },
        { id: 'transferencia' as const, label: 'Transferencia', icon: Landmark },
    ]

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent 
                initialFocus={contentRef as any}
                showCloseButton={false}
                className="bg-background border-border text-foreground rounded-[2rem] w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[95vh] overflow-hidden p-0 outline-none border flex flex-col duration-200"
            >
                <div ref={contentRef} tabIndex={-1} className="outline-none" />
                {/* Status Bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500 z-50 shrink-0" />

                {/* Header */}
                <DialogHeader className="px-5 py-2 border-b border-border/50 bg-card/20 shrink-0 relative flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                            <ShoppingCart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="text-lg font-black uppercase tracking-tighter text-foreground font-display">
                                Confirmar Pago
                            </DialogTitle>
                            <div className="flex items-center gap-2 mt-0.5">
                                <User className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                                <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium text-[10px] px-1.5 py-0 h-4 truncate">
                                    {cita.cliente_nombre}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="w-12 h-12 rounded-xl bg-muted border border-border text-foreground/60 hover:text-foreground hover:bg-muted/80 hover:border-border/20 transition-all shrink-0 group"
                    >
                        <X className="w-7 h-7 group-hover:scale-110 transition-transform" />
                    </Button>
                </DialogHeader>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-none sm:scrollbar-thin">
                    <div className="p-3 space-y-3">
                        {/* Amount Section */}
                        <div className="bg-muted p-3 rounded-xl border border-border/50 relative overflow-hidden">
                            <Label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.4em] mb-2 block px-1">
                                Monto Total
                            </Label>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">$</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={montoFinal}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '')
                                        setMontoFinal(val ? Number(val) : 0)
                                    }}
                                    className="h-auto bg-transparent border-none p-0 text-3xl font-black text-foreground outline-none tracking-tighter focus:text-emerald-600 dark:focus:text-emerald-400 transition-colors placeholder:text-muted-foreground/30 w-full"
                                />
                            </div>

                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                {suggestedAmounts.map(val => (
                                    <Button
                                        key={val}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setMontoFinal(val)}
                                        className={cn(
                                            "h-8 px-3 rounded-lg text-xs font-bold transition-all",
                                            montoFinal === val
                                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                                                : "bg-muted border-border text-muted-foreground hover:text-foreground hover:bg-muted/80"
                                        )}
                                    >
                                        ${val}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Payment Method Section */}
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.4em] px-2 block">
                                Método de Pago
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                                {paymentMethods.map(({ id, label, icon: Icon }) => {
                                    const isSelected = metodoPago === id
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => setMetodoPago(id)}
                                            className={cn(
                                                "relative p-2.5 rounded-xl border transition-all flex flex-col items-center gap-1.5 group active:scale-[0.97]",
                                                isSelected
                                                    ? 'bg-emerald-500/10 border-emerald-500/40 font-bold'
                                                    : 'bg-muted border-border text-muted-foreground/60 hover:bg-muted/80'
                                            )}
                                        >
                                             {isSelected && (
                                                <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                                                    <Check className="w-3 h-3 text-primary-foreground stroke-[3px]" />
                                                </div>
                                            )}
                                            <div className={cn(
                                                "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                                                isSelected
                                                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                    : 'bg-muted text-muted-foreground/50 group-hover:text-muted-foreground'
                                            )}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-widest transition-colors",
                                                isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground group-hover:text-foreground'
                                            )}>
                                                {label}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Notes Section */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between px-2">
                                <Label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.4em]">
                                    Notas CRM
                                </Label>
                                <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">Opcional</span>
                            </div>
                            <Textarea
                                placeholder="Escribe detalles..."
                                value={notasCrm}
                                onChange={(e) => setNotasCrm(e.target.value)}
                                className="min-h-[50px] p-3 bg-muted border-border rounded-xl text-xs focus:bg-muted/80 transition-all placeholder:text-muted-foreground/30 text-foreground resize-none border"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer - Fixed at bottom */}
                <div className="p-3 bg-card/60 border-t border-border/50 shrink-0">
                    <div className="flex flex-col-reverse sm:flex-row gap-2">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="h-11 sm:flex-1 bg-muted text-muted-foreground rounded-xl font-black uppercase tracking-widest text-[9px] hover:text-foreground transition-all border border-border"
                        >
                            <X className="w-3.5 h-3.5 mr-2" />
                            Cancelar
                        </Button>
                        <Button
                            onClick={liquidarCita}
                            disabled={loading}
                            className={cn(
                                "h-11 sm:flex-[2] rounded-xl font-black uppercase tracking-tighter text-[13px] transition-all",
                                loading
                                    ? 'bg-emerald-500/50 text-emerald-900 cursor-not-allowed'
                                    : 'bg-emerald-500 text-primary-foreground hover:bg-emerald-400 active:scale-[0.98]'
                            )}
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                                    <span>...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Confirmar Pago</span>
                                </div>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
