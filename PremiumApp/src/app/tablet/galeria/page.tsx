'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
    ArrowLeft,
    Camera,
    Upload,
    CheckCircle2,
    ImagePlus,
    Scissors,
    Box,
    Sparkles,
    ShieldCheck,
    Loader2,
    Trash2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Servicio {
    id: string
    nombre: string
    precio: number
}

interface FotoCorte {
    id?: string
    servicio_id: string
    url: string
}

// Iconos SVG de barbería para el fondo (Estilo Vercel/Premium)
const ScissorsIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3h-3z" />
    </svg>
)

const RazorIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.5 3L20.34 3.03L15 5.1L9 3L3.36 4.9C3.15 4.97 3 5.15 3 5.38V20.5C3 20.78 3.22 21 3.5 21L3.66 20.97L9 18.9L15 21L20.64 19.1C20.85 19.03 21 18.85 21 18.62V3.5C21 3.22 20.78 3 20.5 3M10 5.47L14 6.87V18.53L10 17.13V5.47M5 6.46L8 5.45V17.15L5 18.31V6.46M19 17.54L16 18.55V6.86L19 5.7V17.54Z" />
    </svg>
)

const CombIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 2H6V22H4V2M8 2H10V11H8V2M8 13H10V22H8V13M12 2H14V8H12V2M12 10H14V22H12V10M16 2H18V6H16V2M16 8H18V22H16V8M20 2H22V4H20V2M20 6H22V22H20V6Z" />
    </svg>
)

