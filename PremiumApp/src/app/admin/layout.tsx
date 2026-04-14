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

const NAV_ITEMS = [
    { href: '/admin', icon: 'dashboard', label: 'Panel Control', group: 'principal' },
    { href: '/admin/citas', icon: 'calendar_month', label: 'Agenda Global', group: 'principal' },
    { href: '/admin/clientes', icon: 'badge', label: 'Clientes', group: 'principal' },
    { href: '/admin/barberos', icon: 'engineering', label: 'Staff', group: 'gestion' },
    { href: '/admin/servicios', icon: 'auto_fix_high', label: 'Servicios', group: 'gestion' },
    { href: '/admin/reportes', icon: 'monitoring', label: 'Reportes', group: 'analisis' },
    { href: '/admin/finanzas', icon: 'account_balance_wallet', label: 'Finanzas', group: 'analisis' },
    { href: '/admin/configuracion', icon: 'tune', label: 'Configuración', group: 'sistema' },
]

const GROUP_LABELS: Record<string, string> = {
    principal: 'Principal',
    gestion: 'Gestión',
    analisis: 'Análisis',
    sistema: 'Sistema',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isCheckingAuth, setIsCheckingAuth] = useState(true)
    const [showMobileMenu, setShowMobileMenu] = useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const { businessName, professionals } = useBusinessLabels()
    const [isLowPerformance, setIsLowPerformance] = useState(false)

    useEffect(() => {
        if (pathname === '/admin/login') { setIsCheckingAuth(false); return }
        const session = sessionStorage.getItem('barbercloud_session') || localStorage.getItem('admin_session')
        if (!session) { router.push('/admin/login') } else { setIsCheckingAuth(false) }
    }, [pathname, router])

    useEffect(() => {
        if (typeof window !== 'undefined') setIsLowPerformance(isLowEndDevice())
    }, [])

    // Close mobile menu when clicking outside or navigating
    useEffect(() => {
        setShowMobileMenu(false)
    }, [pathname])

    const isActive = (href: string) =>
        href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(href + '/')

    const handleLogout = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('admin_session')
            sessionStorage.removeItem('barbercloud_session')
        }
        router.push('/admin/login')
    }

    const toggleTheme = () => {
        if (typeof window === 'undefined') return
        const stored = localStorage.getItem('theme')
        const current = stored || (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
        const next = current === 'dark' ? 'light' : 'dark'
        document.documentElement.setAttribute('data-theme', next)
        document.documentElement.classList.toggle('dark', next === 'dark')
        document.documentElement.classList.toggle('light', next === 'light')
        localStorage.setItem('theme', next)
    }

    if (isCheckingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative size-16">
                        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                        <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin" />
                        <div className="absolute inset-3 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
                        </div>
                    </div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-bold animate-pulse">
                        Verificando acceso...
                    </p>
                </div>
            </div>
        )
    }

    if (pathname === '/admin/login') return <>{children}</>

    /* ── Group nav items ── */
    const grouped = NAV_ITEMS.reduce<Record<string, typeof NAV_ITEMS>>((acc, item) => {
        if (!acc[item.group]) acc[item.group] = []
        acc[item.group].push(item)
        return acc
    }, {})

    return (
        <div className={cn(
            "bg-background text-foreground min-h-screen flex flex-col lg:flex-row font-display relative selection:bg-primary selection:text-black antialiased transition-colors duration-300",
            isLowPerformance && "efficiency-mode"
        )}>
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

            {/* ────────────────────────────────────────────────────
                MOBILE HEADER
            ──────────────────────────────────────────────────── */}
            <header className="lg:hidden h-14 px-4 border-b border-border/60 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-xl z-30">
                {/* Brand */}
                <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-lg bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center shadow-[0_0_12px_-2px_rgba(212,175,55,0.5)]">
                        <span className="text-black font-black text-sm">{businessName.charAt(0)}</span>
                    </div>
                    <span className="text-sm font-black tracking-[0.15em] uppercase">{businessName}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button onClick={toggleTheme}
                        className="size-9 rounded-lg border border-border bg-muted/40 flex items-center justify-center hover:bg-muted transition-all active:scale-95 touch-manipulation"
                        aria-label="Cambiar tema">
                        <span className="material-symbols-outlined text-base leading-none">contrast</span>
                    </button>
                    <button onClick={handleLogout}
                        className="size-9 rounded-lg border border-border bg-muted/40 flex items-center justify-center hover:border-red-400/40 hover:text-red-400 transition-all active:scale-95 touch-manipulation"
                        aria-label="Cerrar sesión">
                        <span className="material-symbols-outlined text-base leading-none">logout</span>
                    </button>
                </div>
            </header>

            {/* ────────────────────────────────────────────────────
                DESKTOP SIDEBAR
            ──────────────────────────────────────────────────── */}
            <aside className="w-[260px] bg-card border-r border-border/60 flex-col h-screen sticky top-0 z-50 hidden lg:flex">

                {/* Brand Header */}
                <div className="relative px-5 py-5 border-b border-border/40 overflow-hidden">
                    {/* Ambient glow */}
                    <div className="absolute -top-6 -left-6 size-24 rounded-full bg-primary/8 blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-4 -right-4 size-20 rounded-full bg-primary/5 blur-xl pointer-events-none" />

                    <div className="relative flex items-center gap-3">
                        {/* Logo mark */}
                        <div className="relative shrink-0">
                            <div className="size-11 rounded-xl bg-gradient-to-br from-primary/90 to-primary flex items-center justify-center shadow-[0_4px_20px_-4px_rgba(212,175,55,0.5)] border border-primary/30">
                                <span className="text-black font-black text-lg">{businessName.charAt(0)}</span>
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 border-2 border-card" />
                        </div>

                        <div className="min-w-0">
                            <h1 className="text-[13px] font-black tracking-[0.18em] text-foreground leading-tight truncate uppercase">
                                {businessName}
                            </h1>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="material-symbols-outlined text-[10px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>diamond</span>
                                <p className="text-[9px] uppercase tracking-[0.3em] text-primary/70 font-black">Premium Suite</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar">
                    {Object.entries(grouped).map(([group, items]) => (
                        <div key={group}>
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/50 px-3 mb-1.5">
                                {GROUP_LABELS[group]}
                            </p>
                            <div className="space-y-0.5">
                                {items.map(item => (
                                    <NavItem
                                        key={item.href}
                                        href={item.href}
                                        icon={item.icon}
                                        label={item.href === '/admin/barberos' ? `${professionals}` : item.label}
                                        active={isActive(item.href)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-3 border-t border-border/40 space-y-2">
                    {/* Theme Toggle */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/30 border border-border/40">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-muted-foreground">contrast</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Apariencia</span>
                        </div>
                        <ThemeToggle />
                    </div>

                    {/* Profile Card */}
                    <div className="rounded-xl border border-border/40 bg-muted/20 overflow-hidden hover:border-primary/20 transition-all group">
                        <div className="flex items-center gap-3 p-3">
                            <div className="relative shrink-0">
                                <div className="size-9 rounded-lg overflow-hidden border border-primary/20">
                                    <img
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAupJ0NN2FAFZ6tI6RCShLVEdmHhuGCITlUKRL6_nXpmUHJwgFD5gdYKHv4rgGoTTyZjfhMPhOizJfi_Wr0I8ScGatKToDD6OoSBPCK216hMjcwbbVW8ECH4_42v7X7UxdAc0iJnJ3ZYaVfVubqC5ggr2alR3AGRmXpmgpnox1TvJ_LjpECls_bxd51pd4_A9JwUKRWndND9sgtx_KrQo6V3Ish93C9evXJpme6TaCkAOstX_qONuWfqoJ4uYZWK8CxXjC5OmTd8Wg"
                                        alt="Admin" className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-black uppercase tracking-wider text-foreground truncate">Administrador</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <span className="material-symbols-outlined text-[9px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                    <p className="text-[9px] text-primary font-bold uppercase tracking-widest">Master Access</p>
                                </div>
                            </div>
                        </div>
                        <button onClick={handleLogout}
                            className="w-full py-2 text-[10px] font-black text-muted-foreground hover:text-red-400 hover:bg-red-500/5 transition-all uppercase tracking-widest border-t border-border/40 flex items-center justify-center gap-1.5">
                            <span className="material-symbols-outlined text-xs leading-none">logout</span>
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </aside>

            {/* ────────────────────────────────────────────────────
                MOBILE BOTTOM NAV
            ──────────────────────────────────────────────────── */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/95 border-t border-border/60 py-1 z-40 backdrop-blur-xl">
                <div className="flex items-center justify-around px-1">
                    {NAV_ITEMS.slice(0, 5).map(item => {
                        const active = isActive(item.href)
                        return (
                            <Link key={item.href} href={item.href}
                                className={`flex flex-col items-center gap-0.5 py-1 px-1 transition-all flex-1 max-w-[64px] ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                                <span className={`material-symbols-outlined text-[18px] leading-none transition-all ${active ? 'scale-105' : ''}`}
                                    style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>
                                    {item.icon}
                                </span>
                                <span className="text-[6px] font-black tracking-wider uppercase text-center line-clamp-1">{item.label.split(' ')[0]}</span>
                                {active && <div className="w-3 h-0.5 bg-primary rounded-full" />}
                            </Link>
                        )
                    })}
                    
                    {/* More Menu Button */}
                    <div className="relative">
                        <button onClick={() => setShowMobileMenu(!showMobileMenu)}
                            className={`flex flex-col items-center gap-0.5 py-1 px-1 transition-all flex-1 max-w-[64px] ${showMobileMenu ? 'text-primary' : 'text-muted-foreground'}`}>
                            <span className="material-symbols-outlined text-[18px] leading-none">more_vert</span>
                            <span className="text-[6px] font-black tracking-wider uppercase">Más</span>
                        </button>
                        
                        {/* Dropdown Menu */}
                        {showMobileMenu && (
                            <div className="absolute bottom-full right-0 mb-1 bg-card border border-border/60 rounded-lg shadow-lg overflow-hidden min-w-[130px] z-50">
                                {NAV_ITEMS.slice(5).map(item => {
                                    const active = isActive(item.href)
                                    return (
                                        <Link key={item.href} href={item.href}
                                            onClick={() => setShowMobileMenu(false)}
                                            className={cn(
                                                "flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider border-b border-border/30 last:border-0 transition-colors",
                                                active ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted/60'
                                            )}>
                                            <span className="material-symbols-outlined text-xs leading-none" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>
                                                {item.icon}
                                            </span>
                                            <span className="truncate">{item.label}</span>
                                        </Link>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* ────────────────────────────────────────────────────
                MAIN CONTENT
            ──────────────────────────────────────────────────── */}
            <main className="flex-1 overflow-y-auto pb-20 lg:pb-0 relative z-10 min-h-screen">
                <ConnectionStatus />
                <div className="max-w-7xl mx-auto w-full p-4 lg:p-6 animate-fade-in">
                    {children}
                </div>
            </main>

            {/* Theme init script */}
            <script dangerouslySetInnerHTML={{
                __html: `
                (function(){if(typeof window==='undefined')return;var t=localStorage.getItem('theme')||(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.classList.toggle('light',t==='light');})();
            `}} />
        </div>
    )
}

/* ── NavItem Component ── */
function NavItem({ href, icon, label, active }: { href: string; icon: string; label: string; active: boolean }) {
    return (
        <Link href={href} className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
            active
                ? "bg-primary text-black"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        )}>
            {active && (
                <div className="absolute inset-0 rounded-xl shadow-[0_4px_15px_-4px_rgba(212,175,55,0.35)] pointer-events-none" />
            )}
            <span className={cn(
                "material-symbols-outlined text-[18px] leading-none shrink-0 transition-transform duration-200",
                !active && "group-hover:scale-110",
                active && "opacity-90"
            )} style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {icon}
            </span>
            <span className={cn(
                "text-[11px] uppercase tracking-[0.12em] truncate",
                active ? "font-black" : "font-bold"
            )}>
                {label}
            </span>
            {active && (
                <span className="ml-auto material-symbols-outlined text-[14px] opacity-60 leading-none">chevron_right</span>
            )}
        </Link>
    )
}