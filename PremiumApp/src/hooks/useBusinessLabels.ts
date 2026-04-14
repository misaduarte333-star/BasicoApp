'use client'

import { useAuth } from '@/context/AuthContext'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface BusinessLabels {
    professional: string     // e.g., "Barbero", "Profesional", "Coach"
    professionals: string    // e.g., "Barberos", "Profesionales", "Coaches"
    appointment: string      // e.g., "Cita", "Sesión", "Entrenamiento"
    appointments: string     // e.g., "Citas", "Sesiones", "Entrenamientos"
    service: string          // e.g., "Corte", "Servicio", "Clase"
    services: string         // e.g., "Cortes", "Servicios", "Clases"
    location: string         // e.g., "Estación", "Cubículo", "Mesa"
    businessName: string
    businessType: string     // e.g., "Barbería", "Centro de Estética"
}

const defaultLabels: BusinessLabels = {
    professional: 'Profesional',
    professionals: 'Profesionales',
    appointment: 'Cita',
    appointments: 'Citas',
    service: 'Servicio',
    services: 'Servicios',
    location: 'Estación',
    businessName: 'Premium Service',
    businessType: 'Barbería'
}

export function useBusinessLabels() {
    const { sucursalId, sucursalNombre } = useAuth()
    const [labels, setLabels] = useState<BusinessLabels>(defaultLabels)
    const supabase = createClient()

    useEffect(() => {
        async function fetchLabels() {
            if (!sucursalId) return

            const { data: sucursal } = await (supabase
                .from('sucursales') as any)
                .select('tipo_prestador, tipo_prestador_label, nombre')
                .eq('id', sucursalId)
                .single()

            if (sucursal) {
                const type = sucursal.tipo_prestador_label || sucursal.tipo_prestador || 'Profesional'
                
                // Logic to pluralize and map terms
                // This is a basic mapping, could be expanded
                setLabels({
                    professional: type,
                    professionals: pluralize(type),
                    appointment: 'Cita',
                    appointments: 'Citas',
                    service: 'Servicio',
                    services: 'Servicios',
                    location: type === 'Barbero' ? 'Estación' : 'Mesa',
                    businessName: sucursal.nombre || sucursalNombre || 'Premium Service',
                    businessType: sucursal.tipo_prestador_label || 'Barbería'
                })
            }
        }

        fetchLabels()
    }, [sucursalId, sucursalNombre, supabase])

    return labels
}

function pluralize(word: string): string {
    if (word.toLowerCase().endsWith('o') || word.toLowerCase().endsWith('a')) return word + 's'
    if (word.toLowerCase().endsWith('r') || word.toLowerCase().endsWith('l')) return word + 'es'
    return word + 's'
}
