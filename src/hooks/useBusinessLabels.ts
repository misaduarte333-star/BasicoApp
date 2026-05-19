'use client'

import { useAuth } from '@/context/AuthContext'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface BusinessLabels {
    professional: string     // Ej: "Profesional", "Especialista", "Coach"
    professionals: string    // Ej: "Profesionales", "Especialistas", "Coaches"
    service: string          // Ej: "Corte", "Servicio", "Clase"
    services: string         // Ej: "Cortes", "Servicios", "Clases"
    location: string         // Ej: "Estación", "Cubículo", "Lugar"
    businessName: string
}

const defaultLabels: BusinessLabels = {
    professional: 'Profesional',
    professionals: 'Profesionales',
    service: 'Servicio',
    services: 'Servicios',
    location: 'Estación',
    businessName: 'Business Panel'
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
                
                setLabels({
                    professional: type,
                    professionals: pluralize(type),
                    service: 'Servicio',
                    services: 'Servicios',
                    location: type === 'Profesional' ? 'Estación' : 'Lugar',
                    businessName: sucursal.nombre || sucursalNombre || 'Business Panel'
                })
            }
        }

        fetchLabels()
    }, [sucursalId, sucursalNombre, supabase])

    /**
     * Helper to get a dynamic label with pluralization and casing options.
     */
    const getLabel = (key: 'professional' | 'service' | 'location' | 'station', form: 'singular' | 'plural' = 'singular', capitalize = false) => {
        let text = ''
        
        switch (key) {
            case 'professional':
                text = form === 'singular' ? labels.professional : labels.professionals
                break
            case 'service':
                text = form === 'singular' ? labels.service : labels.services
                break
            case 'location':
            case 'station':
                text = labels.location
                break
            default:
                text = key
        }

        if (capitalize) {
            return text.charAt(0).toUpperCase() + text.slice(1)
        }
        return text
    }

    return { ...labels, getLabel }
}

function pluralize(word: string): string {
    const w = word.toLowerCase()
    if (w.endsWith('o') || w.endsWith('a') || w.endsWith('e')) return word + 's'
    if (w.endsWith('r') || w.endsWith('l') || w.endsWith('n')) return word + 'es'
    return word + 's'
}
