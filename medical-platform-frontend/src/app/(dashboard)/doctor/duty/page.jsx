'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import api from '@/lib/api'
import {
  Activity, Clock, ShieldAlert, Check, Moon, Users, LogOut, LayoutDashboard, Inbox, MessageSquare, BellRing, Zap, AlertCircle, Wifi, Timer, ShieldCheck, Calendar, UserCheck
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

export default function DoctorSafetyNetPage() {
  const user   = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()

  const [delayHours, setDelayHours]     = useState(12)
  const [quietEnabled, setQuietEnabled] = useState(false)
  const [quietStart, setQuietStart]     = useState('')
  const [quietEnd, setQuietEnd]         = useState('')
  const [loading, setLoading]           = useState(true)
  const [savingPrefs, setSavingPrefs]   = useState(false)
  const [msg, setMsg]                   = useState(null)

  const initials = user?.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api.get('/doctor/safety-net-settings')
      if (res?.data) {
        setDelayHours(res.data.routineDelayHours ?? 12)
        const hasQuiet = !!res.data.quietHoursStart && !!res.data.quietHoursEnd
        setQuietEnabled(hasQuiet)
        setQuietStart(res.data.quietHoursStart ?? '')
        setQuietEnd(res.data.quietHoursEnd ?? '')
      }
    } catch (err) {
      console.error('Failed to load safety net settings', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSavingPrefs(true)
    setMsg(null)
    try {
      await api.put('/doctor/safety-net-settings', {
        routineDelayHours: parseInt(delayHours) || 12,
        quietHoursStart: quietEnabled && quietStart !== '' ? quietStart : null,
        quietHoursEnd:   quietEnabled && quietEnd   !== '' ? quietEnd   : null,
      })
      if (!quietEnabled) { setQuietStart(''); setQuietEnd('') }
      setMsg({ type: 'success', text: 'Preferences saved successfully.' })
      setTimeout(() => setMsg(null), 3000)
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to save.' })
    } finally {
      setSavingPrefs(false)
    }
  }

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
            const active = path === '/doctor/duty'
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
            <div className="w-7 h-7 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-[11px] font-medium text-emerald-400 flex-shrink-0">{initials}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-slate-200 truncate">{user?.fullName}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.specialty ? user.specialty : 'Doctor'}{user?.licenseNumber ? ` • ${user.licenseNumber}` : ''}</p>
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

        {/* Top bar */}
        <header className="h-14 bg-[#080C14] border-b border-slate-800/60 flex items-center justify-between px-6 flex-shrink-0">
          <div>
            <p className="text-[13px] font-semibold text-slate-100">Safety Net</p>
            <p className="text-[11px] text-slate-500">SMS alert preferences</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> CRON ACTIVE
            </span>
            <div className="w-7 h-7 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-[11px] font-medium text-emerald-400">
              {initials}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto flex items-center justify-center p-6">
          <div className="w-full max-w-md space-y-5">

            {/* Page heading */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-3">
                <ShieldAlert size={22} className="text-emerald-400" />
              </div>
              <h1 className="text-lg font-bold text-slate-100">Alert Preferences</h1>
              <p className="text-[12px] text-slate-500">Configure when the Safety Net notifies you via SMS</p>
            </div>

            {/* Status row */}
            <div className="grid grid-cols-2 gap-3">
              <div style={{background:'linear-gradient(135deg,rgba(239,68,68,0.08) 0%,rgba(239,68,68,0.03) 100%)'}}
                className="rounded-2xl border border-red-500/15 px-4 py-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <Zap size={16} className="text-red-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Critical</p>
                  <p className="text-[13px] font-semibold text-slate-200">After 15 min</p>
                </div>
              </div>
              <div style={{background:'linear-gradient(135deg,rgba(16,185,129,0.08) 0%,rgba(16,185,129,0.03) 100%)'}}
                className="rounded-2xl border border-emerald-500/15 px-4 py-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Timer size={16} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Routine</p>
                  <p className="text-[13px] font-semibold text-slate-200">After {delayHours}h</p>
                </div>
              </div>
            </div>

            {/* Feedback toast */}
            {msg && (
              <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-[12px] font-semibold border ${
                msg.type === 'error'
                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                {msg.type === 'error' ? <AlertCircle size={15} /> : <Check size={15} />}
                {msg.text}
              </div>
            )}

            {/* Settings form */}
            <form onSubmit={handleSave}
              style={{background:'linear-gradient(160deg,rgba(15,23,42,0.9) 0%,rgba(15,23,42,0.7) 100%)',backdropFilter:'blur(24px)'}}
              className="rounded-3xl border border-white/[0.06] shadow-2xl overflow-hidden">

              {/* Routine delay section */}
              <div className="px-6 pt-6 pb-5">
                <label className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  <Clock size={12} className="text-emerald-400" /> Routine Alert Delay
                </label>
                <div className="relative">
                  <input
                    type="number" min="1" max="168"
                    value={delayHours}
                    onChange={(e) => setDelayHours(e.target.value)}
                    style={{background:'rgba(0,0,0,0.35)'}}
                    className="w-full border border-white/[0.08] text-slate-100 text-sm font-medium rounded-xl px-4 py-3 pr-14 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-slate-600"
                    placeholder="12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-500 pointer-events-none">hours</span>
                </div>
              </div>

              {/* Divider */}
              <div className="mx-6 border-t border-white/[0.05]" />

              {/* DND toggle section */}
              <div className="px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      quietEnabled
                        ? 'bg-emerald-500/15 border-emerald-500/30'
                        : 'bg-white/[0.04] border-white/[0.07]'
                    }`}>
                      <Moon size={15} className={quietEnabled ? 'text-emerald-400' : 'text-slate-500'} />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-slate-200">Do Not Disturb</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Pause routine alerts during a window</p>
                    </div>
                  </div>
                  {/* Toggle switch */}
                  <button type="button"
                    onClick={() => { setQuietEnabled(p => !p); if (quietEnabled) { setQuietStart(''); setQuietEnd('') } }}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
                      quietEnabled ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-white/10'
                    }`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${
                      quietEnabled ? 'left-[26px]' : 'left-0.5'
                    }`} />
                  </button>
                </div>

                {/* Time pickers */}
                {quietEnabled && (
                  <div className="mt-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Start</label>
                        <input type="time" value={quietStart}
                          onChange={(e) => setQuietStart(e.target.value)}
                          style={{background:'rgba(0,0,0,0.35)'}}
                          className="w-full border border-white/[0.08] text-slate-100 text-sm font-medium rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all [color-scheme:dark]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">End</label>
                        <input type="time" value={quietEnd}
                          onChange={(e) => setQuietEnd(e.target.value)}
                          style={{background:'rgba(0,0,0,0.35)'}}
                          className="w-full border border-white/[0.08] text-slate-100 text-sm font-medium rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all [color-scheme:dark]"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 bg-red-500/8 border border-red-500/12">
                      <Zap size={12} className="text-red-400 flex-shrink-0" />
                      <p className="text-[11px] text-red-400/80 font-medium">Critical alerts always bypass Do Not Disturb</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Save button */}
              <div className="px-6 pb-6">
                <button type="submit" disabled={savingPrefs || loading}
                  style={{background:'linear-gradient(135deg,#059669 0%,#10b981 100%)'}}
                  className="w-full py-3.5 text-white text-[13px] font-bold rounded-2xl shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:brightness-110 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                  {savingPrefs ? 'Saving…' : 'Save Preferences'}
                </button>
              </div>

            </form>

          </div>
        </main>
      </div>
    </div>
  )
}
