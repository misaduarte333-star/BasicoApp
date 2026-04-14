import { Metadata, Viewport } from 'next'
import { Inter, Montserrat, Geist } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { cn } from "@/lib/utils";
import { MotionConfig } from 'framer-motion';
import { ThemeProvider } from "@/components/ThemeProvider"

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
    variable: '--font-inter',
    subsets: ['latin'],
    display: 'swap',
})

const montserrat = Montserrat({
    variable: '--font-montserrat',
    subsets: ['latin'],
    display: 'swap',
    weight: ['300', '400', '700', '900'],
})

export const metadata: Metadata = {
    title: 'Dashboard IA',
    description: 'Sistema inteligente de gestión de citas para negocios de servicios',
    keywords: ['negocio', 'citas', 'gestión', 'IA', 'WhatsApp'],
    authors: [{ name: 'Enterprise' }],
    manifest: '/manifest.json',
}

import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="es" className={cn(inter.variable, montserrat.variable, "font-sans", geist.variable)} suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round&display=swap" rel="stylesheet" />
            </head>
            <body className="min-h-screen font-display antialiased transition-colors duration-300" suppressHydrationWarning>
                <MotionConfig reducedMotion="user">
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="dark"
                        enableSystem
                        disableTransitionOnChange
                    >
                        <AuthProvider>
                            {children}
                            <Toaster position="top-right" richColors closeButton />
                        </AuthProvider>
                    </ThemeProvider>
                </MotionConfig>
            </body>
        </html>
    )
}
