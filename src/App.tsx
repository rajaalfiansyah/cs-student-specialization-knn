import { Component, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardLayout from './components/DashboardLayout'
import DashboardPage from './pages/DashboardPage'
import DatasetPage from './pages/DatasetPage'
import PrediksiPage from './pages/PrediksiPage'
import RiwayatPage from './pages/RiwayatPage'

class PageErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error) { console.error('Page render error:', error) }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center px-4">
          <div className="text-2xl font-bold text-slate-900">Halaman tidak dapat dimuat</div>
          <div className="text-sm text-slate-500 max-w-md">
            Terjadi kesalahan saat menampilkan halaman ini. Silakan muat ulang halaman.
          </div>
          <button
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            onClick={() => window.location.reload()}
          >
            Muat Ulang
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { user, loading } = useAuth()
  return (
    <Routes>
      <Route
        path="/login"
        element={user && !loading ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PageErrorBoundary><DashboardPage /></PageErrorBoundary>} />
        <Route path="dataset" element={<PageErrorBoundary><DatasetPage /></PageErrorBoundary>} />
        <Route path="prediksi" element={<PageErrorBoundary><PrediksiPage /></PageErrorBoundary>} />
        <Route path="riwayat" element={<PageErrorBoundary><RiwayatPage /></PageErrorBoundary>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
