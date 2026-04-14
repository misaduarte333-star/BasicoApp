'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import type { Cliente } from '@/lib/types'
import { User, Phone, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ClientAutocompleteProps {
    value: string
    onChange: (value: string) => void
    onSelect: (cliente: { id: string; nombre: string; telefono: string | null }) => void
    placeholder?: string
    className?: string
    sucursalId?: string | null
}

export function ClientAutocomplete({ value, onChange, onSelect, placeholder, className, sucursalId }: ClientAutocompleteProps) {
    const [suggestions, setSuggestions] = useState<Cliente[]>([])
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)

    const supabase = createClient()
    const containerRef = useRef<HTMLDivElement>(null)
    const skipFetchRef = useRef(false)

    const fetchSuggestions = useCallback(async (query: string) => {
        if (!query || query.length < 2) {
            setSuggestions([])
            setOpen(false)
            return
        }
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('clientes')
                .select('*')
                .eq('sucursal_id', String(sucursalId || ''))
                .or(`nombre.ilike.%${query}%,telefono.ilike.%${query}%`)
                .or(`nombre.ilike.%${query}%,telefono.ilike.%${query}%`)
                .order('total_citas', { ascending: false })
                .limit(5)

            if (error) throw error
            setSuggestions(data || [])
            setOpen(data && data.length > 0)
            setSelectedIndex(-1)
        } catch (err) {
            console.error('Error fetching suggestions:', err)
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        if (skipFetchRef.current) {
            skipFetchRef.current = false
            return
        }
        const timer = setTimeout(() => {
            fetchSuggestions(value)
        }, 300)
        return () => clearTimeout(timer)
    }, [value, fetchSuggestions])

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open || suggestions.length === 0) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev))
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault()
            const chosen = suggestions[selectedIndex]
            skipFetchRef.current = true
            onSelect({ id: chosen.id, nombre: chosen.nombre, telefono: chosen.telefono })
            setOpen(false)
        } else if (e.key === 'Escape') {
            setOpen(false)
        }
    }

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            <div className="group relative flex items-center">
                <User className="absolute left-4 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-colors" />
                <Input
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value)
                        setOpen(true)
                    }}
                    onFocus={() => {
                        if (value.length >= 2) setOpen(true)
                    }}
                    onKeyDown={handleKeyDown}
                    className="pl-11 h-12 bg-foreground/5 border-border rounded-2xl text-sm font-bold focus-visible:ring-primary/50 focus-visible:bg-card/40 transition-all placeholder:text-foreground/10"
                    placeholder={placeholder || "Nombre del Cliente"}
                />
                {loading && <Loader2 className="absolute right-4 w-4 h-4 text-primary animate-spin" />}
            </div>

            {open && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-1">
                        {suggestions.map((cliente, index) => (
                            <button
                                key={cliente.id}
                                type="button"
                                onClick={() => {
                                    skipFetchRef.current = true
                                    onSelect({ id: cliente.id, nombre: cliente.nombre, telefono: cliente.telefono })
                                    setOpen(false)
                                }}
                                className={cn(
                                    "w-full flex items-center justify-between p-3 rounded-xl transition-all group/item",
                                    selectedIndex === index ? "bg-primary/20 text-primary" : "hover:bg-foreground/5"
                                )}
                            >
                                <div className="flex flex-col items-start px-2">
                                    <span className={cn(
                                        "text-sm font-black uppercase tracking-tight",
                                        selectedIndex === index ? "text-primary" : "text-foreground group-hover/item:text-primary"
                                    )}>
                                        {cliente.nombre}
                                    </span>
                                    <div className="flex items-center gap-2 text-[10px] mt-0.5">
                                        <Phone className={cn("w-3 h-3", cliente.telefono ? "text-primary/60" : "text-foreground/20")} />
                                        <span className={cn(
                                            cliente.telefono ? "text-foreground/40" : "text-amber-500/50 italic font-medium"
                                        )}>
                                            {cliente.telefono || "Sin registro de numero celular"}
                                        </span>
                                    </div>
                                </div>
                                <div className="px-3 py-1 rounded-lg bg-foreground/5 text-[9px] font-black text-foreground/30 uppercase tracking-widest">
                                    {cliente.total_citas} Citas
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="bg-foreground/5 px-4 py-2 border-t border-border/5">
                        <p className="text-[8px] font-black text-foreground/20 uppercase tracking-[0.2em] italic">
                            Resultados encontrados en base de datos
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
