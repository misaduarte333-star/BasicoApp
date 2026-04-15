import { LoginView } from '@/components/LoginView'

export default function TabletLoginPage() {
    return (
        <LoginView
            type="tablet"
            title="Portal Profesional"
            subtitle="Ingresa con tu usuario de estación para gestionar tus citas."
            redirectPath="/tablet"
            portalColor="purple"
        />
    )
}
