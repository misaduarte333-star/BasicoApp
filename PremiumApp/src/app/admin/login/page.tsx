'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { Shield } from 'lucide-react'

// Iconos SVG de barberia para el fondo
const ScissorsIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3h-3z"/>
    </svg>
)

const RazorIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.5 3L20.34 3.03L15 5.1L9 3L3.36 4.9C3.15 4.97 3 5.15 3 5.38V20.5C3 20.78 3.22 21 3.5 21L3.66 20.97L9 18.9L15 21L20.64 19.1C20.85 19.03 21 18.85 21 18.62V3.5C21 3.22 20.78 3 20.5 3M10 5.47L14 6.87V18.53L10 17.13V5.47M5 6.46L8 5.45V17.15L5 18.31V6.46M19 17.54L16 18.55V6.86L19 5.7V17.54Z"/>
    </svg>
)

const CombIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 2H6V22H4V2M8 2H10V11H8V2M8 13H10V22H8V13M12 2H14V8H12V2M12 10H14V22H12V10M16 2H18V6H16V2M16 8H18V22H16V8M20 2H22V4H20V2M20 6H22V22H20V6Z"/>
    </svg>
)

const BarberPoleIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 3V5H6V3H8M6 7H8V9H6V7M6 11H8V13H6V11M6 15H8V17H6V15M6 19H8V21H6V19M16 3H18V5H16V3M16 7H18V9H16V7M16 11H18V13H16V11M16 15H18V17H16V15M16 19H18V21H16V19M10 5H14V7H10V5M10 9H14V11H10V9M10 13H14V15H10V13M10 17H14V19H10V17"/>
    </svg>
)

export default function AdminLoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [focusedField, setFocusedField] = useState<string | null>(null)

    const supabase = createClient()

    useEffect(() => {
        const session = localStorage.getItem('admin_session')
        if (session) {
            try {
                const parsed = JSON.parse(session)
                if (parsed?.id) {
                    router.replace('/admin')
                }
            } catch {
                localStorage.removeItem('admin_session')
            }
        }
    }, [router])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (loading) return

        setLoading(true)
        setError('')

        try {
            const lowerEmail = email.toLowerCase()
            const { data: admins, error: dbError } = await supabase
                .from('usuarios_admin')
                .select('*, sucursales!inner(plan)')
                .eq('email', lowerEmail)
                .limit(1)

            if (dbError) throw dbError

            const admin = admins?.[0] as any

            if (admin) {
                const isMatch = await bcrypt.compare(password, admin.password_hash || '')
                const isValid = isMatch || admin.password_hash === password // fallback para los de texto plano
                
                if (isValid) {
                    if (admin.sucursales?.plan !== 'premium') {
                        setError('Tu suscripción es Básica. Por favor inicia sesión mediante BarberiaPanel.')
                        return
                    }
                    localStorage.setItem('admin_session', JSON.stringify(admin))
                    // Notify AuthContext of session change
                    window.dispatchEvent(new Event('admin-session-changed'))
                    router.push('/admin')
                } else {
                    setError('Credenciales incorrectas')
                }
            } else {
                setError('Credenciales incorrectas')
            }
        } catch (err) {
            console.error('Login error:', err)
            setError('Error de conexion con el servidor')
        } finally {
            setLoading(false)
        }
    }

