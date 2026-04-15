'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Mail, User, Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface LoginViewProps {
    type: 'admin' | 'tablet'
    title: string
    subtitle: string
    redirectPath: string
    portalColor?: 'blue' | 'purple'
}

export const LoginView: React.FC<LoginViewProps> = ({ 
    type, 
    title, 
    subtitle, 
    redirectPath,
    portalColor = 'blue'
}) => {
    const router = useRouter()
    const [identifier, setIdentifier] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const accentColor = portalColor === 'blue' ? 'blue-600' : 'purple-600'
    const accentHover = portalColor === 'blue' ? 'blue-700' : 'purple-700'
    const accentBg = portalColor === 'blue' ? 'bg-blue-600' : 'bg-purple-600'

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Error al iniciar sesión')
            }

            // Save session in sessionStorage as expected by AuthContext/Layouts
            const sessionKey = type === 'admin' ? 'admin_session' : 'profesional_session'
            sessionStorage.setItem(sessionKey, JSON.stringify({
                user: data.user,
                role: data.role
            }))

            // Force a small delay for smoother transition
            setTimeout(() => {
                router.push(redirectPath)
                router.refresh()
            }, 500)

        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
                <div className={`absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-20 blur-3xl ${portalColor === 'blue' ? 'bg-blue-400' : 'bg-purple-400'}`} />
                <div className={`absolute -bottom-24 -right-24 w-96 h-96 rounded-full opacity-20 blur-3xl ${portalColor === 'blue' ? 'bg-indigo-400' : 'bg-pink-400'}`} />
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-8 md:p-10">
                    
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 shadow-sm border border-slate-100 ${portalColor === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                            {type === 'admin' ? <Lock size={28} /> : <User size={28} />}
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                            {title}
                        </h1>
                        <p className="text-slate-500 font-medium whitespace-pre-line">
                            {subtitle}
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-semibold flex items-center animate-shake">
                                <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
                                {type === 'admin' ? 'Correo Electrónico' : 'Nombre de Usuario'}
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    {type === 'admin' ? <Mail size={18} /> : <User size={18} />}
                                </div>
                                <input
                                    type={type === 'admin' ? 'email' : 'text'}
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-4 bg-slate-50 border-transparent border-2 border-slate-50 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all text-sm outline-none font-medium"
                                    placeholder={type === 'admin' ? 'admin@negocio.com' : 'usuario_tablet'}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
                                Contraseña
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-11 pr-12 py-4 bg-slate-50 border-transparent border-2 border-slate-50 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all text-sm outline-none font-medium"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-2xl ${accentBg} text-white font-bold text-sm shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:scale-100 transition-all flex items-center justify-center gap-3`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Verificando...
                                </>
                            ) : (
                                'Iniciar Sesión'
                            )}
                        </button>
                    </form>

                    {/* Footer Info */}
                    <div className="mt-10 pt-8 border-t border-slate-50 text-center">
                        <p className="text-xs text-slate-400 font-semibold tracking-wide uppercase">
                            Panel Plus &copy; {new Date().getFullYear()}
                        </p>
                    </div>
                </div>
                
                {/* Back button */}
                <button 
                    onClick={() => router.push('/')}
                    className="mt-8 mx-auto flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors text-sm font-bold"
                >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                   </svg>
                   Volver al inicio
                </button>
            </div>
        </div>
    )
}
