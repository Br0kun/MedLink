'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import api from '@/lib/api'
import { Activity, Users, FlaskConical, Clock, BarChart3, LogOut, LayoutDashboard, ChevronRight, Shield, ShieldCheck } from 'lucide-react'

const navItems = [
  { label: 'Overview',      path: '/admin',               icon: LayoutDashboard },
  { label: 'Users',         path: '/admin/users',         icon: Users },
  { label: 'Verifications', path: '/admin/verifications', icon: ShieldCheck },
  { label: 'Audit log',     path: '/admin/audit',         icon: BarChart3 },
]

export default function AdminDashboard() {
  const router  = useRouter()
  const user    = useAuthStore((s) => s.user)
  const logout  = useAuthStore((s) => s.logout)
  const [stats,   setStats]   = useState(null)
  const [users,   setUsers]   = useState([])
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)

  const initials = user?.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  useEffect(() => {
    const load = async () => {
      try {
        const [s, u, l] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/users?limit=6'),
          api.get('/admin/audit-logs?limit=6'),
        ])
        setStats(s.data); setUsers(u.data.users); setLogs(l.data.logs)
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const toggleUser = async (id) => {
    await api.put('/admin/users/' + id + '/toggle')
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isActive: !u.isActive } : u))
  }

  const avatarColor = (role) => role === 'PATIENT' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : role === 'DOCTOR' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : role === 'LAB' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  const roleBadge  = (role) => role === 'PATIENT' ? 'bg-blue-500/10 text-blue-400'   : role === 'DOCTOR' ? 'bg-teal-500/10 text-teal-400'   : role === 'LAB' ? 'bg-violet-500/10 text-violet-400'   : 'bg-amber-500/10 text-amber-400'

  return (
    <div className="flex h-screen overflow-hidden bg-[#0B0F19] text-slate-200 font-sans">

      {/* Sidebar */}
      <aside className="w-56 h-screen bg-[#080C14] border-r border-slate-800/60 flex flex-col flex-shrink-0">
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-slate-800/60 flex-shrink-0">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Activity size={14} strokeWidth={2} className="text-white" />
          </div>
          <span className="text-[13px] font-medium text-white tracking-tight">MedPlatform</span>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-medium text-slate-600 uppercase tracking-widest px-2 py-2">Navigation</p>
          {navItems.map(({ label, path, icon: Icon }) => {
            const active = typeof window !== 'undefined' && window.location.pathname === path
            return (
              <button key={path} onClick={() => router.push(path)}
                className={'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 ' + (active ? 'bg-blue-600/20 text-blue-400 font-medium' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 font-normal')}
              >
                <Icon size={15} strokeWidth={1.5} />
                <span className="flex-1 text-left">{label}</span>
              </button>
            )
          })}
        </nav>
        <div className="p-3 border-t border-slate-800/60 space-y-1">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-800/60 bg-slate-900/40">
            <div className="w-7 h-7 rounded-full bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-[11px] font-medium text-amber-400 flex-shrink-0">{initials}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-slate-200 truncate">{user?.fullName}</p>
              <p className="text-[10px] text-slate-500">Admin</p>
            </div>
          </div>
          <button onClick={() => { logout(); router.push('/login') }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150">
            <LogOut size={15} strokeWidth={1.5} /><span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Navbar */}
        <header className="h-14 bg-[#080C14] border-b border-slate-800/60 flex items-center justify-between px-6 flex-shrink-0">
          <div>
            <p className="text-[13px] font-medium text-slate-200">Admin Overview</p>
            <p className="text-[11px] text-slate-500">Platform health, users, and audit trail</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
              <Shield size={12} strokeWidth={1.5} className="text-emerald-400" />
              <span className="text-[11px] font-medium text-emerald-400">Admin access</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-[11px] font-medium text-amber-400">{initials}</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">

          {loading ? (
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[1,2,3,4].map((i) => <div key={i} className="h-24 bg-slate-900/50 rounded-2xl animate-pulse border border-slate-800/50" />)}
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Patients',       value: stats?.patients,      icon: Users,        color: 'blue' },
                  { label: 'Doctors',        value: stats?.doctors,       icon: Activity,     color: 'teal' },
                  { label: 'Labs',           value: stats?.labs,          icon: FlaskConical, color: 'purple' },
                  { label: 'Pending access', value: stats?.pendingAccess, icon: Clock,        color: 'amber' },
                ].map((s, i) => (
                  <div key={i} className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 group">
                    <div className="flex justify-between items-start mb-4">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</p>
                      <div className={'w-8 h-8 rounded-xl flex items-center justify-center border border-' + s.color + '-500/20 bg-' + s.color + '-500/10 text-' + s.color + '-400 group-hover:scale-110 transition-transform duration-300'}>
                        <s.icon size={15} strokeWidth={1.5} />
                      </div>
                    </div>
                    <p className="text-3xl font-mono font-medium text-slate-100 tracking-tight">{s.value ?? '—'}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-5 gap-6">

                {/* Recent users */}
                <div className="col-span-3 bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60">
                    <p className="text-[13px] font-medium text-slate-200">Recent users</p>
                    <button onClick={() => router.push('/admin/users')} className="flex items-center gap-1 text-[12px] text-blue-400 hover:text-blue-300 transition-colors">
                      View all <ChevronRight size={12} strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className="divide-y divide-slate-800/40">
                    {users.map((u) => (
                      <div key={u.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium border flex-shrink-0 ' + avatarColor(u.role)}>
                            {u.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[13px] text-slate-200">{u.fullName}</p>
                            <p className="text-[11px] text-slate-500">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={'text-[10px] font-medium px-2 py-0.5 rounded-md ' + roleBadge(u.role)}>
                            {u.role.toLowerCase()}
                          </span>
                          <span className={'text-[10px] font-medium px-2 py-0.5 rounded-md ' + (u.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400')}>
                            {u.isActive ? 'Active' : 'Suspended'}
                          </span>
                          <button
                            onClick={() => toggleUser(u.id)}
                            className={'text-[11px] px-2.5 py-1 rounded-lg border transition-all active:scale-95 ' + (u.isActive ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20')}
                          >
                            {u.isActive ? 'Suspend' : 'Reactivate'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audit log */}
                <div className="col-span-2 bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60">
                    <p className="text-[13px] font-medium text-slate-200">Audit log</p>
                    <button onClick={() => router.push('/admin/audit')} className="flex items-center gap-1 text-[12px] text-blue-400 hover:text-blue-300 transition-colors">
                      View all <ChevronRight size={12} strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className="divide-y divide-slate-800/40">
                    {logs.map((l) => (
                      <div key={l.id} className="px-5 py-3 hover:bg-slate-800/30 transition-colors">
                        <p className="text-[12px] text-slate-300 leading-relaxed">{l.action}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[10px] text-slate-500">{l.user?.fullName}</p>
                          <p className="text-[10px] text-slate-600 font-mono">
                            {new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
