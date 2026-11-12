'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import {
  Clock, ShieldCheck, AlertTriangle, Users, Stethoscope,
  BarChart3, RefreshCw, Filter, CheckCircle2
} from 'lucide-react'

export default function SLAAnalyticsPage() {
  const [slaTargetHours, setSlaTargetHours] = useState(24)
  const [specialty, setSpecialty] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAnalytics()
  }, [slaTargetHours, specialty])

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      let url = `/admin/sla-analytics?slaTargetHours=${slaTargetHours}`
      if (specialty) url += `&specialty=${specialty}`
      const res = await api.get(url)
      setData(res.data)
    } catch (err) {
      console.error('Failed to load SLA analytics', err)
      setError('Failed to calculate SLA analytics')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 lg:p-10 space-y-8 bg-[#0B0F19] text-slate-200 min-h-screen">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
            <Clock size={24} className="text-blue-400" />
            Doctor Responsiveness & SLA Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time tracking of review velocity, SLA target compliance, and bottleneck backlogs.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-xl transition-all self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Metrics
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 flex flex-wrap items-center gap-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Filter size={14} className="text-blue-400" />
          Filter Analytics:
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">SLA Target (Hours):</label>
          <select
            value={slaTargetHours}
            onChange={(e) => setSlaTargetHours(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500"
          >
            <option value="12">12 Hours</option>
            <option value="24">24 Hours (Standard)</option>
            <option value="48">48 Hours</option>
            <option value="72">72 Hours</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Specialty Category:</label>
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Specialties</option>
            <option value="GENERAL">GENERAL</option>
            <option value="CARDIOLOGY">CARDIOLOGY</option>
            <option value="NEUROLOGY">NEUROLOGY</option>
            <option value="ONCOLOGY">ONCOLOGY</option>
            <option value="PEDIATRICS">PEDIATRICS</option>
          </select>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-12 text-center text-slate-400 text-sm">
          Calculating SLA metrics & backlog bottlenecks...
        </div>
      )}

      {/* Analytics Grid */}
      {data && !loading && (
        <div className="space-y-8">
          
          {/* Top Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Avg Review Time */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Average Review Time
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Clock size={16} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-white">
                  {data.avgReviewTime?.hours ?? 0}
                </span>
                <span className="text-sm font-medium text-slate-400">hours</span>
                <span className="text-xs text-slate-500 ml-1">
                  ({data.avgReviewTime?.minutes ?? 0} min)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Mean duration from file upload to doctor acknowledgement.
              </p>
            </div>

            {/* SLA Compliance Rate */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  SLA Compliance Rate
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck size={16} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-emerald-400">
                  {data.slaComplianceRatePercent}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Files reviewed within {slaTargetHours}h target window ({data.reviewedWithinSLA} / {data.totalReviewed} files).
              </p>
            </div>

            {/* Unreviewed Backlog */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Unreviewed Backlog
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <AlertTriangle size={16} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-amber-400">
                  {data.bottlenecks?.totalUnreviewedBacklog ?? 0}
                </span>
                <span className="text-sm font-medium text-slate-400">files</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Pending lab results currently waiting for doctor review.
              </p>
            </div>

          </div>

          {/* Bottlenecks Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Backlog by Doctor */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                <Users size={16} className="text-blue-400" />
                Unreviewed Backlog by Doctor
              </h3>

              {data.bottlenecks?.byDoctor?.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">No doctor backlog identified.</p>
              ) : (
                <div className="space-y-3">
                  {data.bottlenecks?.byDoctor?.map((item) => (
                    <div
                      key={item.doctorId}
                      className="flex items-center justify-between bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-200">{item.doctorName}</p>
                        {item.specialty && (
                          <p className="text-[10px] text-slate-500">{item.specialty}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold font-mono">
                          {item.count} unreviewed
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Backlog by Specialty */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                <Stethoscope size={16} className="text-emerald-400" />
                Unreviewed Backlog by Specialty
              </h3>

              {data.bottlenecks?.bySpecialty?.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">No specialty backlog identified.</p>
              ) : (
                <div className="space-y-3">
                  {data.bottlenecks?.bySpecialty?.map((item) => (
                    <div
                      key={item.specialty}
                      className="flex items-center justify-between bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 text-xs"
                    >
                      <p className="font-semibold text-slate-200">{item.specialty}</p>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold font-mono">
                        {item.count} files
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  )
}
