'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, ArrowRight, Activity } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'

export default function LoginPage() {
  const router  = useRouter()
  const login   = useAuthStore((s) => s.login)
  const [form,    setForm]    = useState({ email: '', password: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [theme,   setTheme]   = useState('light')

  useEffect(() => {
    const sync = () => setTheme(localStorage.getItem('dossier-theme') || 'light')
    sync()
    window.addEventListener('themechange', sync)
    return () => window.removeEventListener('themechange', sync)
  }, [])

  const dark = theme !== 'light'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/login', form)
      login(data.user, data.token)
      const routes = { PATIENT: '/patient', DOCTOR: '/doctor', LAB: '/lab', ADMIN: '/admin', ASSISTANT: '/assistant' }
      router.push(routes[data.user.role] || '/')
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  // Shared input class
  const inputCls = `w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 ${
    dark
      ? 'bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500'
      : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400'
  }`

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${dark ? 'bg-black' : 'bg-slate-50'}`}>

      {/* ── Left panel — switches between dark navy & clean white ── */}
      <div className={`hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden transition-colors duration-300 ${
        dark ? 'bg-[#090d16]' : 'bg-white border-r border-slate-200'
      }`}>
        {/* Grid overlay — only visible in dark */}
        {dark && (
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
          />
        )}
        {/* Glow orb */}
        <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl ${
          dark ? 'bg-emerald-600 opacity-10' : 'bg-emerald-400 opacity-[0.07]'
        }`} />

        {/* EKG Animation */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-64 pointer-events-none z-0">
          <svg className="w-full h-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
            <defs>
              <filter id="glow-login" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <linearGradient id="mask-grad-login" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="black" />
                <stop offset="60%"  stopColor="black" />
                <stop offset="85%"  stopColor="white" stopOpacity="0.3" />
                <stop offset="98%"  stopColor="white" stopOpacity="1" />
                <stop offset="100%" stopColor="black" />
              </linearGradient>
              <mask id="sweep-mask-login">
                <rect x="-1000" y="0" width="1000" height="200" fill="url(#mask-grad-login)">
                  <animateTransform attributeName="transform" type="translate" from="0,0" to="2000,0" dur="4s" repeatCount="indefinite" />
                </rect>
              </mask>
            </defs>
            <path
              d="M 0 100 L 180 100 C 190 90, 200 90, 210 100 L 230 100 L 240 110 L 255 20 L 270 170 L 285 100 C 300 80, 320 80, 335 100 L 680 100 C 690 90, 700 90, 710 100 L 730 100 L 740 110 L 755 20 L 770 170 L 785 100 C 800 80, 820 80, 835 100 L 1000 100"
              fill="none" stroke={dark ? '#064e3b' : '#a7f3d0'} strokeWidth="2" opacity="0.5"
            />
            <path
              d="M 0 100 L 180 100 C 190 90, 200 90, 210 100 L 230 100 L 240 110 L 255 20 L 270 170 L 285 100 C 300 80, 320 80, 335 100 L 680 100 C 690 90, 700 90, 710 100 L 730 100 L 740 110 L 755 20 L 770 170 L 785 100 C 800 80, 820 80, 835 100 L 1000 100"
              fill="none" stroke="#10b981" strokeWidth="3"
              filter="url(#glow-login)" mask="url(#sweep-mask-login)"
            />
          </svg>
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Activity size={16} className="text-white" />
          </div>
          <span className={`font-semibold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>MedPlatform</span>
        </div>

        {/* Headline */}
        <div className="relative z-10">
          <h2 className={`text-3xl font-bold leading-tight mb-4 ${dark ? 'text-white' : 'text-slate-900'}`}>
            Your medical records,<br />secure and accessible.
          </h2>
          <p className={`text-sm leading-relaxed max-w-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            A unified platform connecting patients, doctors, and labs with real-time access control and complete privacy.
          </p>
        </div>

        {/* Role pills */}
        <div className="relative z-10 flex items-center gap-4">
          {['Patients', 'Doctors', 'Labs', 'Admins'].map((role) => (
            <div key={role} className={`rounded-lg px-3 py-1.5 border ${
              dark
                ? 'bg-slate-800 border-slate-700'
                : 'bg-slate-100 border-slate-200'
            }`}>
              <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{role}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — theme-aware ── */}
      <div className={`flex-1 flex items-center justify-center p-8 transition-colors duration-300 ${
        dark ? 'bg-black' : 'bg-slate-50'
      }`}>
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Activity size={14} className="text-white" />
            </div>
            <span className={`font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>MedPlatform</span>
          </div>

          <h1 className={`text-2xl font-bold mb-1 ${dark ? 'text-white' : 'text-slate-900'}`}>Welcome back</h1>
          <p className={`text-sm mb-8 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Sign in to your account to continue</p>

          {error && (
            <div className={`text-xs rounded-xl px-4 py-3 mb-6 border ${
              dark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-700'
            }`}>{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Email address</label>
              <div className="relative">
                <Mail size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input type="email" placeholder="you@example.com" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputCls} required />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Password</label>
              <div className="relative">
                <Lock size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input type="password" placeholder="••••••••" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inputCls} required />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md mt-2">
              {loading ? 'Signing in...' : (<>Sign in <ArrowRight size={14} /></>)}
            </button>
          </form>

          <p className={`text-xs text-center mt-6 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
            No account?{' '}
            <span onClick={() => router.push('/register')} className="text-emerald-600 font-semibold cursor-pointer hover:underline">
              Create one
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
