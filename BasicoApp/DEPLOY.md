# Despliegue en AWS con EasyPanel

## Descripción General

BasicoApp es una aplicación Next.js 15 completamente dockerizada. Puede ser desplegada en AWS EC2 usando EasyPanel.

## Requisitos Previos

- Cuenta en AWS
- EasyPanel instalado en una instancia EC2
- GitHub Personal Access Token (PAT) para clonar repositorios privados (opcional)
- Variables de entorno configuradas en AWS Systems Manager Parameter Store o EasyPanel

## Configuración de Despliegue en EasyPanel

### 1. Preparar Variables de Entorno

Antes de crear la aplicación en EasyPanel, asegurate de tener:

**En AWS Systems Manager → Parameter Store:**
- `NEXT_PUBLIC_SUPABASE_URL`: URL de tu proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave pública de Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Clave de servicio de Supabase (opcional para operaciones backend)

**O en un archivo `.env.local`:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 2. Crear Aplicación en EasyPanel

1. Accede a EasyPanel en tu instancia EC2
2. Ve a **Applications** → **Add New Application**
3. Selecciona **Docker** como método de despliegue
4. Configura los siguientes valores:

| Campo | Valor |
|-------|-------|
| **Application Name** | basico-app |
| **Repository URL** | `https://github.com/misaduarte333-star/BasicoApp.git` |
| **Branch** | `main` |
| **Dockerfile Path** | `./Dockerfile` |
| **Container Port** | `3001` |
| **Public Port** | `3001` (o el que prefieras) |
| **Restart Policy** | `unless-stopped` |

### 3. Configurar Variables de Entorno en EasyPanel

En la sección de **Environment Variables** de EasyPanel, agrega:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NODE_ENV=production
```

### 4. Configurar Health Check

EasyPanel debería detectar automáticamente el health check definido en `docker-compose.yml`:

```yaml
healthcheck:
  test: [ "CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/api/health" ]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### 5. Iniciar Despliegue

1. Haz clic en **Deploy**
2. EasyPanel descargará el repositorio
3. Construirá la imagen Docker
4. Iniciará el contenedor en el puerto `3001`

## Estructura de Construcción

El Dockerfile utiliza un multi-stage build para optimizar:

1. **base**: Node 20 Alpine (imagen base lightweight)
2. **deps**: Instala dependencias (npm ci)
3. **builder**: Construye la aplicación Next.js con `output: 'standalone'`
4. **runner**: Imagen final de producción (solo dependencias runtime)

## Monitoreo

### Logs en EasyPanel
- Accede a **Applications** → **basico-app** → **Logs**
- Visualiza logs en tiempo real del contenedor

### Health Check
La aplicación expone `GET /api/health` que retorna:
```json
{
  "status": "ok",
  "timestamp": "2026-04-14T..."
}
```

## Solución de Problemas

### Puerto en Uso
Si el puerto 3001 está en uso:
```bash
lsof -i :3001
kill -9 <PID>
```

### Variables de Entorno No Detectadas
1. Verifica que `.env.local` exista en la raíz del proyecto
2. Confirma que `docker-compose.yml` tiene `env_file: - .env.local`
3. Reinicia el contenedor: `docker restart basico-app`

### Construcción Fallida
1. Verifica logs de Docker: `docker logs basico-app`
2. Comprueba que `next.config.ts` tiene `output: 'standalone'`
3. Asegurate que `package-lock.json` es compatible con Node 20

## Escalabilidad

Para múltiples instancias:

1. **Load Balancer en AWS**: Configura ALB para distribuir tráfico
2. **Auto Scaling Group**: Configura EASYPanel para crear nuevas instancias automáticamente
3. **RDS para Supabase**: Usa Supabase como base de datos centralizada

## Actualizar la Aplicación

1. Haz push de cambios a GitHub (rama `main`)
2. En EasyPanel, ve a **Applications** → **basico-app**
3. Haz clic en **Redeploy**
4. EasyPanel descargará los cambios más recientes y reconstruirá

## URLs Importantes

- **Aplicación**: `http://your-instance-ip:3001`
- **GitHub**: https://github.com/misaduarte333-star/BasicoApp
- **Documentación Next.js**: https://nextjs.org/docs/deployment/docker
