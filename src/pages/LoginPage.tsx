import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './LoginPage.css'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email.trim(), password)
    setLoading(false)
    if (error) {
      setError(error === 'Invalid login credentials' ? 'Username atau password salah.' : error)
      return
    }
    navigate('/', { replace: true })
  }

  const handleSeed = async () => {
    setSeeding(true)
    setSeedMsg(null)
    try {
      const url = import.meta.env.VITE_SUPABASE_URL
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${url}/functions/v1/seed-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: '{}',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Gagal')
      setEmail(data.email)
      setPassword(data.password)
      setSeedMsg('Akun admin berhasil diinisialisasi. Silakan klik Masuk.')
    } catch (err) {
      setSeedMsg(`Gagal inisialisasi: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <div className="login-card fade-in">
        <div className="login-left">
          <div className="brand-row">
            <div className="brand-mark-lg">SR</div>
            <div>
              <div className="brand-title-lg">Sistem Rekomendasi</div>
              <div className="brand-sub-lg">Konsentrasi Mahasiswa</div>
            </div>
          </div>

          <h1 className="login-hero-title">
            Rekomendasi Konsentrasi<br />berbasis <span className="hl">K-Nearest Neighbors</span>
          </h1>
          <p className="login-hero-desc">
            Sistem cerdas untuk memproyeksikan konsentrasi mahasiswa (RPL, Jaringan,
            atau Sistem Cerdas) berdasarkan 9 nilai mata kuliah &amp; IPK semester 4
            menggunakan algoritma K-NN (K=5) dengan normalisasi Min-Max dan jarak Euclidean.
          </p>

          <div className="login-features">
            <div className="feature"><span className="feature-dot" /><span>Dataset 350 baris data mahasiswa</span></div>
            <div className="feature"><span className="feature-dot" /><span>Normalisasi Min-Max + Euclidean Distance</span></div>
            <div className="feature"><span className="feature-dot" /><span>Ekspor laporan PDF / Excel</span></div>
          </div>
        </div>

        <div className="login-right">
          <h2 className="login-form-title">Masuk ke Sistem</h2>
          <p className="login-form-sub">Gunakan akun Admin atau Kaprodi Anda.</p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="admin@konsentrasi.ac.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="password-wrap">
                <input
                  id="password"
                  type={show ? 'text' : 'password'}
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-pass"
                  onClick={() => setShow((s) => !s)}
                  aria-label="Tampilkan password"
                >
                  {show ? 'Sembunyikan' : 'Lihat'}
                </button>
              </div>
            </div>

            {error && (
              <div className="alert alert-error fade-in" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                </svg>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Masuk'}
            </button>
          </form>

          <div className="login-divider"><span>atau</span></div>

          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={handleSeed}
            disabled={seeding}
          >
            {seeding ? <span className="spinner" /> : 'Inisialisasi Akun Admin Demo'}
          </button>

          {seedMsg && (
            <div className={`alert ${seedMsg.startsWith('Gagal') ? 'alert-error' : 'alert-success'} fade-in`}>
              {seedMsg}
            </div>
          )}

          <p className="login-hint">
            Akun demo: <strong>admin@konsentrasi.ac.id</strong> / <strong>admin12345</strong>
          </p>
        </div>
      </div>

      <footer className="login-footer">
        &copy; {new Date().getFullYear()} Sistem Rekomendasi Konsentrasi Mahasiswa
      </footer>
    </div>
  )
}
