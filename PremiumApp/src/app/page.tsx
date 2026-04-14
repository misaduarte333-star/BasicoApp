'use client'

import Link from 'next/link'
import { Badge, ShieldCheck } from 'lucide-react'

export default function Home() {
    return (
        <main className="fixed inset-0 flex flex-col overflow-hidden bg-black selection:bg-primary selection:text-black">
            
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

            {/* === MAIN CONTENT === */}
            <div className="relative z-10 flex-1 flex flex-col justify-center items-center px-6 py-8 animate-fade-in">
                
                {/* Logo & Title Section */}
                <header className="flex flex-col items-center mb-12 text-center">
                    <div className="relative w-20 h-20 flex items-center justify-center mb-8">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary to-transparent opacity-20 blur-2xl scale-150" />
                        <div className="absolute inset-0 rounded-full border-2 border-primary/50" />
                        <div className="flex items-center justify-center w-full h-full text-primary text-3xl font-display font-bold">
                            P
                        </div>
                    </div>

                    <h1 className="font-display font-black leading-[0.85] mb-6"
                        style={{ fontSize: 'clamp(2.5rem, 10vw, 4.5rem)' }}>
                        <span className="block text-white tracking-tight uppercase">Premium</span>
                        <span className="block gradient-text-gold tracking-tighter uppercase">Platform</span>
                    </h1>

                    <div className="flex items-center gap-5">
                        <div className="h-px w-10 bg-gradient-to-r from-transparent to-primary/30" />
                        <p className="text-[10px] tracking-[0.6em] text-primary/60 font-bold uppercase">
                            Admin & Pro Portal
                        </p>
                        <div className="h-px w-10 bg-gradient-to-l from-transparent to-primary/30" />
                    </div>
                </header>

                {/* Portal Selection */}
                <nav className="w-full max-w-sm flex flex-col gap-5">
                    
                    <Link
                        href="/tablet/login"
                        className="group relative p-6 rounded-2xl overflow-hidden transition-all duration-500 hover:translate-y-[-2px]"
                        style={{
                            background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(153,101,21,0.06) 100%)',
                            border: '1px solid rgba(212,175,55,0.2)',
                            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)'
                        }}
                    >
                        {/* Hover glow effects */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        
                        <div className="relative flex items-center gap-6">
                            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 group-hover:border-primary/60 transition-colors">
                                <Badge className="text-primary w-8 h-8" strokeWidth={1.5} />
                            </div>
                            
                            <div className="flex-1">
                                <p className="text-white font-bold text-lg tracking-wider uppercase leading-none mb-1.5 group-hover:text-primary transition-colors">Profesionales</p>
                                <p className="text-primary/40 text-xs font-semibold tracking-widest uppercase">Estación de Trabajo</p>
                            </div>
                            <div className="text-primary/30 group-hover:text-primary group-hover:translate-x-1 transition-all">
                                →
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/admin/login"
                        className="group relative p-6 rounded-2xl overflow-hidden transition-all duration-500 hover:translate-y-[-2px]"
                        style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)'
                        }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        
                        <div className="relative flex items-center gap-6">
                            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 group-hover:border-white/30 transition-colors">
                                <ShieldCheck className="text-white w-8 h-8 opacity-60 group-hover:opacity-100" strokeWidth={1.5} />
                            </div>
                            
                            <div className="flex-1">
                                <p className="text-white font-bold text-lg tracking-wider uppercase leading-none mb-1.5">Administración</p>
                                <p className="text-white/30 text-xs font-semibold tracking-widest uppercase">Gestión y Control</p>
                            </div>
                            <div className="text-white/20 group-hover:text-white/60 group-hover:translate-x-1 transition-all">
                                →
                            </div>
                        </div>
                    </Link>
                </nav>
            </div>

            <footer className="relative z-10 pb-10 flex flex-col items-center gap-2">
                <p className="text-[9px] tracking-[0.7em] text-white/20 font-bold uppercase text-center max-w-xs leading-relaxed">
                    Generic Service Ecosystem<br/>Authorized Access Only
                </p>
            </footer>
        </main>
    )
}
