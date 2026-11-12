'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import api from '@/lib/api'
import { Activity, Users, BarChart3, LogOut, LayoutDashboard, Shield, ShieldCheck, Filter } from 'lucide-react'

const navItems = [
  { label: 'Overview',      path: '/admin',               icon: LayoutDashboard },
  { label: 'Users',         path: '/admin/users',         icon: Users },
  { label: 'Verifications', path: '/admin/verifications', icon: ShieldCheck },
  { label: 'Audit log',     path: '/admin/audit',         icon: BarChart3 },
]

export default function AuditPage() {
  const router  = useRouter()
  const user    = useAuthStore((s) => s.user)
  const logout  = useAuthStore((s) => s.logout)
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('ALL')
  const [theme,   setTheme]   = useState('light')

  const initials = user?.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  useEffect(() => {
    const handleSync = () => {
      setTheme(localStorage.getItem('dossier-theme') || 'light')
    }
    window.addEventListener('themechange', handleSync)
    handleSync()

    api.get('/admin/audit-logs?limit=100')
      .then((r) => setLogs(r.data.logs))
      .catch(console.error)
      .finally(() => setLoading(false))

    return () => window.removeEventListener('themechange', handleSync)
  }, [])

  const isLight = theme === 'light'

  const roleBadge = (role) => {
    if (role === 'PATIENT') return isLight ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    if (role === 'DOCTOR') return isLight ? 'bg-teal-50 text-teal-700 border-teal-100' : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
    if (role === 'LAB') return isLight ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    return isLight ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  }

  const filteredLogs = logs.filter(l => filter === 'ALL' || l.user?.role === filter)

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 ${
      isLight ? 'bg-[#f1f5f9] text-slate-800' : 'bg-black text-slate-200'
    }`}>
      
      {/* Sidebar */}
      <aside className={`w-56 h-screen flex flex-col flex-shrink-0 border-r transition-colors duration-300 ${
        isLight ? 'bg-[#ffffff] border-zinc-200' : 'bg-[#0a0a0c] border-zinc-800/60'
      }`}>
        <div className={`h-14 flex items-center gap-2.5 px-4 border-b flex-shrink-0 transition-colors duration-300 ${
          isLight ? 'border-zinc-200' : 'border-zinc-800/60'
        }`}>
          <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Activity size={14} strokeWidth={2} className="text-white" />
          </div>
          <span className={`text-[13px] font-semibold tracking-tight transition-colors duration-300 ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>MedPlatform</span>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-2 ${
            isLight ? 'text-slate-400' : 'text-slate-600'
          }`}>Navigation</p>
          {navItems.map(({ label, path, icon: Icon }) => {
            const active = typeof window !== 'undefined' && window.location.pathname === path
            return (
              <button key={path} onClick={() => router.push(path)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-300 relative overflow-hidden group border ${
                  active 
                    ? isLight 
                      ? 'bg-emerald-50 text-emerald-600 font-semibold border-emerald-100' 
                      : 'bg-emerald-600/10 text-emerald-400 font-medium border-emerald-500/20'
                    : isLight 
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-200 border-transparent font-normal' 
                      : 'text-slate-500 hover:text-slate-200 hover:bg-zinc-900 hover:border-zinc-800/40 border-transparent font-normal'
                }`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500 rounded-r transition-transform duration-300 ${active ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100'}`} />
                <Icon size={15} strokeWidth={1.5} className="group-hover:text-emerald-500 transition-colors duration-200" />
                <span className="flex-1 text-left group-hover:translate-x-0.5 transition-transform duration-200">{label}</span>
              </button>
            )
          })}
        </nav>
        <div className={`p-3 border-t space-y-1 transition-colors duration-300 ${
          isLight ? 'border-zinc-200' : 'border-zinc-800/60'
        }`}>
          <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors duration-300 ${
            isLight ? 'border-zinc-250 bg-slate-50' : 'border-zinc-800/60 bg-zinc-900/50'
          }`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${
              isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
            }`}>{initials}</div>
            <div className="flex-1 min-w-0">
              <p className={`text-[12px] font-semibold truncate ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{user?.fullName}</p>
              <p className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Admin</p>
            </div>
          </div>
          <button onClick={() => { logout(); router.push('/login') }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 ${
              isLight ? 'text-slate-500 hover:text-red-650 hover:bg-red-50' : 'text-slate-500 hover:text-red-400 hover:bg-red-500/5'
            }`}>
            <LogOut size={15} strokeWidth={1.5} /><span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className={`h-14 border-b flex items-center justify-between px-6 flex-shrink-0 transition-colors duration-300 ${
          isLight ? 'bg-[#ffffff] border-zinc-200' : 'bg-[#0a0a0c] border-zinc-800/60'
        }`}>
          <div>
            <p className={`text-[13px] font-semibold transition-colors duration-300 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>Platform Audit Logs</p>
            <p className="text-[11px] text-slate-500">Complete immutable record of all dashboard actions</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold ${
              isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
            }`}>{initials}</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className={`border rounded-2xl overflow-hidden transition-colors duration-300 ${
            isLight ? 'bg-[#ffffff] border-zinc-200 shadow-sm' : 'bg-[#121214] border-zinc-800/80'
          }`}>
            {/* Header with Filter System */}
            <div className={`px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors duration-300 ${
              isLight ? 'border-zinc-200' : 'border-zinc-800/60'
            }`}>
              <div className="flex items-center gap-2">
                <BarChart3 size={15} className="text-emerald-505 text-emerald-500" />
                <p className={`text-[13px] font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>All Action Entries</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] flex items-center gap-1 font-medium ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Filter size={10} /> Filter by user role:
                </span>
                <div className={`flex rounded-lg p-0.5 border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-black border-zinc-800'
                }`}>
                  {['ALL', 'PATIENT', 'DOCTOR', 'LAB'].map((role) => {
                    const active = filter === role
                    return (
                      <button key={role} onClick={() => setFilter(role)}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                          active 
                            ? isLight 
                              ? 'bg-white text-emerald-650 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-slate-200/50' 
                              : 'bg-zinc-900 text-emerald-400 border border-zinc-800'
                            : 'text-slate-550 hover:text-slate-800 border border-transparent'
                        }`}
                      >
                        {role}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* List */}
            <div className={`divide-y transition-colors duration-300 ${
              isLight ? 'divide-slate-100' : 'divide-slate-800/40'
            }`}>
              {loading ? (
                <div className="p-12 text-center animate-pulse"><p className="text-[13px] text-slate-500">Loading audit logs...</p></div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-[13px] text-slate-500">No logs found matching your filter criteria</p>
                </div>
              ) : filteredLogs.map((l) => (
                <div key={l.id} className={`flex items-start gap-4 px-6 py-4 transition-colors ${
                  isLight ? 'hover:bg-slate-50/50' : 'hover:bg-slate-800/30'
                }`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border transition-colors ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-slate-800/60 border-slate-700/50 text-slate-400'
                  }`}>
                    <Activity size={12} strokeWidth={1.5} className="text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-medium leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{l.action}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <p className={`text-[11px] font-semibold ${isLight ? 'text-slate-900' : 'text-slate-400'}`}>{l.user?.fullName}</p>
                      <span className={`${isLight ? 'text-slate-300' : 'text-slate-700'}`}>·</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border uppercase tracking-wider ${roleBadge(l.user?.role)}`}>
                        {l.user?.role?.toLowerCase()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-[11px] font-semibold font-mono ${isLight ? 'text-slate-850' : 'text-slate-400'}`}>
                      {new Date(l.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
