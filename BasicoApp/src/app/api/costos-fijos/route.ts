import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getIsDemoMode } from '@/lib/supabase'

/**
 * Endpoint GET para obtener la lista de gastos (anterior costos fijos) de una sucursal para un mes específico.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const sucursal_id = searchParams.get('sucursal_id')
        const mes = searchParams.get('mes') // Format: 'YYYY-MM'

        if (!sucursal_id || !mes) {
            return NextResponse.json({ error: 'Faltan parámetros: sucursal_id y mes' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseServiceKey || supabaseServiceKey === 'your-service-role-key-here') {
            supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }

        if (getIsDemoMode() || !supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json([]) // Demo mode fallback
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Map mes 'YYYY-MM' to date range for fecha_pago
        const startDate = `${mes}-01`
        const [year, month] = mes.split('-').map(Number)
        const endDate = new Date(year, month, 0).toISOString().split('T')[0]

        const { data, error } = await supabase
            .from('gastos')
            .select('*')
            .eq('sucursal_id', sucursal_id)
            .gte('fecha_pago', startDate)
            .lte('fecha_pago', endDate)
            .order('categoria_gasto', { ascending: true })

        if (error) throw error

        // Map back to legacy format if needed by frontend
        const legacyData = data.map(g => ({
            id: g.id,
            sucursal_id: g.sucursal_id,
            mes: mes,
            categoria: g.categoria_gasto,
            monto: g.monto,
            descripcion: g.descripcion
        }))

        return NextResponse.json(legacyData)
    } catch (error: any) {
        console.error('Error in gastos GET:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * Endpoint POST para actualizar los gastos de una sucursal en un mes dado.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { sucursal_id, mes, costos } = body // costos: { categoria: string, monto: number }[]

        if (!sucursal_id || !mes || !Array.isArray(costos)) {
            return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseServiceKey || supabaseServiceKey === 'your-service-role-key-here') {
            supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }

        if (getIsDemoMode() || !supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ success: true, demo: true }) // Demo mode fallback
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Atomic replace logic for the specific month
        const startDate = `${mes}-01`
        const [year, month] = mes.split('-').map(Number)
        const endDate = new Date(year, month, 0).toISOString().split('T')[0]

        // Delete existing in range
        const { error: deleteError } = await supabase
            .from('gastos')
            .delete()
            .eq('sucursal_id', sucursal_id)
            .gte('fecha_pago', startDate)
            .lte('fecha_pago', endDate)

        if (deleteError) throw deleteError

        if (costos.length > 0) {
            const { error: insertError } = await supabase
                .from('gastos')
                .insert(costos.map((c: { categoria: string; monto: number }) => ({
                    sucursal_id, 
                    fecha_pago: startDate, // Simply use first day of month
                    categoria_gasto: c.categoria, 
                    monto: c.monto,
                    descripcion: `Costo mensual: ${c.categoria}`
                })))

            if (insertError) throw insertError
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error in gastos POST:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
