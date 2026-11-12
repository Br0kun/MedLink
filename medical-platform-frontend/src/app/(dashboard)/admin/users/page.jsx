'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import api from '@/lib/api'
import { Activity, Users, BarChart3, LogOut, LayoutDashboard , Shield , ShieldCheck } from 'lucide-react'
const navItems = [
  { label: 'Overview',      path: '/admin',               icon: LayoutDashboard },
  { label: 'Users',         path: '/admin/users',         icon: Users },
  { label: 'Verifications', path: '/admin/verifications', icon: ShieldCheck },
  { label: 'Audit log',     path: '/admin/audit',         icon: BarChart3 },
]

const ROLES = ['ALL','PATIENT','DOCTOR','LAB','ADMIN']

export default function AdminUsersPage() {
  const router  = useRouter()
  const user    = useAuthStore((s) => s.user)
  const logout  = useAuthStore((s) => s.logout)
  const [users,   setUsers]   = useState([])
  const [role,    setRole]    = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  const initials = user?.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  const load = async (r) => {
    setLoading(true)
    try {
      const q = r !== 'ALL' ? '?role=' + r : ''
      const res = await api.get('/admin/users' + q)
      setUsers(res.data.users)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { load(role) }, [role])

  const toggleUser = async (id) => {
    await api.put('/admin/users/' + id + '/toggle')
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isActive: !u.isActive } : u))
  }

  const avatarColor = (r) => r === 'PATIENT' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : r === 'DOCTOR' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : r === 'LAB' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  const roleBadge  = (r) => r === 'PATIENT' ? 'bg-blue-500/10 text-blue-400' : r === 'DOCTOR' ? 'bg-teal-500/10 text-teal-400' : r === 'LAB' ? 'bg-violet-500/10 text-violet-400' : 'bg-amber-500/10 text-amber-400'

  const filtered = users.filter((u) =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[#0B0F19] text-slate-200 font-sans">
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

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="h-14 bg-[#080C14] border-b border-slate-800/60 flex items-center justify-between px-6 flex-shrink-0">
          <div>
            <p className="text-[13px] font-medium text-slate-200">Users</p>
            <p className="text-[11px] text-slate-500">Manage platform users and account status</p>
          </div>
          <div className="w-7 h-7 rounded-full bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-[11px] font-medium text-amber-400">{initials}</div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">

          {/* Filters */}
          <div className="flex items-center gap-3 mb-6">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-[13px] rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-slate-600 w-64"
            />
            <div className="flex gap-1.5">
              {ROLES.map((r) => (
                <button key={r} onClick={() => setRole(r)}
                  className={'px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-150 ' + (role === r ? 'bg-slate-200 text-slate-900' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-200 hover:border-slate-700')}
                >
                  {r === 'ALL' ? 'All' : r.charAt(0) + r.slice(1).toLowerCase() + 's'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800/60 flex items-center justify-between">
              <p className="text-[12px] text-slate-500">{filtered.length} users</p>
            </div>
            <div className="divide-y divide-slate-800/40">
              {loading ? (
                <div className="p-8 text-center"><p className="text-[13px] text-slate-500">Loading...</p></div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center"><p className="text-[13px] text-slate-500">No users found</p></div>
              ) : filtered.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium border flex-shrink-0 ' + avatarColor(u.role)}>
                      {u.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[13px] text-slate-200">{u.fullName}</p>
                      <p className="text-[11px] text-slate-500">{u.email}</p>
                      <p className="text-[10px] text-slate-700 font-mono mt-0.5">{u.id}</p>
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
        </main>
      </div>
    </div>
  )
}
