import { Link } from 'react-router-dom'
import {
  Database,
  History,
  Zap,
  Layers,
  Upload,
  Brain,
  FileText,
} from 'lucide-react'
import { useDataset } from '../context/DatasetContext'
import { useAuth } from '../auth/AuthContext'

export default function DashboardPage() {
  const { profile } = useAuth()
  const { stats, loading } = useDataset()

  const dist = [
    { label: 'RPL', value: stats.rpl, color: '#2563eb', bg: 'bg-blue-500' },
    { label: 'Jaringan', value: stats.jaringan, color: '#059669', bg: 'bg-emerald-500' },
    { label: 'Sistem Cerdas', value: stats.sistemCerdas, color: '#7c3aed', bg: 'bg-violet-500' },
  ]
  const maxDist = Math.max(1, ...dist.map((d) => d.value))

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto fade-in">
      {/* Header */}
      <div className="flex justify-between items-end gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Selamat datang, {profile?.full_name?.split(' ')[0] || 'Admin'}!
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Ringkasan sistem rekomendasi konsentrasi mahasiswa berbasis K-Nearest Neighbors.
          </p>
        </div>
        <Link
          to="/prediksi"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
          <Zap className="w-4 h-4" />
          Mulai Prediksi
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-3.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 grid place-items-center flex-shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Dataset</div>
            <div className="text-2xl font-extrabold text-slate-900 leading-tight">{loading ? '–' : stats.total}</div>
            <div className="text-xs text-slate-400 mt-0.5">baris data mahasiswa</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-3.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center flex-shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Riwayat Prediksi</div>
            <div className="text-2xl font-extrabold text-slate-900 leading-tight">{loading ? '–' : stats.total}</div>
            <div className="text-xs text-slate-400 mt-0.5">prediksi tersimpan</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-3.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 grid place-items-center flex-shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Algoritma</div>
            <div className="text-2xl font-extrabold text-slate-900 leading-tight">K-NN</div>
            <div className="text-xs text-slate-400 mt-0.5">K = 5 · Euclidean</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-3.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-600 grid place-items-center flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Fitur Input</div>
            <div className="text-2xl font-extrabold text-slate-900 leading-tight">10</div>
            <div className="text-xs text-slate-400 mt-0.5">9 nilai + IPK</div>
          </div>
        </div>
      </div>

      {/* Distribution + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">
        {/* Distribution */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-slate-900">Distribusi Konsentrasi</h3>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
              {loading ? 'Memuat…' : `${stats.total} data`}
            </span>
          </div>
          <div className="flex flex-col gap-3.5">
            {dist.map((d) => (
              <div key={d.label} className="grid grid-cols-[110px_1fr_40px] items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  {d.label}
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${(d.value / maxDist) * 100}%`, background: d.color }}
                  />
                </div>
                <div className="text-right font-bold text-slate-900 text-sm">{d.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4">Aksi Cepat</h3>
          <div className="flex flex-col gap-2.5">
            <Link
              to="/dataset"
              className="flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-blue-200 transition-all hover:translate-x-1 no-underline"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 grid place-items-center flex-shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Kelola Dataset</div>
                <div className="text-xs text-slate-500">Unggah & proses CSV</div>
              </div>
            </Link>
            <Link
              to="/prediksi"
              className="flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-emerald-200 transition-all hover:translate-x-1 no-underline"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center flex-shrink-0">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Prediksi Konsentrasi</div>
                <div className="text-xs text-slate-500">Input nilai → K-NN</div>
              </div>
            </Link>
            <Link
              to="/riwayat"
              className="flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-amber-200 transition-all hover:translate-x-1 no-underline"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 grid place-items-center flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Riwayat & Laporan</div>
                <div className="text-xs text-slate-500">Cetak PDF / Excel</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