export default function GalleryPage() {
    const router = useRouter()
    const [barbero, setBarbero] = useState<{ id: string, nombre: string } | null>(null)
    const [servicios, setServicios] = useState<Servicio[]>([])
    const [fotosMap, setFotosMap] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState<string | null>(null)

    const supabase = createClient()

    useEffect(() => {
        const sessionStr = localStorage.getItem('profesional_session')
        if (!sessionStr) {
            router.push('/tablet/login')
            return
        }
        const session = JSON.parse(sessionStr)

        // Verify the barbero still exists in DB (avoids FK errors from stale sessions)
        supabase
            .from('barberos')
            .select('id, nombre')
            .eq('id', session.id)
            .single()
            .then(({ data, error }) => {
                const barberoData = data as { id: string; nombre: string } | null
                if (error || !barberoData) {
                    console.warn('[Galeria] Sesión inválida, redirigiendo a login')
                    localStorage.removeItem('profesional_session')
                    router.push('/tablet/login')
                    return
                }
                setBarbero(barberoData)
                loadData(barberoData.id)
            })
    }, [router])

    const loadData = async (barberoId: string) => {
        setLoading(true)
        try {
            const { data: servs } = await (supabase
                .from('servicios') as any)
                .select('*')
                .eq('activo', true)

            setServicios(servs || [])

            const { data: fotos } = await (supabase
                .from('fotos_cortes') as any)
                .select('servicio_id, url')
                .eq('barbero_id', barberoId)

            const map: Record<string, string> = {}
            fotos?.forEach((f: FotoCorte) => {
                map[f.servicio_id] = f.url
            })
            setFotosMap(map)
        } catch (err) {
            console.error('Error loading gallery data:', err)
            toast.error('Error al cargar la galería')
        } finally {
            setLoading(false)
        }
    }

    const handleUpload = async (servicioId: string, file: File) => {
        if (!barbero) return
        setUploading(servicioId)

        try {
            const fileExt = file.name.split('.').pop()
            const filePath = `${barbero.id}/${servicioId}.${fileExt}`

            console.log('[Galeria] Uploading to bucket=cortes path=', filePath)

            const { error: uploadError } = await supabase.storage
                .from('cortes')
                .upload(filePath, file, { upsert: true })

            if (uploadError) {
                console.error('[Galeria] Storage error:', uploadError.message, '| status:', (uploadError as any).statusCode, '| cause:', (uploadError as any).error)
                toast.error(`Error al subir: ${uploadError.message}`)
                return
            }

            const { data: { publicUrl } } = supabase.storage
                .from('cortes')
                .getPublicUrl(filePath)

            console.log('[Galeria] Uploaded OK, publicUrl=', publicUrl)

            const { error: dbError } = await (supabase
                .from('fotos_cortes') as any)
                .upsert({
                    barbero_id: barbero.id,
                    servicio_id: servicioId,
                    url: publicUrl
                }, { onConflict: 'barbero_id,servicio_id' })

            if (dbError) {
                console.error('[Galeria] DB error:', dbError.message, '| code:', dbError.code)
                toast.error(`Error al guardar en BD: ${dbError.message}`)
                return
            }

            setFotosMap(prev => ({ ...prev, [servicioId]: publicUrl }))
            toast.success('¡Foto actualizada con éxito!', {
                icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            })
        } catch (err: any) {
            console.error('[Galeria] Unexpected error:', err?.message ?? err)
            toast.error('Error inesperado al subir imagen')
        } finally {
            setUploading(null)
        }
    }

    const handleDelete = async (servicioId: string) => {
        if (!barbero) return
        setUploading(servicioId)

        try {
            // Delete record from DB
            const { error: dbError } = await (supabase
                .from('fotos_cortes') as any)
                .delete()
                .eq('barbero_id', barbero.id)
                .eq('servicio_id', servicioId)

            if (dbError) throw dbError

            // Attempt to clean up storage
            const { data: files } = await supabase.storage.from('cortes').list(`${barbero.id}`)
            if (files) {
                const fileToDelete = files.find(f => f.name.startsWith(`${servicioId}.`))
                if (fileToDelete) {
                    await supabase.storage.from('cortes').remove([`${barbero.id}/${fileToDelete.name}`])
                }
            }

            setFotosMap(prev => {
                const newMap = { ...prev }
                delete newMap[servicioId]
                return newMap
            })
            
            toast.success('Foto eliminada con éxito', {
                icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            })
        } catch (err: any) {
            console.error('Delete error:', err)
            toast.error('Error al eliminar imagen')
        } finally {
            setUploading(null)
        }
    }

    return (
        <main className="relative min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary selection:text-black antialiased">

            {/* ── Ambient Background ─────────────────── */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(177,120,20,0.1)_0%,transparent_70%)]" />
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.5) 2px,rgba(255,255,255,0.5) 3px)' }}
                />

                {/* Patterns */}
                <div className="absolute inset-0 opacity-[0.05]">
                    <ScissorsIcon className="absolute w-32 h-32 text-primary top-[10%] left-[5%] rotate-[-15deg]" />
                    <RazorIcon className="absolute w-24 h-24 text-primary top-[40%] right-[10%] rotate-[20deg]" />
                    <CombIcon className="absolute w-28 h-28 text-primary bottom-[15%] left-[20%] rotate-12" />
                </div>

                <div className="absolute inset-0 light-leak-top opacity-30" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-6 py-8">

                {/* ── Header ──────────────────────── */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div className="space-y-4">
                        <Link href="/tablet">
                            <Button variant="ghost" size="sm" className="pl-0 text-primary/60 hover:text-primary transition-colors group">
                                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                                <span className="font-black text-[10px] uppercase tracking-[0.2em]">Volver al Tablero</span>
                            </Button>
                        </Link>

                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                                    <Camera className="w-5 h-5 text-primary" />
                                </div>
                                <Badge className="bg-primary/20 text-primary border-primary/30 font-black text-[9px] uppercase tracking-widest px-3 py-1">
                                    Portafolio Digital
                                </Badge>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black font-display tracking-tight leading-none uppercase">
                                Mi <span className="gradient-text-gold">Galería</span>
                            </h1>
                            <p className="text-muted-foreground mt-3 font-bold text-[11px] uppercase tracking-[0.35em] max-w-md leading-relaxed">
                                Gestiona la exhibición de tus cortes por categoría
                            </p>
                        </div>
                    </div>

                    <div className="hidden md:flex flex-col items-end text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/30 mb-2">Sincronizado</p>
                        <div className="flex items-center gap-2 text-primary">
                            <ShieldCheck className="w-4 h-4" />
                            <span className="font-display font-black text-sm tracking-tighter uppercase">Asistente Virtual</span>
                        </div>
                    </div>
                </header>

                {/* ── Content Grid ────────────────────── */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Card key={i} className="bg-card/40 border-primary/10 animate-pulse h-[340px]">
                                <div className="aspect-[4/3] bg-foreground/5" />
                                <div className="p-6 space-y-3">
                                    <div className="h-4 w-2/3 bg-foreground/10 rounded" />
                                    <div className="h-3 w-full bg-foreground/5 rounded" />
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {servicios.map((servicio) => (
                            <Card
                                key={servicio.id}
                                className="group relative bg-card border-primary/10 backdrop-blur-xl hover:border-primary/40 transition-all duration-300 overflow-hidden shadow-2xl rounded-3xl"
                            >
                                <CardHeader className="p-0 border-b border-primary/5">
                                    <div className="aspect-[4/3] relative bg-muted dark:bg-black/40 overflow-hidden">
                                        {fotosMap[servicio.id] ? (
                                            <img
                                                src={fotosMap[servicio.id]}
                                                alt={servicio.nombre}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/30 group-hover:text-primary/40 transition-colors">
                                                <ImagePlus className="w-16 h-16 mb-4 stroke-[1px]" />
                                                <p className="text-[9px] font-black uppercase tracking-[0.3em]">Esperando Trabajo</p>
                                            </div>
                                        )}

                                        {/* Overlay de Subida */}
                                        {uploading === servicio.id && (
                                            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-20">
                                                <div className="relative">
                                                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                                    <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse" />
                                                </div>
                                                <span className="font-black text-[10px] uppercase tracking-[0.4em] text-primary">Procesando...</span>
                                            </div>
                                        )}

                                        {/* Acciones */}
                                        <div className="absolute bottom-4 right-4 left-4 z-10 flex items-center justify-between scale-100 lg:scale-90 lg:group-hover:scale-100 transition-transform opacity-100 lg:opacity-0 lg:group-hover:opacity-100 duration-300">
                                            {/* Botón de Eliminar */}
                                            {fotosMap[servicio.id] ? (
                                                <button
                                                    onClick={() => handleDelete(servicio.id)}
                                                    className="inline-flex items-center justify-center bg-red-500/10 border border-red-500/30 backdrop-blur-md text-red-500 font-black uppercase tracking-[0.2em] text-[10px] h-11 px-4 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-2xl"
                                                    disabled={!!uploading}
                                                    title="Eliminar Foto"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <div /> /* Placeholder to push Upload to the right */
                                            )}

                                            {/* Botón de Actualizar / Subir Foto */}
                                            <label className="cursor-pointer">
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={(e) => e.target.files?.[0] && handleUpload(servicio.id, e.target.files[0])}
                                                    disabled={!!uploading}
                                                />
                                                <div className="inline-flex items-center justify-center bg-background/90 dark:bg-black/80 border border-primary/30 backdrop-blur-md text-primary font-black uppercase tracking-[0.2em] text-[10px] h-11 px-6 rounded-2xl hover:bg-primary hover:text-black transition-all shadow-2xl">
                                                    <Upload className="w-4 h-4 mr-2" />
                                                    {fotosMap[servicio.id] ? 'Actualizar' : 'Subir Foto'}
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 relative">
                                    <div className="absolute top-0 right-6 -translate-y-1/2">
                                        <div className="p-3 rounded-2xl bg-background border border-primary/20 shadow-xl group-hover:border-primary/50 transition-colors">
                                            <Scissors className="w-4 h-4 text-primary" />
                                        </div>
                                    </div>
                                    <CardTitle className="font-display font-black text-xl uppercase tracking-tighter text-foreground mb-2 group-hover:text-primary transition-colors">
                                        {servicio.nombre}
                                    </CardTitle>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-primary/40" />
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                                            Sube tu mejor corte
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* ── Tip Card ──────────────────────── */}
                <footer className="mt-20 p-8 rounded-[2rem] border border-primary/10 bg-card/40 backdrop-blur-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                        <Sparkles className="w-32 h-32 text-primary rotate-12" />
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                        <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 glow-gold">
                            <Box className="w-8 h-8 text-primary" />
                        </div>
                        <div className="text-center md:text-left flex-1">
                            <h4 className="font-display font-black text-lg uppercase tracking-tight text-foreground mb-2">
                                Optimización de <span className="text-primary italic">Ventas Automáticas</span>
                            </h4>
                            <p className="text-[11px] text-muted-foreground leading-relaxed font-medium max-w-2xl">
                                Estas imágenes son procesadas en tiempo real por el agente inteligente de WhatsApp.
                                <span className="text-primary/70 ml-1">Un portafolio actualizado incrementa la tasa de reserva en un 40%.</span> Asegúrate de capturar cada ángulo con buena iluminación.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            className="bg-primary/5 border-primary/20 text-primary font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl px-8 h-12 hover:bg-primary/10"
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        >
                            Subir más fotos
                        </Button>
                    </div>
                </footer>
            </div>
        </main>
    )
}
