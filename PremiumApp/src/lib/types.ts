// ============================================================================
// PremiumApp - Type Definitions
// ============================================================================

// Schedule Types (used in JSONB columns)
export interface HorarioDia {
    apertura: string  // "09:00"
    cierre: string    // "19:00"
}

export interface HorarioLaboral {
    inicio: string  // "09:00"
    fin: string     // "18:00"
}

export interface BloqueAlmuerzo {
    inicio: string  // "14:00"
    fin: string     // "15:00"
}

export type DiasSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'

export type HorarioApertura = Partial<Record<DiasSemana, HorarioDia>>
export type HorarioLaboralSemana = Partial<Record<DiasSemana, HorarioLaboral>>

export interface ValidacionResultado {
    valido: boolean
    mensaje?: string
    tipo?: 'exito' | 'error' | 'advertencia'
}

// Enums
export type OrigenCita = 'whatsapp' | 'walkin' | 'telefono'
export type EstadoCita = 'confirmada' | 'en_espera' | 'en_proceso' | 'por_cobrar' | 'finalizada' | 'cancelada' | 'no_show'
export type TipoBloqueo = 'almuerzo' | 'vacaciones' | 'dia_festivo' | 'emergencia'

export interface KPIs {
    citasHoy: number
    completadas: number
    ingresos: number
    noShows: number
}
export type RolAdmin = 'admin' | 'secretaria'

// ============================================================================
// Database Row Types (Sincronizado con Esquema SQL)
// ============================================================================

export interface Sucursal {
    id: string
    nombre: string
    direccion: string | null
    telefono_whatsapp: string | null
    activa: boolean
    horario_apertura?: HorarioApertura | null
    created_at: string
    updated_at?: string
    slug?: string | null
    plan?: string
    tipo_prestador?: string
    tipo_prestador_label?: string
}

export interface Profesional {
    id: string
    sucursal_id: string | null
    nombre: string
    usuario_tablet: string
    password_hash: string | null
    horario_laboral: any // JSONB
    bloqueo_almuerzo: BloqueAlmuerzo | null
    hora_entrada: string | null
    activo: boolean
    estacion_id: number | null
    comision_porcentaje: number | null
    meta_cortes_mensual: number | null
    created_at: string
}
// Alias para compatibilidad con código legado
export type Barbero = Profesional

export interface BarberoConSucursal extends Barbero {
    sucursal?: Partial<Sucursal>
}

export interface Servicio {
    id: string
    sucursal_id?: string | null
    nombre: string
    duracion_minutos: number
    precio: number
    activo: boolean
    created_at: string
    costo_directo?: number
}

export interface Cita {
    id: string
    sucursal_id: string | null
    barbero_id: string | null // Still using barbero_id in DB, but typed as string for now
    servicio_id: string | null
    cliente_id?: string | null
    cliente_nombre: string
    cliente_telefono: string | null
    timestamp_inicio: string
    timestamp_fin: string
    origen: 'manual' | 'walkin' | 'whatsapp' | 'telefono'
    estado: EstadoCita | 'pendiente' | 'ausente' | 'por_cobrar'
    notas?: string | null
    monto_pagado?: number | null
    metodo_pago?: string | null
    notas_crm?: string | null
    timestamp_inicio_servicio?: string | null
    timestamp_fin_servicio?: string | null
    duracion_real_minutos?: number | null
    created_at: string
    updated_at?: string
}

// CitaDesdeVista used in tablet/admin views with joined relations
export interface CitaDesdeVista {
    id: string
    sucursal_id: string
    barbero_id: string
    servicio_id: string | null
    cliente_id?: string | null
    cliente_nombre: string
    cliente_telefono: string
    timestamp_inicio: string
    timestamp_fin: string
    timestamp_inicio_local?: string
    timestamp_fin_local?: string
    origen: OrigenCita | 'manual'
    estado: EstadoCita
    notas: string | null
    monto_pagado?: number | null
    metodo_pago?: string | null
    notas_crm?: string | null
    recordatorio_24h_enviado?: boolean
    recordatorio_1h_enviado?: boolean
    created_at: string
    updated_at: string
    hora_cita_local?: string
    hora_fin_local?: string
    fecha_cita_local?: string
    duracion_real_minutos?: number | null
    timestamp_inicio_servicio?: string | null
    timestamp_fin_servicio?: string | null
    servicio_nombre?: string
    servicio_precio?: number
    servicio_duracion?: number
    barbero_nombre?: string
    barbero_estacion?: number
}

export interface Cliente {
    id: string
    sucursal_id: string | null
    nombre: string
    telefono: string | null
    email: string | null
    notas_internas: string | null
    ultima_cita: string | null
    total_citas: number
    created_at: string
    updated_at: string
}

export interface Gasto {
    id: string
    sucursal_id: string | null
    descripcion: string
    monto: number
    fecha_pago: string
    pagado: boolean
    es_recurrente: boolean
    frecuencia?: string | null
    dia_semana?: string | null
    dia_mes?: number | null
    metodo_pago?: string | null
    detalles_pago?: string | null
    barbero_id?: string | null
    created_at: string
    updated_at: string
}

export interface Bloqueo {
    id: string
    barbero_id: string | null
    sucursal_id: string
    timestamp_inicio: string
    timestamp_fin: string
    timestamp_inicio_local?: string
    timestamp_fin_local?: string
    fecha_inicio?: string
    fecha_fin?: string
    tipo: TipoBloqueo
    motivo: string | null
    created_at: string
}

export interface UsuarioAdmin {
    id: string
    sucursal_id: string
    nombre: string
    email: string
    password_hash: string
    rol: RolAdmin
    activo: boolean
    created_at: string
}

export interface Database {
    public: {
        Tables: {
            sucursales: {
                Row: Sucursal
                Insert: Omit<Sucursal, 'id' | 'created_at'>
                Update: Partial<Omit<Sucursal, 'id' | 'created_at'>>
                Relationships: []
            }
            barberos: {
                Row: Profesional
                Insert: Omit<Profesional, 'id' | 'created_at'>
                Update: Partial<Omit<Profesional, 'id' | 'created_at'>>
                Relationships: []
            }
            servicios: {
                Row: Servicio
                Insert: Omit<Servicio, 'id' | 'created_at'>
                Update: Partial<Omit<Servicio, 'id' | 'created_at'>>
                Relationships: []
            }
            citas: {
                Row: Cita
                Insert: Omit<Cita, 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Omit<Cita, 'id' | 'created_at'>>
                Relationships: []
            }
            bloqueos: {
                Row: Bloqueo
                Insert: Omit<Bloqueo, 'id' | 'created_at'>
                Update: Partial<Omit<Bloqueo, 'id' | 'created_at'>>
                Relationships: []
            }
            usuarios_admin: {
                Row: UsuarioAdmin
                Insert: Omit<UsuarioAdmin, 'id' | 'created_at'>
                Update: Partial<Omit<UsuarioAdmin, 'id' | 'created_at'>>
                Relationships: []
            }
            clientes: {
                Row: Cliente
                Insert: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Omit<Cliente, 'id' | 'created_at'>>
                Relationships: []
            }
            gastos: {
                Row: Gasto
                Insert: Omit<Gasto, 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Omit<Gasto, 'id' | 'created_at'>>
                Relationships: []
            }
        }
        Views: {
            vista_citas_app: {
                Row: any // Simplified or reference actual Cita
            }
        }
        Functions: Record<string, never>
        Enums: Record<string, never>
        CompositeTypes: Record<string, never>
    }
}