return (
        <main className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black selection:bg-primary selection:text-black">
            {/* === LUXURY BACKGROUND === */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0806] via-[#0d0a07] to-black" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(212,175,55,0.12)_0%,transparent_60%)]" />
                
                {/* Art Deco geometric lines - Left */}
                <svg className="absolute left-0 top-0 h-full w-32 md:w-48 opacity-[0.06]" viewBox="0 0 100 400" preserveAspectRatio="none">
                    <line x1="20" y1="0" x2="20" y2="400" stroke="#D4AF37" strokeWidth="0.5"/>
                    <line x1="35" y1="0" x2="35" y2="400" stroke="#D4AF37" strokeWidth="0.3"/>
                    <line x1="50" y1="0" x2="50" y2="400" stroke="#D4AF37" strokeWidth="0.5"/>
                </svg>
                
                {/* Art Deco geometric lines - Right */}
                <svg className="absolute right-0 top-0 h-full w-32 md:w-48 opacity-[0.06]" viewBox="0 0 100 400" preserveAspectRatio="none">
                    <line x1="80" y1="0" x2="80" y2="400" stroke="#D4AF37" strokeWidth="0.5"/>
                    <line x1="65" y1="0" x2="65" y2="400" stroke="#D4AF37" strokeWidth="0.3"/>
                    <line x1="50" y1="0" x2="50" y2="400" stroke="#D4AF37" strokeWidth="0.5"/>
                </svg>

                {/* Premium grain texture overlay */}
                <div className="absolute inset-0 opacity-[0.015]" 
                    style={{ 
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` 
                    }} 
                />
</div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-sm px-5 animate-fade-in">
                
                {/* Logo Section */}
                <header className="flex flex-col items-center mb-6">
                    <div className="relative w-16 h-16 flex items-center justify-center mb-4 rounded-full">
                        <div className="absolute inset-0 rounded-full bg-white/10 blur-xl" />
                        <div className="absolute inset-0 rounded-full border-2 border-white/30" />
                        <div className="absolute inset-1 rounded-full border border-white/10" />
                        <Shield className="relative z-10 w-8 h-8 text-white/90" strokeWidth={1.5} />
                    </div>

                    <h1 className="text-center font-display font-black text-3xl mb-2 leading-tight">
                        <span className="text-white tracking-tight">Panel </span>
                        <span className="text-white/70 tracking-tight">Admin</span>
                    </h1>

                    <p className="text-[10px] tracking-[0.3em] text-white/40 font-semibold uppercase">
                        Gestion y Control
                    </p>
                </header>

                {/* Login Card */}
                <section className="glass-card p-5" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        
                        {/* Email Field */}
                        <div className="flex flex-col gap-1.5">
                            <label 
                                htmlFor="email" 
                                className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 ${
                                    focusedField === 'email' ? 'text-white' : 'text-white/50'
                                }`}
                            >
                                Correo
                            </label>
                            <div className={`relative flex items-center gap-2 rounded-lg transition-all duration-300 ${
                                focusedField === 'email' 
                                    ? 'bg-black/80 ring-2 ring-white/30 shadow-lg shadow-white/5' 
                                    : 'bg-black/50 ring-1 ring-white/10 hover:ring-white/20'
                            }`}>
                                <span className={`material-icons-round text-lg pl-3 transition-colors duration-200 ${
                                    focusedField === 'email' ? 'text-white' : 'text-white/30'
                                }`}>
                                    alternate_email
                                </span>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    className="flex-1 bg-transparent border-none outline-none py-3 pr-3 text-white placeholder:text-white/25 font-medium text-sm"
                                    placeholder="admin@negocio.com"
                                    autoComplete="email"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="flex flex-col gap-1.5">
                            <label 
                                htmlFor="password" 
                                className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 ${
                                    focusedField === 'password' ? 'text-white' : 'text-white/50'
                                }`}
                            >
                                Clave Maestra
                            </label>
                            <div className={`relative flex items-center gap-2 rounded-lg transition-all duration-300 ${
                                focusedField === 'password' 
                                    ? 'bg-black/80 ring-2 ring-white/30 shadow-lg shadow-white/5' 
                                    : 'bg-black/50 ring-1 ring-white/10 hover:ring-white/20'
                            }`}>
                                <span className={`material-icons-round text-lg pl-3 transition-colors duration-200 ${
                                    focusedField === 'password' ? 'text-white' : 'text-white/30'
                                }`}>
                                    vpn_key
                                </span>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    className="flex-1 bg-transparent border-none outline-none py-3 pr-3 text-white placeholder:text-white/25 font-medium text-sm"
                                    placeholder="Ingresa tu clave"
                                    autoComplete="current-password"
                                    required
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg animate-slide-in">
                                <span className="material-icons-round text-red-400 text-base">error_outline</span>
                                <span className="text-xs font-medium text-red-400">{error}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="relative w-full py-3.5 mt-1 rounded-lg font-bold text-sm uppercase tracking-wider overflow-hidden transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group bg-white text-black hover:bg-white/90 hover:shadow-lg hover:shadow-white/10"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>Acceder</span>
                                        <span className="material-icons-round text-base group-hover:translate-x-1 transition-transform duration-200">
                                            admin_panel_settings
                                        </span>
                                    </>
                                )}
                            </span>
                        </button>
                    </form>
                </section>

                {/* Footer */}
                <footer className="flex items-center justify-between mt-5">
                    <div className="flex items-center gap-1.5 text-white/25">
                        <span className="material-icons-round text-xs">policy</span>
                        <span className="text-[10px] font-medium">Restringido</span>
                    </div>
                    
                    <Link 
                        href="/" 
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-white/50 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-200 active:scale-95"
                    >
                        <span className="material-icons-round text-sm">arrow_back</span>
                        Inicio
                    </Link>
                </footer>
            </div>
        </main>
    )
}
