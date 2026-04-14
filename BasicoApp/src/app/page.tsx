'use client'

import Link from 'next/link'
import { LayoutDashboard, Users } from 'lucide-react'

export default function Home() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
            
            {/* Simple Background Decoration */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-3xl" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-100/50 blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-2xl text-center space-y-12">
                
                {/* Header */}
                <header className="space-y-4">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-sm border border-slate-200 mb-6">
                        <span className="text-3xl font-bold text-slate-800">B</span>
                    </div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                        Sistema <span className="text-blue-600">Básico</span>
                    </h1>
                    <p className="text-lg text-slate-600 font-medium">
                        Plataforma de Gestión de Servicios
                    </p>
                </header>

                {/* Grid de Portales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    
                    {/* Portal Profesional */}
                    <Link 
                        href="/tablet/login"
                        className="group p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Users size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Profesionales</h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-6">
                            Estación de trabajo para prestadores de servicios y gestión de citas diarias.
                        </p>
                        <div className="flex items-center text-blue-600 font-bold text-sm">
                            Acceder al Portal <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                    </Link>

                    {/* Portal Admin */}
                    <Link 
                        href="/admin/login"
                        className="group p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center mb-6 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                            <LayoutDashboard size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Administración</h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-6">
                            Panel de control para dueños de negocio, finanzas y configuración global.
                        </p>
                        <div className="flex items-center text-slate-900 font-bold text-sm">
                            Acceder al Portal <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                    </Link>

                </div>

                <footer className="pt-12 text-slate-400 text-xs font-semibold tracking-widest uppercase">
                    Plataforma Multi-Tenant &copy; {new Date().getFullYear()}
                </footer>
            </div>
        </main>
    )
}
