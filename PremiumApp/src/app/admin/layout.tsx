'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { cn } from '@/lib/utils'
import { isLowEndDevice } from '@/lib/performance'
import { ThemeToggle } from '@/components/ThemeToggle'

import { useBusinessLabels } from '@/hooks/useBusinessLabels'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isCheckingAuth, setIsCheckingAuth] = useState(true)
    const router = useRouter()
    const pathname = usePathname()
    const { businessName, professionals } = useBusinessLabels()

    useEffect(() => {
        if (pathname === '/admin/login') {
            setIsCheckingAuth(false)
            return
        }

        const session = sessionStorage.getItem('barbercloud_session') || localStorage.getItem('admin_session')
        if (!session) {
            router.push('/admin/login')
        } else {
            setIsCheckingAuth(false)
        }
    }, [pathname, router])

    const isLinkActive = (href: string) => {
        if (href === '/admin') return pathname === '/admin'
        return pathname === href || pathname.startsWith(href + '/')
    }

    const [isLowPerformance, setIsLowPerformance] = useState(false)
    
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsLowPerformance(isLowEndDevice())
        }
    }, [])

    if (isCheckingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary shadow-glow-gold"></div>
            </div>
        )
    }

    if (pathname === '/admin/login') {
        return <>{children}</>
    }

    return (
        <div className={cn(
            "bg-background text-foreground min-h-screen flex flex-col lg:flex-row font-display relative selection:bg-primary selection:text-black antialiased transition-colors duration-300",
            isLowPerformance && "efficiency-mode"
        )}>
            {/* Material Symbols Outlined stylesheet */}
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

            {/* Mobile Header (Elite Style) */}
            <header className="lg:hidden h-14 px-4 border-b border-border flex items-center justify-between sticky top-0 bg-background/90 backdrop-blur-xl z-30">
                <div className="flex items-center gap-2.5">
                    <div className="size-10 rounded-xl overflow-hidden shadow-lg shadow-primary/20 border border-primary/20 bg-background flex items-center justify-center text-primary font-bold">
                        {businessName.charAt(0)}
                    </div>
                    <h1 className="text-sm font-black tracking-[0.2em] text-foreground uppercase italic">{businessName}</h1>
                </div>
                <div className="flex items-center gap-2">
                    {/* Mobile Theme Toggle */}
                    <button
                        onClick={() => {
                            // Check current theme state from multiple sources
                            let currentTheme = 'light';
                            
                            // Check localStorage first
                            if (typeof window !== 'undefined') {
                                const storedTheme = localStorage.getItem('theme');
                                if (storedTheme) {
                                    currentTheme = storedTheme;
                                } else {
                                    // Fallback to checking document classes
                                    if (document.documentElement.classList.contains('dark')) {
                                        currentTheme = 'dark';
                                    }
                                }
                            }
                            
                            // Toggle theme
                            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                            
                            // Apply theme changes
                            if (typeof window !== 'undefined') {
                                document.documentElement.setAttribute('data-theme', newTheme);
                                document.documentElement.classList.toggle('dark', newTheme === 'dark');
                                document.documentElement.classList.toggle('light', newTheme === 'light');
                                localStorage.setItem('theme', newTheme);
                            }
                        }}
                        className="relative size-9 min-h-[36px] rounded-lg border border-border bg-muted/50 flex items-center justify-center transition-all hover:bg-muted/80 active:scale-95 touch-manipulation group"
                        aria-label="Cambiar tema entre claro y oscuro"
                        title="Cambiar tema"
                    >
                        <span className="material-symbols-outlined text-lg leading-none group-hover:scale-110 transition-transform">light_mode</span>
                        <div className="absolute -top-1 -right-1 size-2 rounded-full bg-primary/70 group-hover:scale-125 transition-transform"></div>
                    </button>
                    
                    {/* Mobile Logout Button */}
                    <button
                        onClick={() => { 
                            // Clear session
                            if (typeof window !== 'undefined') {
                                localStorage.removeItem('admin_session'); 
                                sessionStorage.removeItem('barbercloud_session');
                            }
                            router.push('/admin/login'); 
                        }}
                        className="relative size-9 min-h-[36px] rounded-lg border border-border bg-muted/50 flex items-center justify-center transition-all hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-200 dark:hover:border-red-800 active:scale-95 touch-manipulation group"
                        aria-label="Cerrar sesión del panel de administración"
                        title="Cerrar sesión"
                    >
                        <span className="material-symbols-outlined text-lg leading-none text-muted-foreground group-hover:text-red-500 transition-colors">logout</span>
                        <div className="absolute -bottom-0.5 -right-0.5 w-full h-0.5 bg-gradient-to-r from-transparent via-red-400 to-transparent opacity-0 group-hover:opacity-70 transition-opacity"></div>
                    </button>
                    
                    {/* User Menu (Avatar) */}
                    <div className="size-9 min-h-[36px] rounded-lg overflow-hidden border border-border bg-background shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <Image 
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAupJ0NN2FAFZ6tI6RCShLVEdmHhuGCITlUKRL6_nXpmUHJwgFD5gdYKHv4rgGoTTyZjfhMPhOizJfi_Wr0I8ScGatKToDD6OoSBPCK216hMjcwbbVW8ECH4_42v7X7UxdAc0iJnJ3ZYaVfVubqC5ggr2alR3AGRmXpmgpnox1TvJ_LjpECls_bxd51pd4_A9JwUKRWndND9sgtx_KrQo6V3Ish93C9evXJpme6TaCkAOstX_qONuWfqoJ4uYZWK8CxXjC5OmTd8Wg" 
                            alt="Avatar del administrador"
                            width={36}
                            height={36}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                    </div>
                </div>
            </header>

            {/* Theme Initialization Script for Mobile and Desktop */}
            <script
                dangerouslySetInnerHTML={{
                    __html: `
                    // Enhanced theme initialization script
                    (function() {
                        // Only run on client-side
                        if (typeof window !== 'undefined') {
                            // Check if current theme is stored
                            let storedTheme = localStorage.getItem('theme');
                            
                            // If no stored theme, check system preference as fallback
                            if (!storedTheme) {
                                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                                    storedTheme = 'dark';
                                } else {
                                    storedTheme = 'light';
                                }
                            }
                            
                            // Apply the theme
                            document.documentElement.setAttribute('data-theme', storedTheme);
                            document.documentElement.classList.toggle('dark', storedTheme === 'dark');
                            document.documentElement.classList.toggle('light', storedTheme === 'light');
                            
                            // Listen for system theme changes as a fallback
                            if (window.matchMedia) {
                                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                                    if (!localStorage.getItem('theme')) {
                                        const newTheme = e.matches ? 'dark' : 'light';
                                        document.documentElement.setAttribute('data-theme', newTheme);
                                        document.documentElement.classList.toggle('dark', newTheme === 'dark');
                                        document.documentElement.classList.toggle('light', newTheme === 'light');
                                    }
                                });
                            }
                        }
                    })();
                    `
                }}
            />

            <aside className={`
                w-72 bg-card border-r border-border flex-col h-screen sticky top-0 z-50 overflow-hidden
                hidden lg:flex transition-transform duration-500
            `}>
                <div className="p-6 flex items-center gap-3.5">
                    <div className="size-12 rounded-xl overflow-hidden shadow-lg shadow-primary/20 border border-primary/20 bg-card transition-transform hover:scale-110 flex items-center justify-center text-primary font-bold text-xl">
                        {businessName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-lg font-black tracking-[0.2em] text-foreground leading-none max-w-full truncate">{businessName}</h1>
                        <p className="text-[9px] uppercase tracking-[0.3em] text-foreground/40 font-black mt-1">Portal Premium</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1.5 mt-2 overflow-y-auto custom-scrollbar pt-2">
                    <NavItem href="/admin" icon="dashboard" label="Panel Control" active={isLinkActive('/admin')} />
                    <NavItem href="/admin/citas" icon="calendar_month" label="Agenda Global" active={isLinkActive('/admin/citas')} />
                    <NavItem href="/admin/clientes" icon="badge" label="Clientes" active={isLinkActive('/admin/clientes')} />
                    <NavItem href="/admin/barberos" icon="engineering" label={`Gestión ${professionals}`} active={isLinkActive('/admin/barberos')} />
                    <NavItem href="/admin/servicios" icon="brush" label="Servicios" active={isLinkActive('/admin/servicios')} />
                    <NavItem href="/admin/reportes" icon="monitoring" label="Reportes" active={isLinkActive('/admin/reportes')} />
                    <NavItem href="/admin/finanzas" icon="account_balance_wallet" label="Finanzas" active={isLinkActive('/admin/finanzas')} />
                    <NavItem href="/admin/configuracion" icon="settings" label="Ajustes" active={isLinkActive('/admin/configuracion')} />
                </nav>

                <div className="p-4 mt-auto border-t border-border bg-background/20 space-y-4">
                    <div className="flex justify-center py-2 px-4 bg-muted/30 rounded-2xl border border-border">
                        <ThemeToggle />
                    </div>
                    
                    <div className="bg-muted/50 rounded-2xl p-3 border border-border hover:border-primary/20 transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="size-9 rounded-xl overflow-hidden border border-primary/20 group-hover:scale-105 transition-transform">
                                <img 
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAupJ0NN2FAFZ6tI6RCShLVEdmHhuGCITlUKRL6_nXpmUHJwgFD5gdYKHv4rgGoTTyZjfhMPhOizJfi_Wr0I8ScGatKToDD6OoSBPCK216hMjcwbbVW8ECH4_42v7X7UxdAc0iJnJ3ZYaVfVubqC5ggr2alR3AGRmXpmgpnox1TvJ_LjpECls_bxd51pd4_A9JwUKRWndND9sgtx_KrQo6V3Ish93C9evXJpme6TaCkAOstX_qONuWfqoJ4uYZWK8CxXjC5OmTd8Wg" 
                                    alt="Admin"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-black text-foreground leading-none uppercase tracking-wider truncate">Administrador</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <p className="text-[9px] text-primary font-bold uppercase tracking-widest">Master Access</p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => { localStorage.removeItem('admin_session'); router.push('/admin/login'); }}
                            className="w-full mt-3 py-2 text-[10px] font-black text-muted-foreground hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all uppercase tracking-widest border border-border"
                        >
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/90 border-t border-border py-2 z-40 backdrop-blur-xl transition-colors duration-300">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar px-6 relative">
                    {/* Shadow indicators for scrolling */}
                    <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
                    
                    <Link className={`flex flex-col items-center gap-1 min-w-[72px] py-1 transition-all ${isLinkActive('/admin') ? 'text-primary' : 'text-muted-foreground'}`} href="/admin">
                        <span className="material-symbols-outlined text-xl leading-none">dashboard</span>
                        <span className="text-[9px] font-black tracking-widest uppercase">Inicio</span>
                        {isLinkActive('/admin') && <div className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-full shadow-glow-gold" />}
                    </Link>
                    
                    <Link className={`flex flex-col items-center gap-1 min-w-[72px] py-1 transition-all ${isLinkActive('/admin/citas') ? 'text-primary' : 'text-muted-foreground'}`} href="/admin/citas">
                        <span className="material-symbols-outlined text-xl leading-none">calendar_month</span>
                        <span className="text-[9px] font-black tracking-widest uppercase">Agenda</span>
                        {isLinkActive('/admin/citas') && <div className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-full shadow-glow-gold" />}
                    </Link>

                    <Link className={`flex flex-col items-center gap-1 min-w-[72px] py-1 transition-all ${isLinkActive('/admin/clientes') ? 'text-primary' : 'text-muted-foreground'}`} href="/admin/clientes">
                        <span className="material-symbols-outlined text-xl leading-none">badge</span>
                        <span className="text-[9px] font-black tracking-widest uppercase">Clientes</span>
                        {isLinkActive('/admin/clientes') && <div className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-full shadow-glow-gold" />}
                    </Link>

                    <Link className={`flex flex-col items-center gap-1 min-w-[72px] py-1 transition-all ${isLinkActive('/admin/barberos') ? 'text-primary' : 'text-muted-foreground'}`} href="/admin/barberos">
                        <span className="material-symbols-outlined text-xl leading-none">engineering</span>
                        <span className="text-[9px] font-black tracking-widest uppercase">Staff</span>
                        {isLinkActive('/admin/barberos') && <div className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-full shadow-glow-gold" />}
                    </Link>

                    <Link className={`flex flex-col items-center gap-1 min-w-[72px] py-1 transition-all ${isLinkActive('/admin/servicios') ? 'text-primary' : 'text-muted-foreground'}`} href="/admin/servicios">
                        <span className="material-symbols-outlined text-xl leading-none">brush</span>
                        <span className="text-[9px] font-black tracking-widest uppercase">Servicios</span>
                        {isLinkActive('/admin/servicios') && <div className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-full shadow-glow-gold" />}
                    </Link>

                    <Link className={`flex flex-col items-center gap-1 min-w-[72px] py-1 transition-all ${isLinkActive('/admin/reportes') ? 'text-primary' : 'text-muted-foreground'}`} href="/admin/reportes">
                        <span className="material-symbols-outlined text-xl leading-none">monitoring</span>
                        <span className="text-[9px] font-black tracking-widest uppercase">Reportes</span>
                        {isLinkActive('/admin/reportes') && <div className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-full shadow-glow-gold" />}
                    </Link>

                    <Link className={`flex flex-col items-center gap-1 min-w-[72px] py-1 transition-all ${isLinkActive('/admin/finanzas') ? 'text-primary' : 'text-muted-foreground'}`} href="/admin/finanzas">
                        <span className="material-symbols-outlined text-xl leading-none">account_balance_wallet</span>
                        <span className="text-[9px] font-black tracking-widest uppercase">Finanzas</span>
                        {isLinkActive('/admin/finanzas') && <div className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-full shadow-glow-gold" />}
                    </Link>

                    <Link className={`flex flex-col items-center gap-1 min-w-[72px] py-1 transition-all ${isLinkActive('/admin/configuracion') ? 'text-primary' : 'text-muted-foreground'}`} href="/admin/configuracion">
                        <span className="material-symbols-outlined text-xl leading-none">settings</span>
                        <span className="text-[9px] font-black tracking-widest uppercase">Ajustes</span>
                        {isLinkActive('/admin/configuracion') && <div className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-full shadow-glow-gold" />}
                    </Link>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto pb-24 lg:pb-0 relative z-10">
                <ConnectionStatus />
                <div className="max-w-7xl mx-auto w-full animate-fade-in relative flex-1 p-4 lg:p-6">
                    {children}
                </div>
            </main>
        </div>
    )
}

function NavItem({ href, icon, label, active }: { href: string; icon: string; label: string; active: boolean }) {
    return (
        <Link
            href={href}
            className={`
                flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group relative overflow-hidden
                ${active
                    ? 'bg-primary text-black font-black shadow-[0_0_20px_-5px_rgba(212,175,55,0.4)]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent hover:border-border'
                }
            `}
        >
            {active && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-black/20" />
            )}
            <span className={`material-symbols-outlined text-xl transition-transform duration-300 ${!active && 'group-hover:scale-110 group-hover:rotate-6 opacity-70 group-hover:opacity-100'} ${active ? 'font-black' : ''}`}>
                {icon}
            </span>
            <span className={`text-[11px] uppercase tracking-[0.15em] transition-all ${active ? 'font-black' : 'font-bold'}`}>
                {label}
            </span>
            
            {!active && (
                <div className="absolute right-2 translate-x-4 group-hover:translate-x-0 transition-transform duration-300">
                    <span className="material-symbols-outlined text-[10px] text-primary/40">chevron_right</span>
                </div>
            )}
        </Link>
    )
}
