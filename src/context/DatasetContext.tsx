import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase, type Konsentrasi } from '../lib/supabase'
import type { DatasetRow } from '../lib/knn'

export interface DatasetRecord {
  id: number
  nim: string | null
  algo_pemrog_2: number | null
  struktur_data: number | null
  pbo: number | null
  jaringan_komputer: number | null
  sistem_operasi: number | null
  arsitektur_orkom: number | null
  matematika_diskrit: number | null
  statiska_dasar: number | null
  kecerdasan_buatan: number | null
  ipk_sem_4: number | null
  konsentrasi: string
  created_at: string
}

interface DatasetStats {
  total: number
  rpl: number
  jaringan: number
  sistemCerdas: number
}

interface DatasetState {
  dataset: DatasetRecord[]
  loading: boolean
  stats: DatasetStats
  refresh: () => Promise<void>
  replaceAll: (rows: Record<string, unknown>[]) => Promise<{ error: string | null; count: number }>
  resetDefault: () => Promise<{ error: string | null; count: number }>
  clearAll: () => Promise<{ error: string | null }>
}

const DatasetContext = createContext<DatasetState | undefined>(undefined)

const STORAGE_KEY = 'konsentrasi_dataset_cache'

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<DatasetRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadFromDb = useCallback(async () => {
    const { data, error } = await supabase
      .from('dataset_mahasiswa')
      .select('*')
      .order('id', { ascending: true })
    if (error) {
      console.error('Gagal memuat dataset:', error.message)
      return null
    }
    return (data ?? []) as DatasetRecord[]
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    const data = await loadFromDb()
    if (data) {
      setDataset(data)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch {
        // ignore quota errors
      }
    }
    setLoading(false)
  }, [loadFromDb])

  useEffect(() => {
    // Try cached localStorage first for instant render, then refresh from DB
    try {
      const cached = localStorage.getItem(STORAGE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached) as DatasetRecord[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDataset(parsed)
        }
      }
    } catch {
      // ignore
    }
    refresh()
  }, [refresh])

  const replaceAll = useCallback(async (rows: Record<string, unknown>[]) => {
    const { error: delErr } = await supabase.from('dataset_mahasiswa').delete().neq('id', -1)
    if (delErr) return { error: delErr.message, count: 0 }
    const { error: insErr } = await supabase.from('dataset_mahasiswa').insert(rows)
    if (insErr) return { error: insErr.message, count: 0 }
    await refresh()
    return { error: null, count: rows.length }
  }, [refresh])

  const resetDefault = useCallback(async () => {
    const konsentrasiList: Konsentrasi[] = ['RPL', 'Jaringan', 'Sistem Cerdas']
    const rows: Record<string, unknown>[] = []
    for (let i = 0; i < 350; i++) {
      const k = konsentrasiList[i % 3]
      const base = k === 'RPL'
        ? [85, 84, 86, 70, 72, 74, 75, 74, 65]
        : k === 'Jaringan'
        ? [71, 72, 74, 88, 85, 76, 70, 72, 65]
        : [76, 78, 72, 78, 76, 74, 78, 80, 90]
      const nilai = base.map((b) => Math.max(50, Math.min(100, Math.round(b + (Math.random() * 20 - 10)))))
      const ipk = Math.max(2.5, Math.min(4, +(3 + Math.random()).toFixed(2)))
      const nim = `2021${String(1000 + i).padStart(4, '0')}`
      const row: Record<string, unknown> = {
        nim,
        algo_pemrog_2: nilai[0],
        struktur_data: nilai[1],
        pbo: nilai[2],
        jaringan_komputer: nilai[3],
        sistem_operasi: nilai[4],
        arsitektur_orkom: nilai[5],
        matematika_diskrit: nilai[6],
        statiska_dasar: nilai[7],
        kecerdasan_buatan: nilai[8],
        ipk_sem_4: ipk,
        konsentrasi: k,
      }
      rows.push(row)
    }
    return replaceAll(rows)
  }, [replaceAll])

  const clearAll = useCallback(async () => {
    const { error: delErr } = await supabase.from('dataset_mahasiswa').delete().neq('id', -1)
    if (delErr) return { error: delErr.message }
    await refresh()
    return { error: null }
  }, [refresh])

  const stats = useMemo<DatasetStats>(() => {
    let rpl = 0, jaringan = 0, sistemCerdas = 0
    for (const r of dataset) {
      const k = (r.konsentrasi) as string
      if (k === 'RPL') rpl++
      else if (k === 'Jaringan') jaringan++
      else if (k === 'Sistem Cerdas') sistemCerdas++
    }
    return { total: dataset.length, rpl, jaringan, sistemCerdas }
  }, [dataset])

  const value = useMemo<DatasetState>(
    () => ({ dataset, loading, stats, refresh, replaceAll, resetDefault, clearAll }),
    [dataset, loading, stats, refresh, replaceAll, resetDefault, clearAll],
  )

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>
}

export function useDataset(): DatasetState {
  const ctx = useContext(DatasetContext)
  if (!ctx) throw new Error('useDataset harus dipakai di dalam DatasetProvider')
  return ctx
}

export type { DatasetRow }
