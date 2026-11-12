'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSocket } from '@/lib/socket'
import api from '@/lib/api'
import {
  Activity, FlaskConical, Pill, Stethoscope, FileText, Bell, LayoutDashboard, FolderOpen, ShieldCheck, LogOut, Download, X, AlertTriangle, Share2, ShieldAlert, Phone, ChevronDown, Calendar
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard',     path: '/patient',               icon: LayoutDashboard },
  { label: 'My dossier',    path: '/patient/dossier',       icon: FolderOpen },
  { label: 'Access',        path: '/patient/access',        icon: ShieldCheck },
  { label: 'Notifications', path: '/patient/notifications', icon: Bell },
  { label: 'Book Appointment', path: '/patient/doctors',            icon: Calendar },
]

export default function DossierPage() {
  const user   = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()
  const [dossier, setDossier] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('analyses')
  const [unread,  setUnread]  = useState(0)
  const [pulse,   setPulse]   = useState(false)
  const [theme,   setTheme]   = useState('light')

  // Phone capture state
  const [phoneInput, setPhoneInput] = useState('')
  const [updatingPhone, setUpdatingPhone] = useState(false)
  const [phoneError, setPhoneError] = useState('')

  // Sharing states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedItemType, setSelectedItemType] = useState('analyses')
  const [doctors, setDoctors] = useState([])
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [loadingDoctors, setLoadingDoctors] = useState(false)
  const [sharingInProgress, setSharingInProgress] = useState(false)
  const [shareError, setShareError] = useState('')

  // Toast state
  const [toasts, setToasts] = useState([])

  const addToast = (message, type = 'success') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  const initials = user?.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  useEffect(() => {
    const handleSync = () => {
      setTheme(localStorage.getItem('dossier-theme') || 'light')
    }
    window.addEventListener('themechange', handleSync)
    handleSync()

    api.get('/dossier/me')
      .then((r) => {
        setDossier(r.data)
        setPhoneInput(r.data.patient?.user?.phoneNumber || '')
      })
      .catch(console.error)
      .finally(() => setLoading(false))

    api.get('/notifications/unread').then((r) => setUnread(r.data.count)).catch(() => {})

    const socket = getSocket()
    socket.on('notification', () => { setUnread((p) => p + 1); setPulse(true); setTimeout(() => setPulse(false), 3000) })
    return () => {
      socket.off('notification')
      window.removeEventListener('themechange', handleSync)
    }
  }, [])

  const handleUpdatePhone = async (e) => {
    e.preventDefault()
    if (!phoneInput.trim()) return
    setUpdatingPhone(true)
    setPhoneError('')
    try {
      await api.put('/dossier/profile', {
        phoneNumber: phoneInput.trim()
      })
      const r = await api.get('/dossier/me')
      setDossier(r.data)
      addToast('Phone number updated successfully. Twilio SMS alerts activated!', 'success')
    } catch (err) {
      setPhoneError(err.response?.data?.error || 'Failed to update phone number.')
      addToast(err.response?.data?.error || 'Failed to update phone number.', 'error')
    } finally {
      setUpdatingPhone(false)
    }
  }

  const openShareModal = async (item, itemType) => {
    setSelectedFile(item)
    setSelectedItemType(itemType || 'analyses')
    setIsShareModalOpen(true)
    setShareError('')
    setSelectedDoctorId('')
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
      ...(selectedItemType === 'analyses' && { fileId: selectedFile.id }),
      ...(selectedItemType === 'prescriptions' && { prescriptionId: selectedFile.id }),
      ...(selectedItemType === 'diagnoses' && { diagnosisId: selectedFile.id })
    }

    try {
      await api.post('/api/files/share', payload)
      setIsShareModalOpen(false)
      addToast('Access officially granted. Twilio SMS alert dispatched to the patient!', 'success')
      const r = await api.get('/dossier/me')
      setDossier(r.data)
    } catch (err) {
      console.error(err)
      setShareError(err.response?.data?.error || 'Failed to share file. Please try again.')
    } finally {
      setSharingInProgress(false)
    }
  }

  const isLight = theme === 'light'

  const tabs = [
    { key: 'analyses',      label: 'Analyses',      icon: FlaskConical, color: isLight ? 'text-emerald-700' : 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { key: 'prescriptions', label: 'Prescriptions', icon: Pill,         color: isLight ? 'text-teal-700' : 'text-teal-400', bg: 'bg-teal-500/10' },
    { key: 'diagnoses',     label: 'Diagnoses',     icon: Stethoscope,  color: isLight ? 'text-emerald-800' : 'text-emerald-450', bg: 'bg-emerald-600/10' },
  ]

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 ${
      isLight ? 'bg-[#f4f4f5] text-slate-800' : 'bg-black text-slate-200'
    } selection:bg-emerald-500/30`}>
      
      {/* Sidebar */}
      <aside className={`w-56 h-screen flex flex-col flex-shrink-0 border-r transition-colors duration-300 ${
        isLight ? 'bg-[#fafaf9] border-zinc-200' : 'bg-[#0a0a0c] border-zinc-800/60'
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
                      ? 'bg-emerald-50 text-emerald-600 font-semibold border-emerald-100 shadow-[0_2px_8px_rgba(16,185,129,0.06)]' 
                      : 'bg-emerald-600/10 text-emerald-400 font-medium border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                    : isLight 
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-200 border-transparent font-normal' 
                      : 'text-slate-500 hover:text-slate-200 hover:bg-zinc-900 hover:border-zinc-800/40 border-transparent font-normal'
                }`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-505 bg-emerald-500 rounded-r transition-transform duration-300 ${active ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100'}`} />
                <Icon size={15} strokeWidth={1.5} className="group-hover:text-emerald-500 transition-colors duration-200" />
                <span className="flex-1 text-left group-hover:translate-x-0.5 transition-transform duration-200">{label}</span>
                {label === 'Notifications' && unread > 0 && (
                  <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{unread}</span>
                )}
              </button>
            )
          })}
        </nav>
        <div className={`p-3 border-t space-y-1 transition-colors duration-300 ${
          isLight ? 'border-zinc-200' : 'border-zinc-800/60'
        }`}>
          <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors duration-300 ${
            isLight ? 'border-zinc-200 bg-[#f4f4f5]' : 'border-zinc-800/60 bg-zinc-900/50'
          }`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${
              isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            }`}>{initials}</div>
            <div className="flex-1 min-w-0">
              <p className={`text-[12px] font-semibold truncate ${
                isLight ? 'text-slate-900' : 'text-slate-200'
              }`}>{user?.fullName}</p>
              <p className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Patient</p>
            </div>
          </div>
          <button onClick={() => { logout(); router.push('/login') }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 ${
              isLight 
                ? 'text-slate-505 hover:text-red-650 hover:bg-red-50' 
                : 'text-slate-500 hover:text-red-400 hover:bg-red-500/5'
            }`}>
            <LogOut size={15} strokeWidth={1.5} /><span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Navbar */}
        <header className={`h-14 border-b flex items-center justify-between px-6 flex-shrink-0 transition-colors duration-300 ${
          isLight ? 'bg-[#fafaf9] border-zinc-200' : 'bg-[#0a0a0c] border-zinc-800/60'
        }`}>
          <div>
            <p className={`text-[13px] font-semibold transition-colors duration-300 ${
              isLight ? 'text-slate-900' : 'text-slate-200'
            }`}>My Medical Dossier</p>
            <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Your complete, encrypted medical history.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { router.push('/patient/notifications'); setUnread(0) }}
              className={`relative w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 ${
                isLight 
                  ? 'hover:bg-slate-100 text-slate-650 hover:text-slate-900' 
                  : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bell size={15} strokeWidth={1.5} className={pulse ? 'animate-bounce text-emerald-500' : ''} />
              {unread > 0 && <span className="absolute top-1 right-1 min-w-[14px] h-[14px] bg-emerald-600 text-white text-[8px] font-medium rounded-full flex items-center justify-center px-0.5">{unread > 9 ? '9+' : unread}</span>}
            </button>
            <div className={`w-px h-5 ${isLight ? 'bg-zinc-200' : 'bg-zinc-800'}`} />
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold ${
              isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            }`}>{initials}</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {loading ? (
            <div className={`h-64 rounded-2xl border animate-pulse transition-colors duration-300 ${
              isLight ? 'bg-white border-slate-200' : 'bg-zinc-900/40 border-zinc-800/60'
            }`} />
          ) : (
            <>
              <div className="space-y-6">
              {/* Missing Phone Number Alert Banner */}
              {!dossier?.patient?.user?.phoneNumber && (
                <div className={`border rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-300 ${
                  isLight 
                    ? 'bg-amber-50/50 border-amber-250/70 text-amber-900' 
                    : 'bg-amber-500/5 border-amber-500/20 text-amber-300'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      <AlertTriangle size={18} strokeWidth={2} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">SMS Notifications Offline</h4>
                      <p className={`text-[12px] mt-1 leading-relaxed ${isLight ? 'text-amber-700/90' : 'text-amber-400/90'}`}>
                        You have not configured a phone number. A valid phone number is required to send you secure automated SMS alerts via Twilio when files/analyses are shared with doctors.
                      </p>
                    </div>
                  </div>
                  
                  {/* Inline Phone Form */}
                  <form onSubmit={handleUpdatePhone} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full md:w-auto">
                    <div className="relative flex-1 sm:w-48">
                      <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        placeholder="e.g. +17623800927"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className={`w-full py-2 pl-8 pr-3 text-xs rounded-lg outline-none border focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 ${
                          isLight 
                            ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400' 
                            : 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500'
                        }`}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={updatingPhone}
                      className={`flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg border transition-all cursor-pointer ${
                        isLight 
                          ? 'bg-amber-600 hover:bg-amber-700 text-white border-transparent' 
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20'
                      }`}
                    >
                      {updatingPhone ? 'Saving...' : 'Add Phone'}
                    </button>
                  </form>
                </div>
              )}

              {/* Dossier Card Container */}
              <div className={`border rounded-2xl overflow-hidden transition-colors duration-300 ${
                isLight ? 'bg-[#fafaf9] border-zinc-200 shadow-sm' : 'bg-[#121214] border-zinc-800/80'
              }`}>
              {/* Tabs */}
              <div className={`flex border-b transition-colors duration-300 ${
                isLight ? 'border-zinc-200' : 'border-zinc-800/60'
              }`}>
                {tabs.map(({ key, label, icon: Icon }) => (
                  <button key={key} onClick={() => setTab(key)}
                    className={`flex items-center gap-2 px-5 py-4 text-[13px] font-semibold border-b-2 transition-all duration-150 ${
                      tab === key 
                        ? 'border-emerald-500 text-emerald-650 font-bold' 
                        : 'border-transparent text-slate-500 hover:text-slate-350'
                    }`}
                  >
                    <Icon size={14} strokeWidth={1.5} />
                    {label}
                    <span className={`ml-0.5 text-[10px] px-1.5 py-0.5 rounded-md ${
                      isLight ? 'bg-slate-100 text-slate-600' : 'bg-black text-slate-400'
                    }`}>{dossier?.[key]?.length ?? 0}</span>
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className={`divide-y transition-colors duration-300 ${
                isLight ? 'divide-slate-100' : 'divide-slate-800/40'
              }`}>
                {dossier?.[tab]?.length === 0 ? (
                  <div className="p-12 text-center"><p className="text-[13px] text-slate-500">No {tab} yet</p></div>
                ) : dossier?.[tab]?.map((item) => (
                  <div key={item.id} className={`flex items-start justify-between px-6 py-4 transition-colors duration-200 ${
                    isLight ? 'hover:bg-slate-50/80' : 'hover:bg-slate-800/30'
                  }`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        tab === 'analyses' 
                          ? isLight ? 'bg-emerald-100/50' : 'bg-emerald-500/10'
                          : tab === 'prescriptions'
                            ? isLight ? 'bg-teal-100/50' : 'bg-teal-500/10'
                            : isLight ? 'bg-emerald-200/20' : 'bg-emerald-600/10'
                      }`}>
                        {tab === 'analyses'      && <FlaskConical size={15} strokeWidth={1.5} className="text-emerald-650" />}
                        {tab === 'prescriptions' && <Pill         size={15} strokeWidth={1.5} className="text-teal-650 animate-pulse" />}
                        {tab === 'diagnoses'     && <Stethoscope  size={15} strokeWidth={1.5} className="text-emerald-700" />}
                      </div>
                      <div>
                        <p className={`text-[13px] font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{item.analysisType || item.title || 'Prescription'}</p>
                        {item.summary      && <p className="text-[12px] text-slate-500 mt-0.5">{item.summary}</p>}
                        {item.notes        && <p className="text-[12px] text-slate-500 mt-0.5">{item.notes}</p>}
                        {item.instructions && <p className="text-[12px] text-slate-500 mt-0.5">{item.instructions}</p>}
                        {item.medications  && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {item.medications.map((m, i) => (
                              <span key={i} className={`text-[11px] px-2 py-0.5 rounded-md border ${
                                isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}>{m}</span>
                            ))}
                          </div>
                        )}
                        {item.doctor?.user?.fullName && <p className="text-[11px] text-slate-500 mt-1">Dr. {item.doctor.user.fullName}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(item.uploadedAt || item.issuedAt || item.diagnosedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openShareModal(item, tab)}
                          className={`flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                            isLight 
                              ? 'text-slate-700 hover:text-slate-805 bg-slate-50 hover:bg-slate-100 border-zinc-205 hover:border-zinc-300' 
                              : 'text-slate-300 hover:text-white bg-zinc-800/40 border border-zinc-700/60 hover:bg-zinc-850'
                          }`}
                        >
                          <Share2 size={12} strokeWidth={1.5} /> Secure Share
                        </button>
                        {item.fileUrl && (
                          <a href={'http://localhost:5000/' + item.fileUrl} target="_blank"
                            className={`flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                              isLight 
                                ? 'text-emerald-700 hover:text-emerald-800 bg-emerald-50 border-emerald-100 hover:border-emerald-250' 
                                : 'text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20'
                            }`}
                          >
                            <FileText size={12} strokeWidth={1.5} /> View File
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Secure Share / Grant Access Modal */}
            {isShareModalOpen && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                {/* Backdrop */}
                <div
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => setIsShareModalOpen(false)}
                />

                {/* Panel */}
                <div className={`relative w-full sm:max-w-md sm:mx-4 rounded-t-2xl sm:rounded-2xl shadow-2xl border transition-colors duration-300 ${
                  isLight ? 'bg-white border-zinc-200' : 'bg-[#111113] border-zinc-800'
                }`}>
                  {/* Header */}
                  <div className={`flex items-center justify-between px-6 pt-5 pb-4 border-b ${isLight ? 'border-zinc-100' : 'border-zinc-800'}`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isLight ? 'bg-emerald-50 border border-emerald-100' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                        <Share2 size={13} className="text-emerald-600" />
                      </div>
                      <div>
                        <h2 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>Secure Share</h2>
                        <p className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Authorize a doctor to view this item</p>
                      </div>
                    </div>
                    <button onClick={() => setIsShareModalOpen(false)} className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all duration-200 ${isLight ? 'border-zinc-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50' : 'border-zinc-800 text-slate-500 hover:text-slate-200 hover:bg-zinc-900'}`}>
                      <X size={14} />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="px-6 py-5 space-y-4">
                    {shareError && (
                      <div className={`text-xs rounded-xl px-4 py-3 border ${isLight ? 'bg-red-50 border-red-200 text-red-700' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                        {shareError}
                      </div>
                    )}

                    {/* Explanatory callout */}
                    <div className={`text-xs rounded-xl px-4 py-3.5 border flex items-start gap-2.5 leading-relaxed ${
                      isLight ? 'bg-emerald-50/50 border-emerald-100/80 text-emerald-800' : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400'
                    }`}>
                      <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <p>
                        <strong>Legal Notice:</strong> This action creates an <code className="font-mono bg-emerald-500/10 px-1 rounded text-emerald-600 font-semibold">AccessGrant</code> record in the database, securely granting this doctor legal permission to view this specific item from their account.
                      </p>
                    </div>

                    {/* File Info */}
                    <div className={`border rounded-xl p-3 ${isLight ? 'bg-[#f4f4f5] border-zinc-150' : 'bg-black/40 border-zinc-800/40'}`}>
                      <p className={`text-[9px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-455' : 'text-slate-555'}`}>Item Selected</p>
                      <p className={`text-xs font-semibold mt-1 truncate ${isLight ? 'text-slate-800' : 'text-slate-205'}`}>
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

                    {/* Doctor Dropdown */}
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        Select Verified Doctor
                      </label>
                      {loadingDoctors ? (
                        <div className={`w-full py-2.5 px-3.5 text-xs rounded-xl border animate-pulse ${
                          isLight ? 'bg-[#f4f4f5] border-slate-200 text-slate-400' : 'bg-zinc-900 border-zinc-700 text-zinc-500'
                        }`}>
                          Fetching verified medical staff...
                        </div>
                      ) : doctors.length === 0 ? (
                        <div className={`text-xs rounded-xl px-4 py-3 border ${isLight ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                          No verified doctors are currently active in the platform.
                        </div>
                      ) : (
                        <div className="relative">
                          <select
                            value={selectedDoctorId}
                            onChange={(e) => setSelectedDoctorId(e.target.value)}
                            className={`w-full py-2.5 px-3.5 pr-10 text-sm rounded-xl outline-none border focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 appearance-none ${
                              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-900 border-zinc-700 text-white'
                            }`}
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
                  </div>

                  {/* Footer */}
                  <div className={`flex gap-2.5 px-6 pb-5 pt-2`}>
                    <button
                      onClick={() => setIsShareModalOpen(false)}
                      className={`flex-1 py-2.5 text-sm font-semibold rounded-xl border transition-all duration-200 ${
                        isLight ? 'border-zinc-200 text-slate-600 hover:bg-slate-50' : 'border-zinc-700 text-slate-400 hover:bg-zinc-900'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmShare}
                      disabled={sharingInProgress || !selectedDoctorId || doctors.length === 0}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-200 disabled:opacity-60 shadow-sm hover:shadow-md hover:shadow-emerald-500/20 cursor-pointer"
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

            {/* Toast Notifications */}
            <div className="fixed top-5 right-5 z-55 space-y-2 pointer-events-none">
              {toasts.map((t) => (
                <div
                  key={t.id}
                  className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg transition-all duration-305 ${
                    isLight 
                      ? 'bg-white border-slate-205 text-slate-800 shadow-slate-100' 
                      : 'bg-zinc-900 border-zinc-800 text-slate-100 shadow-black'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                    <ShieldCheck size={14} />
                  </div>
                  <p className="text-xs font-semibold">{t.message}</p>
                  <button
                    onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
                    className="text-slate-400 hover:text-slate-600 hover:scale-105 shrink-0 ml-2 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>

            </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
