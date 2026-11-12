'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import api from '@/lib/api'
import { getSocket } from '@/lib/socket'
import {
  Activity, FlaskConical, LogOut, LayoutDashboard, Users, Inbox, AlertTriangle, AlertCircle, CheckCircle2, Clock, FileText, MessageSquare, Pill, Stethoscope, ExternalLink, Share2, ShieldCheck, UserCheck, Calendar
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

const priorityConfig = {
  CRITICAL: { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    icon: AlertTriangle, label: 'Critical' },
  URGENT:   { color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  icon: AlertCircle,   label: 'Urgent' },
  ROUTINE:  { color: 'text-slate-400',  bg: 'bg-slate-500/10',  border: 'border-slate-700/50',  icon: Clock,         label: 'Routine' },
}

export default function DoctorInboxPage() {
  const user   = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()

  const [mainTab,     setMainTab]     = useState('LABS') // 'LABS' | 'SHARED'
  const [items,       setItems]       = useState([])
  const [sharedItems, setSharedItems] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState('ALL')
  const [reviewing,   setReviewing]   = useState(null)

  const initials = user?.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  const loadLabs = async () => {
    try {
      const r = await api.get('/doctor/inbox')
      setItems(r.data)
    } catch (err) { console.error(err) }
  }

  const loadShared = async () => {
    try {
      const r = await api.get('/doctor/shared-with-me')
      setSharedItems(r.data)
    } catch (err) { console.error(err) }
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadLabs(), loadShared()]).finally(() => setLoading(false))

    const socket = getSocket()
    socket.on('notification', (n) => {
      if (n.type === 'RESULT_ESCALATED' || n.type === 'LAB_RESULT_UPLOADED') loadLabs()
      if (n.type === 'ACCESS_GRANTED') loadShared()
    })
    socket.on('critical_alert', () => loadLabs())
    return () => { socket.off('notification'); socket.off('critical_alert') }
  }, [])

  const markReviewed = async (id) => {
    setReviewing(id)
    try {
      await api.put('/doctor/inbox/' + id + '/review')
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch (err) { console.error(err) }
    finally { setReviewing(null) }
  }

  const filteredLabs = filter === 'ALL' ? items : items.filter((i) => i.priority === filter)

  const counts = {
    CRITICAL: items.filter((i) => i.priority === 'CRITICAL').length,
    URGENT:   items.filter((i) => i.priority === 'URGENT').length,
    ROUTINE:  items.filter((i) => i.priority === 'ROUTINE').length,
  }

  const timeAgo = (date) => {
    if (!date) return 'Recently'
    const hrs = Math.floor((Date.now() - new Date(date)) / 3600000)
    if (hrs < 1) return 'Just now'
    if (hrs < 24) return hrs + 'h ago'
    return Math.floor(hrs / 24) + 'd ago'
  }

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
                {label === 'Inbox' && (items.length + sharedItems.length) > 0 && (
                  <span className={'text-[9px] font-bold px-1.5 py-0.5 rounded-full ' + (counts.CRITICAL > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 text-white')}>
                    {items.length + sharedItems.length}
                  </span>
                )}
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

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        <header className="h-14 bg-[#080C14] border-b border-slate-800/60 flex items-center justify-between px-6 flex-shrink-0">
          <div>
            <p className="text-[13px] font-medium text-slate-200">Doctor Inbox & Consultation Hub</p>
            <p className="text-[11px] text-slate-500">Manage unreviewed labs and inter-doctor shared records</p>
          </div>
          <div className="w-7 h-7 rounded-full bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-[11px] font-medium text-teal-400">{initials}</div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">

          {/* Main Category Tabs */}
          <div className="flex border-b border-slate-800/80 mb-6">
            <button
              onClick={() => setMainTab('LABS')}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                mainTab === 'LABS' ? 'border-blue-500 text-blue-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <FlaskConical size={14} />
              Unreviewed Lab Triage
              {items.length > 0 && (
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">{items.length}</span>
              )}
            </button>
            <button
              onClick={() => setMainTab('SHARED')}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                mainTab === 'SHARED' ? 'border-emerald-500 text-emerald-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Share2 size={14} />
              Shared Consultation Records
              {sharedItems.length > 0 && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">{sharedItems.length}</span>
              )}
            </button>
          </div>

          {/* LABS TAB CONTENT */}
          {mainTab === 'LABS' && (
            <>
              {/* Priority filter pills */}
              <div className="flex items-center gap-2 mb-6">
                <button onClick={() => setFilter('ALL')}
                  className={'px-3 py-2 rounded-lg text-[12px] font-medium transition-all ' + (filter === 'ALL' ? 'bg-slate-200 text-slate-900' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-200')}
                >All ({items.length})</button>
                <button onClick={() => setFilter('CRITICAL')}
                  className={'flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ' + (filter === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20')}
                ><AlertTriangle size={12} strokeWidth={1.5} /> Critical ({counts.CRITICAL})</button>
                <button onClick={() => setFilter('URGENT')}
                  className={'flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ' + (filter === 'URGENT' ? 'bg-amber-600 text-white' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20')}
                ><AlertCircle size={12} strokeWidth={1.5} /> Urgent ({counts.URGENT})</button>
                <button onClick={() => setFilter('ROUTINE')}
                  className={'flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ' + (filter === 'ROUTINE' ? 'bg-slate-200 text-slate-900' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-200')}
                ><Clock size={12} strokeWidth={1.5} /> Routine ({counts.ROUTINE})</button>
              </div>

              {loading ? (
                <div className="h-64 bg-slate-900/50 rounded-2xl animate-pulse border border-slate-800/50" />
              ) : filteredLabs.length === 0 ? (
                <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-14 text-center">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={20} strokeWidth={1.5} className="text-emerald-400" />
                  </div>
                  <p className="text-[13px] font-medium text-slate-300">All caught up</p>
                  <p className="text-[12px] text-slate-500 mt-1">No pending lab results to review</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLabs.map((item) => {
                    const cfg  = priorityConfig[item.priority] || priorityConfig.ROUTINE
                    const Icon = cfg.icon
                    return (
                      <div key={item.id}
                        className={'bg-slate-900/70 border rounded-2xl p-5 transition-all duration-200 ' + cfg.border + (item.priority === 'CRITICAL' ? ' shadow-[0_0_20px_rgba(239,68,68,0.1)]' : '')}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className={'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ' + cfg.bg}>
                              <Icon size={16} strokeWidth={1.5} className={cfg.color} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-[14px] font-medium text-slate-100">{item.analysisType}</p>
                                <span className={'text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ' + cfg.bg + ' ' + cfg.color}>
                                  {cfg.label}
                                </span>
                              </div>
                              <p className="text-[12px] text-slate-400">
                                Patient: <span className="text-slate-300">{item.medicalRecord?.patient?.user?.fullName}</span>
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Lab: {item.lab?.user?.fullName} · {timeAgo(item.uploadedAt)}
                              </p>
                              {item.summary && <p className="text-[12px] text-slate-500 mt-2">{item.summary}</p>}
                              {item.escalatedAt && (
                                <p className="text-[11px] text-red-400 mt-2 flex items-center gap-1">
                                  <AlertTriangle size={11} strokeWidth={1.5} />
                                  Auto-escalated after 24h without review
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {item.fileUrl && (
                              <a href={'http://localhost:5000/' + item.fileUrl} target="_blank"
                                className="flex items-center gap-1 text-[12px] text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-colors"
                              ><FileText size={12} strokeWidth={1.5} /> View</a>
                            )}
                            <button
                              onClick={() => markReviewed(item.id)}
                              disabled={reviewing === item.id}
                              className="flex items-center gap-1.5 text-[12px] font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <CheckCircle2 size={12} strokeWidth={1.5} />
                              {reviewing === item.id ? 'Marking...' : 'Mark reviewed'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* SHARED RECORDS TAB CONTENT */}
          {mainTab === 'SHARED' && (
            <>
              {loading ? (
                <div className="h-64 bg-slate-900/50 rounded-2xl animate-pulse border border-slate-800/50" />
              ) : sharedItems.length === 0 ? (
                <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-14 text-center">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck size={20} strokeWidth={1.5} className="text-emerald-400" />
                  </div>
                  <p className="text-[13px] font-medium text-slate-300">No shared consultation records</p>
                  <p className="text-[12px] text-slate-500 mt-1">When colleagues share specific prescriptions, diagnoses, or analyses with you, they will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sharedItems.map((grant) => {
                    const patientUser = grant.medicalRecord?.patient?.user
                    const itemType = grant.file ? 'Analysis' : grant.prescription ? 'Prescription' : 'Diagnosis'
                    const title = grant.file?.analysisType || grant.prescription?.medications?.join(', ') || grant.diagnosis?.title || 'Medical Record Item'
                    const details = grant.file?.summary || grant.prescription?.instructions || grant.diagnosis?.notes
                    const creatorName = grant.prescription?.doctor?.user?.fullName || grant.diagnosis?.doctor?.user?.fullName || grant.file?.lab?.user?.fullName || 'Colleague / Patient'

                    return (
                      <div key={grant.id} className="bg-slate-900/70 border border-emerald-500/20 rounded-2xl p-5 hover:bg-slate-900 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                              {grant.file && <FlaskConical size={16} />}
                              {grant.prescription && <Pill size={16} />}
                              {grant.diagnosis && <Stethoscope size={16} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-[14px] font-medium text-slate-100">{title}</p>
                                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  {itemType}
                                </span>
                              </div>
                              <p className="text-[12px] text-slate-400">
                                Patient: <span className="text-slate-200 font-semibold">{patientUser?.fullName}</span> <span className="text-slate-500">({patientUser?.email})</span>
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Originator: Dr. {creatorName} · Granted: {timeAgo(grant.respondedAt || grant.requestedAt)}
                              </p>
                              {details && (
                                <p className="text-[12px] text-slate-400 mt-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                                  {details}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {patientUser?.email && (
                              <button
                                onClick={() => router.push(`/doctor/patients?email=${encodeURIComponent(patientUser.email)}`)}
                                className="flex items-center gap-1.5 text-[12px] font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                <ExternalLink size={13} />
                                Open Patient Dossier
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

        </main>
      </div>
    </div>
  )
}
