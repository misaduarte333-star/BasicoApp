'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
    user: User | null
    loading: boolean
    sucursalId: string
    sucursalNombre: string
    isAdmin: boolean
    sessionUser: any | null
    logout: () => void
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    sucursalId: '',
    sucursalNombre: '',
    isAdmin: false,
    sessionUser: null,
    logout: () => {},
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [sucursalNombre, setSucursalNombre] = useState<string>('');
const getInitialSession = () => {
    if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('admin_session');
        return raw ? JSON.parse(raw) : null;
    }
    return null;
};
const initialSession = getInitialSession();
const [sessionUser, setSessionUser] = useState<any>(initialSession);
const [isAdmin, setIsAdmin] = useState(() => !!initialSession);
const [sucursalId, setSucursalId] = useState<string>(() => initialSession?.sucursal_id || '');

    const supabase = createClient()

    const logout = useCallback(() => {
        localStorage.removeItem('admin_session')
        setSessionUser(null)
        setIsAdmin(false)
        setSucursalId('')
        setSucursalNombre('')
        window.location.href = '/admin/login'
    }, [])

    useEffect(() => {
        const initAuth = async () => {
            try {
                // 1. Check localStorage admin_session (set during login)
                const raw = localStorage.getItem('admin_session')
                let resolvedSucursalId = ''

                if (raw) {
                    const session = JSON.parse(raw)
                    setSessionUser(session)
                    setIsAdmin(true)

                    if (session.sucursal_id) {
                        resolvedSucursalId = session.sucursal_id
                        setSucursalId(session.sucursal_id)
                    }
                }

                // 2. Also check Supabase auth (for backward compat)
                const { data: { session: supaSession } } = await supabase.auth.getSession()
                const currentUser = supaSession?.user ?? null
                setUser(currentUser)

                if (currentUser?.email) {
                    const { data } = await (supabase
                        .from('usuarios_admin') as any)
                        .select('rol, sucursal_id')
                        .eq('email', currentUser.email)
                        .maybeSingle()

                    if (data) {
                        setIsAdmin(true)
                        if (data.sucursal_id && !resolvedSucursalId) {
                            resolvedSucursalId = data.sucursal_id
                            setSucursalId(data.sucursal_id)
                        }
                    }
                }

                // 3. Fetch sucursal name once we have the ID
                if (resolvedSucursalId) {
                    const { data: sucData } = await (supabase
                        .from('sucursales') as any)
                        .select('nombre')
                        .eq('id', resolvedSucursalId)
                        .single()

                    if (sucData) {
                        setSucursalNombre(sucData.nombre)
                    }
                }
            } catch (error) {
                console.error('Auth check error:', error)
            } finally {
                setLoading(false)
            }
        }

        initAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [supabase])

    return (
        <AuthContext.Provider value={{ user, loading, sucursalId, sucursalNombre, isAdmin, sessionUser, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
