import { useMemo, useRef, useState } from 'react'
import Papa from 'papaparse'
import {
  Upload,
  FileSpreadsheet,
  Download,
  RotateCcw,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Database,
  Users,
  GraduationCap,
  AlertCircle,
  FileUp,
} from 'lucide-react'
import {
  CSV_HEADERS,
  COURSE_FIELDS,
  COURSE_LABELS,
  normalizeKonsentrasi,
  validateCsvHeaders,
  buildHeaderMap,
  KONSENTRASI_LABEL,
  type Konsentrasi,
} from '../lib/supabase'
import { useDataset } from '../context/DatasetContext'
import { useToast } from '../context/ToastContext'

const PAGE_SIZE_OPTIONS = [10, 25, 50]

const BIDANG_BADGE: Record<string, string> = {
  RPL: 'bg-blue-100 text-blue-800 border border-blue-200',
  Jaringan: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  'Sistem Cerdas': 'bg-violet-100 text-violet-800 border border-violet-200',
}

export default function DatasetPage() {
  const { dataset, loading, stats, replaceAll, resetDefault, clearAll } = useDataset()
  const { show } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      const text = await file.text()
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
      })

      if (parsed.errors.length > 0 && parsed.data.length === 0) {
        show('error', 'File CSV tidak dapat dibaca. Pastikan format file benar.')
        setUploading(false)
        return
      }

      const headers = parsed.meta.fields ?? []
      if (!validateCsvHeaders(headers)) {
        show('error', 'Format header CSV tidak valid. Pastikan menggunakan 12 kolom atribut yang sesuai.')
        setUploading(false)
        return
      }

      const headerMap = buildHeaderMap(headers)

      const records = parsed.data.filter((r) =>
        Object.values(r).some((v) => v !== undefined && v !== ''),
      )

      if (records.length === 0) {
        show('error', 'File CSV kosong atau tidak ada baris data.')
        setUploading(false)
        return
      }

      const toInsert = records.map((r) => {
        const row: Record<string, number | string | null> = {}
        for (const [csvKey, dbKey] of Object.entries(headerMap)) {
          const raw = (r[csvKey] ?? '').toString().trim()
          if (dbKey === 'nim') {
            row[dbKey] = raw || null
          } else if (dbKey === 'konsentrasi') {
            row[dbKey] = normalizeKonsentrasi(raw)
          } else {
            const n = parseFloat(raw)
            row[dbKey] = Number.isFinite(n) ? n : null
          }
        }
        return row
      }).filter((r) => r.konsentrasi !== null)

      if (toInsert.length === 0) {
        show('error', 'Tidak ada baris valid dengan kolom Bidang_Keilmuan yang dikenali (RPL / Jaringan / Sistem Cerdas).')
        setUploading(false)
        return
      }

      const { error, count } = await replaceAll(toInsert)
      if (error) {
        show('error', `Gagal mengunggah: ${error}`)
      } else {
        show('success', `Berhasil mengunggah ${count} data mahasiswa`)
        setPage(0)
      }
    } catch (err) {
      show('error', err instanceof Error ? err.message : String(err))
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadTemplate = () => {
    const header = CSV_HEADERS.join(',')
    const sample = [
      '20210001,85,84,86,70,72,74,75,74,65,3.65,RPL',
      '20210002,71,72,74,88,85,76,70,72,65,3.42,Jaringan',
      '20210003,76,78,72,78,76,74,78,80,90,3.55,Sistem Cerdas',
    ].join('\n')
    const blob = new Blob([header + '\n' + sample + '\n'], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'DATASET_MAHASISWA_350.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleResetDefault = async () => {
    if (!confirm('Reset dataset ke 350 data default? Ini akan mengganti semua data saat ini.')) return
    setUploading(true)
    const { error, count } = await resetDefault()
    setUploading(false)
    if (error) {
      show('error', `Gagal reset: ${error}`)
    } else {
      show('success', `Berhasil reset ke ${count} data default`)
      setPage(0)
    }
  }

  const handleClear = async () => {
    if (!confirm('Hapus seluruh dataset? Tindakan ini tidak dapat dibatalkan.')) return
    setUploading(true)
    const { error } = await clearAll()
    setUploading(false)
    if (error) {
      show('error', `Gagal mengosongkan: ${error}`)
    } else {
      show('info', 'Dataset berhasil dikosongkan')
      setPage(0)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return dataset
    return dataset.filter((r) => {
      const nim = (r.nim ?? '').toLowerCase()
      const bidang = (r.konsentrasi ?? '').toLowerCase()
      const label = KONSENTRASI_LABEL[r.konsentrasi as Konsentrasi]?.toLowerCase() ?? ''
      return nim.includes(q) || bidang.includes(q) || label.includes(q)
    })
  }, [dataset, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages - 1)
  const pageData = filtered.slice(currentPage * pageSize, currentPage * pageSize + pageSize)

  return (
    <div className="flex flex-col gap-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kelola Dataset Mahasiswa</h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Unggah file CSV berisi data nilai mahasiswa untuk digunakan sebagai training set K-NN.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
            onClick={handleResetDefault}
            disabled={uploading}
          >
            <RotateCcw className="w-4 h-4" />
            Reset Dataset Default
          </button>
          <button
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all"
            onClick={handleDownloadTemplate}
          >
            <Download className="w-4 h-4" />
            Unduh Template CSV
          </button>
        </div>
      </div>

      {/* Stat badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 grid place-items-center flex-shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Data Latih</div>
            <div className="text-2xl font-extrabold text-slate-900 leading-tight">
              {loading ? '–' : stats.total}
            </div>
            <div className="text-xs text-slate-400">Mahasiswa</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 grid place-items-center flex-shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">RPL</div>
            <div className="text-2xl font-extrabold text-slate-900 leading-tight">
              {loading ? '–' : stats.rpl}
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Jaringan</div>
            <div className="text-2xl font-extrabold text-slate-900 leading-tight">
              {loading ? '–' : stats.jaringan}
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 grid place-items-center flex-shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sistem Cerdas</div>
            <div className="text-2xl font-extrabold text-slate-900 leading-tight">
              {loading ? '–' : stats.sistemCerdas}
            </div>
          </div>
        </div>
      </div>

      {/* Upload zone */}
      <div
        className={`border-2 border-dashed rounded-2xl bg-white px-8 py-10 flex flex-col items-center gap-4 text-center transition-all cursor-pointer ${
          dragOver
            ? 'border-blue-400 bg-blue-50 scale-[1.01]'
            : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const f = e.dataTransfer.files?.[0]
          if (f) handleFile(f)
        }}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
            e.target.value = ''
          }}
        />
        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 grid place-items-center">
          {uploading ? (
            <div className="w-7 h-7 border-[3px] border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          ) : (
            <Upload className="w-8 h-8" />
          )}
        </div>
        <div>
          <div className="font-bold text-slate-900 text-base">
            {uploading ? 'Memproses data…' : 'Tarik & lepas file CSV di sini'}
          </div>
          <div className="text-sm text-slate-500 mt-1">
            Format: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-700">DATASET_MAHASISWA_350.csv</code> — 12 kolom atribut
          </div>
        </div>
        <button
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
          disabled={uploading}
          onClick={(e) => {
            e.stopPropagation()
            fileRef.current?.click()
          }}
        >
          <FileUp className="w-4 h-4" />
          Pilih File CSV
        </button>
      </div>

      {/* Data table card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
        {/* Table header */}
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-slate-900">Data Dataset</h3>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
              {filtered.length} baris
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari NIM atau Bidang Keilmuan…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0) }}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
            {/* Page size selector */}
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer"
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s} / halaman</option>
              ))}
            </select>
            <button
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-100 text-sm font-semibold hover:bg-red-100 transition-all disabled:opacity-50"
              onClick={handleClear}
              disabled={uploading || dataset.length === 0}
            >
              <Trash2 className="w-4 h-4" />
              Kosongkan
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-3 py-3 text-left font-semibold text-slate-700 text-xs uppercase tracking-wide whitespace-nowrap border-b border-slate-200">#</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700 text-xs uppercase tracking-wide whitespace-nowrap border-b border-slate-200">NIM</th>
                {COURSE_FIELDS.map((f) => (
                  <th
                    key={f}
                    title={COURSE_LABELS[f]}
                    className="px-3 py-3 text-right font-semibold text-slate-700 text-xs uppercase tracking-wide whitespace-nowrap border-b border-slate-200"
                  >
                    {COURSE_LABELS[f]}
                  </th>
                ))}
                <th className="px-3 py-3 text-left font-semibold text-slate-700 text-xs uppercase tracking-wide whitespace-nowrap border-b border-slate-200">Bidang Keilmuan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="text-center py-10 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                      <span>Memuat data…</span>
                    </div>
                  </td>
                </tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-300" />
                      <span>{search ? 'Tidak ada data yang cocok dengan pencarian.' : 'Belum ada data. Silakan unggah file CSV.'}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                pageData.map((r, i) => {
                  const bidang = (r.konsentrasi ?? '') as string
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-blue-50/50 transition-colors"
                    >
                      <td className="px-3 py-2.5 text-slate-400 text-xs">{currentPage * pageSize + i + 1}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900 whitespace-nowrap">{r.nim ?? '-'}</td>
                      {COURSE_FIELDS.map((f) => (
                        <td
                          key={f}
                          className="px-3 py-2.5 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap"
                        >
                          {Number(r[f] ?? 0).toFixed(2)}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${BIDANG_BADGE[bidang] ?? 'bg-slate-100 text-slate-700'}`}>
                          {bidang}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > pageSize && (
          <div className="flex justify-center items-center gap-4 mt-4">
            <button
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="w-4 h-4" />
              Sebelumnya
            </button>
            <span className="text-sm text-slate-500 font-medium">
              Halaman {currentPage + 1} / {totalPages}
            </span>
            <button
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              Berikutnya
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
