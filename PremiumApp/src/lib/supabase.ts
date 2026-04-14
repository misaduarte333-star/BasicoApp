import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

// ============================================================================
// VERSION DE DEPURACION: 1.1.0 (2026-02-26 21:55)
// ============================================================================

// Check if Supabase is configured
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Flag to check if we're in demo mode
export const isDemoMode = !SUPABASE_URL || !SUPABASE_ANON_KEY ||
    SUPABASE_URL.includes('your-project') ||
    SUPABASE_URL === '' ||
    SUPABASE_URL === 'undefined' ||
    !SUPABASE_URL.startsWith('http')

// Fallback Mock Object (Plain Structure - avoid Proxy issues)
const createFallbackMock = () => {
    const mockPromise = Promise.resolve({ data: null, error: null, count: 0 })
    const chainer: any = () => chainer

    // Setup chainer methods
    const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'gte', 'lte', 'in', 'or', 'order', 'limit', 'range']
    methods.forEach(m => chainer[m] = chainer)
    chainer.single = () => mockPromise
    chainer.maybeSingle = () => mockPromise
    chainer.then = (onfulfilled: any) => mockPromise.then(onfulfilled)

    return {
        from: () => chainer,
        channel: () => ({ on: chainer, subscribe: chainer, unsubscribe: () => { } }),
        removeChannel: () => { },
        removeAllChannels: () => { },
        auth: {
            getUser: () => mockPromise,
            getSession: () => mockPromise,
            signInWithPassword: () => mockPromise,
            signInWithOAuth: () => mockPromise,
            signOut: () => mockPromise,
            onAuthStateChange: (cb: any) => {
                console.log('🛡️ Fallback: onAuthStateChange called')
                if (typeof window !== 'undefined') {
                    // Force immediate callback to unblock AuthContext
                    setTimeout(() => {
                        try { cb('SIGNED_OUT', null) } catch (e) { }
                    }, 0)
                }
                return { data: { subscription: { unsubscribe: () => { } } } }
            }
        }
    }
}

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient(): ReturnType<typeof createBrowserClient<Database>> {
    const isBrowser = typeof window !== 'undefined'

    if (isDemoMode) {
        if (isBrowser) {
            console.warn('🚀 BARBERIA-APP VERSION: 1.1.0')
            console.warn('🎭 MODO DEMO ACTIVO: Revisar secretos en GitHub.')
            console.log('DIAGNOSTICO:', {
                URL: SUPABASE_URL ? `${SUPABASE_URL.substring(0, 10)}...` : 'FALTANTE',
                KEY: SUPABASE_ANON_KEY ? 'PRESENTE' : 'FALTANTE'
            })
        }
        return createFallbackMock() as any
    }

    // Return existing client if in browser
    if (isBrowser && browserClient) return browserClient

    try {
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
             throw new Error('Supabase URL or Anon Key is missing from environment variables.')
        }

        if (isBrowser) console.log('✅ BARBERIA-APP VERSION: 1.1.0 - Usando Supabase Real')
        const client = createBrowserClient<Database>(
            SUPABASE_URL,
            SUPABASE_ANON_KEY
        )

        if (isBrowser) browserClient = client
        return client
    } catch (e: any) {
        if (isBrowser) {
            console.error('❌ Error Supabase Init:', e?.message || e)
            // Diagnostic for Easy Panel / Production environment
            console.log('DIAGNOSTICO AMBIENTE:', {
                url_type: typeof SUPABASE_URL,
                url_present: !!SUPABASE_URL,
                key_present: !!SUPABASE_ANON_KEY,
                origin: window.location.origin
            })
        }
        return createFallbackMock() as any
    }
}

export function createServerClient(supabaseUrl: string, supabaseKey: string) {
    if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
        return createFallbackMock() as any
    }
    return createBrowserClient<Database>(supabaseUrl, supabaseKey)
}
