'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import api from '@/lib/api'
import { Activity, LogOut, Calendar, Plus, Clock, Search, Phone, User, CheckCircle, XCircle } from 'lucide-react'

export default function AssistantDashboard() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()

  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split('T')[0])
  const [statusFilter, setStatusFilter] = useState('ALL')

  const initials = user?.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  useEffect(() => {
    fetchAppointments()
  }, [filterDate])

  const fetchAppointments = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/appointments?date=${filterDate}`)
      setAppointments(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/api/appointments/${id}/status`, { status })
      fetchAppointments()
    } catch (err) {
      console.error(err)
      alert('Failed to update status')
    }
  }

  const filteredAppointments = appointments.filter(a => statusFilter === 'ALL' || a.status === statusFilter)

  return (
    <div className="flex h-screen overflow-hidden bg-[#0B0F19] text-slate-200 font-sans">
      {/* ── Sidebar ── */}
      <aside className="w-56 h-screen bg-[#080C14] border-r border-slate-800/60 flex flex-col flex-shrink-0">
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-slate-800/60 flex-shrink-0">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Activity size={14} strokeWidth={2} className="text-white" />
          </div>
          <span className="text-[13px] font-medium text-white tracking-tight">MedPlatform</span>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-medium text-slate-600 uppercase tracking-widest px-2 py-2">Assistant Desk</p>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] bg-indigo-600/20 text-indigo-400 font-medium border border-indigo-500/20 transition-all duration-150">
            <Calendar size={15} strokeWidth={1.5} />
            <span className="flex-1 text-left">Appointments</span>
          </button>
        </nav>
        <div className="p-3 border-t border-slate-800/60 space-y-1">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-800/60 bg-slate-900/40">
            <div className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-[11px] font-medium text-indigo-400 flex-shrink-0">{initials}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-slate-200 truncate">{user?.fullName}</p>
              <p className="text-[10px] text-slate-500 truncate">Assistant</p>
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
            <p className="text-[13px] font-medium text-slate-200">Today's Schedule</p>
            <p className="text-[11px] text-slate-500">Manage patient appointments for your doctor</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-300 text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500/50" />
                <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800/80">
                  {['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1 text-[11px] font-medium rounded-lg transition-all ${statusFilter === s ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* List */}
            {loading ? (
              <p className="text-slate-500 text-sm py-10 text-center">Loading appointments...</p>
            ) : filteredAppointments.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800/60 border-dashed rounded-2xl p-12 text-center">
                <Calendar size={32} className="text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No appointments found for this date.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAppointments.map(app => {
                  const time = new Date(app.appointmentTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 hover:border-indigo-500/30 transition-all">
                      <div className="flex items-center gap-5">
                        <div className="w-16 text-center">
                          <p className="text-lg font-bold text-slate-100">{time}</p>
                          <p className="text-[10px] font-medium uppercase text-slate-500 mt-0.5">{app.status}</p>
                        </div>
                        <div className="h-10 w-px bg-slate-800 hidden sm:block"></div>
                        <div>
                          <p className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
                            <User size={13} className="text-slate-500" /> {app.patientName}
                          </p>
                          <div className="flex gap-4">
                            <p className="text-[11px] text-slate-400 flex items-center gap-1.5"><Phone size={11}/> {app.patientPhone}</p>
                            {app.bookedBy === 'ASSISTANT' && <span className="text-[10px] text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded">Booked by Desk</span>}
                          </div>
                          {app.reason && <p className="text-[11px] text-slate-500 mt-2 line-clamp-1 italic">"{app.reason}"</p>}
                        </div>
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto">
                        {app.status === 'PENDING' && (
                          <button onClick={() => updateStatus(app.id, 'CONFIRMED')}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[11px] font-semibold transition-all">
                            <CheckCircle size={13} /> Confirm
                          </button>
                        )}
                        {(app.status === 'PENDING' || app.status === 'CONFIRMED') && (
                          <button onClick={() => updateStatus(app.id, 'COMPLETED')}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-lg text-[11px] font-semibold transition-all">
                            Complete
                          </button>
                        )}
                        {app.status !== 'CANCELLED' && app.status !== 'COMPLETED' && (
                          <button onClick={() => updateStatus(app.id, 'CANCELLED')}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded-lg text-[11px] font-semibold transition-all">
                            <XCircle size={13} /> Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
