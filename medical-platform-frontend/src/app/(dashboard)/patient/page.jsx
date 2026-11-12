'use client'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'
import api from '@/lib/api'
import { getSocket } from '@/lib/socket'
import { useRouter } from 'next/navigation'
import {
  Activity, Search, ShieldAlert, ShieldCheck, User, FileText, Pill, Stethoscope, LogOut, LayoutDashboard, Users, X, Check, Inbox, FolderOpen, Bell, FlaskConical, LockKeyhole, Copy, Download, Clock, Share2, Sun, Moon, Pencil, Droplets, Calendar, AlertTriangle, Save, Phone
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard',     path: '/patient',               icon: LayoutDashboard },
  { label: 'My dossier',    path: '/patient/dossier',       icon: FolderOpen },
  { label: 'Access',        path: '/patient/access',        icon: ShieldCheck },
  { label: 'Notifications', path: '/patient/notifications', icon: Bell },
  { label: 'Book Appointment', path: '/patient/doctors',            icon: Calendar },
]

export default function PatientDashboard() {
  const user   = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()

  const [dossier,       setDossier]       = useState(null)
  const [notifications, setNotifications] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [copied,        setCopied]        = useState(false)
  const [responding,    setResponding]    = useState(null)
  const [unread,        setUnread]        = useState(0)
  const [pulse,         setPulse]         = useState(false)
  const [theme,         setTheme]         = useState('light')

  // Edit Profile modal state
  const [editOpen,      setEditOpen]      = useState(false)
  const [editForm,      setEditForm]      = useState({ dateOfBirth: '', bloodType: '', allergies: [], phoneNumber: '' })
  const [editAllergy,   setEditAllergy]   = useState('')
  const [editSaving,    setEditSaving]    = useState(false)
  const [editError,     setEditError]     = useState('')

  const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

  const loadDashboardData = async () => {
    try {
      const [dossierRes, notifRes] = await Promise.all([
        api.get('/dossier/me'),
        api.get('/notifications')
      ])
      setDossier(dossierRes.data)
      setNotifications(notifRes.data.slice(0, 3))
      setUnread(notifRes.data.filter((n) => !n.isRead).length)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const handleSync = () => {
      const savedTheme = localStorage.getItem('dossier-theme') || 'light'
      setTheme(savedTheme)
    }
    window.addEventListener('themechange', handleSync)
    handleSync()
    
    loadDashboardData()
    const socket = getSocket()
    socket.on('notification', (n) => {
      setNotifications((prev) => [n, ...prev].slice(0, 3))
      setUnread((prev) => prev + 1)
      setPulse(true)
      setTimeout(() => setPulse(false), 3000)
    })
    return () => {
      socket.off('notification')
      window.removeEventListener('themechange', handleSync)
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('dossier-theme', newTheme)
    window.dispatchEvent(new Event('themechange'))
  }

  const copyId = () => {
    if (!dossier?.patientId) return
    navigator.clipboard.writeText(dossier.patientId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const revokeAccess = async (grantId) => {
    if (!confirm('Are you sure you want to revoke this access?')) return
    setResponding(grantId)
    try {
      await api.put('/dossier/access/' + grantId + '/revoke')
      await loadDashboardData()
    } catch (err) { console.error(err) }
    finally { setResponding(null) }
  }

  // ── Edit Profile helpers ────────────────────────────────
  const openEditProfile = () => {
    const p = dossier?.patient
    setEditForm({
      dateOfBirth: p?.dateOfBirth ? new Date(p.dateOfBirth).toISOString().split('T')[0] : '',
      bloodType:   p?.bloodType   || '',
      allergies:   p?.allergies   ? [...p.allergies] : [],
      phoneNumber: p?.user?.phoneNumber || '',
    })
    setEditError('')
    setEditOpen(true)
  }

  const addEditAllergy = (val) => {
    const t = val.trim()
    if (t && !editForm.allergies.includes(t)) {
      setEditForm((f) => ({ ...f, allergies: [...f.allergies, t] }))
    }
    setEditAllergy('')
  }

  const removeEditAllergy = (tag) => {
    setEditForm((f) => ({ ...f, allergies: f.allergies.filter((a) => a !== tag) }))
  }

  const saveProfile = async () => {
    setEditSaving(true)
    setEditError('')
    try {
      await api.put('/dossier/profile', {
        dateOfBirth: editForm.dateOfBirth || null,
        bloodType:   editForm.bloodType   || null,
        allergies:   editForm.allergies,
        phoneNumber: editForm.phoneNumber || null,
      })
      setEditOpen(false)
      await loadDashboardData()
    } catch (err) {
      setEditError(err.response?.data?.error || 'Failed to save. Please try again.')
    } finally {
      setEditSaving(false)
    }
  }

  const downloadPDF = () => {
    const token = localStorage.getItem('token')
    fetch('http://localhost:5000/dossier/download/pdf', {
      headers: { Authorization: 'Bearer ' + token }
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const a   = document.createElement('a')
        a.href = url; a.download = 'medical-dossier.pdf'; a.click()
        URL.revokeObjectURL(url)
      })
      .catch(console.error)
  }

  const approvedGrants = dossier?.accessGrants?.filter((g) => g.status === 'APPROVED') || []

  const timelineEvents = []
  if (dossier?.analyses)      dossier.analyses.forEach((a)      => timelineEvents.push({ id: 'a-' + a.id, title: 'New ' + a.analysisType + ' uploaded', date: new Date(a.uploadedAt),  color: 'text-emerald-450', bg: 'bg-emerald-500/10' }))
  if (dossier?.prescriptions) dossier.prescriptions.forEach((p) => timelineEvents.push({ id: 'p-' + p.id, title: 'Prescription added',                    date: new Date(p.issuedAt),    color: 'text-emerald-455', bg: 'bg-emerald-500/10' }))
  if (dossier?.diagnoses)     dossier.diagnoses.forEach((d)     => timelineEvents.push({ id: 'd-' + d.id, title: 'Diagnosis: ' + d.title,                date: new Date(d.diagnosedAt), color: 'text-teal-450',    bg: 'bg-teal-500/10' }))
  const recentTimeline = timelineEvents.sort((a, b) => b.date - a.date).slice(0, 4)

  const buildChartData = () => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      months.push({
        month: d.toLocaleDateString('en-GB', { month: 'short' }),
        year:  d.getFullYear(),
        num:   d.getMonth(),
        value: 0,
      })
    }
    const allEvents = [
      ...(dossier?.analyses      || []).map((a) => new Date(a.uploadedAt)),
      ...(dossier?.prescriptions || []).map((p) => new Date(p.issuedAt)),
      ...(dossier?.diagnoses     || []).map((d) => new Date(d.diagnosedAt)),
    ]
    allEvents.forEach((date) => {
      const m = months.find((mo) => mo.num === date.getMonth() && mo.year === date.getFullYear())
      if (m) m.value++
    })
    return months
  }

  const chartData = dossier ? buildChartData() : []
  const maxVal    = Math.max(...chartData.map((d) => d.value), 4)
  const initials  = user?.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  const getAge = (dobString) => {
    if (!dobString) return '—'
    const dob = new Date(dobString)
    if (isNaN(dob.getTime())) return '—'
    const diffMs = Date.now() - dob.getTime()
    const ageDate = new Date(diffMs)
    return Math.abs(ageDate.getUTCFullYear() - 1970) + ' y/o'
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Pre-calculate line chart coordinate points
  const points = chartData.map((d, i) => {
    const x = 50 + i * 80
    const y = 90 - (d.value / maxVal) * 70
    return { x, y, ...d }
  })

  const linePath = points.length > 0 
    ? `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}` 
    : ''

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`
    : ''

  const isLight = theme === 'light'

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 ${
      isLight ? 'bg-[#f4f4f5] text-slate-800' : 'bg-black text-slate-200'
    } selection:bg-emerald-500/30`}>

      {/* Clinical Sidebar */}
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
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 hover:border-slate-200 border-transparent font-normal' 
                      : 'text-slate-500 hover:text-slate-200 hover:bg-zinc-900 hover:border-zinc-800/40 border-transparent font-normal'
                }`}
              >
                {/* Visual Accent bar on hover/active */}
                <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500 rounded-r transition-transform duration-300 ${active ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100'}`} />
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

      {/* Main Container */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Clinical Navbar */}
        <header className={`h-14 border-b flex items-center justify-between px-6 flex-shrink-0 transition-colors duration-300 ${
          isLight ? 'bg-[#fafaf9] border-zinc-200' : 'bg-[#0a0a0c] border-zinc-800/60'
        }`}>
          <div>
            <p className={`text-[13px] font-semibold transition-colors duration-300 ${
              isLight ? 'text-slate-900' : 'text-slate-200'
            }`}>Patient Workspace</p>
            <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Welcome, {user?.fullName?.split(' ')[0]}</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Theme Toggle Light Switch */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Light/Dark Theme"
              className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all duration-300 ${
                isLight 
                  ? 'border-zinc-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900' 
                  : 'border-zinc-800/60 hover:bg-zinc-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {isLight ? <Moon size={15} strokeWidth={1.8} /> : <Sun size={15} strokeWidth={1.8} />}
            </button>

            <button
              onClick={() => { router.push('/patient/notifications'); setUnread(0) }}
              className={`relative w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 ${
                isLight 
                  ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900' 
                  : 'hover:bg-zinc-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bell size={15} strokeWidth={1.5} className={pulse ? 'animate-bounce text-emerald-500' : ''} />
              {unread > 0 && (
                <>
                  <span className="absolute top-1 right-1 min-w-[14px] h-[14px] bg-emerald-600 text-white text-[8px] font-medium rounded-full flex items-center justify-center px-0.5">
                    {unread > 9 ? '9+' : unread}
                  </span>
                  {pulse && <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full animate-ping opacity-60" />}
                </>
              )}
            </button>
            <div className={`w-px h-5 ${isLight ? 'bg-zinc-200' : 'bg-zinc-800'}`} />
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold ${
              isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            }`}>{initials}</div>
          </div>
        </header>

        {/* Split-Pane Clinical Workspace */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {loading ? (
            <div className={`max-w-7xl mx-auto h-[70vh] rounded-2xl border animate-pulse flex items-center justify-center transition-colors duration-300 ${
              isLight ? 'bg-[#fafaf9] border-zinc-200' : 'bg-zinc-900/40 border-zinc-800/60'
            }`}>
              <p className="text-slate-505 text-xs font-semibold tracking-widest uppercase">Initializing Medical Environment...</p>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-6">
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
                  <button
                    onClick={openEditProfile}
                    className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl border transition-all flex-shrink-0 cursor-pointer ${
                      isLight 
                        ? 'bg-amber-600 hover:bg-amber-750 text-white border-transparent' 
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20'
                    }`}
                  >
                    <Phone size={13} /> Configure Phone Number
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* LEFT COLUMN: Patient Chart & Security Identity (Permanent Pane) */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* Unified Patient Card */}
                <div className={`border rounded-2xl p-6 relative overflow-hidden transition-all duration-300 ${
                  isLight ? 'bg-[#fafaf9] border-zinc-200 shadow-sm' : 'bg-[#121214] border-zinc-800/80'
                }`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                  
                  {/* Identity Header */}
                  <div className="flex items-center gap-4 relative z-10 w-full">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-sm flex-shrink-0 ${
                      isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    }`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono tracking-wider text-emerald-600 uppercase font-bold">PATIENT RECORD</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <h1 className={`text-xl font-bold mt-0.5 tracking-tight transition-colors duration-300 ${
                        isLight ? 'text-slate-900' : 'text-slate-100'
                      }`}>{user?.fullName}</h1>
                    </div>
                    <button
                      onClick={openEditProfile}
                      title="Edit medical profile"
                      className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95 ${
                        isLight ? 'border-zinc-200 hover:border-emerald-400 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600' : 'border-zinc-700 hover:border-emerald-500/60 hover:bg-emerald-500/10 text-slate-500 hover:text-emerald-400'
                      }`}
                    >
                      <Pencil size={13} strokeWidth={2} />
                    </button>
                  </div>


                  {/* Core Clinical Vitals Stack */}
                  <div className={`mt-6 pt-5 border-t space-y-3.5 transition-colors duration-300 ${
                    isLight ? 'border-zinc-100' : 'border-zinc-800/60'
                  }`}>
                    {[
                      { label: 'Date of Birth', value: dossier?.patient?.dateOfBirth ? formatDate(dossier.patient.dateOfBirth) : 'Not specified', mono: false },
                      { label: 'Age Summary', value: dossier?.patient?.dateOfBirth ? getAge(dossier.patient.dateOfBirth) : '—', mono: false },
                      { label: 'Phone Number (SMS Alerts)', value: dossier?.patient?.user?.phoneNumber || 'None configured (No SMS Alerts)', mono: true, colorClass: dossier?.patient?.user?.phoneNumber ? (isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-semibold') : '' },
                      { label: 'Verified Blood Type', value: dossier?.patient?.bloodType || 'Not verified', mono: true, colorClass: isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-semibold' },
                      { label: 'Allergy Declarations', value: dossier?.patient?.allergies && dossier.patient.allergies.length > 0 ? dossier.patient.allergies.join(', ') : 'None declared', mono: false, title: dossier?.patient?.allergies?.join(', ') }
                    ].map((item, idx) => (
                      <div key={idx} className={`border rounded-xl p-3 transition-all duration-300 group cursor-default ${
                        isLight 
                          ? 'bg-[#f4f4f5] border-zinc-150 hover:bg-[#fafaf9] hover:border-zinc-250' 
                          : 'bg-black/40 border-transparent hover:border-zinc-800/40 hover:bg-black/85'
                      }`}>
                        <p className={`text-[9px] uppercase tracking-wider font-bold transition-colors duration-300 ${
                          isLight ? 'text-slate-405 group-hover:text-slate-500' : 'text-slate-500 group-hover:text-slate-400'
                        }`}>{item.label}</p>
                        <p className={`text-xs font-semibold mt-1 truncate ${
                          item.colorClass || (isLight ? 'text-slate-800' : 'text-slate-200')
                        } ${item.mono ? 'font-mono' : ''}`} title={item.title}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* PDF Download Trigger */}
                  <button onClick={downloadPDF} className={`mt-5 w-full flex items-center justify-center gap-2 text-xs font-semibold py-2.5 rounded-xl transition-all duration-200 active:scale-[0.98] border ${
                    isLight 
                      ? 'bg-[#f4f4f5] hover:bg-slate-200/65 border-zinc-205 hover:border-zinc-350 text-slate-700' 
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800/60 hover:border-emerald-500/40 text-slate-200'
                  }`}>
                    <Download size={13} /> Export Clinical Dossier (PDF)
                  </button>
                </div>

                {/* Share Access Key Card */}
                <div className={`border rounded-2xl p-6 relative overflow-hidden transition-colors duration-300 ${
                  isLight ? 'bg-[#fafaf9] border-zinc-200 shadow-sm' : 'bg-[#121214] border-zinc-800/80'
                }`}>
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                  
                  <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${
                    isLight ? 'text-slate-400' : 'text-slate-500'
                  }`}>Dossier Authorization Key</p>
                  <h2 className={`text-xs font-semibold mb-3.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>Patient Share ID</h2>
                  <p className={`text-xs mb-4 leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Share this private key with doctors or labs to grant permissions to upload analyses or write care prescriptions.</p>
                  
                  <div onClick={copyId} className={`flex items-center justify-between border active:scale-[0.98] rounded-xl p-3 cursor-pointer transition-all duration-300 group ${
                    isLight 
                      ? 'bg-[#f4f4f5] border-zinc-200 hover:border-emerald-450/60 hover:bg-emerald-50/10 hover:shadow-[0_2px_10px_rgba(16,185,129,0.04)]' 
                      : 'bg-black border-zinc-850 hover:border-emerald-500/40 hover:bg-[#08080a] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]'
                  }`}>
                    <span className={`font-mono text-xs tracking-wider truncate mr-3 ${
                      isLight ? 'text-emerald-700' : 'text-emerald-100'
                    }`}>{dossier?.patientId || 'LOADING...'}</span>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isLight ? 'bg-white border border-slate-200 text-slate-400 group-hover:text-slate-650' : 'bg-slate-800/50 text-slate-400 group-hover:text-slate-200'
                    }`}>
                      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </div>
                  </div>
                  
                  <div className={`mt-4 pt-3 border-t flex items-center justify-between transition-colors duration-300 ${
                    isLight ? 'border-zinc-100' : 'border-zinc-800/40'
                  }`}>
                    <span className={`text-[10px] flex items-center gap-1.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                      <LockKeyhole size={11} className="text-emerald-500" /> Secure identity token
                    </span>
                    {copied && <span className="text-[10px] text-emerald-605 font-semibold animate-pulse">Copied!</span>}
                  </div>
                </div>

                {/* Authorized Medical Staff Panel */}
                <div className={`border rounded-2xl p-6 transition-colors duration-300 ${
                  isLight ? 'bg-[#fafaf9] border-zinc-200 shadow-sm' : 'bg-[#121214] border-zinc-800/80'
                }`}>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Users size={15} className={isLight ? 'text-slate-400' : 'text-slate-400'} />
                      <h2 className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Authorized Doctors</h2>
                    </div>
                    <span onClick={() => router.push('/patient/access')} className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer hover:underline">Manage</span>
                  </div>

                  {approvedGrants.length === 0 ? (
                    <div className={`py-8 text-center border border-dashed rounded-xl transition-colors duration-300 ${
                      isLight ? 'border-zinc-200 bg-slate-50/50' : 'border-zinc-800/40 bg-zinc-900/10'
                    }`}>
                      <p className="text-xs text-slate-450">No active doctors authorized.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {approvedGrants.slice(0, 3).map((grant) => (
                        <div key={grant.id} className={`flex items-center justify-between gap-3 text-xs border rounded-xl p-3 transition-all duration-300 group/doc ${
                          isLight 
                            ? 'bg-[#f4f4f5] border-zinc-200 hover:border-zinc-300 hover:bg-[#fafaf9]' 
                            : 'bg-black/40 border-zinc-850/50 hover:border-zinc-700/50 hover:bg-[#0c0c0e]'
                        }`}>
                          <div className="min-w-0 flex-1">
                            <p className={`font-semibold truncate text-[12.5px] transition-colors duration-200 ${
                              isLight ? 'text-slate-800 group-hover/doc:text-slate-955' : 'text-slate-200 group-hover/doc:text-white'
                            }`}>Dr. {grant.doctor?.user?.fullName}</p>
                            <p className={`text-[10px] truncate mt-0.5 transition-colors duration-200 ${
                              isLight ? 'text-slate-450 group-hover/doc:text-slate-600' : 'text-slate-550 group-hover/doc:text-slate-400'
                            }`}>{grant.doctor?.user?.email}</p>
                          </div>
                          <button
                            onClick={() => revokeAccess(grant.id)}
                            disabled={responding === grant.id}
                            className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-all duration-200 active:scale-95 shrink-0 ${
                              isLight 
                                ? 'text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent' 
                                : 'text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20'
                            }`}
                          >
                            {responding === grant.id ? '...' : 'Revoke'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className={`mt-5 pt-4 border-t flex justify-between items-center text-[10px] transition-colors duration-300 ${
                    isLight ? 'border-zinc-100 text-slate-500' : 'border-zinc-800/40 text-slate-500'
                  }`}>
                    <span>Authorized staff count:</span>
                    <span className="font-bold text-emerald-600">{approvedGrants.length}</span>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: Clinical Workspace (Dynamic Charts, Tables, and Ledger logs) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Telemetry Overview & Stats Header */}
                <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Lab Analyses',  value: dossier?.analyses?.length ?? 0,      icon: FlaskConical, color: isLight ? 'text-emerald-600' : 'text-emerald-400', border: isLight ? 'border-emerald-200/60' : 'border-emerald-500/20', bg: isLight ? 'bg-emerald-50' : 'bg-emerald-500/5' },
                    { label: 'Prescriptions', value: dossier?.prescriptions?.length ?? 0, icon: Pill,         color: isLight ? 'text-emerald-600' : 'text-emerald-400', border: isLight ? 'border-emerald-200/60' : 'border-emerald-500/20', bg: isLight ? 'bg-emerald-50' : 'bg-emerald-500/5' },
                    { label: 'Diagnoses',     value: dossier?.diagnoses?.length ?? 0,     icon: Stethoscope,  color: isLight ? 'text-emerald-600' : 'text-emerald-400', border: isLight ? 'border-emerald-200/60' : 'border-emerald-500/20', bg: isLight ? 'bg-emerald-50' : 'bg-emerald-500/5' },
                  ].map((stat, i) => (
                    <div key={i} className={`border rounded-2xl p-4.5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 ease-out group cursor-pointer ${
                      isLight 
                        ? 'bg-[#fafaf9] border-zinc-200 hover:border-emerald-300' 
                        : 'bg-[#121214] border-zinc-800/80 hover:border-emerald-500/50 hover:shadow-emerald-500/5'
                    }`}>
                      <div className="flex justify-between items-center mb-2.5">
                        <p className={`text-[9.5px] font-bold uppercase tracking-widest group-hover:text-emerald-650 transition-colors duration-300 ${
                          isLight ? 'text-slate-400' : 'text-slate-505'
                        }`}>{stat.label}</p>
                        <div className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center border transition-all duration-305 group-hover:scale-105 ${stat.border} ${stat.bg} ${stat.color}`}>
                          <stat.icon size={14} strokeWidth={2} />
                        </div>
                      </div>
                      <p className={`text-2xl font-mono font-semibold tracking-tight transition-colors duration-300 ${
                        isLight ? 'text-slate-900 group-hover:text-emerald-700' : 'text-slate-100 group-hover:text-white'
                      }`}>{stat.value}</p>
                    </div>
                  ))}
                </section>

                {/* Telemetry Line Chart */}
                <div className={`border rounded-2xl p-6 flex flex-col justify-between transition-colors duration-300 ${
                  isLight ? 'bg-[#fafaf9] border-zinc-200 shadow-sm' : 'bg-[#121214] border-zinc-800/80'
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <Activity size={16} className="text-emerald-600" />
                        <h2 className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Medical Activity Timeline</h2>
                      </div>
                      <span className={`text-[10px] font-mono border px-2.5 py-1 rounded-lg transition-colors duration-300 ${
                        isLight ? 'bg-[#f4f4f5] border-zinc-200 text-slate-500' : 'bg-black border-zinc-850/80 text-slate-500'
                      }`}>Telemetry - 6 Months</span>
                    </div>

                    {/* Line Chart */}
                    <div className="relative w-full h-44 mt-4">
                      <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chart-fade" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Grid Lines */}
                        <line x1="40" y1="20" x2="460" y2="20" stroke={isLight ? '#e2e8f0' : '#1e293b'} strokeDasharray="3,3" />
                        <line x1="40" y1="60" x2="460" y2="60" stroke={isLight ? '#e2e8f0' : '#1e293b'} strokeDasharray="3,3" />
                        <line x1="40" y1="100" x2="460" y2="100" stroke={isLight ? '#cbd5e1' : '#1e293b'} opacity={isLight ? 0.7 : 0.5} />

                        {/* Y-Axis Labels */}
                        <text x="20" y="24" fill={isLight ? '#94a3b8' : '#475569'} fontSize="8" fontFamily="monospace" textAnchor="end">{maxVal}</text>
                        <text x="20" y="64" fill={isLight ? '#94a3b8' : '#475569'} fontSize="8" fontFamily="monospace" textAnchor="end">{Math.round(maxVal * 0.5)}</text>
                        <text x="20" y="104" fill={isLight ? '#94a3b8' : '#475569'} fontSize="8" fontFamily="monospace" textAnchor="end">0</text>

                        {points.length > 0 && (
                          <>
                            {/* Area under the line */}
                            <path d={areaPath} fill="url(#chart-fade)" />
                            
                            {/* The line itself */}
                            <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" />

                            {/* Interactive Hover Indicators */}
                            {points.map((p, idx) => (
                              <g key={idx} className="group/node">
                                {/* Wide hover block */}
                                <rect
                                  x={p.x - 20}
                                  y="10"
                                  width="40"
                                  height="90"
                                  fill="white"
                                  opacity="0"
                                  className="cursor-pointer hover:opacity-[0.02] transition-opacity duration-205"
                                />
                                {/* Vertical indicator line shown on hover */}
                                <line
                                  x1={p.x}
                                  y1="20"
                                  x2={p.x}
                                  y2="100"
                                  stroke="#10b981"
                                  strokeWidth="1"
                                  strokeDasharray="2,2"
                                  opacity="0"
                                  className="group-hover/node:opacity-50 transition-opacity duration-200 pointer-events-none"
                                />
                                {/* Pulsing indicator node */}
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="4.5"
                                  fill="#34d399"
                                  stroke={isLight ? '#fafaf9' : '#121214'}
                                  strokeWidth="2"
                                  className="cursor-pointer group-hover/node:r-6 group-hover/node:fill-white group-hover/node:stroke-emerald-500 transition-all duration-200"
                                />
                              </g>
                            ))}
                          </>
                        )}
                      </svg>

                      {/* X-Axis Labels below the SVG */}
                      <div className="flex justify-between pl-[40px] pr-[30px] mt-2">
                        {chartData.map((d, idx) => (
                          <span key={idx} className={`text-[10px] font-mono transition-colors ${
                            isLight ? 'text-slate-405 hover:text-slate-700' : 'text-slate-500 hover:text-slate-300'
                          }`}>
                            {d.month}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Chart Legend */}
                  <div className={`flex items-center gap-4 mt-6 pt-4 border-t transition-colors duration-300 ${
                    isLight ? 'border-zinc-100' : 'border-zinc-800/40'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-emerald-550" style={{ backgroundColor: '#10b981' }} />
                      <span className={`text-[10px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Activity frequency (files, prescriptions, diagnoses)</span>
                    </div>
                    <span className={`ml-auto text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>Total events: {(dossier?.analyses?.length ?? 0) + (dossier?.prescriptions?.length ?? 0) + (dossier?.diagnoses?.length ?? 0)}</span>
                  </div>
                </div>

                {/* Laboratory Findings Ledger */}
                <div className={`border rounded-2xl p-6 shadow-sm transition-colors duration-300 ${
                  isLight ? 'bg-[#fafaf9] border-zinc-200' : 'bg-[#121214] border-zinc-800/80'
                }`}>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <FlaskConical size={16} className="text-emerald-600" />
                      <h2 className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Recent Laboratory Analyses</h2>
                    </div>
                    <span onClick={() => router.push('/patient/dossier')} className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-755 cursor-pointer hover:underline">View All</span>
                  </div>

                  {dossier?.analyses?.length === 0 ? (
                    <div className={`py-12 text-center border border-dashed rounded-xl transition-colors duration-300 ${
                      isLight ? 'border-zinc-200 bg-slate-50/50' : 'border-zinc-800/80 bg-slate-900/10'
                    }`}>
                      <p className="text-xs text-slate-400">No laboratory analyses have been logged in your dossier yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className={`border-b font-semibold transition-colors duration-300 ${
                            isLight ? 'border-zinc-150 text-slate-400' : 'border-zinc-800/60 text-slate-505'
                          }`} style={{ color: isLight ? '#94a3b8' : '#64748b' }}>
                            <th className="pb-3 pl-3 font-semibold text-[10px] uppercase tracking-wider">Test / Analysis</th>
                            <th className="pb-3 font-semibold text-[10px] uppercase tracking-wider">Filing Lab</th>
                            <th className="pb-3 font-semibold text-[10px] uppercase tracking-wider">Date Uploaded</th>
                            <th className="pb-3 font-semibold text-[10px] uppercase tracking-wider">Priority</th>
                            <th className="pb-3 text-right pr-3 font-semibold text-[10px] uppercase tracking-wider">File</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y transition-colors duration-300 ${
                          isLight ? 'divide-slate-100' : 'divide-slate-800/30'
                        }`}>
                          {dossier.analyses.slice(0, 3).map((a) => (
                            <tr key={a.id} className={`border-b border-transparent transition-all duration-200 group/row ${
                              isLight ? 'hover:bg-slate-50/80 hover:border-zinc-200/60' : 'hover:bg-zinc-900/40 hover:border-zinc-800/40'
                            }`}>
                              <td className={`py-3.5 pl-3 font-semibold transition-colors duration-200 rounded-l-xl ${
                                isLight ? 'text-slate-800 group-hover/row:text-slate-950' : 'text-slate-200 group-hover/row:text-white'
                              }`}>{a.analysisType}</td>
                              <td className={`py-3.5 transition-colors duration-200 ${
                                isLight ? 'text-slate-505 group-hover/row:text-slate-700' : 'text-slate-404 group-hover/row:text-slate-300'
                              }`}>{a.lab?.labName || 'Associated Lab'}</td>
                              <td className={`py-3.5 font-mono transition-colors duration-200 ${
                                isLight ? 'text-slate-400 group-hover/row:text-slate-500' : 'text-slate-500 group-hover/row:text-slate-400'
                              }`}>{formatDate(a.uploadedAt)}</td>
                              <td className="py-3.5">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                  a.priority === 'CRITICAL' ? 'bg-red-500/10 border-red-500/20 text-red-500 animate-pulse' :
                                  a.priority === 'URGENT' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                                  isLight ? 'bg-slate-100 border-slate-200 text-slate-650' : 'bg-slate-800/40 border-slate-700/50 text-slate-450'
                                } group-hover/row:scale-102 transition-all duration-205`}>
                                  {a.priority}
                                </span>
                              </td>
                              <td className="py-3.5 pr-3 text-right rounded-r-xl">
                                {a.fileUrl ? (
                                  <a
                                    href={'http://localhost:5000/' + a.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-all duration-205"
                                  >
                                    <Download size={12} /> View File
                                  </a>
                                ) : (
                                  <span className="text-slate-450">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Prescriptions & Care Plan and Security logs grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Active Prescriptions Cards */}
                  <div className={`border rounded-2xl p-6 shadow-sm flex flex-col justify-between transition-colors duration-300 ${
                    isLight ? 'bg-[#fafaf9] border-zinc-200' : 'bg-[#121214] border-zinc-800/80'
                  }`}>
                    <div>
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2.5">
                          <Pill size={16} className="text-emerald-600" />
                          <h2 className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Prescriptions & Plan</h2>
                        </div>
                        <span onClick={() => router.push('/patient/dossier')} className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-755 cursor-pointer hover:underline">View All</span>
                      </div>

                      {dossier?.prescriptions?.length === 0 ? (
                        <div className={`py-8 text-center border border-dashed rounded-xl transition-colors duration-300 ${
                          isLight ? 'border-zinc-200 bg-slate-50/50' : 'border-zinc-800/40 bg-zinc-900/10'
                        }`}>
                          <p className="text-xs text-slate-400">No prescriptions logged.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {dossier.prescriptions.slice(0, 2).map((p) => (
                            <div key={p.id} className={`border rounded-xl p-3.5 flex flex-col justify-between transition-all duration-300 group/card ${
                              isLight 
                                ? 'bg-[#f4f4f5] border-zinc-200 hover:border-zinc-300 hover:bg-[#fafaf9]/60' 
                                : 'bg-black/50 border-zinc-800/80 hover:border-zinc-700/50 hover:bg-[#0c0c0e]'
                            }`}>
                              <div>
                                <div className="flex justify-between items-center gap-3">
                                  <span className={`text-[9.5px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wide ${
                                    isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  }`}>Medication</span>
                                  <span className={`text-[9.5px] font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{formatDate(p.issuedAt)}</span>
                                </div>
                                <p className={`text-xs font-bold mt-2 truncate group-hover/card:text-emerald-700 transition-colors duration-250 ${
                                  isLight ? 'text-slate-800' : 'text-slate-200'
                                }`}>{p.medications?.join(', ')}</p>
                                <p className={`text-[11px] mt-0.5 leading-relaxed line-clamp-1 transition-colors duration-250 ${
                                  isLight ? 'text-slate-500 group-hover/card:text-slate-750' : 'text-slate-404 group-hover/card:text-slate-300'
                                }`}>{p.instructions || 'No details'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timeline Logs */}
                  <div className={`border rounded-2xl p-6 shadow-sm transition-colors duration-300 ${
                    isLight ? 'bg-[#fafaf9] border-zinc-200' : 'bg-[#121214] border-zinc-800/80'
                  }`}>
                    <div className="flex items-center gap-2.5 mb-5">
                      <Clock size={16} className={isLight ? 'text-slate-400' : 'text-slate-450'} />
                      <h2 className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Security Audit Log</h2>
                    </div>

                    {recentTimeline.length === 0 ? (
                      <div className="py-8 text-center"><p className="text-xs text-slate-400">No audit records.</p></div>
                    ) : (
                      <div className="space-y-3">
                        {recentTimeline.slice(0, 3).map((event) => (
                          <div key={event.id} className={`flex gap-2.5 items-start text-xs group/timeline p-1.5 rounded-lg border border-transparent transition-all duration-300 ${
                            isLight ? 'hover:bg-[#f4f4f5] hover:border-zinc-200' : 'hover:bg-black/20 hover:border-zinc-800/40'
                          }`}>
                            <div className={`mt-1.5 w-1.5 h-1.5 rounded-full border ring-2 shrink-0 ${
                              isLight 
                                ? 'bg-slate-100 border-zinc-300 ring-slate-100' 
                                : 'bg-zinc-850 border-zinc-700 ring-zinc-900/30'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium truncate text-[11px] transition-colors duration-200 ${
                                isLight ? 'text-slate-700 group-hover/timeline:text-slate-900' : 'text-slate-300 group-hover/timeline:text-white'
                              }`}>{event.title}</p>
                              <p className={`text-[9.5px] font-mono mt-0.5 transition-colors duration-200 ${
                                isLight ? 'text-slate-400 group-hover/timeline:text-slate-500' : 'text-slate-500 group-hover/timeline:text-slate-400'
                              }`}>
                                {event.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

              </div>

            </div>
          </div>
          )}
        </main>
      </div>

      {/* ── Edit Profile Modal ──────────────────────────────── */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setEditOpen(false)}
          />

          {/* Panel */}
          <div className={`relative w-full sm:max-w-md sm:mx-4 rounded-t-2xl sm:rounded-2xl shadow-2xl border transition-colors duration-300 ${
            isLight ? 'bg-white border-zinc-200' : 'bg-[#111113] border-zinc-800'
          }`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-6 pt-5 pb-4 border-b ${isLight ? 'border-zinc-100' : 'border-zinc-800'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isLight ? 'bg-emerald-50 border border-emerald-100' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                  <Pencil size={13} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>Edit Medical Profile</h2>
                  <p className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Update your personal health information</p>
                </div>
              </div>
              <button onClick={() => setEditOpen(false)} className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all duration-200 ${isLight ? 'border-zinc-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50' : 'border-zinc-800 text-slate-500 hover:text-slate-200 hover:bg-zinc-900'}`}>
                <X size={14} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">

              {editError && (
                <div className={`text-xs rounded-xl px-4 py-3 border ${isLight ? 'bg-red-50 border-red-200 text-red-700' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                  {editError}
                </div>
              )}

              {/* Date of Birth */}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  <span className="flex items-center gap-1.5"><Calendar size={11} />Date of Birth</span>
                </label>
                <input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={editForm.dateOfBirth}
                  onChange={(e) => setEditForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                  className={`w-full py-2.5 px-3.5 text-sm rounded-xl outline-none border focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 ${
                    isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-900 border-zinc-700 text-white'
                  }`}
                />
              </div>

              {/* Phone number */}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  <span className="flex items-center gap-1.5"><Phone size={11} className="text-emerald-500" />Phone Number</span>
                </label>
                <input
                  type="tel"
                  placeholder="+17623800927"
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                  className={`w-full py-2.5 px-3.5 text-sm rounded-xl outline-none border focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 ${
                    isLight ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400' : 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500'
                  }`}
                />
              </div>

              {/* Blood Type */}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  <span className="flex items-center gap-1.5"><Droplets size={11} className="text-emerald-500" />Blood Type</span>
                </label>
                <select
                  value={editForm.bloodType}
                  onChange={(e) => setEditForm((f) => ({ ...f, bloodType: e.target.value }))}
                  className={`w-full py-2.5 px-3.5 text-sm rounded-xl outline-none border focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 appearance-none ${
                    isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-900 border-zinc-700 text-white'
                  }`}
                >
                  <option value="">Select blood type...</option>
                  {BLOOD_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
                </select>
              </div>

              {/* Allergies */}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  <span className="flex items-center gap-1.5"><AlertTriangle size={11} className="text-amber-500" />Allergies <span className={`text-[10px] font-normal ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>(press Enter or comma to add)</span></span>
                </label>
                {editForm.allergies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {editForm.allergies.map((tag) => (
                      <span key={tag} className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border ${
                        isLight ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}>
                        {tag}
                        <button type="button" onClick={() => removeEditAllergy(tag)} className="ml-0.5 opacity-60 hover:opacity-100">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Pollen..."
                  value={editAllergy}
                  onChange={(e) => setEditAllergy(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addEditAllergy(editAllergy) }
                    if (e.key === ',')     { e.preventDefault(); addEditAllergy(editAllergy) }
                  }}
                  onBlur={() => { if (editAllergy.trim()) addEditAllergy(editAllergy) }}
                  className={`w-full py-2.5 px-3.5 text-sm rounded-xl outline-none border focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 ${
                    isLight ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400' : 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500'
                  }`}
                />
              </div>
            </div>

            {/* Footer */}
            <div className={`flex gap-2.5 px-6 pb-5 pt-2`}>
              <button
                onClick={() => setEditOpen(false)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl border transition-all duration-200 ${
                  isLight ? 'border-zinc-200 text-slate-600 hover:bg-slate-50' : 'border-zinc-700 text-slate-400 hover:bg-zinc-900'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={saveProfile}
                disabled={editSaving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-200 disabled:opacity-60 shadow-sm hover:shadow-md hover:shadow-emerald-500/20"
              >
                {editSaving ? (
                  <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</span>
                ) : (
                  <><Save size={14} />Save Profile</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}