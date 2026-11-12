'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, User, ArrowRight, Activity, Stethoscope, FlaskConical, UserCircle, Clock, CheckCircle, Droplets, Calendar, AlertTriangle, X as XIcon, Phone } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'

const ROLES = [
  { key: 'PATIENT', label: 'Patient',    description: 'Access your medical records', Icon: UserCircle },
  { key: 'DOCTOR',  label: 'Doctor',     description: 'Manage patient dossiers',      Icon: Stethoscope },
  { key: 'LAB',     label: 'Laboratory', description: 'Upload analysis results',      Icon: FlaskConical },
  { key: 'ASSISTANT', label: 'Assistant', description: 'Manage clinic schedule',      Icon: UserCircle },
]

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const SPECIALTIES = [
  'GENERAL', 'CARDIOLOGY', 'NEUROLOGY', 'DERMATOLOGY', 'PEDIATRICS',
  'ONCOLOGY', 'OPHTHALMOLOGY', 'PSYCHIATRY', 'ORTHOPEDICS', 'OTHER'
]

const specialtyLabel = (s) => s.charAt(0) + s.slice(1).toLowerCase()

export default function RegisterPage() {
  const router = useRouter()
  const login  = useAuthStore((s) => s.login)

  const [role,            setRole]           = useState('PATIENT')
  const [form,            setForm]           = useState({ fullName: '', email: '', password: '', phoneNumber: '' })
  const [specialty,       setSpecialty]      = useState('GENERAL')
  const [customSpecialty, setCustomSpecialty] = useState('')
  const [licenseNumber,   setLicenseNumber]  = useState('')
  const [labName,         setLabName]        = useState('')
  const [inpeCode,        setInpeCode]       = useState('')
  const [doctorEmail,     setDoctorEmail]    = useState('')
  const [patientInfo,     setPatientInfo]    = useState({ dateOfBirth: '', bloodType: '', allergies: [] })
  const [allergyInput,    setAllergyInput]   = useState('')
  const [error,           setError]          = useState('')
  const [loading,         setLoading]        = useState(false)
  const [pendingState,    setPendingState]   = useState(false)
  const [theme,           setTheme]          = useState('light')

  useEffect(() => {
    const sync = () => setTheme(localStorage.getItem('dossier-theme') || 'light')
    sync()
    window.addEventListener('themechange', sync)
    return () => window.removeEventListener('themechange', sync)
  }, [])

  const dark = theme !== 'light'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = { ...form, role }
      if (role === 'DOCTOR') {
        payload.specialty       = specialty
        payload.customSpecialty = specialty === 'OTHER' ? customSpecialty : undefined
        payload.licenseNumber   = licenseNumber
      }
      if (role === 'PATIENT') {
        payload.dateOfBirth = patientInfo.dateOfBirth || undefined
        payload.bloodType   = patientInfo.bloodType   || undefined
        payload.allergies   = patientInfo.allergies
      }
      if (role === 'LAB') {
        payload.fullName = labName || 'Laboratory' // backend requires fullName
        payload.labName  = labName  || undefined
        payload.inpeCode = inpeCode || undefined
      }
      if (role === 'ASSISTANT') {
        payload.doctorEmail = doctorEmail || undefined
      }
      const { data } = await api.post('/auth/register', payload)
      if (data.pending) { setPendingState(true); return }
      login(data.user, data.token)
      const routes = { PATIENT: '/patient' }
      router.push(routes[data.user.role] || '/login')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const addAllergy = (value) => {
    const trimmed = value.trim()
    if (trimmed && !patientInfo.allergies.includes(trimmed)) {
      setPatientInfo((p) => ({ ...p, allergies: [...p.allergies, trimmed] }))
    }
    setAllergyInput('')
  }

  const removeAllergy = (tag) => {
    setPatientInfo((p) => ({ ...p, allergies: p.allergies.filter((a) => a !== tag) }))
  }

  // Shared input class
  const inputCls = (extra = '') => `w-full py-2.5 text-sm rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 ${extra} ${
    dark
      ? 'bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500'
      : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400'
  }`

  // ── Pending approval screen ─────────────────────────────
  if (pendingState) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-8 transition-colors duration-300 ${dark ? 'bg-black' : 'bg-slate-50'}`}>
        <div className="w-full max-w-md text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border ${
            dark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'
          }`}>
            <Clock size={28} strokeWidth={1.5} className="text-amber-500" />
          </div>
          <h1 className={`text-2xl font-bold mb-2 ${dark ? 'text-white' : 'text-slate-900'}`}>Account pending approval</h1>
          <p className={`text-sm leading-relaxed mb-8 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            Your {role === 'DOCTOR' ? 'doctor' : role === 'ASSISTANT' ? 'assistant' : 'laboratory'} account has been created and is awaiting verification by {role === 'ASSISTANT' ? 'your doctor' : 'our admin team'}.
            You'll be notified once your account is activated.
          </p>
          <div className={`rounded-xl p-5 text-left mb-8 border ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={14} strokeWidth={1.5} className="text-emerald-500" />
              <p className={`text-xs font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Account created</p>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} strokeWidth={1.5} className="text-amber-500" />
              <p className={`text-xs font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Awaiting verification</p>
            </div>
            <div className="flex items-center gap-2 opacity-40">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" />
              <p className={`text-xs font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Account activated</p>
            </div>
          </div>
          <button onClick={() => router.push('/login')} className="text-sm text-emerald-600 font-medium hover:underline">
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${dark ? 'bg-black' : 'bg-slate-50'}`}>

      {/* ── Left panel — switches between dark navy & clean white ── */}
      <div className={`hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden transition-colors duration-300 ${
        dark ? 'bg-[#090d16]' : 'bg-white border-r border-slate-200'
      }`}>
        {/* Grid overlay — dark only */}
        {dark && (
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
          />
        )}
        {/* Glow orb */}
        <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl ${
          dark ? 'bg-emerald-600 opacity-10' : 'bg-emerald-400 opacity-[0.07]'
        }`} />

        {/* EKG Animation */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-64 pointer-events-none z-0">
          <svg className="w-full h-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
            <defs>
              <filter id="glow-reg" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <linearGradient id="mask-grad-reg" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="black" />
                <stop offset="60%"  stopColor="black" />
                <stop offset="85%"  stopColor="white" stopOpacity="0.3" />
                <stop offset="98%"  stopColor="white" stopOpacity="1" />
                <stop offset="100%" stopColor="black" />
              </linearGradient>
              <mask id="sweep-mask-reg">
                <rect x="-1000" y="0" width="1000" height="200" fill="url(#mask-grad-reg)">
                  <animateTransform attributeName="transform" type="translate" from="0,0" to="2000,0" dur="4s" repeatCount="indefinite" />
                </rect>
              </mask>
            </defs>
            <path
              d="M 0 100 L 180 100 C 190 90, 200 90, 210 100 L 230 100 L 240 110 L 255 20 L 270 170 L 285 100 C 300 80, 320 80, 335 100 L 680 100 C 690 90, 700 90, 710 100 L 730 100 L 740 110 L 755 20 L 770 170 L 785 100 C 800 80, 820 80, 835 100 L 1000 100"
              fill="none" stroke={dark ? '#064e3b' : '#a7f3d0'} strokeWidth="2" opacity="0.5"
            />
            <path
              d="M 0 100 L 180 100 C 190 90, 200 90, 210 100 L 230 100 L 240 110 L 255 20 L 270 170 L 285 100 C 300 80, 320 80, 335 100 L 680 100 C 690 90, 700 90, 710 100 L 730 100 L 740 110 L 755 20 L 770 170 L 785 100 C 800 80, 820 80, 835 100 L 1000 100"
              fill="none" stroke="#10b981" strokeWidth="3"
              filter="url(#glow-reg)" mask="url(#sweep-mask-reg)"
            />
          </svg>
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Activity size={16} className="text-white" />
          </div>
          <span className={`font-semibold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>MedPlatform</span>
        </div>

        {/* Headline */}
        <div className="relative z-10">
          <h2 className={`text-3xl font-bold leading-tight mb-4 ${dark ? 'text-white' : 'text-slate-900'}`}>
            Join the future<br />of healthcare.
          </h2>
          <p className={`text-sm leading-relaxed max-w-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            Create your account and be part of a secure, modern medical records ecosystem built for the digital age.
          </p>
        </div>

        {/* Role cards */}
        <div className="relative z-10 space-y-3">
          {ROLES.map(({ key, label, description, Icon }) => (
            <div key={key} className={`flex items-center gap-3 rounded-xl p-3 border ${
              dark
                ? 'bg-slate-800 border-slate-700'
                : 'bg-slate-100 border-slate-200'
            }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                dark ? 'bg-slate-700' : 'bg-white border border-slate-200'
              }`}>
                <Icon size={14} className={dark ? 'text-slate-300' : 'text-slate-500'} />
              </div>
              <div>
                <p className={`text-xs font-medium ${dark ? 'text-white' : 'text-slate-800'}`}>{label}</p>
                <p className={`text-[11px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — theme-aware ── */}
      <div className={`flex-1 flex items-center justify-center p-8 overflow-y-auto transition-colors duration-300 ${
        dark ? 'bg-black' : 'bg-slate-50'
      }`}>
        <div className="w-full max-w-sm py-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Activity size={14} className="text-white" />
            </div>
            <span className={`font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>MedPlatform</span>
          </div>

          <h1 className={`text-2xl font-bold mb-1 ${dark ? 'text-white' : 'text-slate-900'}`}>Create account</h1>
          <p className={`text-sm mb-6 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Choose your role and get started</p>

          {/* Role selector */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {ROLES.map(({ key, label, Icon }) => (
              <button key={key} type="button" onClick={() => setRole(key)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 ${
                  role === key
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                    : dark
                      ? 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}>
                <Icon size={16} className={role === key ? 'text-emerald-600' : dark ? 'text-slate-500' : 'text-slate-400'} />
                <span className={`text-[11px] font-medium ${role === key ? 'text-emerald-700' : dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>

          {/* Pending notice */}
          {(role === 'DOCTOR' || role === 'LAB') && (
            <div className={`flex items-start gap-2 rounded-xl px-4 py-3 mb-5 border ${
              dark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'
            }`}>
              <Clock size={14} strokeWidth={1.5} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <p className={`text-[11px] leading-relaxed ${dark ? 'text-amber-400' : 'text-amber-700'}`}>
                {role === 'DOCTOR' ? 'Doctor' : 'Laboratory'} accounts require admin verification before you can log in.
              </p>
            </div>
          )}

          {error && (
            <div className={`text-xs rounded-xl px-4 py-3 mb-5 border ${
              dark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-700'
            }`}>{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name (Hidden for LAB) */}
            {role !== 'LAB' && (
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Full name</label>
                <div className="relative">
                  <User size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input type="text" placeholder={role === 'DOCTOR' ? 'Dr. Sara Benali' : 'Ilyas Dahbi'}
                    value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className={inputCls('pl-10 pr-4')} required={role !== 'LAB'} />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Email address</label>
              <div className="relative">
                <Mail size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input type="email" placeholder="you@example.com"
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputCls('pl-10 pr-4')} required />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Password</label>
              <div className="relative">
                <Lock size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input type="password" placeholder="••••••••"
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inputCls('pl-10 pr-4')} required />
              </div>
            </div>

            {/* Phone number */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Phone number <span className={`text-[10px] font-normal ${dark ? 'text-slate-500' : 'text-slate-400'}`}>(optional — for SMS alerts)</span></label>
              <div className="relative">
                <Phone size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input type="tel" placeholder="+17623800927"
                  value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  className={inputCls('pl-10 pr-4')} />
              </div>
            </div>

            {/* Patient-specific medical info */}
            {role === 'PATIENT' && (
              <>
                {/* Divider */}
                <div className={`flex items-center gap-3 py-1`}>
                  <div className={`flex-1 h-px ${dark ? 'bg-zinc-800' : 'bg-slate-200'}`} />
                  <span className={`text-[10px] font-semibold uppercase tracking-widest ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Medical Info</span>
                  <div className={`flex-1 h-px ${dark ? 'bg-zinc-800' : 'bg-slate-200'}`} />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Date of Birth <span className={`text-[10px] font-normal ${dark ? 'text-slate-500' : 'text-slate-400'}`}>(optional)</span></label>
                  <div className="relative">
                    <Calendar size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                      type="date"
                      max={new Date().toISOString().split('T')[0]}
                      value={patientInfo.dateOfBirth}
                      onChange={(e) => setPatientInfo((p) => ({ ...p, dateOfBirth: e.target.value }))}
                      className={inputCls('pl-10 pr-4')}
                    />
                  </div>
                </div>

                {/* Blood Type */}
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Blood Type <span className={`text-[10px] font-normal ${dark ? 'text-slate-500' : 'text-slate-400'}`}>(optional)</span></label>
                  <div className="relative">
                    <Droplets size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
                    <select
                      value={patientInfo.bloodType}
                      onChange={(e) => setPatientInfo((p) => ({ ...p, bloodType: e.target.value }))}
                      className={inputCls('pl-10 pr-4 appearance-none')}
                    >
                      <option value="">Select blood type...</option>
                      {BLOOD_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
                    </select>
                  </div>
                </div>

                {/* Allergies */}
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Allergies <span className={`text-[10px] font-normal ${dark ? 'text-slate-500' : 'text-slate-400'}`}>(optional — press Enter to add)</span></label>
                  {patientInfo.allergies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {patientInfo.allergies.map((tag) => (
                        <span key={tag} className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border ${
                          dark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        }`}>
                          {tag}
                          <button type="button" onClick={() => removeAllergy(tag)} className="ml-0.5 opacity-60 hover:opacity-100">
                            <XIcon size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <AlertTriangle size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                      type="text"
                      placeholder="e.g. Penicillin, Pollen, Latex..."
                      value={allergyInput}
                      onChange={(e) => setAllergyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); addAllergy(allergyInput) }
                        if (e.key === ',')     { e.preventDefault(); addAllergy(allergyInput) }
                      }}
                      onBlur={() => { if (allergyInput.trim()) addAllergy(allergyInput) }}
                      className={inputCls('pl-10 pr-4')}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Doctor-specific */}
            {role === 'DOCTOR' && (
              <>
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Specialty</label>
                  <div className="relative">
                    <Stethoscope size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
                    <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}
                      className={inputCls('pl-10 pr-4 appearance-none')}>
                      {SPECIALTIES.map((s) => (<option key={s} value={s}>{specialtyLabel(s)}</option>))}
                    </select>
                  </div>
                </div>

                {specialty === 'OTHER' && (
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Specify your specialty</label>
                    <input type="text" placeholder="e.g. Endocrinology"
                      value={customSpecialty} onChange={(e) => setCustomSpecialty(e.target.value)}
                      className={inputCls('px-4')} required />
                  </div>
                )}

                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>License number</label>
                  <input type="text" placeholder="MED-12345"
                    value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)}
                    className={inputCls('px-4')} />
                </div>
              </>
            )}

            {/* Lab-specific */}
            {role === 'LAB' && (
              <>
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Laboratory name</label>
                  <div className="relative">
                    <FlaskConical size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                      type="text"
                      placeholder="e.g. Laboratoire Atlas"
                      value={labName}
                      onChange={(e) => setLabName(e.target.value)}
                      className={inputCls('pl-10 pr-4')}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Code INPE
                    <span className={`ml-1.5 text-[10px] font-normal ${dark ? 'text-slate-500' : 'text-slate-400'}`}>(9-digit national code — ANAM)</span>
                  </label>
                  <div className="relative">
                    <svg className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${dark ? 'text-slate-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>
                    <input
                      type="text"
                      placeholder="e.g. 123456789"
                      maxLength={9}
                      value={inpeCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 9)
                        setInpeCode(val)
                      }}
                      className={inputCls('pl-10 pr-4 font-mono tracking-widest')}
                    />
                    {inpeCode.length > 0 && (
                      <span className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono ${
                        inpeCode.length === 9 ? 'text-emerald-500' : dark ? 'text-slate-500' : 'text-slate-400'
                      }`}>{inpeCode.length}/9</span>
                    )}
                  </div>
                  {inpeCode.length > 0 && inpeCode.length < 9 && (
                    <p className={`text-[10px] mt-1 ${dark ? 'text-amber-400' : 'text-amber-600'}`}>⚠ Must be exactly 9 digits</p>
                  )}
                </div>
              </>
            )}

            {/* Assistant-specific */}
            {role === 'ASSISTANT' && (
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Doctor Email</label>
                <div className="relative">
                  <Stethoscope size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="email"
                    placeholder="Enter the email address of the doctor you work for"
                    value={doctorEmail}
                    onChange={(e) => setDoctorEmail(e.target.value)}
                    className={inputCls('pl-10 pr-4')}
                    required
                  />
                </div>
                <p className={`text-[10px] mt-1.5 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Your account will remain pending until this doctor approves it.
                </p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md mt-2">
              {loading ? 'Creating account...' : (<>Create account <ArrowRight size={14} /></>)}
            </button>
          </form>

          <p className={`text-xs text-center mt-6 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
            Already have an account?{' '}
            <span onClick={() => router.push('/login')} className="text-emerald-600 font-semibold cursor-pointer hover:underline">
              Sign in
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
