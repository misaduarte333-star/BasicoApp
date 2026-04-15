import { LoginView } from '@/components/LoginView'

export default function AdminLoginPage() {
    return (
        <LoginView
            type="admin"
            title="Administración"
            subtitle="Acceso exclusivo para dueños y administradores del negocio."
            redirectPath="/admin"
            portalColor="blue"
        />
    )
}
