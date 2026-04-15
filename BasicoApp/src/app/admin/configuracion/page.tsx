'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { createClient, formatError } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

import type { Sucursal, HorarioApertura } from '@/lib/types'

/**
 * Página de Configuración de la Sucursal.
 * Permite editar los datos generales y configuraciones.
 */
export default function ConfiguracionPage() {
    const { sucursalId, loading: authLoading } = useAuth()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [mounted, setMounted] = useState(false)
    const { theme, setTheme } = useTheme()
    
    const [sucursal, setSucursal] = useState<Sucursal | null>(null)
    const [horario, setHorario] = useState<HorarioApertura>({
        lunes: { apertura: '09:00', cierre: '20:00' },
        martes: { apertura: '09:00', cierre: '20:00' },
        miercoles: { apertura: '09:00', cierre: '20:00' },
        jueves: { apertura: '09:00', cierre: '20:00' },
        viernes: { apertura: '09:00', cierre: '20:00' },
        sabado: { apertura: '10:00', cierre: '18:00' },
        domingo: { apertura: '10:00', cierre: '14:00' }
    })

    const [formData, setFormData] = useState({
        nombre: '',
        direccion: '',
        telefono_whatsapp: '',
        slug: '',
        plan: 'Gratis',
        activa: true,
        tipo_prestador: 'servicios',
        tipo_prestador_label: 'Profesional'
    })

    const supabase = createClient()

    const cargarConfiguracion = useCallback(async () => {
        if (!sucursalId) return
        setLoading(true)

        try {
            const { data, error } = await supabase
                .from('sucursales')
                .select('*')
                .eq('id', sucursalId)
                .single()

            if (error) {
                console.warn('Error loading config:', formatError(error))
            } else if (data) {
                const sData = data as any
                setSucursal(sData)
                setFormData({
                    nombre: sData.nombre,
                    direccion: sData.direccion || '',
                    telefono_whatsapp: sData.telefono_whatsapp || '',
                    slug: (sData as any).slug || '',
                    plan: (sData as any).plan || 'Gratis',
                    activa: sData.activa,
                    tipo_prestador: (sData as any).tipo_prestador || 'servicios',
                    tipo_prestador_label: (sData as any).tipo_prestador_label || 'Profesional'
                })
                if (sData.horario_apertura) {
                    setHorario(sData.horario_apertura as any)
                }
            }
        } catch (err) {
            console.warn('Supabase connection error:', formatError(err))
        } finally {
            setLoading(false)
        }
    }, [sucursalId, supabase])

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (authLoading) return
        if (!sucursalId) {
            setLoading(false)
            return
        }
        cargarConfiguracion()
    }, [authLoading, sucursalId, cargarConfiguracion])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!sucursalId) return
        setSaving(true)

        try {
            const res = await fetch('/api/sucursales', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: sucursalId,
                    ...formData,
                    horario_apertura: horario
                }),
            })

            const result = await res.json()
            if (!res.ok || !result.success) {
                throw new Error(result.error || 'Error al guardar')
            }

            alert('Configuración guardada correctamente')
        } catch (err) {
            console.warn('Error saving:', formatError(err))
            alert('Error al guardar la configuración')
        } finally {
            setSaving(false)
        }
    }

    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const

    const updateHorario = (dia: string, campo: 'apertura' | 'cierre', valor: string) => {
        setHorario(prev => ({
            ...prev,
            [dia]: {
                ...prev[dia as keyof HorarioApertura],
                [campo]: valor
            }
        }))
    }

    if (loading) {
        return (
            <div className="h-screen bg-background flex items-center justify-center">
                <div className="flex items-center justify-center h-full">
                    <div className="spinner w-8 h-8" />
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Configuración</h1>
                <p className="text-muted-foreground mt-1">Administra los datos generales y avanzados de tu sucursal</p>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* General Info & AI Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card p-6">
                        <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Datos de la Sucursal
                        </h2>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-2">Nombre del Negocio</label>
                                    <input
                                        type="text"
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                        className="input-field"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-2">Slug (URL personalizada)</label>
                                    <input
                                        type="text"
                                        value={formData.slug}
                                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                        className="input-field"
                                        placeholder="mi-negocio"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-muted mb-2">Dirección</label>
                                <textarea
                                    value={formData.direccion}
                                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                                    className="input-field min-h-[80px]"
                                    placeholder="Calle, Número, Colonia, Ciudad"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-2">WhatsApp de Contacto</label>
                                    <input
                                        type="tel"
                                        value={formData.telefono_whatsapp}
                                        onChange={(e) => setFormData({ ...formData, telefono_whatsapp: e.target.value })}
                                        className="input-field"
                                        placeholder="5215512345678"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-2">Plan Actual</label>
                                    <select 
                                        value={formData.plan}
                                        onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                                        className="input-field"
                                    >
                                        <option value="Gratis">Gratis</option>
                                        <option value="Premium">Premium</option>
                                        <option value="Empresarial">Empresarial</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.activa}
                                        onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-surface-hover peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                    <span className="ml-3 text-sm font-medium text-muted">Sucursal Activa</span>
                                </label>
                            </div>
                        </div>
                    </div>


                    <div className="glass-card p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Horario de Apertura
                            </h2>
                        </div>

                        <div className="space-y-4">
                            {dias.map((dia) => (
                                <div key={dia} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 border-b border-slate-700/50 last:border-0">
                                    <span className="w-full sm:w-24 capitalize text-muted font-medium">{dia}</span>
                                    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center w-full sm:w-auto sm:flex sm:gap-2">
                                        <input
                                            type="time"
                                            value={horario[dia as keyof HorarioApertura]?.apertura || ''}
                                            onChange={(e) => updateHorario(dia, 'apertura', e.target.value)}
                                            className="input-field w-full sm:w-32 py-1 text-center"
                                        />
                                        <span className="text-muted-foreground/70 text-sm">a</span>
                                        <input
                                            type="time"
                                            value={horario[dia as keyof HorarioApertura]?.cierre || ''}
                                            onChange={(e) => updateHorario(dia, 'cierre', e.target.value)}
                                            className="input-field w-full sm:w-32 py-1 text-center"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar / Actions */}
                <div className="space-y-6">
                    <div className="glass-card p-6 sticky top-8">
                        <h3 className="text-lg font-bold text-foreground mb-4">Acciones</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Guarda los cambios para aplicarlos inmediatamente.
                        </p>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full btn-primary flex items-center justify-center gap-2 mb-3"
                        >
                            {saving ? (
                                <>
                                    <div className="spinner w-4 h-4" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Guardar Cambios
                                </>
                            )}
                        </button>

                        <button type="button" className="w-full btn-secondary">
                            Cancelar
                        </button>
                    </div>

                    <div className="glass-card p-6 border-l-4 border-l-blue-500">
                        <h3 className="text-sm font-bold text-foreground mb-2">Estado del Sistema</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Base de Datos</span>
                                <span className="text-emerald-400 font-medium">Conectado</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">ID Sucursal</span>
                                <code className="text-muted-foreground bg-background px-1 rounded truncate max-w-[120px]" title={sucursalId}>
                                    {sucursalId || '---'}
                                </code>
                            </div>
                        </div>
                    </div>

                    {/* Theme Toggler */}
                    {mounted && (
                        <div className="glass-card p-6">
                            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                                Apariencia
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setTheme('light')}
                                    className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${theme === 'light' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-surface-hover'}`}
                                >
                                    Claro
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTheme('dark')}
                                    className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${theme === 'dark' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-surface-hover'}`}
                                >
                                    Oscuro
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTheme('system')}
                                    className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${theme === 'system' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-surface-hover'}`}
                                >
                                    Auto
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </form>
        </>
    )
}
