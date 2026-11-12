'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import api from '@/lib/api'
import {
  Activity, ShieldCheck, User, LogOut, LayoutDashboard, FlaskConical
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', path: '/lab',          icon: LayoutDashboard },
]

export default function LabSettingsPage() {
  const user   = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const login  = useAuthStore((s) => s.login)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [profileMsg, setProfileMsg] = useState(null)
  const [pwdMsg, setPwdMsg] = useState(null)
  
  const [profileForm, setProfileForm] = useState({ fullName: '', phoneNumber: '', labName: '', inpeCode: '' })
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  const initials = user?.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await api.get('/users/profile')
      if (res.data) {
        setProfileForm({
          fullName: res.data.fullName || '',
          phoneNumber: res.data.phoneNumber || '',
          labName: res.data.labName || '',
          inpeCode: res.data.inpeCode || ''
        })
      }
    } catch (err) {
      console.error('Failed to load profile', err)
    } finally {
      setLoading(false)
    }
  }

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setProfileMsg(null)
    try {
      await api.put('/users/profile', profileForm)
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' })
      // Update local storage user just for UI (fullName/labName)
      if (user) {
        const token = localStorage.getItem('token')
        login({ ...user, fullName: profileForm.fullName, labName: profileForm.labName }, token)
      }
      setTimeout(() => setProfileMsg(null), 3000)
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update profile' })
    }
  }

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    setPwdMsg(null)
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      return setPwdMsg({ type: 'error', text: 'New passwords do not match' })
    }
    try {
      await api.put('/users/password', { currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword })
      setPwdMsg({ type: 'success', text: 'Password updated successfully!' })
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setPwdMsg(null), 3000)
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update password' })
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0B0F19] text-slate-200 font-sans">
      
      {/* ── Sidebar ── */}
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
            const active = path === '/lab/settings'
            return (
              <button key={path} onClick={() => router.push(path)}
                className={'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 ' +
                  (active ? 'bg-slate-800/80 text-white font-medium border border-slate-700'
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
              <p className="text-[10px] text-slate-500 truncate">
                {user?.labName ? user.labName : 'Laboratory'}
              </p>
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
            <p className="text-[13px] font-medium text-slate-200">Laboratory Settings</p>
            <p className="text-[11px] text-slate-500">Manage your profile and security preferences</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-[11px] font-medium text-teal-400">{initials}</div>
            <div className="hidden sm:block">
              <p className="text-[12px] font-medium text-slate-200 leading-none">{user?.fullName}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                {user?.labName ? user.labName : 'Laboratory'}
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 lg:p-10">
          {loading ? (
            <p className="text-slate-500 text-sm">Loading settings...</p>
          ) : (
            <div className="max-w-2xl space-y-6">
              
              {/* Profile Card */}
              <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-800/60 flex items-center gap-3">
                  <FlaskConical className="text-blue-400" size={18} />
                  <h2 className="text-sm font-semibold text-slate-200">Laboratory Information</h2>
                </div>
                <div className="p-6">
                  {profileMsg && (
                    <div className={\`mb-4 px-4 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2 \${profileMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}\`}>
                      {profileMsg.text}
                    </div>
                  )}
                  <form onSubmit={handleProfileSave} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Full Name (Admin)</label>
                        <input type="text" value={profileForm.fullName} onChange={e => setProfileForm({...profileForm, fullName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all" required />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Phone Number</label>
                        <input type="text" value={profileForm.phoneNumber} onChange={e => setProfileForm({...profileForm, phoneNumber: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Lab Name</label>
                        <input type="text" value={profileForm.labName} onChange={e => setProfileForm({...profileForm, labName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">INPE Code</label>
                        <input type="text" value={profileForm.inpeCode} onChange={e => setProfileForm({...profileForm, inpeCode: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all" />
                      </div>
                    </div>
                    <div className="pt-2 flex justify-end">
                      <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all active:scale-[0.98]">Save Profile Changes</button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Password Card */}
              <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-800/60 flex items-center gap-3">
                  <ShieldCheck className="text-amber-400" size={18} />
                  <h2 className="text-sm font-semibold text-slate-200">Security & Password</h2>
                </div>
                <div className="p-6">
                  {pwdMsg && (
                    <div className={\`mb-4 px-4 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2 \${pwdMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}\`}>
                      {pwdMsg.text}
                    </div>
                  )}
                  <form onSubmit={handlePasswordSave} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Current Password</label>
                      <input type="password" value={pwdForm.currentPassword} onChange={e => setPwdForm({...pwdForm, currentPassword: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">New Password</label>
                        <input type="password" value={pwdForm.newPassword} onChange={e => setPwdForm({...pwdForm, newPassword: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all" required />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Confirm New Password</label>
                        <input type="password" value={pwdForm.confirmPassword} onChange={e => setPwdForm({...pwdForm, confirmPassword: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all" required />
                      </div>
                    </div>
                    <div className="pt-2 flex justify-end">
                      <button type="submit" className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-medium rounded-xl transition-all active:scale-[0.98]">Update Password</button>
                    </div>
                  </form>
                </div>
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  )
}
