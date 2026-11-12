'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import api from '@/lib/api'
import {
  Activity, Users, UserCheck, Inbox, MessageSquare, LayoutDashboard,
  LogOut, ShieldCheck, Ban, CheckCircle, Clock, Calendar
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard',     path: '/doctor',          icon: LayoutDashboard },
  { label: 'Inbox',         path: '/doctor/inbox',    icon: Inbox },
  { label: 'Patients',      path: '/doctor/patients', icon: Users },
  { label: 'Duty & Status', path: '/doctor/duty',     icon: UserCheck },
  { label: 'Chat',          path: '/doctor/chat',     icon: MessageSquare },
  { label: 'Staff',         path: '/doctor/staff',    icon: ShieldCheck },
  { label: 'Schedule',      path: '/doctor/schedule', icon: Calendar },
]

export default function DoctorStaffPage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()

  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [filter, setFilter] = useState('ALL') // ALL, PENDING, ACTIVE, SUSPENDED

  const initials = user?.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      const res = await api.get('/doctor/staff')
      setStaff(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (assistantId, action) => {
    setActionLoading(assistantId)
    try {
      await api.put(`/doctor/staff/${assistantId}/${action}`)
      await fetchStaff()
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.error || 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  const filteredStaff = staff.filter(s => filter === 'ALL' || s.user.accountStatus === filter)

  return (
    <div className="flex h-screen overflow-hidden bg-[#0B0F19] text-slate-200 font-sans">
      {/* ── Sidebar ── */}
      <aside className="w-56 h-screen bg-[#080C14] border-r border-slate-800/60 flex flex-col flex-shrink-0">
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-slate-800/60 flex-shrink-0">
          <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Activity size={14} strokeWidth={2} className="text-white" />
          </div>
          <span className="text-[13px] font-medium text-white tracking-tight">MedPlatform</span>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-medium text-slate-600 uppercase tracking-widest px-2 py-2">Navigation</p>
          {navItems.map(({ label, path, icon: Icon }) => {
            const active = path === '/doctor/staff'
            return (
              <button key={path} onClick={() => router.push(path)}
                className={'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 ' +
                  (active ? 'bg-emerald-600/20 text-emerald-400 font-medium border border-emerald-500/20'
                           : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 font-normal')}>
                <Icon size={15} strokeWidth={1.5} />
                <span className="flex-1 text-left">{label}</span>
              </button>
            )
          })}
        </nav>
        <div className="p-3 border-t border-slate-800/60 space-y-1">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-800/60 bg-slate-900/40">
            <div className="w-7 h-7 rounded-full bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-[11px] font-medium text-teal-400 flex-shrink-0">{initials}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-slate-200 truncate">{user?.fullName}</p>
              <p className="text-[10px] text-slate-500 truncate">
                {user?.specialty ? user.specialty : 'Doctor'}
                {user?.licenseNumber ? ` • ${user.licenseNumber}` : ''}
              </p>
            </div>
          </div>
          <button onClick={() => { logout(); router.push('/login') }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150">
            <LogOut size={15} strokeWidth={1.5} /><span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="h-14 bg-[#080C14] border-b border-slate-800/60 flex items-center justify-between px-6 flex-shrink-0">
          <div>
            <p className="text-[13px] font-medium text-slate-200">Staff Management</p>
            <p className="text-[11px] text-slate-500">Manage your clinical assistants and their access</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-[11px] font-medium text-teal-400">{initials}</div>
            <div className="hidden sm:block">
              <p className="text-[12px] font-medium text-slate-200 leading-none">{user?.fullName}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                {user?.specialty ? user.specialty : 'Doctor'}
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-4xl mx-auto">
            {/* Filters */}
            <div className="flex items-center gap-2 mb-6 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800/80 w-fit">
              {['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${filter === f ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                  {f === 'ALL' ? 'All Staff' : f.charAt(0) + f.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="text-slate-500 text-sm">Loading staff...</p>
            ) : filteredStaff.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800/60 border-dashed rounded-2xl p-10 text-center">
                <Users size={32} className="text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No assistants found matching this filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredStaff.map(assistant => (
                  <div key={assistant.id} className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 hover:border-blue-500/30 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-slate-700 flex items-center justify-center text-sm font-bold text-indigo-300">
                          {assistant.user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-100 leading-none mb-1">{assistant.user.fullName}</p>
                          <p className="text-[11px] text-slate-500">{assistant.user.email}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                        assistant.user.accountStatus === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        assistant.user.accountStatus === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {assistant.user.accountStatus}
                      </span>
                    </div>

                    <div className="space-y-1.5 mb-5">
                      <p className="text-[11px] text-slate-400 flex items-center gap-2"><Clock size={12}/> Joined: {new Date(assistant.createdAt).toLocaleDateString()}</p>
                      {assistant.user.phoneNumber && <p className="text-[11px] text-slate-400">Phone: {assistant.user.phoneNumber}</p>}
                    </div>

                    <div className="flex gap-2">
                      {assistant.user.accountStatus !== 'ACTIVE' && (
                        <button onClick={() => handleAction(assistant.id, 'approve')} disabled={actionLoading === assistant.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-[11px] font-semibold transition-all disabled:opacity-50">
                          <CheckCircle size={13} /> Approve
                        </button>
                      )}
                      {assistant.user.accountStatus !== 'SUSPENDED' && (
                        <button onClick={() => handleAction(assistant.id, 'ban')} disabled={actionLoading === assistant.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded-xl text-[11px] font-semibold transition-all disabled:opacity-50">
                          <Ban size={13} /> Ban / Revoke
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
