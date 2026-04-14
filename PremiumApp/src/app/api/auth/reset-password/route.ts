import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * POST /api/auth/reset-password
 * Restablece la contraseña de un profesional de forma segura (hashing en el servidor).
 * 
 * Body: { table: 'barberos', userId: string, newPassword: string }
 */
export async function POST(req: NextRequest) {
    try {
        const { table, userId, newPassword } = await req.json()

        if (!table || !userId || !newPassword) {
            return NextResponse.json(
                { error: 'Faltan parámetros: table, userId, newPassword' }, 
                { status: 400 }
            )
        }

        // Validación básica de seguridad
        if (table !== 'barberos') {
            return NextResponse.json(
                { error: 'Tabla no permitida para esta operación' }, 
                { status: 400 }
            )
        }

        if (newPassword.length < 4) {
            return NextResponse.json(
                { error: 'La contraseña debe tener al menos 4 caracteres' }, 
                { status: 400 }
            )
        }

        // Generar hash bcrypt real
        const salt = await bcrypt.genSalt(10)
        const hash = await bcrypt.hash(newPassword, salt)

        // Usar Service Role Key para actualizar la contraseña directamente
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        const { error } = await supabase
            .from(table)
            .update({ password_hash: hash })
            .eq('id', userId)

        if (error) {
            console.error('Database update error:', error)
            return NextResponse.json(
                { error: 'Error al actualizar la base de datos' }, 
                { status: 500 }
            )
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Contraseña encriptada y actualizada correctamente' 
        })

    } catch (err: any) {
        console.error('Reset password API error:', err)
        return NextResponse.json(
            { error: 'Error interno del servidor' }, 
            { status: 500 }
        )
    }
}
