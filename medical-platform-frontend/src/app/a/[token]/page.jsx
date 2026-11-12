'use client'
import { useState, useEffect, use } from 'react'
import { Activity, ShieldCheck, AlertTriangle, Clock, CheckCircle2, FileText, User, Building2, ChevronRight } from 'lucide-react'

export default function OneTapReviewPage({ params }) {
  const resolvedParams = use(params)
  const token = resolvedParams.token

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [reviewedSuccess, setReviewedSuccess] = useState(false)

  useEffect(() => {
    if (!token) return
    fetchPreview()
  }, [token])

  const fetchPreview = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`http://localhost:5000/api/a/${token}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Magic link is invalid or expired.')
      }
      const json = await res.json()
      setData(json)
      if (json.isReviewed) {
        setReviewedSuccess(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkReviewed = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`http://localhost:5000/api/a/${token}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to mark report as reviewed.')
      }
      setReviewedSuccess(true)
    } catch (err) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 font-sans flex flex-col justify-between p-4 sm:p-6">
      {/* Mobile Top Header */}
      <header className="w-full max-w-md mx-auto py-4 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/30">
            <Activity size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">SecuMed Mobile</h1>
            <p className="text-[10px] text-slate-500 font-medium">Doctor Safety Net One-Tap</p>
          </div>
        </div>
        <div className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
          <ShieldCheck size={12} /> Secure Auth
        </div>
      </header>

      {/* Main Content Card */}
      <main className="w-full max-w-md mx-auto my-auto py-6">
        {loading ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
            <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Fetching lab report core values...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-950/30 border border-rose-500/30 rounded-3xl p-8 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30">
              <AlertTriangle size={24} />
            </div>
            <h2 className="text-base font-bold text-rose-300">Invalid Link</h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">{error}</p>
          </div>
        ) : data ? (
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-black/80 space-y-6 relative overflow-hidden">
            {/* Urgency Highlight Banner */}
            <div className="flex items-center justify-between">
              <span
                className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider border flex items-center gap-1.5 ${
                  data.priority === 'CRITICAL'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}
              >
                {data.priority === 'CRITICAL' ? <AlertTriangle size={14} /> : <Activity size={14} />}
                {data.priority} LAB REPORT
              </span>
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <Clock size={12} /> {new Date(data.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Test Type Header */}
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">{data.analysisType}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{data.category} Specialty</p>
            </div>

            {/* Core Details Metadata Grid */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <User size={14} className="text-emerald-400" /> Patient
                </span>
                <span className="font-semibold text-slate-200">{data.patientName}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/50">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Building2 size={14} className="text-emerald-400" /> Diagnostic Lab
                </span>
                <span className="font-semibold text-slate-200">{data.labName}</span>
              </div>
            </div>

            {/* Core Values / Summary Preview */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText size={13} className="text-emerald-400" /> Core Test Values & Summary
              </label>
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                {data.summary || 'No summary notes attached to this lab report.'}
              </div>
            </div>

            {/* PDF File Download Link if exists */}
            {data.fileUrl && (
              <a
                href={`http://localhost:5000/${data.fileUrl}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-xs font-semibold text-emerald-400 flex items-center justify-between transition-all"
              >
                <span>View Full Lab File Attachment</span>
                <ChevronRight size={14} />
              </a>
            )}

            {/* One-Tap Action Button or Reviewed Confirmation */}
            {reviewedSuccess ? (
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-1">
                <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 size={18} /> Mark Reviewed Complete
                </div>
                <p className="text-[11px] text-slate-400">This lab report is marked as reviewed. The Safety Net Cron job has stopped monitoring this item.</p>
              </div>
            ) : (
              <button
                onClick={handleMarkReviewed}
                disabled={submitting}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-emerald-600/30 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Updating Record...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Mark Reviewed (One-Tap)</span>
                  </>
                )}
              </button>
            )}
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto py-3 text-center text-[10px] text-slate-600">
        SecuMed Healthcare Platform &bull; Doctor Safety Net Notification Engine
      </footer>
    </div>
  )
}
