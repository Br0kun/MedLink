'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import api from '@/lib/api'
import {
  Activity, Calendar, Clock, Save, LogOut, LayoutDashboard,
  Inbox, Users, UserCheck, MessageSquare, ShieldCheck
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

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function DoctorSchedulePage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [slotDuration, setSlotDuration] = useState(30)
  const [schedule, setSchedule] = useState([])

  const initials = user?.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  useEffect(() => {
    fetchSchedule()
  }, [])

  const fetchSchedule = async () => {
    try {
      const res = await api.get('/doctor/schedule')
      setSlotDuration(res.data.slotDurationMinutes || 30)

      // Merge DB schedule with default 7 days to ensure all days are visible
      const dbDays = res.data.schedule || []
      const fullWeek = DAYS.map((name, i) => {
        const dbDay = dbDays.find(d => d.dayOfWeek === i)
        return dbDay || { dayOfWeek: i, startTime: '09:00', endTime: '17:00', isDayOff: i === 0 || i === 6 } // default weekends off
      })
      setSchedule(fullWeek)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/doctor/schedule', { slotDurationMinutes: slotDuration, schedule })
      alert('Schedule saved successfully')
    } catch (err) {
      console.error(err)
      alert('Failed to save schedule')
    } finally {
      setSaving(false)
    }
  }

  const updateDay = (dayOfWeek, field, value) => {
    setSchedule(prev => prev.map(d => d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d))
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
            const active = path === '/doctor/schedule'
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
              <p className="text-[10px] text-slate-500 truncate">{user?.specialty ? user.specialty : 'Doctor'}</p>
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
            <p className="text-[13px] font-medium text-slate-200">Weekly Schedule</p>
            <p className="text-[11px] text-slate-500">Configure your working hours and slot durations</p>
          </div>
          <button onClick={handleSave} disabled={saving || loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all">
            <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Global Settings */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Clock size={16} className="text-blue-400" /> Booking Preferences
              </h3>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-2 uppercase tracking-wide">Appointment Slot Duration</label>
                <select value={slotDuration} onChange={e => setSlotDuration(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500/50 w-full sm:w-64">
                  <option value={15}>15 Minutes</option>
                  <option value={20}>20 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
                <p className="text-xs text-slate-500 mt-2">This determines how the system divides your working hours into bookable slots.</p>
              </div>
            </div>

            {/* Weekly Schedule */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800/60">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Calendar size={16} className="text-blue-400" /> Working Hours
                </h3>
              </div>
              <div className="divide-y divide-slate-800/60">
                {loading ? (
                  <p className="p-6 text-slate-500 text-sm text-center">Loading schedule...</p>
                ) : schedule.map((day) => (
                  <div key={day.dayOfWeek} className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${day.isDayOff ? 'bg-slate-900/40 opacity-70' : 'bg-slate-900/70'}`}>
                    <div className="flex items-center gap-4 w-32">
                      <input type="checkbox" checked={!day.isDayOff} onChange={e => updateDay(day.dayOfWeek, 'isDayOff', !e.target.checked)}
                        className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-blue-500/30" />
                      <span className="text-sm font-medium text-slate-300">{DAYS[day.dayOfWeek]}</span>
                    </div>

                    {!day.isDayOff ? (
                      <div className="flex items-center gap-3">
                        <input type="time" value={day.startTime} onChange={e => updateDay(day.dayOfWeek, 'startTime', e.target.value)} required
                          className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500/50" />
                        <span className="text-slate-600 text-xs font-medium">TO</span>
                        <input type="time" value={day.endTime} onChange={e => updateDay(day.dayOfWeek, 'endTime', e.target.value)} required
                          className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500/50" />
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-800/50 px-3 py-1.5 rounded-lg w-fit">Day Off</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
