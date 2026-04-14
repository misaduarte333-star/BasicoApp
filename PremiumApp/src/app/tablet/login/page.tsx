'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { Activity, Calendar, Clock, Shield, User, Lock, ArrowLeft } from 'lucide-react'

// Generic Service Icons for background
const ServiceIcon1 = ({ className }: { className?: string }) => <Activity className={className} />
const ServiceIcon2 = ({ className }: { className?: string }) => <Calendar className={className} />
const ServiceIcon3 = ({ className }: { className?: string }) => <Clock className={className} />
const ServiceIcon4 = ({ className }: { className?: string }) => <Shield className={className} />

export default function TabletLoginPage() {
    const router = useRouter()
    const [usuario, setUsuario] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [focusedField, setFocusedField] = useState<string | null>(null)


    useEffect(() => {
        const session = localStorage.getItem('profesional_session')
        if (session) {
            try {
                const parsed = JSON.parse(session)
                if (parsed?.id) {
                    router.replace('/tablet')
                }
            } catch {
                localStorage.removeItem('profesional_session')
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
            const res = await fetch('/api/auth/login-barbero', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario, password })
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Usuario o contraseña incorrectos')
                return
            }

            if (data.success && data.user) {
                localStorage.setItem('profesional_session', JSON.stringify(data.user))
                router.replace('/tablet')
            }
        } catch (err) {
            console.error('Login error:', err)
            setError('Error de conexión. Verifica tu red.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="fixed inset-0 flex items-center justify-center overflow-hidden bg-background selection:bg-primary selection:text-black">
            {/* Watermark Background Pattern */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                {/* Radial gradient overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,transparent_0%,hsl(var(--background)/0.95)_70%)]" />
                
                {/* Pattern de iconos de servicio */}
                <div className="absolute inset-0 opacity-[0.04]">
                    {/* Fila 1 */}
                    <ServiceIcon1 className="absolute w-24 h-24 text-primary -top-4 left-[5%] rotate-[-15deg]" />
                    <ServiceIcon2 className="absolute w-16 h-16 text-primary top-8 left-[25%] rotate-[20deg]" />
                    <ServiceIcon3 className="absolute w-20 h-20 text-primary -top-2 left-[45%] rotate-[-30deg]" />
                    <ServiceIcon4 className="absolute w-14 h-14 text-primary top-12 left-[65%] rotate-[10deg]" />
                    <ServiceIcon1 className="absolute w-28 h-28 text-primary -top-6 left-[85%] rotate-[45deg]" />
                    
                    {/* Fila 2 */}
                    <ServiceIcon3 className="absolute w-18 h-18 text-primary top-[20%] left-[10%] rotate-[25deg]" />
                    <ServiceIcon4 className="absolute w-20 h-20 text-primary top-[18%] left-[35%] rotate-[-20deg]" />
                    <ServiceIcon1 className="absolute w-16 h-16 text-primary top-[22%] left-[55%] rotate-[35deg]" />
                    <ServiceIcon2 className="absolute w-24 h-24 text-primary top-[15%] left-[78%] rotate-[-10deg]" />
                    
                    {/* Fila 3 */}
                    <ServiceIcon2 className="absolute w-20 h-20 text-primary top-[40%] left-[2%] rotate-[15deg]" />
                    <ServiceIcon1 className="absolute w-32 h-32 text-primary top-[38%] left-[20%] rotate-[-25deg]" />
                    <ServiceIcon4 className="absolute w-16 h-16 text-primary top-[42%] left-[75%] rotate-[30deg]" />
                    <ServiceIcon3 className="absolute w-24 h-24 text-primary top-[35%] left-[90%] rotate-[-15deg]" />
                    
                    {/* Fila 4 */}
                    <ServiceIcon4 className="absolute w-22 h-22 text-primary top-[58%] left-[8%] rotate-[-35deg]" />
                    <ServiceIcon3 className="absolute w-16 h-16 text-primary top-[62%] left-[30%] rotate-[20deg]" />
                    <ServiceIcon2 className="absolute w-28 h-28 text-primary top-[55%] left-[50%] rotate-[-5deg]" />
                    <ServiceIcon1 className="absolute w-20 h-20 text-primary top-[60%] left-[72%] rotate-[40deg]" />
                    
                    {/* Fila 5 */}
                    <ServiceIcon1 className="absolute w-24 h-24 text-primary top-[78%] left-[5%] rotate-[25deg]" />
                    <ServiceIcon2 className="absolute w-18 h-18 text-primary top-[82%] left-[28%] rotate-[-30deg]" />
                    <ServiceIcon4 className="absolute w-26 h-26 text-primary top-[75%] left-[48%] rotate-[15deg]" />
                    <ServiceIcon3 className="absolute w-20 h-20 text-primary top-[80%] left-[68%] rotate-[-20deg]" />
                    <ServiceIcon1 className="absolute w-16 h-16 text-primary top-[85%] left-[88%] rotate-[50deg]" />
                </div>

                {/* Light leaks */}
                <div className="absolute inset-0 light-leak-top opacity-60" />
                <div className="absolute inset-0 light-leak-bottom opacity-40" />
                
                {/* Vignette effect */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_100%_at_50%_50%,transparent_20%,rgba(0,0,0,0.6)_100%)]" />
            </div>

            {/* Main Content - Compacto para evitar scroll */}
            <div className="relative z-10 w-full max-w-sm px-5 animate-fade-in">
                
                {/* Logo Section - Compacto */}
                <header className="flex flex-col items-center mb-6">
                    <div className="relative w-20 h-20 flex items-center justify-center mb-4 glow-logo rounded-full overflow-hidden">
                        <div className="absolute inset-0 rounded-full bg-gradient-gold opacity-20 blur-xl" />
                        <div className="absolute inset-0 rounded-full border-2 border-primary/40" />
                        <User className="relative z-10 w-10 h-10 text-primary" strokeWidth={1.5} />
                    </div>

                    <h1 className="text-center font-display font-black text-3xl mb-2 leading-tight">
                        <span className="text-foreground tracking-tight">Acceso </span>
                        <span className="gradient-text-gold tracking-tight">Profesional</span>
                    </h1>

                    <p className="text-[10px] tracking-[0.3em] text-primary/50 font-semibold uppercase">
                        Estacion de Trabajo
                    </p>
                </header>

                {/* Login Card - Compacto */}
                <section className="glass-card glow-gold p-5">
                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        
                        {/* Usuario Field */}
                        <div className="flex flex-col gap-1.5">
                            <label 
                                htmlFor="usuario" 
                                className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 ${
                                    focusedField === 'usuario' ? 'text-primary' : 'text-foreground/50'
                                }`}
                            >
                                Usuario
                            </label>
                            <div className={`relative flex items-center gap-2 rounded-lg transition-all duration-300 ${
                                focusedField === 'usuario' 
                                    ? 'bg-card/80 ring-2 ring-primary/50 shadow-lg shadow-primary/10' 
                                    : 'bg-card/50 ring-1 ring-foreground/10 hover:ring-foreground/20'
                            }`}>
                                <User className={`w-5 h-5 ml-3 transition-colors duration-200 ${
                                    focusedField === 'usuario' ? 'text-primary' : 'text-foreground/30'
                                }`} />
                                <input
                                    id="usuario"
                                    type="text"
                                    value={usuario}
                                    onChange={(e) => setUsuario(e.target.value)}
                                    onFocus={() => setFocusedField('usuario')}
                                    onBlur={() => setFocusedField(null)}
                                    className="flex-1 bg-transparent border-none outline-none py-3 pr-3 text-foreground placeholder:text-foreground/25 font-medium text-sm"
                                    placeholder="Ingresa tu usuario"
                                    autoComplete="username"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="flex flex-col gap-1.5">
                            <label 
                                htmlFor="password" 
                                className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 ${
                                    focusedField === 'password' ? 'text-primary' : 'text-foreground/50'
                                }`}
                            >
                                Clave
                            </label>
                            <div className={`relative flex items-center gap-2 rounded-lg transition-all duration-300 ${
                                focusedField === 'password' 
                                    ? 'bg-card/80 ring-2 ring-primary/50 shadow-lg shadow-primary/10' 
                                    : 'bg-card/50 ring-1 ring-foreground/10 hover:ring-foreground/20'
                            }`}>
                                <Lock className={`w-5 h-5 ml-3 transition-colors duration-200 ${
                                    focusedField === 'password' ? 'text-primary' : 'text-foreground/30'
                                }`} />
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    className="flex-1 bg-transparent border-none outline-none py-3 pr-3 text-foreground placeholder:text-foreground/25 font-medium text-sm"
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
                            className="relative w-full py-3.5 mt-1 rounded-lg font-bold text-sm uppercase tracking-wider overflow-hidden transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group bg-gradient-gold text-black hover:shadow-lg hover:shadow-primary/30"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {loading ? (
                                    <div className="spinner" />
                                ) : (
                                    <>
                                        <span>Ingresar</span>
                                        <span className="material-icons-round text-base group-hover:translate-x-1 transition-transform duration-200">
                                            login
                                        </span>
                                    </>
                                )}
                            </span>
                        </button>
                    </form>
                </section>

                {/* Footer - Compacto */}
                <footer className="flex items-center justify-between mt-5">
                    <div className="flex items-center gap-1.5 text-foreground/25">
                        <Shield className="w-3 h-3" />
                        <span className="text-[10px] font-medium">Seguro</span>
                    </div>
                    
                    <Link 
                        href="/" 
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-foreground/10 bg-foreground/5 text-xs font-medium text-foreground/50 hover:bg-foreground/10 hover:text-foreground hover:border-foreground/20 transition-all duration-200 active:scale-95"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        Inicio
                    </Link>
                </footer>
            </div>
        </main>
    )
}
