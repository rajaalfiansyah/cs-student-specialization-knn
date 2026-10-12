import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import {
  FileText,
  FileSpreadsheet,
  Trash2,
  CheckSquare,
  Square,
  Clock,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  History,
} from 'lucide-react'
import {
  supabase,
  KONSENTRASI_LABEL,
  KONSENTRASI_COLOR,
  COURSE_LABELS_FULL,
  COURSE_FIELDS,
  type CourseField,
  type Konsentrasi,
} from '../lib/supabase'
import { useToast } from '../context/ToastContext'

interface RiwayatRow {
  id: string
  hasil: Konsentrasi
  probabilitas: Record<Konsentrasi, number> | null
  tetangga: Array<{ index: number; nim?: string; jarak: number; konsentrasi: Konsentrasi }> | null
  input: Record<CourseField, number> | null
  created_at: string | null
}

const PAGE_SIZE_OPTIONS = [10, 25, 50]

const BIDANG_BADGE: Record<string, string> = {
  RPL: 'bg-blue-100 text-blue-800 border border-blue-200',
  Jaringan: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  'Sistem Cerdas': 'bg-violet-100 text-violet-800 border border-violet-200',
}

function safeProb(p: RiwayatRow['probabilitas']): Record<Konsentrasi, number> {
  return p ?? { RPL: 0, Jaringan: 0, 'Sistem Cerdas': 0 }
}

function safeInput(i: RiwayatRow['input']): Record<CourseField, number> {
  const fallback = {} as Record<CourseField, number>
  for (const f of COURSE_FIELDS) fallback[f] = 0
  return i ?? fallback
}

function formatDate(iso: string | null): string {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '-'
  }
}

