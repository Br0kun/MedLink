'use client'
import { useState, useEffect, use } from 'react'
import axios from 'axios'
import {
  Activity, ShieldAlert, CheckCircle2, AlertTriangle, Clock,
  User, Building2, FileText, Check, Sparkles
} from 'lucide-react'

export default function MobileReviewPage({ params }) {
  const resolvedParams = use(params)
  const token = resolvedParams?.token

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [ackState, setAckState] = useState({ loading: false, done: false, error: null })

  useEffect(() => {
    if (!token) return
    fetchPreview()
  }, [token])

  const fetchPreview = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get(`http://localhost:5000/review/${token}`)
      setData(res.data)
    } catch (err) {
      console.error('Failed to load magic link preview', err)
      const detail = err.response?.data?.detail || err.response?.data?.error || 'Invalid or expired review link.'
      setError(detail)
    } finally {
      setLoading(false)
    }
  }

  const handleAcknowledge = async () => {
    setAckState({ loading: true, done: false, error: null })
    try {
      await axios.post(`http://localhost:5000/review/${token}/acknowledge`)
      setAckState({ loading: false, done: true, error: null })
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Failed to acknowledge result.'
      setAckState({ loading: false, done: false, error: msg })
    }
  }

  const priorityColors = {
    CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/20 text-red-500',
    URGENT:   'bg-amber-500/10 text-amber-400 border-amber-500/20 text-amber-500',
    ROUTINE:  'bg-blue-500/10 text-blue-400 border-blue-500/20 text-blue-500',
  }

  return (
    <div className="min-h-screen bg-[#070A11] text-slate-100 font-sans flex flex-col items-center justify-center p-4 sm:p-6">
      
      {/* Mobile container */}
      <div className="w-full max-w-md bg-[#0B0F19] border border-slate-800 rounded-3xl p-6 shadow-2xl shadow-blue-500/5 relative overflow-hidden">
        
        {/* Decorative Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-600/15 blur-3xl rounded-full pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Activity size={18} strokeWidth={2.5} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-100 tracking-tight flex items-center gap-1.5">
                SecuMed <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Mobile Review</span>
              </h1>
              <p className="text-[11px] text-slate-500">Secure Magic Link Authentication</p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Authenticating secure token...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto text-red-400">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Link Unavailable</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">{error}</p>
            </div>
          </div>
        )}

        {/* Preview & One-Click Review Card */}
        {data && !loading && !error && (
          <div className="space-y-6 relative z-10">

            {/* Doctor Greeting */}
            <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-xs font-semibold text-teal-400">
                  Dr
                </div>
                <p className="text-xs text-slate-300">
                  Reviewing as <span className="font-semibold text-white">Dr. {data.doctor?.name}</span>
                </p>
              </div>
            </div>

            {/* Main Lab Result Summary Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <FileText size={13} className="text-blue-400" />
                  Lab Analysis Card
                </span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${priorityColors[data.preview?.priority] || 'bg-slate-800 text-slate-400'}`}>
                  {data.preview?.priority === 'CRITICAL' && <AlertTriangle size={11} className="inline mr-1 -mt-0.5" />}
                  {data.preview?.priority}
                </span>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Test Name</p>
                  <p className="text-base font-semibold text-white mt-0.5">{data.preview?.analysisType}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1">
                      <User size={11} /> Patient
                    </p>
                    <p className="text-xs font-medium text-slate-200 mt-0.5 truncate">{data.preview?.patientName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1">
                      <Building2 size={11} /> Laboratory
                    </p>
                    <p className="text-xs font-medium text-slate-200 mt-0.5 truncate">{data.preview?.labName}</p>
                  </div>
                </div>

                {data.preview?.summary && (
                  <div className="pt-2 border-t border-slate-800/60">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Summary / Findings</p>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/40">
                      {data.preview.summary}
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* One-Click Action Button */}
            {ackState.done || data.preview?.isReviewed ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 text-center space-y-2 animate-in fade-in zoom-in duration-300">
                <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 size={20} />
                </div>
                <h3 className="text-sm font-bold text-emerald-400">Reviewed & Acknowledged</h3>
                <p className="text-xs text-slate-400">
                  This lab result has been officially marked as reviewed in the patient's record.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {ackState.error && (
                  <p className="text-xs text-red-400 text-center font-medium bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">
                    {ackState.error}
                  </p>
                )}

                <button
                  onClick={handleAcknowledge}
                  disabled={ackState.loading}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {ackState.loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Acknowledging...</span>
                    </>
                  ) : (
                    <>
                      <Check size={18} strokeWidth={2.5} />
                      <span>Acknowledge & Mark Reviewed</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1">
                  <Sparkles size={11} className="text-blue-400" />
                  One-tap encrypted SLA acknowledgement
                </p>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  )
}
