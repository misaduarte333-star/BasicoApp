// ============================================================================
// BasicoApp - Type Definitions
// ============================================================================

// Schedule Types
export interface ValidacionResultado {
    valido: boolean
    mensaje?: string
}

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

// Enums
export type OrigenCita = 'whatsapp' | 'walkin' | 'manual' | 'telefono'
export type EstadoCita = 'confirmada' | 'en_proceso' | 'finalizada' | 'cancelada'
export type TipoBloqueo = 'almuerzo' | 'vacaciones' | 'dia_festivo' | 'emergencia'
export type RolAdmin = 'admin' | 'secretaria'

export interface KPIs {
    citasHoy: number
    completadas: number
    ingresos: number
    noShows: number
    tendencias: {
        citasHoy: number
        completadas: number
        ingresos: number
        noShows: number
    }
}

// ============================================================================
// Database Row Types
// ============================================================================

export interface Sucursal {
    id: string
    nombre: string
    slug: string | null
    plan: string
    direccion: string | null
    telefono_whatsapp: string
    horario_apertura: HorarioApertura
    activa: boolean
    tipo_prestador?: string
    tipo_prestador_label?: string
    created_at: string
    updated_at?: string
}

export interface Profesional {
    id: string
    sucursal_id: string | null
    nombre: string
    estacion_id: number
    usuario_tablet: string
    password_hash: string
    horario_laboral: HorarioLaboralSemana
    bloqueo_almuerzo: BloqueAlmuerzo | null
    activo: boolean
    hora_entrada: string | null
    comision_porcentaje: number
    meta_cortes_mensual: number
    created_at: string
}
// Alias para compatibilidad con código legado
export type Barbero = Profesional

export interface Servicio {
    id: string
    sucursal_id: string
    nombre: string
    duracion_minutos: number
    precio: number
    costo_directo?: number
    activo: boolean
    created_at: string
}

export interface Cita {
    id: string
    sucursal_id: string | null
    barbero_id: string | null // Mapping to barbero_id table
    servicio_id: string | null
    cliente_nombre: string
    cliente_telefono: string
    timestamp_inicio: string
    timestamp_fin: string
    origen: OrigenCita
    estado: EstadoCita
    notas: string | null
    monto_pagado?: number | null
    metodo_pago?: string | null
    notas_crm?: string | null
    timestamp_inicio_servicio?: string | null
    timestamp_fin_servicio?: string | null
    duracion_real_minutos?: number | null
    cliente_id?: string | null
    created_at: string
    updated_at: string
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

export interface ProfesionalConSucursal extends Profesional {
    sucursal?: Sucursal
}

export interface CitaConRelaciones extends Cita {
    servicio?: Servicio
    profesional?: Profesional // Relación con profesional
    barbero?: Profesional     // Mantener campo original de Supabase (barbero_id FK)
}

export interface CostoFijo {
    categoria: string
    monto: number
}

export interface Cliente {
    id: string
    sucursal_id: string | null
    nombre: string
    telefono?: string | null
    email?: string | null
    notas_internas?: string | null
    ultima_cita?: string | null
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
    metodo_pago?: string | null
    barbero_id?: string | null
    created_at: string
}

export interface Bloqueo {
    id: string
    profesional_id: string | null // Alias interno
    barbero_id: string | null     // Map to DB
    sucursal_id: string
    timestamp_inicio: string
    timestamp_fin: string
    tipo: TipoBloqueo
    motivo: string | null
    created_at: string
}

// ============================================================================
// Supabase Database Type
// ============================================================================

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
        Views: Record<string, never>
        Functions: Record<string, never>
        Enums: Record<string, never>
        CompositeTypes: Record<string, never>
    }
}
