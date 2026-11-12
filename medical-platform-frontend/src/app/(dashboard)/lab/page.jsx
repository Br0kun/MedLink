'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import api from '@/lib/api'
import { Activity, Mail, FlaskConical, Upload, CheckCircle, AlertCircle, LogOut, LayoutDashboard } from 'lucide-react'

const TYPES = ['Complete blood count','Lipid panel','Urinalysis','Liver function','Thyroid panel','Other']

const navItems = [
  { label: 'Dashboard', path: '/lab', icon: LayoutDashboard },
]

export default function LabDashboard() {
  const user   = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()

  const [uploads, setUploads] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState(null)
  const [error,   setError]   = useState(null)
  
  // 1. Updated state to include customAnalysisType and priority
  const [form,    setForm]    = useState({ 
    patientEmail: '', 
    analysisType: 'Complete blood count',
    customAnalysisType: '', 
    priority: 'ROUTINE',
    summary: '' 
  })
  const [file,    setFile]    = useState(null)

  const initials = user?.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  const loadUploads = async () => {
    try { const r = await api.get('/lab/uploads'); setUploads(r.data) }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadUploads() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault(); setSending(true); setMessage(null); setError(null)
    
    // 2. Determine final analysis type
    const finalAnalysisType = form.analysisType === 'Other' && form.customAnalysisType.trim() !== '' 
      ? form.customAnalysisType 
      : form.analysisType;

    try {
      const fd = new FormData()
      fd.append('patientEmail', form.patientEmail)
      fd.append('analysisType', finalAnalysisType)
      fd.append('priority', form.priority) // 3. Append priority
      fd.append('summary', form.summary)
      if (file) fd.append('file', file)
      
      await api.post('/lab/upload', fd)
      
      setMessage('Analysis uploaded successfully')
      
      // 4. Reset form fully
      setForm({ 
        patientEmail: '', 
        analysisType: 'Complete blood count', 
        customAnalysisType: '',
        priority: 'ROUTINE',
        summary: '' 
      })
      setFile(null)
      loadUploads()
    } catch (err) { 
      setError(err.response?.data?.error || 'Upload failed') 
    }
    finally { setSending(false) }
  }

  const thisMonth      = uploads.filter((u) => new Date(u.uploadedAt).getMonth() === new Date().getMonth()).length
  const uniquePatients = new Set(uploads.map((u) => u.medicalRecordId)).size

  return (
    <div className="flex h-screen overflow-hidden bg-[#0B0F19] text-slate-200 font-sans">

      {/* Sidebar */}
      <aside className="w-56 h-screen bg-[#080C14] border-r border-slate-800/60 flex flex-col flex-shrink-0">
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-slate-800/60 flex-shrink-0">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Activity size={14} strokeWidth={2} className="text-white" />
          </div>
          <span className="text-[13px] font-medium text-white tracking-tight">MedPlatform</span>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-medium text-slate-600 uppercase tracking-widest px-2 py-2">Navigation</p>
          {navItems.map(({ label, path, icon: Icon }) => {
            const active = typeof window !== 'undefined' && window.location.pathname === path
            return (
              <button key={path} onClick={() => router.push(path)}
                className={'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 ' + (active ? 'bg-blue-600/20 text-blue-400 font-medium' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 font-normal')}
              >
                <Icon size={15} strokeWidth={1.5} />
                <span className="flex-1 text-left">{label}</span>
              </button>
            )
          })}
        </nav>
        <div className="p-3 border-t border-slate-800/60 space-y-1">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-800/60 bg-slate-900/40">
            <div className="w-7 h-7 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-[11px] font-medium text-violet-400 flex-shrink-0">{initials}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-slate-200 truncate">{user?.fullName}</p>
              <p className="text-[10px] text-slate-500">Laboratory</p>
            </div>
          </div>
          <button onClick={() => { logout(); router.push('/login') }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150">
            <LogOut size={15} strokeWidth={1.5} /><span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Dark Navbar */}
        <header className="h-14 bg-[#080C14] border-b border-slate-800/60 flex items-center justify-between px-6 flex-shrink-0">
          <div>
            <p className="text-[13px] font-medium text-slate-200">Lab Dashboard</p>
            <p className="text-[11px] text-slate-500">Upload and manage patient analysis results</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-[11px] font-medium text-violet-400">{initials}</div>
            <div className="hidden sm:block">
              <p className="text-[12px] font-medium text-slate-200 leading-none">{user?.fullName}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Laboratory</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Total uploads',   value: uploads.length,  icon: FlaskConical, color: 'blue' },
              { label: 'This month',      value: thisMonth,       icon: Upload,       color: 'teal' },
              { label: 'Patients served', value: uniquePatients,  icon: Mail,         color: 'purple' },
            ].map((s, i) => (
              <div key={i} className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 group">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</p>
                  <div className={'w-8 h-8 rounded-xl flex items-center justify-center border border-' + s.color + '-500/20 bg-' + s.color + '-500/10 text-' + s.color + '-400 group-hover:scale-110 transition-transform duration-300'}>
                    <s.icon size={15} strokeWidth={1.5} />
                  </div>
                </div>
                <p className="text-3xl font-mono font-medium text-slate-100 tracking-tight">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-6">

            {/* Upload form */}
            <div className="col-span-2 bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6">
              <p className="text-[13px] font-medium text-slate-200 mb-1">Upload analysis result</p>
              <p className="text-[11px] text-slate-500 mb-5">Patient will be notified once uploaded</p>

              {message && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5 mb-4">
                  <CheckCircle size={13} strokeWidth={1.5} className="text-emerald-400 flex-shrink-0" />
                  <p className="text-[12px] text-emerald-400">{message}</p>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mb-4">
                  <AlertCircle size={13} strokeWidth={1.5} className="text-red-400 flex-shrink-0" />
                  <p className="text-[12px] text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Patient email</label>
                  <div className="relative">
                    <Mail size={13} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      placeholder="patient@email.com"
                      value={form.patientEmail}
                      onChange={(e) => setForm({ ...form, patientEmail: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-[13px] rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-slate-600"
                      required
                    />
                  </div>
                </div>

                {/* --- 5. Added Priority Dropdown --- */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-[13px] rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
                  >
                    <option value="ROUTINE">Routine</option>
                    <option value="URGENT">Urgent</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Analysis type</label>
                  <select
                    value={form.analysisType}
                    onChange={(e) => setForm({ ...form, analysisType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-[13px] rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
                  >
                    {TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>

                {/* --- 6. Added Conditional Custom Type Input --- */}
                {form.analysisType === 'Other' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Specify Analysis Type</label>
                    <input
                      type="text"
                      placeholder="e.g., Genetic Sequencing"
                      value={form.customAnalysisType}
                      onChange={(e) => setForm({ ...form, customAnalysisType: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-[13px] rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-slate-600"
                      required={form.analysisType === 'Other'}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Result summary</label>
                  <textarea
                    placeholder="Enter key findings..."
                    value={form.summary}
                    onChange={(e) => setForm({ ...form, summary: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-[13px] rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-slate-600 resize-none h-20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Attach file</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="w-full text-[12px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-700 file:text-[12px] file:font-medium file:text-slate-400 file:bg-slate-800 hover:file:bg-slate-700 file:transition-all file:cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium rounded-xl transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  <Upload size={14} strokeWidth={1.5} />
                  {sending ? 'Uploading...' : 'Upload result'}
                </button>
              </form>
            </div>

            {/* Recent uploads */}
            <div className="col-span-3 bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
                <p className="text-[13px] font-medium text-slate-200">Recent uploads</p>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{uploads.length} total</span>
              </div>
              <div className="divide-y divide-slate-800/40">
                {loading ? (
                  <div className="p-8 text-center"><p className="text-[13px] text-slate-500">Loading...</p></div>
                ) : uploads.length === 0 ? (
                  <div className="p-8 text-center"><p className="text-[13px] text-slate-500">No uploads yet</p></div>
                ) : uploads.slice(0, 10).map((u) => (
                  <div key={u.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FlaskConical size={13} strokeWidth={1.5} className="text-blue-400" />
                      </div>
                      <div>
                        <p className="text-[13px] text-slate-200">{u.medicalRecord?.patient?.user?.fullName || '—'}</p>
                        <p className="text-[11px] text-slate-500">{u.analysisType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {u.fileUrl && (
                        <a href={'http://localhost:5000/' + u.fileUrl} target="_blank"
                          className="text-[11px] text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg transition-colors"
                        >View file</a>
                      )}
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(u.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
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