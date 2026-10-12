import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Database,
  Brain,
  FileText,
  LogOut,
  Menu,
  X,
  Zap,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/dataset', label: 'Kelola Dataset', icon: Database },
  { to: '/prediksi', label: 'Prediksi KNN', icon: Brain },
  { to: '/riwayat', label: 'Riwayat & Laporan', icon: FileText },
]

export default function DashboardLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="grid grid-cols-[260px_1fr] min-h-screen">
      {/* Sidebar */}
      <aside
        className={`bg-gradient-to-b from-slate-900 to-slate-800 text-slate-200 flex flex-col p-4 sticky top-0 h-screen z-30 transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } fixed lg:static w-[260px]`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 pb-6 border-b border-white/10 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 grid place-items-center font-bold text-white text-base shadow-lg shadow-blue-500/40">
            SR
          </div>
          <div>
            <div className="font-bold text-white text-base">Konsentrasi</div>
            <div className="text-xs text-slate-400">Sistem Rekomendasi</div>
          </div>
          <button
            className="ml-auto lg:hidden text-slate-400 hover:text-white"
            onClick={() => setOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all no-underline ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600/30 to-blue-600/10 text-white ring-1 ring-blue-400/30'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`
                }
                onClick={() => setOpen(false)}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 grid place-items-center text-white font-bold text-sm flex-shrink-0">
              {(profile?.full_name || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">
                {profile?.full_name || 'Pengguna'}
              </div>
              <div className="text-xs text-slate-400">
                {profile?.role === 'admin' ? 'Administrator' : 'Kaprodi'}
              </div>
            </div>
          </div>
          <button
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-all w-full text-left"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b border-slate-200 px-7 py-3.5 flex items-center gap-3.5">
          <button
            className="lg:hidden p-1.5 rounded-lg text-slate-900 hover:bg-slate-100"
            onClick={() => setOpen(true)}
            aria-label="Buka menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="font-bold text-base text-slate-900 flex-1">
            Sistem Rekomendasi Konsentrasi Mahasiswa
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
            <Zap className="w-3 h-3" />
            K-NN · K=5
          </span>
        </header>

        {/* Content */}
        <main className="p-7 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
