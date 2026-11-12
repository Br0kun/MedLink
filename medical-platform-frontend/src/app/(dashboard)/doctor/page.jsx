'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import api from '@/lib/api'
import {
  Activity, Search, ShieldAlert, ShieldCheck, User, FileText, Pill, Stethoscope, LogOut, LayoutDashboard, Users, X, Check, Inbox, MessageSquare, UserCheck, Calendar, FlaskConical
} from 'lucide-react'
import DoctorAvailabilityCard from '@/components/DoctorAvailabilityCard'

const navItems = [
  { label: 'Dashboard',     path: '/doctor',          icon: LayoutDashboard },
  { label: 'Inbox',         path: '/doctor/inbox',    icon: Inbox },
  { label: 'Patients',      path: '/doctor/patients', icon: Users },
  { label: 'Duty & Status', path: '/doctor/duty',     icon: UserCheck },
  { label: 'Chat',          path: '/doctor/chat',     icon: MessageSquare },
  { label: 'Staff',         path: '/doctor/staff',    icon: ShieldCheck },
  { label: 'Schedule',      path: '/doctor/schedule', icon: Calendar },
]

export default function DoctorDashboard() {
  const user   = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()

  const [email,        setEmail]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [patientData,  setPatientData]  = useState(null)
  const [error,        setError]        = useState(null)
  const [accessStatus, setAccessStatus] = useState(null)
  const [activeForm,   setActiveForm]   = useState(null) // 'rx' | 'dx' | null
  const [rxForm,       setRxForm]       = useState({ medications: '', instructions: '' })
  const [dxForm,       setDxForm]       = useState({ title: '', notes: '' })
  const [sending,      setSending]      = useState(false)
  const [successMsg,   setSuccessMsg]   = useState(null)

  const [stats, setStats] = useState({ appointmentsToday: 0, pendingAppointments: 0, totalPatients: 0, pendingLabs: 0 })
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await api.get('/doctor/stats')
      setStats(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setStatsLoading(false)
    }
  }

  const initials = user?.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  const searchPatient = async (e) => {
    e.preventDefault()
    if (!email) return
    setLoading(true); setError(null); setPatientData(null); setAccessStatus(null); setActiveForm(null); setSuccessMsg(null)
    try {
      const res = await api.get('/dossier/by-email/' + email)
      setPatientData(res.data)
      setAccessStatus('GRANTED')
    } catch (err) {
      if (err.response?.status === 403) {
        setError('You do not have access to this patient\'s dossier.')
        setAccessStatus('NONE')
      } else if (err.response?.status === 404) {
        setError('No patient found with this email address.')
      } else {
        setError('An unexpected error occurred.')
      }
    } finally { setLoading(false) }
  }

  const handleRequestAccess = async () => {
    try {
      await api.post('/dossier/access/request', { patientEmail: email })
      setAccessStatus('PENDING')
      setError('Access request sent. Waiting for patient approval.')
    } catch (err) {
      if (err.response?.status === 409) {
        setError('A request already exists for this patient.')
        setAccessStatus('PENDING')
      } else {
        setError('Failed to send access request.')
      }
    }
  }

  const addPrescription = async (e) => {
    e.preventDefault(); setSending(true); setSuccessMsg(null)
    try {
      await api.post('/dossier/prescription/' + email, {
        medications:  rxForm.medications.split(',').map((m) => m.trim()),
        instructions: rxForm.instructions,
      })
      setSuccessMsg('Prescription added successfully')
      setRxForm({ medications: '', instructions: '' })
      setActiveForm(null)
      const res = await api.get('/dossier/by-email/' + email)
      setPatientData(res.data)
    } catch (err) { setSuccessMsg('Error: ' + (err.response?.data?.error || 'Failed')) }
    finally { setSending(false) }
  }

  const addDiagnosis = async (e) => {
    e.preventDefault(); setSending(true); setSuccessMsg(null)
    try {
      await api.post('/dossier/diagnosis/' + email, dxForm)
      setSuccessMsg('Diagnosis added successfully')
      setDxForm({ title: '', notes: '' })
      setActiveForm(null)
      const res = await api.get('/dossier/by-email/' + email)
      setPatientData(res.data)
    } catch (err) { setSuccessMsg('Error: ' + (err.response?.data?.error || 'Failed')) }
    finally { setSending(false) }
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

        {/* Dark Navbar */}
        <header className="h-14 bg-[#080C14] border-b border-slate-800/60 flex items-center justify-between px-6 flex-shrink-0">
          <div>
            <p className="text-[13px] font-medium text-slate-200">Doctor Dashboard</p>
            <p className="text-[11px] text-slate-500">Search patients and manage medical records</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-[11px] font-medium text-teal-400">{initials}</div>
            <div className="hidden sm:block">
              <p className="text-[12px] font-medium text-slate-200 leading-none">{user?.fullName}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {user?.specialty ? user.specialty : 'Doctor'}
                {user?.licenseNumber ? ` • ${user.licenseNumber}` : ''}
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 lg:p-10">
          
          {/* Dashboard KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Today's Appointments</p>
                <p className="text-2xl font-bold text-white">{statsLoading ? '-' : stats.appointmentsToday}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Calendar size={18} />
              </div>
            </div>
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Pending Appointments</p>
                <p className="text-2xl font-bold text-white">{statsLoading ? '-' : stats.pendingAppointments}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Activity size={18} />
              </div>
            </div>
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total Patients</p>
                <p className="text-2xl font-bold text-white">{statsLoading ? '-' : stats.totalPatients}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Users size={18} />
              </div>
            </div>
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:border-purple-500/30 transition-all"
                 onClick={() => router.push('/doctor/inbox')}>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Pending Labs</p>
                <p className="text-2xl font-bold text-white">{statsLoading ? '-' : stats.pendingLabs}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <FlaskConical size={18} />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-medium text-slate-100 tracking-tight">Patient Lookup</h1>
            <p className="text-sm text-slate-400 mt-1.5">Search for patients and manage their medical records.</p>
          </div>

          {/* Search */}
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 mb-6">
            <form onSubmit={searchPatient} className="flex gap-3 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={15} strokeWidth={1.5} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter patient email address..."
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl pl-11 pr-4 py-2.5 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-slate-600"
                  required
                />
              </div>
              <button type="submit" disabled={loading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>
          </div>

          {/* Error state */}
          {error && accessStatus !== 'GRANTED' && (
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-10 text-center max-w-lg mb-6">
              <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldAlert size={20} className={accessStatus === 'PENDING' ? 'text-amber-400' : 'text-slate-400'} />
              </div>
              <p className="text-sm text-slate-300 mb-5">{error}</p>
              {accessStatus === 'NONE' && (
                <button onClick={handleRequestAccess}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all active:scale-[0.98]"
                >
                  Request dossier access
                </button>
              )}
            </div>
          )}

          {/* Success message */}
          {successMsg && (
            <div className={'flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-sm font-medium max-w-lg ' + (successMsg.startsWith('Error') ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400')}>
              {successMsg.startsWith('Error') ? <X size={15} /> : <Check size={15} />}
              {successMsg}
            </div>
          )}

          {/* Granted state */}
          {accessStatus === 'GRANTED' && patientData && (
            <div className="space-y-5">

              {/* Access badge */}
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 max-w-lg">
                <ShieldCheck className="text-emerald-400 flex-shrink-0" size={16} strokeWidth={1.5} />
                <p className="text-sm font-medium text-emerald-400">Secure access verified for {patientData.patientName}</p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5">
                  <div className="flex items-center gap-2.5 mb-4">
                    <User className="text-blue-400" size={16} strokeWidth={1.5} />
                    <h3 className="text-[13px] font-medium text-slate-200">Patient info</h3>
                  </div>
                  <p className="text-[12px] text-slate-500">Name</p>
                  <p className="text-[13px] text-slate-200 mt-0.5">{patientData.patientName}</p>
                  <p className="text-[12px] text-slate-500 mt-3">Email</p>
                  <p className="text-[13px] text-slate-200 mt-0.5">{patientData.patientEmail}</p>
                </div>

                <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5">
                  <div className="flex items-center gap-2.5 mb-4">
                    <Stethoscope className="text-purple-400" size={16} strokeWidth={1.5} />
                    <h3 className="text-[13px] font-medium text-slate-200">Diagnoses</h3>
                  </div>
                  <p className="text-3xl font-mono font-medium text-slate-100">{patientData.diagnoses?.length || 0}</p>
                  {patientData.diagnoses?.length > 0 && (
                    <p className="text-[11px] text-slate-500 mt-2">Latest: {patientData.diagnoses[0]?.title}</p>
                  )}
                </div>

                <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5">
                  <div className="flex items-center gap-2.5 mb-4">
                    <Pill className="text-amber-400" size={16} strokeWidth={1.5} />
                    <h3 className="text-[13px] font-medium text-slate-200">Prescriptions</h3>
                  </div>
                  <p className="text-3xl font-mono font-medium text-slate-100">{patientData.prescriptions?.length || 0}</p>
                  {patientData.prescriptions?.length > 0 && (
                    <p className="text-[11px] text-slate-500 mt-2">Latest: {new Date(patientData.prescriptions[0]?.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setActiveForm(activeForm === 'rx' ? null : 'rx')}
                  className={'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-all active:scale-[0.98] ' + (activeForm === 'rx' ? 'bg-blue-600 text-white border-transparent' : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20')}
                >
                  <Pill size={14} strokeWidth={1.5} /> Add Prescription
                </button>
                <button
                  onClick={() => setActiveForm(activeForm === 'dx' ? null : 'dx')}
                  className={'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-all active:scale-[0.98] ' + (activeForm === 'dx' ? 'bg-purple-600 text-white border-transparent' : 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20')}
                >
                  <Stethoscope size={14} strokeWidth={1.5} /> Add Diagnosis
                </button>
                <button
                  onClick={() => router.push('/doctor/patients')}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-700/50 bg-slate-800/50 text-slate-300 hover:bg-slate-800 transition-all active:scale-[0.98]"
                >
                  <FileText size={14} strokeWidth={1.5} /> View Full Dossier
                </button>
              </div>

              {/* Add Prescription form */}
              {activeForm === 'rx' && (
                <div className="bg-slate-900/70 border border-blue-500/20 rounded-2xl p-6 max-w-lg">
                  <h3 className="text-[13px] font-medium text-slate-200 mb-4 flex items-center gap-2">
                    <Pill size={14} strokeWidth={1.5} className="text-blue-400" /> Add prescription
                  </h3>
                  <form onSubmit={addPrescription} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Medications (comma separated)</label>
                      <input
                        type="text"
                        placeholder="Paracetamol 500mg, Ibuprofen 400mg"
                        value={rxForm.medications}
                        onChange={(e) => setRxForm({ ...rxForm, medications: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-slate-600"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Instructions</label>
                      <textarea
                        placeholder="Take twice daily after meals..."
                        value={rxForm.instructions}
                        onChange={(e) => setRxForm({ ...rxForm, instructions: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-slate-600 resize-none h-20"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button type="submit" disabled={sending}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 active:scale-[0.98]"
                      >
                        <Pill size={13} strokeWidth={1.5} />{sending ? 'Saving...' : 'Add prescription'}
                      </button>
                      <button type="button" onClick={() => setActiveForm(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm font-medium rounded-xl transition-all"
                      >Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {/* Add Diagnosis form */}
              {activeForm === 'dx' && (
                <div className="bg-slate-900/70 border border-purple-500/20 rounded-2xl p-6 max-w-lg">
                  <h3 className="text-[13px] font-medium text-slate-200 mb-4 flex items-center gap-2">
                    <Stethoscope size={14} strokeWidth={1.5} className="text-purple-400" /> Add diagnosis
                  </h3>
                  <form onSubmit={addDiagnosis} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Diagnosis title</label>
                      <input
                        type="text"
                        placeholder="Acute bronchitis"
                        value={dxForm.title}
                        onChange={(e) => setDxForm({ ...dxForm, title: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all placeholder:text-slate-600"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Clinical notes</label>
                      <textarea
                        placeholder="Patient presented with..."
                        value={dxForm.notes}
                        onChange={(e) => setDxForm({ ...dxForm, notes: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all placeholder:text-slate-600 resize-none h-20"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button type="submit" disabled={sending}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 active:scale-[0.98]"
                      >
                        <Stethoscope size={13} strokeWidth={1.5} />{sending ? 'Saving...' : 'Add diagnosis'}
                      </button>
                      <button type="button" onClick={() => setActiveForm(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm font-medium rounded-xl transition-all"
                      >Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {/* Recent analyses preview */}
              {patientData.analyses?.length > 0 && (
                <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
                    <p className="text-[13px] font-medium text-slate-200">Recent analyses</p>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md">{patientData.analyses.length} total</span>
                  </div>
                  <div className="divide-y divide-slate-800/40">
                    {patientData.analyses.slice(0, 3).map((a) => (
                      <div key={a.id} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText size={13} strokeWidth={1.5} className="text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-[13px] text-slate-200">{a.analysisType}</p>
                            {a.summary && <p className="text-[11px] text-slate-500 mt-0.5">{a.summary}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-slate-500">{new Date(a.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                          {a.fileUrl && (
                            <a href={'http://localhost:5000/' + a.fileUrl} target="_blank"
                              className="text-[11px] text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg transition-colors"
                            >View file</a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
