# Guía de Despliegue en Easypanel (EC2)

Esta guía explica cómo configurar el despliegue automático de la aplicación utilizando **GitHub Actions** y **Easypanel**.

## 1. Configuración en GitHub (Secrets)

Para que el despliegue automático funcione, ve a tu repositorio en GitHub:
**Settings > Secrets and variables > Actions > New repository secret**

Agrega los siguientes secretos:

| Secreto | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `EC2_HOST` | IP pública de tu instancia EC2 | `54.123.45.67` |
| `EC2_USER` | Usuario para SSH | `ubuntu` |
| `EC2_SSH_KEY` | Contenido de tu archivo `.pem` | `-----BEGIN RSA...` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon Key de Supabase | `eyJhbGci...` |
| `EASYPANEL_WEBHOOK` | (Opcional) URL del webhook de la app | `https://panel.tudominio.com/api/hooks/...` |

> [!IMPORTANT]
> Las variables `NEXT_PUBLIC_` deben estar en GitHub Secrets **antes** de hacer el build, ya que Next.js las inyecta en el código del navegador durante la compilación. Sin ellas, la app arrancará en "Modo Demo".

> [!NOTE]
> El workflow utiliza `GITHUB_TOKEN` para subir la imagen a **GitHub Container Registry (GHCR)** de forma gratuita.

## 2. Configuración en Easypanel

1. Entra a tu dashboard de Easypanel en la EC2.
2. Crea un nuevo **Project** (si no tienes uno).
3. Crea un nuevo **Service** de tipo **App**.
4. En **Source**, selecciona **Docker Image**.
5. Configura la imagen como: `ghcr.io/tu-usuario/tu-repositorio:latest`
   - *Nota: Asegúrate de que el paquete en GitHub sea público o configura el Docker Registry Auth en Easypanel.*
6. En **Environment**, agrega todas las variables necesarias (ver `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PORT=3000`
   - `HOSTNAME=0.0.0.0`
7. **Configurar el Webhook**:
   - En Easypanel, ve a la pestaña **General** del servicio.
   - Busca la sección **Deploy Webhook**.
   - Copia la URL que aparece.
   - Agrégala como un secreto llamado `EASYPANEL_WEBHOOK` en GitHub.

## 3. Flujo de Trabajo

1. Realizas cambios en tu código localmente.
2. Haces `git commit` y `git push origin main`.
3. GitHub Actions construirá la imagen y la subirá a GHCR.
4. Si configuraste el Webhook, Easypanel descargará la nueva imagen y reiniciará el contenedor automáticamente.

---

## Verificación de Salud

La app incluye un endpoint de salud en `/api/health` que puedes usar en la configuración de **Health Check** de Easypanel para asegurar que el tráfico solo se envíe cuando la app esté lista.
