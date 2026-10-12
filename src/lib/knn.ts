import type { CourseField, Konsentrasi } from './supabase'

export interface DatasetRow {
  id?: number
  nim?: string | null
  [key: string]: number | string | null | undefined
}

export interface Neighbor {
  index: number
  nim?: string | null
  jarak: number
  konsentrasi: Konsentrasi
  nilai: Record<CourseField, number>
}

export interface KnnResult {
  hasil: Konsentrasi
  probabilitas: Record<Konsentrasi, number>
  tetangga: Neighbor[]
  jumlahData: number
}

const K = 5

const FIELDS: CourseField[] = [
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
]

function toNumber(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v)
  return Number.isFinite(n) ? n : 0
}

function minMaxNormalize(value: number, min: number, max: number): number {
  if (max === min) return 0
  return (value - min) / (max - min)
}

function euclidean(a: Record<CourseField, number>, b: Record<CourseField, number>): number {
  let sum = 0
  for (const key of FIELDS) {
    const d = a[key] - b[key]
    sum += d * d
  }
  return Math.sqrt(sum)
}

export function computeMinMax(rows: DatasetRow[]): Record<CourseField, { min: number; max: number }> {
  const acc = {} as Record<CourseField, { min: number; max: number }>
  for (const f of FIELDS) acc[f] = { min: Infinity, max: -Infinity }
  for (const row of rows) {
    for (const f of FIELDS) {
      const v = toNumber(row[f])
      if (v < acc[f].min) acc[f].min = v
      if (v > acc[f].max) acc[f].max = v
    }
  }
  return acc
}

export function normalizeRow(
  row: DatasetRow,
  minmax: Record<CourseField, { min: number; max: number }>,
): Record<CourseField, number> {
  const out = {} as Record<CourseField, number>
  for (const f of FIELDS) {
    out[f] = minMaxNormalize(toNumber(row[f]), minmax[f].min, minmax[f].max)
  }
  return out
}

export function knnPredict(
  dataset: DatasetRow[],
  input: Record<CourseField, number>,
): KnnResult {
  const minmax = computeMinMax(dataset)
  const normalizedDataset = dataset.map((row, idx) => ({
    idx,
    row,
    norm: normalizeRow(row, minmax),
    konsentrasi: String(row.konsentrasi ?? '') as Konsentrasi,
  }))

  const normInput = {} as Record<CourseField, number>
  for (const f of FIELDS) {
    normInput[f] = minMaxNormalize(input[f], minmax[f].min, minmax[f].max)
  }

  const distances = normalizedDataset.map((d) => ({
    ...d,
    jarak: euclidean(normInput, d.norm),
  }))

  distances.sort((a, b) => a.jarak - b.jarak)
  const top = distances.slice(0, K)

  const counts: Record<Konsentrasi, number> = { RPL: 0, Jaringan: 0, 'Sistem Cerdas': 0 }
  for (const t of top) {
    if (t.konsentrasi in counts) counts[t.konsentrasi]++
  }
  const total = top.length || 1
  const prob = {
    RPL: counts.RPL / total,
    Jaringan: counts.Jaringan / total,
    'Sistem Cerdas': counts['Sistem Cerdas'] / total,
  } as Record<Konsentrasi, number>

  let hasil: Konsentrasi = 'RPL'
  let maxCount = -1
  for (const k of Object.keys(counts) as Konsentrasi[]) {
    if (counts[k] > maxCount) {
      maxCount = counts[k]
      hasil = k
    }
  }

  const tetangga: Neighbor[] = top.map((t, i) => ({
    index: i + 1,
    nim: t.row.nim as string | null | undefined,
    jarak: t.jarak,
    konsentrasi: t.konsentrasi,
    nilai: t.norm,
  }))

  return { hasil, probabilitas: prob, tetangga, jumlahData: dataset.length }
}
