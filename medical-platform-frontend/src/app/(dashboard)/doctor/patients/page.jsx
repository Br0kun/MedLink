'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import api from '@/lib/api'
import {
  Activity, Mail, Search, ShieldAlert, ShieldCheck, User, FileText, Pill, Stethoscope, LogOut, LayoutDashboard, Users, X, Check, Inbox, FlaskConical, ChevronRight, MessageSquare, Share2, ChevronDown, UserCheck, Calendar
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

export default function DoctorPatientsPage() {
  const user   = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()

  const [email,        setEmail]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [patientData,  setPatientData]  = useState(null)
  const [error,        setError]        = useState(null)
  const [accessStatus, setAccessStatus] = useState(null)
  const [myPatients,   setMyPatients]   = useState([])
  const [loadingList,  setLoadingList]  = useState(true)
  const [activeForm,   setActiveForm]   = useState(null)
  const [rxForm,       setRxForm]       = useState({ medications: '', instructions: '' })
  const [dxForm,       setDxForm]       = useState({ title: '', notes: '' })
  const [sending,      setSending]      = useState(false)
  const [successMsg,   setSuccessMsg]   = useState(null)
  const [activeTab,    setActiveTab]    = useState('analyses')

  // Sharing states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedItemType, setSelectedItemType] = useState('analyses')
  const [doctors, setDoctors] = useState([])
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [consultationNote, setConsultationNote] = useState('')
  const [sendChatCard, setSendChatCard] = useState(true)
  const [loadingDoctors, setLoadingDoctors] = useState(false)
  const [sharingInProgress, setSharingInProgress] = useState(false)
  const [shareError, setShareError] = useState('')

  const initials = user?.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  useEffect(() => {
    api.get('/dossier/my-patients')
      .then((r) => {
        setMyPatients(r.data)
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search)
          const emailParam = params.get('email')
          if (emailParam) {
            setEmail(emailParam)
            api.get('/dossier/by-email/' + emailParam)
              .then((res) => { setPatientData(res.data); setAccessStatus('GRANTED') })
              .catch(console.error)
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoadingList(false))
  }, [])

  const openShareModal = async (file, itemType) => {
    setSelectedFile(file)
    setSelectedItemType(itemType || 'analyses')
    setIsShareModalOpen(true)
    setShareError('')
    setSelectedDoctorId('')
    setConsultationNote('')
    setSendChatCard(true)
    setLoadingDoctors(true)
    try {
      const res = await api.get('/api/doctors')
      setDoctors(res.data)
      if (res.data.length > 0) {
        setSelectedDoctorId(res.data[0].id)
      }
    } catch (err) {
      console.error(err)
      setShareError('Failed to fetch verified doctors.')
    } finally {
      setLoadingDoctors(false)
    }
  }

  const handleConfirmShare = async () => {
    if (!selectedFile?.id || !selectedDoctorId) return
    setSharingInProgress(true)
    setShareError('')

    const payload = {
      doctorId: selectedDoctorId,
      note: consultationNote,
      sendChatCard,
      ...(selectedItemType === 'analyses' && { fileId: selectedFile.id }),
      ...(selectedItemType === 'prescriptions' && { prescriptionId: selectedFile.id }),
      ...(selectedItemType === 'diagnoses' && { diagnosisId: selectedFile.id })
    }

    try {
      await api.post('/api/files/share', payload)
      setIsShareModalOpen(false)
      setSuccessMsg('Access officially granted. Twilio SMS alert dispatched to the patient!')
      setTimeout(() => setSuccessMsg(null), 5000)
      
      const res = await api.get('/dossier/by-email/' + email)
      setPatientData(res.data)
    } catch (err) {
      console.error(err)
      setShareError(err.response?.data?.error || 'Failed to share file. Please try again.')
    } finally {
      setSharingInProgress(false)
    }
  }

  const searchPatient = async (e) => {
    e?.preventDefault()
    if (!email) return
    setLoading(true); setError(null); setPatientData(null); setAccessStatus(null); setActiveForm(null); setSuccessMsg(null)
    try {
      const res = await api.get('/dossier/by-email/' + email)
      setPatientData(res.data); setAccessStatus('GRANTED')
    } catch (err) {
      if (err.response?.status === 403) { setError('You do not have access to this patient\'s dossier.'); setAccessStatus('NONE') }
      else if (err.response?.status === 404) setError('No patient found with this email.')
      else setError('An unexpected error occurred.')
    } finally { setLoading(false) }
  }

  const handleRequestAccess = async () => {
    try {
      await api.post('/dossier/access/request', { patientEmail: email })
      setAccessStatus('PENDING'); setError('Access request sent. Waiting for patient approval.')
    } catch (err) {
      if (err.response?.status === 409) { setError('A request already exists for this patient.'); setAccessStatus('PENDING') }
      else setError('Failed to send access request.')
    }
  }

  const loadPatient = (p) => {
    setEmail(p.email); setError(null); setPatientData(null); setAccessStatus(null); setActiveForm(null); setSuccessMsg(null)
    setTimeout(() => {
      api.get('/dossier/by-email/' + p.email)
        .then((r) => { setPatientData(r.data); setAccessStatus('GRANTED') })
        .catch(() => setError('Failed to load patient data.'))
    }, 50)
  }

  const addPrescription = async (e) => {
    e.preventDefault(); setSending(true); setSuccessMsg(null)
    try {
      await api.post('/dossier/prescription/' + email, { medications: rxForm.medications.split(',').map((m) => m.trim()), instructions: rxForm.instructions })
      setSuccessMsg('Prescription added successfully')
      setRxForm({ medications: '', instructions: '' }); setActiveForm(null)
      const res = await api.get('/dossier/by-email/' + email); setPatientData(res.data)
    } catch (err) { setSuccessMsg('Error: ' + (err.response?.data?.error || 'Failed')) }
    finally { setSending(false) }
  }

  const addDiagnosis = async (e) => {
    e.preventDefault(); setSending(true); setSuccessMsg(null)
    try {
      await api.post('/dossier/diagnosis/' + email, dxForm)
      setSuccessMsg('Diagnosis added successfully')
      setDxForm({ title: '', notes: '' }); setActiveForm(null)
      const res = await api.get('/dossier/by-email/' + email); setPatientData(res.data)
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

        {/* Navbar */}
        <header className="h-14 bg-[#080C14] border-b border-slate-800/60 flex items-center justify-between px-6 flex-shrink-0">
          <div>
            <p className="text-[13px] font-medium text-slate-200">Patient Records</p>
            <p className="text-[11px] text-slate-500">Search or select a patient to view their dossier</p>
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

        <main className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 h-full">

            {/* Patients list */}
            <div className="lg:col-span-1 border-r border-slate-800/60 flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Users size={14} strokeWidth={1.5} className="text-teal-400" />
                  <p className="text-[12px] font-medium text-slate-200">My patients</p>
                </div>
                <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{myPatients.length}</span>
              </div>

              <div className="p-3 border-b border-slate-800/60 flex-shrink-0">
                <form onSubmit={searchPatient} className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail size={12} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Search by email..."
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-[12px] rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600" />
                  </div>
                  <button type="submit" disabled={loading} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-all disabled:opacity-50">Go</button>
                </form>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loadingList ? (
                  <div className="p-6 text-center"><p className="text-[12px] text-slate-500">Loading...</p></div>
                ) : myPatients.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-[12px] text-slate-500">No approved patients yet.</p>
                    <p className="text-[11px] text-slate-600 mt-1">Request access from the dashboard.</p>
                  </div>
                ) : myPatients.map((p) => (
                  <button key={p.grantId} onClick={() => loadPatient(p)}
                    className={'w-full text-left px-3 py-3 rounded-xl border transition-all duration-150 ' + (patientData?.patientEmail === p.email ? 'bg-blue-600/15 border-blue-500/30' : 'border-transparent hover:bg-slate-800/60 hover:border-slate-700/50')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[10px] font-medium text-blue-400 flex-shrink-0">
                          {p.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-slate-200 truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{p.email}</p>
                        </div>
                      </div>
                      <ChevronRight size={12} strokeWidth={1.5} className="text-slate-600 flex-shrink-0 ml-1" />
                    </div>
                    <div className="flex gap-2 mt-2 pl-9">
                      <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">{p.analyses || 0} analyses</span>
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">{p.prescriptions || 0} rx</span>
                      <span className="text-[9px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded">{p.diagnoses || 0} dx</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dossier view */}
            <div className="lg:col-span-3 overflow-y-auto p-8">

              {!patientData && !error && !loading && (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-slate-800/60 border border-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users size={24} strokeWidth={1.5} className="text-slate-600" />
                  </div>
                  <p className="text-[13px] font-medium text-slate-400">Select a patient from the list</p>
                  <p className="text-[12px] text-slate-600 mt-1">or search by email above</p>
                </div>
              )}

              {loading && (
                <div className="h-48 bg-slate-900/50 rounded-2xl animate-pulse border border-slate-800/50 flex items-center justify-center">
                  <p className="text-[12px] text-slate-500">Loading patient data...</p>
                </div>
              )}

              {error && accessStatus !== 'GRANTED' && (
                <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-10 text-center max-w-md">
                  <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ShieldAlert size={20} className={accessStatus === 'PENDING' ? 'text-amber-400' : 'text-slate-400'} />
                  </div>
                  <p className="text-[13px] text-slate-300 mb-5">{error}</p>
                  {accessStatus === 'NONE' && (
                    <button onClick={handleRequestAccess} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium rounded-xl transition-all active:scale-[0.98]">
                      Request dossier access
                    </button>
                  )}
                </div>
              )}

              {successMsg && (
                <div className={'flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-[13px] font-medium ' + (successMsg.startsWith('Error') ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400')}>
                  {successMsg.startsWith('Error') ? <X size={14} /> : <Check size={14} />}
                  {successMsg}
                </div>
              )}

              {accessStatus === 'GRANTED' && patientData && (
                <div className="space-y-5">

                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-medium text-slate-100">{patientData.patientName}</h2>
                      <p className="text-[12px] text-slate-500 mt-0.5">{patientData.patientEmail}</p>
                    </div>
                    <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 ${
                      patientData.hasBaseAccess 
                        ? 'bg-emerald-500/10 border-emerald-500/20' 
                        : 'bg-amber-500/10 border-amber-500/20'
                    }`}>
                      <ShieldCheck size={14} strokeWidth={1.5} className={patientData.hasBaseAccess ? 'text-emerald-400' : 'text-amber-400'} />
                      <span className={`text-[12px] font-medium ${patientData.hasBaseAccess ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {patientData.hasBaseAccess ? 'Full Access Granted' : 'Limited Item Access'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Analyses',      value: patientData.analyses?.length || 0,      icon: FlaskConical, color: 'blue' },
                      { label: 'Prescriptions', value: patientData.prescriptions?.length || 0, icon: Pill,         color: 'emerald' },
                      { label: 'Diagnoses',     value: patientData.diagnoses?.length || 0,     icon: Stethoscope,  color: 'purple' },
                    ].map((s, i) => (
                      <div key={i} className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <s.icon size={13} strokeWidth={1.5} className={'text-' + s.color + '-400'} />
                          <p className="text-[11px] text-slate-500">{s.label}</p>
                        </div>
                        <p className="text-2xl font-mono font-medium text-slate-100">{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {patientData.hasBaseAccess ? (
                    <div className="flex gap-2">
                      <button onClick={() => setActiveForm(activeForm === 'rx' ? null : 'rx')}
                        className={'flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium rounded-lg border transition-all ' + (activeForm === 'rx' ? 'bg-blue-600 text-white border-transparent' : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20')}
                      ><Pill size={13} strokeWidth={1.5} /> Add prescription</button>
                      <button onClick={() => setActiveForm(activeForm === 'dx' ? null : 'dx')}
                        className={'flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium rounded-lg border transition-all ' + (activeForm === 'dx' ? 'bg-purple-600 text-white border-transparent' : 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20')}
                      ><Stethoscope size={13} strokeWidth={1.5} /> Add diagnosis</button>
                    </div>
                  ) : (
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl px-4 py-3 flex items-start gap-3">
                       <ShieldAlert size={16} className="text-amber-500 shrink-0 mt-0.5" />
                       <div className="space-y-0.5">
                         <p className="text-[12px] font-medium text-amber-500">Read-Only Access</p>
                         <p className="text-[11px] text-amber-500/80 leading-relaxed">
                           You only have access to specific shared items. You cannot add prescriptions or diagnoses to this dossier.
                         </p>
                       </div>
                    </div>
                  )}

                  {activeForm === 'rx' && (
                    <div className="bg-slate-900/70 border border-blue-500/20 rounded-xl p-5">
                      <form onSubmit={addPrescription} className="space-y-3">
                        <input type="text" placeholder="Medications (comma separated)" value={rxForm.medications} onChange={(e) => setRxForm({ ...rxForm, medications: e.target.value })} required
                          className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-[13px] rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600" />
                        <textarea placeholder="Instructions..." value={rxForm.instructions} onChange={(e) => setRxForm({ ...rxForm, instructions: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-[13px] rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600 resize-none h-16" />
                        <div className="flex gap-2">
                          <button type="submit" disabled={sending} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-all disabled:opacity-50">
                            <Pill size={12} strokeWidth={1.5} />{sending ? 'Saving...' : 'Save prescription'}
                          </button>
                          <button type="button" onClick={() => setActiveForm(null)} className="px-4 py-2 bg-slate-800 text-slate-400 text-[12px] font-medium rounded-lg hover:bg-slate-700 transition-all">Cancel</button>
                        </div>
                      </form>
                    </div>
                  )}

                  {activeForm === 'dx' && (
                    <div className="bg-slate-900/70 border border-purple-500/20 rounded-xl p-5">
                      <form onSubmit={addDiagnosis} className="space-y-3">
                        <input type="text" placeholder="Diagnosis title" value={dxForm.title} onChange={(e) => setDxForm({ ...dxForm, title: e.target.value })} required
                          className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-[13px] rounded-lg px-3 py-2.5 focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-600" />
                        <textarea placeholder="Clinical notes..." value={dxForm.notes} onChange={(e) => setDxForm({ ...dxForm, notes: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-[13px] rounded-lg px-3 py-2.5 focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-600 resize-none h-16" />
                        <div className="flex gap-2">
                          <button type="submit" disabled={sending} className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-[12px] font-medium rounded-lg transition-all disabled:opacity-50">
                            <Stethoscope size={12} strokeWidth={1.5} />{sending ? 'Saving...' : 'Save diagnosis'}
                          </button>
                          <button type="button" onClick={() => setActiveForm(null)} className="px-4 py-2 bg-slate-800 text-slate-400 text-[12px] font-medium rounded-lg hover:bg-slate-700 transition-all">Cancel</button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Dossier tabs */}
                  <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl overflow-hidden">
                    <div className="flex border-b border-slate-800/60 overflow-x-auto">
                      {['analyses', 'prescriptions', 'diagnoses'].map((t) => (
                        <button key={t} onClick={() => setActiveTab(t)}
                          className={'flex items-center gap-1.5 px-4 py-3 text-[12px] font-medium capitalize border-b-2 transition-all whitespace-nowrap ' + (activeTab === t ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300')}
                        >
                          {t === 'analyses'      && <FlaskConical size={12} strokeWidth={1.5} />}
                          {t === 'prescriptions' && <Pill         size={12} strokeWidth={1.5} />}
                          {t === 'diagnoses'     && <Stethoscope  size={12} strokeWidth={1.5} />}
                          {t}
                          <span className="ml-1 text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">{patientData[t]?.length ?? 0}</span>
                        </button>
                      ))}
                    </div>
                    <div className="divide-y divide-slate-800/40">
                      {patientData[activeTab]?.length === 0 ? (
                        <div className="p-8 text-center"><p className="text-[13px] text-slate-500">No {activeTab} yet</p></div>
                      ) : patientData[activeTab]?.map((item) => (
                        <div key={item.id} className="flex items-start justify-between px-5 py-4 hover:bg-slate-800/20 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className={'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ' + (activeTab === 'analyses' ? 'bg-blue-500/10' : activeTab === 'prescriptions' ? 'bg-emerald-500/10' : 'bg-purple-500/10')}>
                              {activeTab === 'analyses'      && <FlaskConical size={13} strokeWidth={1.5} className="text-blue-400" />}
                              {activeTab === 'prescriptions' && <Pill         size={13} strokeWidth={1.5} className="text-emerald-400" />}
                              {activeTab === 'diagnoses'     && <Stethoscope  size={13} strokeWidth={1.5} className="text-purple-400" />}
                            </div>
                            <div>
                              <p className="text-[13px] font-medium text-slate-200">{item.analysisType || item.title || 'Prescription'}</p>
                              {item.summary      && <p className="text-[11px] text-slate-500 mt-0.5">{item.summary}</p>}
                              {item.notes        && <p className="text-[11px] text-slate-500 mt-0.5">{item.notes}</p>}
                              {item.instructions && <p className="text-[11px] text-slate-500 mt-0.5">{item.instructions}</p>}
                              {item.medications  && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {item.medications.map((m, i) => (
                                    <span key={i} className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md">{m}</span>
                                  ))}
                                </div>
                              )}
                              {/* Who added it */}
                              {activeTab === 'analyses' && item.lab?.user?.fullName && (
                                <span className="inline-flex mt-1.5 text-[10px] text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-md">
                                  Lab: {item.lab.user.fullName}
                                </span>
                              )}
                              {activeTab === 'prescriptions' && item.doctor?.user?.fullName && (
                                <span className="inline-flex mt-1.5 text-[10px] text-teal-500/70 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-md">
                                  Dr. {item.doctor.user.fullName}
                                </span>
                              )}
                              {activeTab === 'diagnoses' && item.doctor?.user?.fullName && (
                                <span className="inline-flex mt-1.5 text-[10px] text-teal-500/70 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-md">
                                  Dr. {item.doctor.user.fullName}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[11px] text-slate-500">{new Date(item.uploadedAt || item.issuedAt || item.diagnosedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => openShareModal(item, activeTab)}
                                className="flex items-center gap-1 text-[11px] text-emerald-450 hover:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                              >
                                <Share2 size={11} strokeWidth={1.5} /> Share
                              </button>
                              {item.fileUrl && (
                                <a href={'http://localhost:5000/' + item.fileUrl} target="_blank"
                                  className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg transition-colors"
                                ><FileText size={11} strokeWidth={1.5} /> View</a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Secure Share / Grant Access Modal */}
              {isShareModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                  <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => setIsShareModalOpen(false)}
                  />
                  <div className="relative w-full sm:max-w-md sm:mx-4 rounded-t-2xl sm:rounded-2xl shadow-2xl border transition-colors duration-300 bg-[#0d121f] border-slate-800/80">
                    <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-800/60">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
                          <Share2 size={13} className="text-blue-400" />
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-slate-100">Secure Share</h2>
                          <p className="text-[10px] text-slate-500">Authorize a doctor to view this item</p>
                        </div>
                      </div>
                      <button onClick={() => setIsShareModalOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-slate-200 hover:bg-slate-800/60">
                        <X size={14} />
                      </button>
                    </div>

                    <div className="px-6 py-5 space-y-4">
                      {shareError && (
                        <div className="text-xs rounded-xl px-4 py-3 border bg-red-500/10 border-red-500/20 text-red-400">
                          {shareError}
                        </div>
                      )}

                      <div className="text-xs rounded-xl px-4 py-3.5 border flex items-start gap-2.5 leading-relaxed bg-blue-500/5 border-blue-500/10 text-blue-400">
                        <ShieldCheck size={16} className="text-blue-400 shrink-0 mt-0.5" />
                        <p>
                          <strong>Secure Share:</strong> This action creates an <code className="font-mono bg-blue-500/10 px-1 rounded text-blue-400 font-semibold">AccessGrant</code> in the database, securely granting this doctor legal permission to view this item from their account.
                        </p>
                      </div>

                      <div className="border rounded-xl p-3 bg-black/40 border-slate-800/60">
                        <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Item Selected</p>
                        <p className="text-xs font-semibold mt-1 truncate text-slate-200">
                          {selectedFile?.analysisType || selectedFile?.title || selectedFile?.medications?.join(', ') || 'Medical Record Item'}
                        </p>
                        {selectedFile?.summary && (
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{selectedFile.summary}</p>
                        )}
                        {selectedFile?.instructions && (
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{selectedFile.instructions}</p>
                        )}
                        {selectedFile?.notes && (
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{selectedFile.notes}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1.5 text-slate-300">
                          Select Verified Doctor
                        </label>
                        {loadingDoctors ? (
                          <div className="w-full py-2.5 px-3.5 text-xs rounded-xl border animate-pulse bg-slate-900 border-slate-800 text-slate-500">
                            Fetching verified medical staff...
                          </div>
                        ) : doctors.length === 0 ? (
                          <div className="text-xs rounded-xl px-4 py-3 border bg-amber-500/10 border-amber-500/20 text-amber-400">
                            No other verified doctors are currently active in the platform.
                          </div>
                        ) : (
                          <div className="relative">
                            <select
                              value={selectedDoctorId}
                              onChange={(e) => setSelectedDoctorId(e.target.value)}
                              className="w-full py-2.5 px-3.5 pr-10 text-sm rounded-xl outline-none border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none bg-slate-900 border-slate-800 text-white"
                            >
                              {doctors.map((doc) => (
                                <option key={doc.id} value={doc.id}>
                                  Dr. {doc.name || doc.user?.fullName || 'Unknown Doctor'} — {doc.specialty ? doc.specialty.charAt(0) + doc.specialty.slice(1).toLowerCase() : 'General'}
                                </option>
                              ))}
                            </select>
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <ChevronDown size={14} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Clinical consultation note */}
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 text-slate-300">
                          Clinical Consultation Note (Optional)
                        </label>
                        <textarea
                          rows={2}
                          value={consultationNote}
                          onChange={(e) => setConsultationNote(e.target.value)}
                          placeholder="e.g. Please review for drug interaction before prescribing treatment..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none"
                        />
                      </div>

                      {/* Send Chat Card Toggle */}
                      <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={sendChatCard}
                          onChange={(e) => setSendChatCard(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                        />
                        <span className="text-xs text-slate-300">Post interactive consultation card to Chat</span>
                      </label>
                    </div>

                    <div className="flex gap-2.5 px-6 pb-5 pt-2">
                      <button
                        onClick={() => setIsShareModalOpen(false)}
                        className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800/60 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmShare}
                        disabled={sharingInProgress || !selectedDoctorId || doctors.length === 0}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 disabled:opacity-60 shadow-sm hover:shadow-md hover:shadow-blue-500/20 cursor-pointer"
                      >
                        {sharingInProgress ? (
                          <span className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Sharing...
                          </span>
                        ) : (
                          <>Confirm Share</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
