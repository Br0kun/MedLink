'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { ShieldCheck, ArrowRight, Clock, BellRing } from 'lucide-react'

export default function DoctorAvailabilityCard() {
  const router = useRouter()
  const [settings, setSettings] = useState({ routineDelayHours: 12, quietHoursStart: null, quietHoursEnd: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api.get('/doctor/safety-net-settings')
      if (res?.data) {
        setSettings(res.data)
      }
    } catch (err) {
      console.error('Failed to load safety net settings banner', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return null

  return (
    <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-2xl p-5 mb-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-lg shadow-emerald-500/10">
            <BellRing size={20} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">Doctor Safety Net Engine</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Active (15-Min Cron)
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-1">
              CRITICAL files trigger immediate Textbee SMS. ROUTINE files wait {settings.routineDelayHours}h delay
              {settings.quietHoursStart && settings.quietHoursEnd ? ` & respect Quiet Hours (${settings.quietHoursStart} - ${settings.quietHoursEnd})` : ''}.
            </p>
          </div>
        </div>

        <button
          onClick={() => router.push('/doctor/duty')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] flex-shrink-0"
        >
          <span>Safety Net Settings</span>
          <ArrowRight size={14} />
        </button>

      </div>
    </div>
  )
}
