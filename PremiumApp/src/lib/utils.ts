import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getHermosilloMins(date: Date): number {
    try {
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'America/Hermosillo',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).formatToParts(date);
        const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
        const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
        return h * 60 + m;
    } catch {
        // Fallback: use device local time (for browsers without named timezone support)
        return date.getHours() * 60 + date.getMinutes();
    }
}

export function getHermosilloDateStr(date: Date = new Date()): string {
    try {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Hermosillo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(date);
    } catch {
        // Fallback: use ISO date string
        return date.toISOString().split('T')[0];
    }
}

export function formatToHermosilloISO(d: Date): string {
    try {
        const dateStr = getHermosilloDateStr(d)
        const timeStr = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'America/Hermosillo',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(d)
        return `${dateStr}T${timeStr}-07:00`
    } catch {
        // Fallback: use ISO string with UTC offset approximation
        return d.toISOString().replace('Z', '-07:00')
    }
}

/**
 * Parses a local timestamp string from Supabase/PostgreSQL safely across all browsers.
 * Safari does not support space-separated date strings ("YYYY-MM-DD HH:mm:ss").
 * This normalizes them to ISO 8601 ("YYYY-MM-DDTHH:mm:ss") before parsing.
 */
export function parseLocalTimestamp(s: string): Date {
    if (s && s.length >= 11 && s[10] === ' ') {
        return new Date(s.slice(0, 10) + 'T' + s.slice(11))
    }
    return new Date(s)
}

/**
 * Extracts total minutes from a Hermosillo local timestamp string (YYYY-MM-DD HH:mm:ss)
 * bypassing browser timezone shifts.
 */
export function getMinsFromHermosilloString(dateStr: string): number {
    if (!dateStr) return 0;
    // Extract HH:mm from "YYYY-MM-DD HH:mm:ss"
    const timePart = dateStr.includes('T') ? dateStr.split('T')[1] : dateStr.split(' ')[1];
    if (!timePart) return 0;
    const [h, m] = timePart.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

/** Parse "HH:MM AM/PM" → total minutes. Shared across CitaCard and TabletNuevaCitaModal. */
export function parse12hToMins(hora12: string): number {
    if (!hora12) return 0
    const matches = hora12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
    if (!matches) return 0
    let hours = parseInt(matches[1], 10)
    const minutes = parseInt(matches[2], 10)
    const ampm = matches[3].toUpperCase()
    if (ampm === 'PM' && hours < 12) hours += 12
    if (ampm === 'AM' && hours === 12) hours = 0
    return hours * 60 + minutes
}

/** Convert "HH:MM" (24h) → "HH:MM AM/PM". Shared across CitaCard and TabletNuevaCitaModal. */
export function formato12h(hora24: string): string {
    if (!hora24) return 'Ninguna'
    const [h, m] = hora24.split(':')
    const hNum = parseInt(h, 10)
    const ampm = hNum >= 12 ? 'PM' : 'AM'
    const h12 = hNum % 12 || 12
    return `${h12.toString().padStart(2, '0')}:${m} ${ampm}`
}

