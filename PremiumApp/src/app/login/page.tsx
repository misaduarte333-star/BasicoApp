import { redirect } from 'next/navigation'

export default function LoginPage() {
    // Redirect /login to /admin/login by default
    // This heals 404s from components or browser cache that expect a root /login
    redirect('/admin/login')
}
