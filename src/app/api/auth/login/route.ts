import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * POST /api/auth/login
 * Recibe { identifier, password } y determina automáticamente el rol:
 * 1. Primero intenta como Desarrollador (solo si env vars están configuradas)
 * 2. Luego como Admin (tabla usuarios_admin, busca por email)
 * 3. Finalmente como Profesional (tabla 'barberos' en BD, busca por usuario_tablet)
 */
export async function POST(req: NextRequest) {
    try {
        const { identifier, password } = await req.json()

        if (!identifier || !password) {
            return NextResponse.json({ error: 'Usuario y contraseña son requeridos' }, { status: 400 })
        }

        const trimmedId = identifier.trim()
        const lowerId = trimmedId.toLowerCase()

        // ─── 1. Check Admin (by email) ───
        const supabase = createClient(supabaseUrl, supabaseKey)

        // ─── 2. Check Admin (by email) ───
        if (lowerId.includes('@')) {
            const { data: admin } = await supabase
                .from('usuarios_admin')
                .select('id, nombre, email, rol, sucursal_id, password_hash, sucursales!inner(plan)')
                .eq('email', lowerId)
                .eq('activo', true)
                .maybeSingle()

            if (admin) {
                const planData = admin.sucursales as any;
                const adminPlan = Array.isArray(planData) ? planData[0]?.plan : planData?.plan;
                if (adminPlan !== 'basico') {
                    return NextResponse.json({ error: 'Este panel es exclusivo para el plan Básico. Por favor ingresa desde la plataforma Premium.' }, { status: 403 })
                }
                const match = await bcrypt.compare(password, admin.password_hash)
                if (match) {
                    return NextResponse.json({
                        success: true,
                        role: 'admin',
                        user: {
                            id: admin.id,
                            nombre: admin.nombre,
                            email: admin.email,
                            rol: admin.rol,
                            sucursal_id: admin.sucursal_id
                        },
                        redirect: '/admin'
                    })
                }
            }
        }

        // ─── 3. Check Professional (by usuario_tablet, case-insensitive) ───
        const { data: profesionales } = await supabase
            .from('barberos')
            .select('id, sucursal_id, nombre, estacion_id, usuario_tablet, password_hash, horario_laboral, bloqueo_almuerzo, activo, hora_entrada, sucursales!inner(plan)')
            .ilike('usuario_tablet', trimmedId)
            .eq('activo', true)
            .limit(1)

        const profesional = profesionales?.[0]
        if (profesional) {
            const planData = profesional.sucursales as any;
            const profPlan = Array.isArray(planData) ? planData[0]?.plan : planData?.plan;
            if (profPlan !== 'basico') {
                return NextResponse.json({ error: 'Este panel es exclusivo para el plan Básico. Por favor ingresa desde la plataforma Premium.' }, { status: 403 })
            }
            const match = await bcrypt.compare(password, profesional.password_hash)
            if (match) {
                return NextResponse.json({
                    success: true,
                    role: 'profesional',
                    user: profesional,
                    redirect: '/tablet'
                })
            }
        }

        // ─── Nothing matched ───
        return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 })
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}
