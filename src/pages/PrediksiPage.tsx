import { useEffect, useState } from 'react'
import {
  Zap,
  RotateCcw,
  Save,
  Check,
  Brain,
  Target,
  Users,
  AlertCircle,
} from 'lucide-react'
import {
  supabase,
  COURSE_FIELDS,
  COURSE_LABELS_FULL,
  KONSENTRASI_LABEL,
  KONSENTRASI_COLOR,
  type CourseField,
  type Konsentrasi,
} from '../lib/supabase'
import { knnPredict, type DatasetRow, type KnnResult } from '../lib/knn'
import { useDataset } from '../context/DatasetContext'
import { useToast } from '../context/ToastContext'

const emptyInput: Record<CourseField, number> = {
  algo_pemrog_2: 0,
  struktur_data: 0,
  pbo: 0,
  jaringan_komputer: 0,
  sistem_operasi: 0,
  arsitektur_orkom: 0,
  matematika_diskrit: 0,
  statiska_dasar: 0,
  kecerdasan_buatan: 0,
  ipk_sem_4: 0,
}

export default function PrediksiPage() {
  const { dataset, loading: loadingData } = useDataset()
  const { show } = useToast()
  const [input, setInput] = useState<Record<CourseField, number>>({ ...emptyInput })
  const [result, setResult] = useState<KnnResult | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setError(null)
  }, [loadingData])

  const handleChange = (field: CourseField, value: string) => {
    const n = parseFloat(value)
    setInput((prev) => ({ ...prev, [field]: Number.isFinite(n) ? n : 0 }))
    setResult(null)
    setSaved(false)
  }

  const handleReset = () => {
    setInput({ ...emptyInput })
    setResult(null)
    setSaved(false)
  }

  const handlePredict = async () => {
    setError(null)
    setSaved(false)
    if (dataset.length < 5) {
      setError('Dataset minimal 5 baris diperlukan. Silakan unggah dataset terlebih dahulu.')
      return
    }
    setProcessing(true)
    await new Promise((r) => setTimeout(r, 350))
    const res = knnPredict(dataset as unknown as DatasetRow[], input)
    setResult(res)
    setProcessing(false)
  }

  const handleSave = async () => {
    if (!result) return
    const { error } = await supabase.from('prediksi_riwayat').insert({
      input: input,
      hasil: result.hasil,
      probabilitas: result.probabilitas,
      tetangga: result.tetangga,
    })
    if (error) {
      show('error', `Gagal menyimpan: ${error.message}`)
      return
    }
    setSaved(true)
    show('success', 'Prediksi berhasil disimpan ke riwayat')
  }

  const probEntries = result
    ? (Object.entries(result.probabilitas) as [Konsentrasi, number][]).sort((a, b) => b[1] - a[1])
    : []

  return (
    <div className="flex flex-col gap-5 max-w-[1280px] mx-auto fade-in">
      {/* Header */}
      <div className="flex justify-between items-end gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Simulasi Prediksi Konsentrasi</h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Masukkan 9 nilai mata kuliah &amp; IPK semester 4, lalu proses dengan algoritma K-NN (K=5).
          </p>
        </div>
        {result && (
          <div className="flex gap-2">
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all"
              onClick={handleReset}
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
              onClick={handleSave}
              disabled={saved}
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Tersimpan' : 'Simpan ke Riwayat'}
            </button>
          </div>
        )}
      </div>

      {/* Loading */}
      {loadingData && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 text-sm text-slate-500">
          <div className="w-5 h-5 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          Memuat dataset dari database…
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5 items-start">
        {/* Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-slate-900">Input Nilai Mahasiswa Baru</h3>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
              {dataset.length} data latih
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {COURSE_FIELDS.map((f) => (
              <div key={f} className="flex flex-col gap-1.5">
                <label htmlFor={f} className="text-sm font-semibold text-slate-900">
                  {COURSE_LABELS_FULL[f]}
                </label>
                <input
                  id={f}
                  type="number"
                  step="0.01"
                  min={0}
                  max={f === 'ipk_sem_4' ? 4 : 100}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  value={input[f] === 0 ? '' : input[f]}
                  onChange={(e) => handleChange(f, e.target.value)}
                  placeholder={f === 'ipk_sem_4' ? '0.00 - 4.00' : '0 - 100'}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2.5 mt-5 pt-4 border-t border-slate-200">
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all"
              onClick={handleReset}
              type="button"
            >
              Bersihkan
            </button>
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
              onClick={handlePredict}
              disabled={processing || loadingData}
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memproses…
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Proses Prediksi K-NN
                </>
              )}
            </button>
          </div>
        </div>

        {/* Result */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-20">
          {!result ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center gap-3 text-slate-500 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 grid place-items-center">
                <Brain className="w-9 h-9" />
              </div>
              <h3 className="text-slate-900 font-bold">Hasil Prediksi</h3>
              <p className="text-sm max-w-xs leading-relaxed">
                Masukkan nilai pada form di samping, lalu klik "Proses Prediksi K-NN" untuk melihat rekomendasi konsentrasi.
              </p>
            </div>
          ) : (
            <>
              {/* Result card */}
              <div
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm fade-in border-l-4"
                style={{ borderColor: KONSENTRASI_COLOR[result.hasil] }}
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <Target className="w-4 h-4" />
                  Rekomendasi Konsentrasi
                </div>
                <div
                  className="text-3xl font-extrabold mt-1.5 mb-2 tracking-tight"
                  style={{ color: KONSENTRASI_COLOR[result.hasil] }}
                >
                  {KONSENTRASI_LABEL[result.hasil]}
                </div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  Berdasarkan {result.jumlahData} data latih · K=5 · Euclidean Distance · Min-Max Normalization
                </div>
              </div>

              {/* Probability */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm fade-in">
                <h3 className="text-base font-bold text-slate-900 mb-3.5">Probabilitas Kelas</h3>
                <div className="flex flex-col gap-3">
                  {probEntries.map(([k, p]) => (
                    <div key={k} className="grid grid-cols-[180px_1fr_44px] items-center gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: KONSENTRASI_COLOR[k] }} />
                        {KONSENTRASI_LABEL[k]}
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${p * 100}%`, background: KONSENTRASI_COLOR[k] }}
                        />
                      </div>
                      <div className="text-right font-bold text-slate-900 text-sm">{(p * 100).toFixed(0)}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Neighbors */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm fade-in">
                <h3 className="text-base font-bold text-slate-900 mb-3.5 flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  5 Tetangga Terdekat
                </h3>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-3 py-2.5 text-left font-semibold text-slate-700 text-xs uppercase tracking-wide border-b border-slate-200">#</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-slate-700 text-xs uppercase tracking-wide border-b border-slate-200">NIM</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-slate-700 text-xs uppercase tracking-wide border-b border-slate-200">Konsentrasi</th>
                        <th className="px-3 py-2.5 text-right font-semibold text-slate-700 text-xs uppercase tracking-wide border-b border-slate-200">Jarak</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.tetangga.map((n) => (
                        <tr key={n.index} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/50 transition-colors">
                          <td className="px-3 py-2.5 text-slate-400">{n.index}</td>
                          <td className="px-3 py-2.5 font-semibold text-slate-900">{n.nim ?? '-'}</td>
                          <td className="px-3 py-2.5">
                            <span
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                              style={{
                                background: `${KONSENTRASI_COLOR[n.konsentrasi]}1a`,
                                color: KONSENTRASI_COLOR[n.konsentrasi],
                              }}
                            >
                              {n.konsentrasi}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-700 tabular-nums">{n.jarak.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
