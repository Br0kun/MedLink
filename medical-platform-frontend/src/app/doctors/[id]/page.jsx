'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Activity, ArrowLeft, MapPin, Stethoscope, Clock, CheckCircle, ChevronLeft, ChevronRight, Phone, User, FileText } from 'lucide-react'
import { useAuthStore } from '@/store/auth'

export default function DoctorBookingPage() {
  const { id } = useParams()
  const router = useRouter()

  const [doctor, setDoctor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  })
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [isDayOff, setIsDayOff] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const { user } = useAuthStore()
  const [form, setForm] = useState({ patientName: user?.fullName || '', patientPhone: user?.phoneNumber || '', reason: '' })
  const [booking, setBooking] = useState(false)
  const [confirmed, setConfirmed] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDoctor()
  }, [id])

  useEffect(() => {
    if (user && !form.patientName) {
      setForm(f => ({ ...f, patientName: user.fullName || f.patientName, patientPhone: user.phoneNumber || f.patientPhone }))
    }
  }, [user])

  useEffect(() => {
    if (id) fetchSlots()
  }, [id, selectedDate])

  const fetchDoctor = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/doctors/${id}`)
      if (!res.ok) throw new Error('Not found')
      setDoctor(await res.json())
    } catch {
      setDoctor(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchSlots = async () => {
    setSlotsLoading(true)
    setSelectedSlot(null)
    try {
      const res = await fetch(`http://localhost:5000/api/doctors/${id}/available-slots?date=${selectedDate}`)
      const data = await res.json()
      setSlots(data.slots || [])
      setIsDayOff(data.isDayOff || false)
    } catch {
      setSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }

  const shiftDate = (days) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    const newDate = d.toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]
    if (newDate >= today) setSelectedDate(newDate)
  }

  const handleBook = async (e) => {
    e.preventDefault()
    if (!selectedSlot) return
    setBooking(true); setError(null)
    try {
      const res = await fetch('http://localhost:5000/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId: id, ...form, appointmentTime: selectedSlot.time })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Booking failed')
      setConfirmed({ slot: selectedSlot, form: { ...form } })
      setShowForm(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBooking(false)
    }
  }

  const displayDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
      <p className="text-slate-500 text-sm">Loading doctor profile...</p>
    </div>
  )

  if (!doctor) return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center text-center">
      <div>
        <p className="text-slate-400 mb-4">Doctor not found or not available.</p>
        <button onClick={() => router.push('/doctors')} className="text-blue-400 text-sm hover:underline">← Back to directory</button>
      </div>
    </div>
  )

  const displaySpecialty = doctor.customSpecialty || doctor.specialty
  const initials = doctor.user.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 font-sans">
      {/* Header */}
      <header className="bg-[#080C14] border-b border-slate-800/60 px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/doctors')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <Activity size={14} className="text-white" />
          </div>
          <span className="text-[14px] font-bold text-white">MedPlatform</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">

        {/* Doctor Profile Card */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 mb-6 flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/30 to-purple-600/30 border border-slate-700 flex items-center justify-center text-xl font-bold text-blue-300 flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Dr. {doctor.user.fullName}</h1>
            <div className="flex flex-wrap gap-3 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-purple-400 bg-purple-400/10 px-2.5 py-1 rounded-full">
                <Stethoscope size={11} />
                {displaySpecialty.charAt(0) + displaySpecialty.slice(1).toLowerCase()}
              </span>
              {doctor.city && (
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <MapPin size={11} />
                  {doctor.city}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full">
                <Clock size={11} />
                {doctor.slotDurationMinutes}-min appointments
              </span>
            </div>
          </div>
        </div>

        {/* Confirmation state */}
        {confirmed && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 mb-6 text-center">
            <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-emerald-300 mb-1">Appointment Booked!</h2>
            <p className="text-sm text-slate-400 mb-1">
              <strong className="text-white">{confirmed.form.patientName}</strong> — {confirmed.slot.label}
            </p>
            <p className="text-xs text-slate-500 mb-4">{displayDate}</p>
            <p className="text-xs text-slate-500">You will receive a confirmation from the clinic. Please arrive 5 minutes early.</p>
            <button onClick={() => { setConfirmed(null); fetchSlots() }} className="mt-4 px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-xl transition-all">Book another slot</button>
          </div>
        )}

        {!confirmed && (
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden">
            {/* Date navigation */}
            <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
              <button onClick={() => shiftDate(-1)} className="p-1.5 rounded-lg hover:bg-slate-800 transition-all"><ChevronLeft size={18} className="text-slate-400" /></button>
              <div className="text-center">
                <p className="text-sm font-medium text-white">{displayDate}</p>
                <p className="text-xs text-slate-500 mt-0.5">Select a time slot below</p>
              </div>
              <button onClick={() => shiftDate(1)} className="p-1.5 rounded-lg hover:bg-slate-800 transition-all"><ChevronRight size={18} className="text-slate-400" /></button>
            </div>

            {/* Slots */}
            <div className="p-5">
              {slotsLoading ? (
                <p className="text-center text-slate-500 text-sm py-8">Loading slots...</p>
              ) : isDayOff ? (
                <p className="text-center text-slate-500 text-sm py-8">This doctor is not available on this day.</p>
              ) : slots.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-8">No available slots for this date. Please try another day.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {slots.map(slot => (
                    <button key={slot.time} onClick={() => { setSelectedSlot(slot); setShowForm(true); setError(null) }}
                      className={`py-2.5 text-sm font-medium rounded-xl border transition-all ${selectedSlot?.time === slot.time ? 'bg-blue-600 text-white border-transparent' : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800 hover:border-blue-500/40'}`}>
                      {slot.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Booking form */}
            {showForm && selectedSlot && (
              <div className="px-5 pb-5 border-t border-slate-800/60 pt-4">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <CheckCircle size={14} className="text-blue-400" />
                  Confirm appointment at <span className="text-blue-400">{selectedSlot.label}</span>
                </h3>
                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3 mb-4">{error}</div>}
                <form onSubmit={handleBook} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Full Name</label>
                      <div className="relative">
                        <User size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input type="text" placeholder="Your full name" value={form.patientName} onChange={e => setForm({ ...form, patientName: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-slate-600" required />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Phone Number</label>
                      <div className="relative">
                        <Phone size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input type="tel" placeholder="+213 ..." value={form.patientPhone} onChange={e => setForm({ ...form, patientPhone: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-slate-600" required />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Reason for Visit (Optional)</label>
                    <div className="relative">
                      <FileText size={13} className="absolute left-3.5 top-3 text-slate-500" />
                      <textarea placeholder="Briefly describe your reason for the visit..." value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={2}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-slate-600 resize-none" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button type="submit" disabled={booking}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 active:scale-[0.98]">
                      {booking ? 'Booking...' : '✓ Confirm Appointment'}
                    </button>
                    <button type="button" onClick={() => { setShowForm(false); setSelectedSlot(null) }}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm rounded-xl transition-all">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
