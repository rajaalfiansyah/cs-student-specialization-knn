import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anonKey) {
  throw new Error('Supabase env vars missing. Cek file .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).')
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export type Konsentrasi = 'RPL' | 'Jaringan' | 'Sistem Cerdas'

export const KONSENTRASI_LABEL: Record<Konsentrasi, string> = {
  RPL: 'Rekayasa Perangkat Lunak (RPL)',
  Jaringan: 'Jaringan',
  'Sistem Cerdas': 'Sistem Cerdas',
}

export const KONSENTRASI_COLOR: Record<Konsentrasi, string> = {
  RPL: '#2563eb',
  Jaringan: '#059669',
  'Sistem Cerdas': '#7c3aed',
}

// 12 CSV column headers (exact, in order)
export const CSV_HEADERS = [
  'NIM',
  'Algo_Pemrog_2',
  'Struktur_Data',
  'PBO',
  'Jaringan_Komputer',
  'Sistem_Operasi',
  'Arsitektur_Orkom',
  'Matematika_Diskrit',
  'Statiska_Dasar',
  'Kecerdasan_Buatan',
  'IPK_Sem_4',
  'Bidang_Keilmuan',
] as const

// 9 numeric course fields + IPK (10 KNN features total)
export const COURSE_FIELDS = [
  'algo_pemrog_2',
  'struktur_data',
  'pbo',
  'jaringan_komputer',
  'sistem_operasi',
  'arsitektur_orkom',
  'matematika_diskrit',
  'statiska_dasar',
  'kecerdasan_buatan',
  'ipk_sem_4',
] as const

export type CourseField = (typeof COURSE_FIELDS)[number]

export const COURSE_LABELS: Record<CourseField, string> = {
  algo_pemrog_2: 'Algo Pemrog 2',
  struktur_data: 'Struktur Data',
  pbo: 'PBO',
  jaringan_komputer: 'Jarkom',
  sistem_operasi: 'SO',
  arsitektur_orkom: 'Orkom',
  matematika_diskrit: 'Matdis',
  statiska_dasar: 'Statis',
  kecerdasan_buatan: 'AI',
  ipk_sem_4: 'IPK Sem 4',
}

export const COURSE_LABELS_FULL: Record<CourseField, string> = {
  algo_pemrog_2: 'Algoritma & Pemrograman 2',
  struktur_data: 'Struktur Data',
  pbo: 'Pemrograman Berorientasi Objek',
  jaringan_komputer: 'Jaringan Komputer',
  sistem_operasi: 'Sistem Operasi',
  arsitektur_orkom: 'Arsitektur & Organisasi Komputer',
  matematika_diskrit: 'Matematika Diskrit',
  statiska_dasar: 'Statistika Dasar',
  kecerdasan_buatan: 'Kecerdasan Buatan',
  ipk_sem_4: 'IPK Semester 4',
}

// Map CSV header (lowercase) → DB column key
// Bidang_Keilmuan maps to `konsentrasi` (the NOT NULL column)
export const CSV_HEADER_TO_KEY: Record<string, string> = {
  nim: 'nim',
  algo_pemrog_2: 'algo_pemrog_2',
  struktur_data: 'struktur_data',
  pbo: 'pbo',
  jaringan_komputer: 'jaringan_komputer',
  sistem_operasi: 'sistem_operasi',
  arsitektur_orkom: 'arsitektur_orkom',
  matematika_diskrit: 'matematika_diskrit',
  statiska_dasar: 'statiska_dasar',
  kecerdasan_buatan: 'kecerdasan_buatan',
  ipk_sem_4: 'ipk_sem_4',
  bidang_keilmuan: 'konsentrasi',
}

export function normalizeKonsentrasi(v: string): Konsentrasi | null {
  const s = String(v).toLowerCase().trim()
  if (s === 'rpl' || s.includes('rekayasa')) return 'RPL'
  if (s.includes('jaringan')) return 'Jaringan'
  if (s.includes('cerdas')) return 'Sistem Cerdas'
  return null
}

// Case-insensitive header validation
export function validateCsvHeaders(headers: string[]): boolean {
  const normalized = headers.map((h) => h.trim().toLowerCase())
  if (normalized.length !== CSV_HEADERS.length) return false
  return CSV_HEADERS.every((h, i) => normalized[i] === h.toLowerCase())
}

// Build a case-insensitive lookup from parsed CSV fields to DB column keys
export function buildHeaderMap(parsedFields: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const field of parsedFields) {
    const key = field.trim().toLowerCase()
    if (CSV_HEADER_TO_KEY[key]) {
      map[field] = CSV_HEADER_TO_KEY[key]
    }
  }
  return map
}
