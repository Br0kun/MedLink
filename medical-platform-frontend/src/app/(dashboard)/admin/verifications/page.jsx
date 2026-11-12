'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import api from '@/lib/api'
import {
  Activity, Users, BarChart3, LogOut, LayoutDashboard, ShieldCheck,
  Stethoscope, FlaskConical, Check, X, Clock
} from 'lucide-react'

const navItems = [
  { label: 'Overview',      path: '/admin',              icon: LayoutDashboard },
  { label: 'Users',         path: '/admin/users',        icon: Users },
  { label: 'Verifications', path: '/admin/verifications', icon: ShieldCheck },
  { label: 'Audit log',     path: '/admin/audit',        icon: BarChart3 },
]

const specialtyLabel = (s) => s ? s.charAt(0) + s.slice(1).toLowerCase() : ''

export default function VerificationsPage() {
  const router  = useRouter()
  const user    = useAuthStore((s) => s.user)
  const logout  = useAuthStore((s) => s.logout)
  const [pending,  setPending]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [deciding, setDeciding] = useState(null)

  const initials = user?.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  const load = async () => {
    try {
      const r = await api.get('/admin/verifications')
      setPending(r.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const decide = async (id, decision) => {
    setDeciding(id)
    try {
      await api.put('/admin/verifications/' + id, { decision })
      setPending((prev) => prev.filter((p) => p.id !== id))
    } catch (err) { console.error(err) }
    finally { setDeciding(null) }
  }

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
                {label === 'Verifications' && pending.length > 0 && (
                  <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{pending.length}</span>
                )}
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
            <p className="text-[13px] font-medium text-slate-200">Verification Center</p>
            <p className="text-[11px] text-slate-500">Review and approve doctor and lab accounts</p>
          </div>
          <div className="w-7 h-7 rounded-full bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-[11px] font-medium text-amber-400">{initials}</div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="h-64 bg-slate-900/50 rounded-2xl animate-pulse border border-slate-800/50" />
          ) : pending.length === 0 ? (
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-14 text-center">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={20} strokeWidth={1.5} className="text-emerald-400" />
              </div>
              <p className="text-[13px] font-medium text-slate-300">No pending verifications</p>
              <p className="text-[12px] text-slate-500 mt-1">All doctor and lab accounts are reviewed</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((p) => (
                <div key={p.id} className="bg-slate-900/70 border border-amber-500/20 rounded-2xl p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ' + (p.role === 'DOCTOR' ? 'bg-teal-500/10' : 'bg-violet-500/10')}>
                        {p.role === 'DOCTOR'
                          ? <Stethoscope size={18} strokeWidth={1.5} className="text-teal-400" />
                          : <FlaskConical size={18} strokeWidth={1.5} className="text-violet-400" />
                        }
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[14px] font-medium text-slate-100">{p.fullName}</p>
                          <span className={'text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ' + (p.role === 'DOCTOR' ? 'bg-teal-500/10 text-teal-400' : 'bg-violet-500/10 text-violet-400')}>
                            {p.role}
                          </span>
                        </div>
                        <p className="text-[12px] text-slate-400">{p.email}</p>

                        {p.role === 'DOCTOR' && p.doctorProfile && (
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[11px] text-slate-500">
                              Specialty: <span className="text-slate-300">{p.doctorProfile.specialty === 'OTHER' ? p.doctorProfile.customSpecialty : specialtyLabel(p.doctorProfile.specialty)}</span>
                            </span>
                            {p.doctorProfile.licenseNumber && (
                              <span className="text-[11px] text-slate-500">
                                License: <span className="text-slate-300 font-mono">{p.doctorProfile.licenseNumber}</span>
                              </span>
                            )}
                          </div>
                        )}

                        {p.role === 'LAB' && p.labProfile && (
                          <div className="flex items-center gap-3 mt-2">
                            {p.labProfile.labName && <span className="text-[11px] text-slate-500">Lab: <span className="text-slate-300">{p.labProfile.labName}</span></span>}
                          </div>
                        )}

                        <p className="text-[11px] text-slate-600 mt-2 flex items-center gap-1">
                          <Clock size={11} strokeWidth={1.5} />
                          Registered {new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => decide(p.id, 'REJECTED')}
                        disabled={deciding === p.id}
                        className="flex items-center gap-1.5 text-[12px] font-medium text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <X size={12} strokeWidth={1.5} /> Reject
                      </button>
                      <button
                        onClick={() => decide(p.id, 'APPROVED')}
                        disabled={deciding === p.id}
                        className="flex items-center gap-1.5 text-[12px] font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Check size={12} strokeWidth={1.5} />
                        {deciding === p.id ? 'Saving...' : 'Approve'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
