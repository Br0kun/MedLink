'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, Search, MapPin, Stethoscope, Star, ArrowRight, Filter } from 'lucide-react'

import { useAuthStore } from '@/store/auth'

const SPECIALTIES = ['', 'GENERAL', 'CARDIOLOGY', 'NEUROLOGY', 'DERMATOLOGY', 'PEDIATRICS', 'ONCOLOGY', 'OPHTHALMOLOGY', 'PSYCHIATRY', 'ORTHOPEDICS']

const SPECIALTY_COLORS = {
  CARDIOLOGY: 'text-red-400 bg-red-400/10',
  NEUROLOGY: 'text-purple-400 bg-purple-400/10',
  PSYCHIATRY: 'text-pink-400 bg-pink-400/10',
  PEDIATRICS: 'text-amber-400 bg-amber-400/10',
  ONCOLOGY: 'text-orange-400 bg-orange-400/10',
  DERMATOLOGY: 'text-lime-400 bg-lime-400/10',
  OPHTHALMOLOGY: 'text-cyan-400 bg-cyan-400/10',
  ORTHOPEDICS: 'text-blue-400 bg-blue-400/10',
  GENERAL: 'text-emerald-400 bg-emerald-400/10',
  OTHER: 'text-slate-400 bg-slate-400/10',
}

export default function PatientDoctorDirectory() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [city, setCity] = useState('')

  useEffect(() => {
    fetchDoctors()
  }, [search, specialty, city])

  const fetchDoctors = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('name', search)
      if (specialty) params.set('specialty', specialty)
      if (city) params.set('city', city)
      const res = await fetch(`http://localhost:5000/api/doctors?${params}`)
      const data = await res.json()
      setDoctors(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const initials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  const routes = { PATIENT: '/patient', DOCTOR: '/doctor', LAB: '/lab', ADMIN: '/admin', ASSISTANT: '/assistant' }

  return (
    <div className="text-slate-900 dark:text-slate-200 font-sans">
      {/* Header */}
      

      {/* Hero */}
      <div className="bg-gradient-to-b from-blue-950/40 to-transparent px-6 py-16 text-center">
        <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Find Your Doctor</h1>
        <p className="text-slate-400 text-base max-w-md mx-auto mb-8">Book verified specialist appointments instantly — no account needed.</p>

        {/* Search & Filters */}
        <div className="max-w-3xl mx-auto bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Search by doctor name..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-slate-600" />
          </div>
          <select value={specialty} onChange={e => setSpecialty(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500/50 transition-all">
            <option value="">All Specialties</option>
            {SPECIALTIES.filter(Boolean).map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
          </select>
          <div className="relative">
            <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="City..." value={city} onChange={e => setCity(e.target.value)}
              className="w-full sm:w-36 bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-slate-600" />
          </div>
        </div>
      </div>

      {/* Doctor Grid */}
      <main className="max-w-6xl mx-auto px-6 pb-16">
        {loading ? (
          <div className="text-center py-20 text-slate-500 text-sm">Searching doctors...</div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-20">
            <Stethoscope size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">No doctors found matching your criteria.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-500 mb-5">{doctors.length} doctor{doctors.length !== 1 ? 's' : ''} found</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map(doc => {
                const displaySpecialty = doc.customSpecialty || doc.specialty
                const colorClass = SPECIALTY_COLORS[doc.specialty] || SPECIALTY_COLORS.OTHER
                return (
                  <div key={doc.id} className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 hover:border-blue-500/30 hover:bg-slate-900 transition-all group cursor-pointer"
                    onClick={() => router.push(`/patient/doctors/${doc.id}`)}>
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-slate-700 flex items-center justify-center text-sm font-bold text-blue-300 flex-shrink-0">
                        {initials(doc.user.fullName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-100 truncate">Dr. {doc.user.fullName}</p>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full mt-1 ${colorClass}`}>
                          <Stethoscope size={10} />
                          {displaySpecialty.charAt(0) + displaySpecialty.slice(1).toLowerCase()}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5 mb-4">
                      {doc.city && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <MapPin size={12} />
                          {doc.city}
                        </div>
                      )}
                      {doc.licenseNumber && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Star size={12} />
                          License: {doc.licenseNumber}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Filter size={12} />
                        {doc.slotDurationMinutes}-min slots
                      </div>
                    </div>
                    <button className="w-full flex items-center justify-center gap-2 text-xs font-semibold py-2.5 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white hover:border-transparent transition-all group-hover:bg-blue-600 group-hover:text-white group-hover:border-transparent">
                      Book Appointment <ArrowRight size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