export default function RiwayatPage() {
  const { show } = useToast()
  const [rows, setRows] = useState<RiwayatRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [renderError, setRenderError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setRenderError(null)
    try {
      const { data, error } = await supabase
        .from('prediksi_riwayat')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) {
        show('error', `Gagal memuat riwayat: ${error.message}`)
        setLoading(false)
        return
      }
      setRows((data ?? []) as RiwayatRow[])
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const hasil = (r?.hasil ?? '').toLowerCase()
      const label = KONSENTRASI_LABEL[r?.hasil as Konsentrasi]?.toLowerCase() ?? ''
      return hasil.includes(q) || label.includes(q)
    })
  }, [rows, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages - 1)
  const pageData = filtered.slice(currentPage * pageSize, currentPage * pageSize + pageSize)

  const allSelected = pageData.length > 0 && pageData.every((r) => selected[r.id])
  const toggleAll = () => {
    if (allSelected) {
      setSelected((s) => {
        const next = { ...s }
        pageData.forEach((r) => delete next[r.id])
        return next
      })
    } else {
      setSelected((s) => {
        const next = { ...s }
        pageData.forEach((r) => { next[r.id] = true })
        return next
      })
    }
  }
  const toggleOne = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }))
  const selectedRows = rows.filter((r) => selected[r.id])

  // Summary stats
  const summary = useMemo(() => {
    const dist: Record<string, number> = { RPL: 0, Jaringan: 0, 'Sistem Cerdas': 0 }
    for (const r of rows) {
      const h = r?.hasil
      if (h && h in dist) dist[h]++
    }
    return { total: rows.length, dist }
  }, [rows])

  const exportPDF = () => {
    const targets = selectedRows.length > 0 ? selectedRows : rows
    if (targets.length === 0) {
      show('error', 'Tidak ada data untuk diekspor')
      return
    }
    try {
      import('jspdf').then(({ default: jsPDF }) => {
        import('jspdf-autotable').then(({ default: autoTable }) => {
          const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
          doc.setFontSize(14)
          doc.setFont('helvetica', 'bold')
          doc.text('LAPORAN REKAPITULASI PREDIKSI KONSENTRASI MAHASISWA', 40, 40)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 40, 56)
          doc.text(`Total Prediksi: ${summary.total}`, 40, 68)
          doc.text(`RPL: ${summary.dist.RPL}  |  Jaringan: ${summary.dist.Jaringan}  |  Sistem Cerdas: ${summary.dist['Sistem Cerdas']}`, 40, 80)

          autoTable(doc, {
            startY: 95,
            head: [['No', 'Tanggal', 'Input (9 Nilai + IPK)', 'Hasil Konsentrasi', 'Probabilitas']],
            body: targets.map((r, i) => {
              const inp = safeInput(r?.input)
              const prob = safeProb(r?.probabilitas)
              const inputStr = COURSE_FIELDS.map((k) => `${COURSE_LABELS_FULL[k].slice(0, 6)}=${inp[k]}`).join(', ')
              const probStr = (Object.entries(prob) as [Konsentrasi, number][])
                .map(([k, p]) => `${k}: ${(p * 100).toFixed(0)}%`)
                .join('  ')
              return [
                String(i + 1),
                formatDate(r?.created_at ?? null),
                inputStr,
                KONSENTRASI_LABEL[r?.hasil as Konsentrasi] ?? r?.hasil ?? '-',
                probStr,
              ]
            }),
            styles: { fontSize: 7, cellPadding: 3 },
            headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 248, 252] },
            margin: { left: 40, right: 40 },
          })

          doc.save(`Laporan_Prediksi_${new Date().toISOString().slice(0, 10)}.pdf`)
          show('success', `Laporan PDF dengan ${targets.length} data berhasil diunduh`)
        })
      }).catch(() => {
        show('error', 'Gagal memuat modul PDF. Coba gunakan unduh Excel.')
      })
    } catch (err) {
      show('error', err instanceof Error ? err.message : 'Gagal membuat PDF')
    }
  }

  const exportExcel = () => {
    const targets = selectedRows.length > 0 ? selectedRows : rows
    if (targets.length === 0) {
      show('error', 'Tidak ada data untuk diekspor')
      return
    }
    try {
      const flat = targets.map((r, i) => {
        const inp = safeInput(r?.input)
        const prob = safeProb(r?.probabilitas)
        const base: Record<string, string | number> = {
          No: i + 1,
          Tanggal: formatDate(r?.created_at ?? null),
          Hasil: KONSENTRASI_LABEL[r?.hasil as Konsentrasi] ?? r?.hasil ?? '-',
        }
        COURSE_FIELDS.forEach((k) => {
          base[COURSE_LABELS_FULL[k]] = inp[k]
        })
        base['Prob_RPL'] = `${(prob.RPL * 100).toFixed(0)}%`
        base['Prob_Jaringan'] = `${(prob.Jaringan * 100).toFixed(0)}%`
        base['Prob_Sistem_Cerdas'] = `${(prob['Sistem Cerdas'] * 100).toFixed(0)}%`
        return base
      })
      const csv = Papa.unparse(flat)
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Laporan_Prediksi_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      show('success', `Laporan Excel dengan ${targets.length} data berhasil diunduh`)
    } catch (err) {
      show('error', err instanceof Error ? err.message : 'Gagal membuat Excel')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus riwayat ini?')) return
    const { error } = await supabase.from('prediksi_riwayat').delete().eq('id', id)
    if (error) {
      show('error', `Gagal menghapus: ${error.message}`)
      return
    }
    setSelected((s) => {
      const n = { ...s }
      delete n[id]
      return n
    })
    await load()
    show('info', 'Riwayat berhasil dihapus')
  }

  if (renderError) {
    return (
      <div className="flex flex-col gap-5 max-w-[1280px] mx-auto fade-in">
        <div className="flex items-center gap-3 px-4 py-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <div className="font-bold">Terjadi kesalahan</div>
            <div className="text-red-600 mt-0.5">{renderError}</div>
          </div>
          <button
            className="ml-auto px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
            onClick={load}
          >
            Coba lagi
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 max-w-[1280px] mx-auto fade-in">
      {/* Header */}
      <div className="flex justify-between items-end gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Riwayat Prediksi &amp; Cetak Laporan</h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Lihat riwayat prediksi konsentrasi dan unduh laporan dalam format PDF atau Excel (CSV).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all disabled:opacity-50"
            onClick={exportExcel}
            disabled={rows.length === 0}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Unduh Excel
          </button>
          <button
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
            onClick={exportPDF}
            disabled={rows.length === 0}
          >
            <FileText className="w-4 h-4" />
            Cetak Laporan PDF
          </button>
        </div>
      </div>

      {/* Summary stats */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 grid place-items-center flex-shrink-0">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Prediksi</div>
              <div className="text-2xl font-extrabold text-slate-900 leading-tight">{summary.total}</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">RPL</div>
              <div className="text-2xl font-extrabold text-slate-900 leading-tight">{summary.dist.RPL}</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <div className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0 mt-1" />
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Jaringan</div>
              <div className="text-2xl font-extrabold text-slate-900 leading-tight">{summary.dist.Jaringan}</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <div className="w-3 h-3 rounded-full bg-violet-500 flex-shrink-0 mt-1" />
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sistem Cerdas</div>
              <div className="text-2xl font-extrabold text-slate-900 leading-tight">{summary.dist['Sistem Cerdas']}</div>
            </div>
          </div>
        </div>
      )}

      {/* Selection indicator */}
      {selectedRows.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium fade-in">
          <CheckSquare className="w-4 h-4" />
          {selectedRows.length} riwayat dipilih untuk diekspor.
        </div>
      )}

      {/* Table card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        {/* Table header */}
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-slate-900">Riwayat Prediksi</h3>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
              {filtered.length} entri
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari konsentrasi…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0) }}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-56 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
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
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-3 py-3 text-center border-b border-slate-200 w-10">
                  <button onClick={toggleAll} className="text-slate-500 hover:text-blue-600 transition-colors" aria-label="Pilih semua">
                    {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700 text-xs uppercase tracking-wide whitespace-nowrap border-b border-slate-200">Tanggal Prediksi</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700 text-xs uppercase tracking-wide whitespace-nowrap border-b border-slate-200">Input Nilai</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700 text-xs uppercase tracking-wide whitespace-nowrap border-b border-slate-200">Hasil Konsentrasi</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700 text-xs uppercase tracking-wide whitespace-nowrap border-b border-slate-200">Probabilitas</th>
                <th className="px-3 py-3 text-center font-semibold text-slate-700 text-xs uppercase tracking-wide whitespace-nowrap border-b border-slate-200 w-20">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                      <span>Memuat data…</span>
                    </div>
                  </td>
                </tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-slate-100 grid place-items-center">
                        <History className="w-8 h-8 text-slate-300" />
                      </div>
                      <div className="font-semibold text-slate-500">Belum Ada Riwayat Prediksi</div>
                      <span className="text-sm text-slate-400 max-w-xs">
                        {search
                          ? 'Tidak ada riwayat yang cocok dengan pencarian.'
                          : 'Lakukan prediksi pada menu Prediksi KNN, lalu simpan hasilnya.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                pageData.map((r) => {
                  const prob = safeProb(r?.probabilitas)
                  const inp = safeInput(r?.input)
                  const probSorted = (Object.entries(prob) as [Konsentrasi, number][]).sort((a, b) => b[1] - a[1])
                  const hasil = r?.hasil ?? ''
                  return (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/50 transition-colors">
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => toggleOne(r.id)}
                          className={`transition-colors ${selected[r.id] ? 'text-blue-600' : 'text-slate-400 hover:text-blue-600'}`}
                          aria-label="Pilih baris"
                        >
                          {selected[r.id] ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap font-medium text-slate-900 tabular-nums flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(r?.created_at ?? null)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {COURSE_FIELDS.slice(0, 5).map((k) => (
                            <span
                              key={k}
                              className="inline-flex items-center gap-1 bg-slate-100 rounded px-1.5 py-0.5 text-xs"
                            >
                              <span className="text-slate-500">{COURSE_LABELS_FULL[k].slice(0, 6)}</span>
                              <span className="font-bold text-slate-900 tabular-nums">{inp[k]}</span>
                            </span>
                          ))}
                          <span className="inline-flex items-center bg-blue-50 text-blue-700 rounded px-1.5 py-0.5 text-xs font-semibold">
                            +5 lainnya
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${BIDANG_BADGE[hasil] ?? 'bg-slate-100 text-slate-700'}`}>
                          {KONSENTRASI_LABEL[hasil as Konsentrasi] ?? hasil}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1 min-w-[140px]">
                          {probSorted.map(([k, p]) => (
                            <div key={k} className="flex items-center gap-2 text-xs">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: KONSENTRASI_COLOR[k] }} />
                              <span className="text-slate-500 min-w-[80px]">{k}</span>
                              <span className="font-bold text-slate-900 tabular-nums">{(p * 100).toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all"
                          onClick={() => handleDelete(r.id)}
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
