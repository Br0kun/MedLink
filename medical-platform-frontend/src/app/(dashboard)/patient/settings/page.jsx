'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import api from '@/lib/api'
import {
  Activity, LayoutDashboard, FolderOpen, ShieldCheck, Bell,
  User, ShieldAlert, Phone, Droplets, Calendar, AlertTriangle
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard',     path: '/patient',               icon: LayoutDashboard },
  { label: 'My dossier',    path: '/patient/dossier',       icon: FolderOpen },
  { label: 'Access',        path: '/patient/access',        icon: ShieldCheck },
  { label: 'Notifications', path: '/patient/notifications', icon: Bell },
]

export default function PatientSettingsPage() {
  const user   = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const login  = useAuthStore((s) => s.login)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [profileMsg, setProfileMsg] = useState(null)
  const [pwdMsg, setPwdMsg] = useState(null)
  
  const [profileForm, setProfileForm] = useState({ fullName: '', phoneNumber: '', bloodType: '', allergies: '', dateOfBirth: '' })
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
          bloodType: res.data.bloodType || '',
          allergies: (res.data.allergies || []).join(', '),
          dateOfBirth: res.data.dateOfBirth ? new Date(res.data.dateOfBirth).toISOString().split('T')[0] : ''
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
      const payload = { ...profileForm }
      await api.put('/users/profile', payload)
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' })
      if (user) {
        const token = localStorage.getItem('token')
        login({ ...user, fullName: profileForm.fullName }, token)
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
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      
      {/* ── Sidebar ── */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-20 hidden md:flex">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-200">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-600/20">
            <Activity size={16} strokeWidth={2.5} className="text-white" />
          </div>
          <span className="text-[15px] font-bold text-slate-800 tracking-tight">MedPlatform</span>
        </div>
        
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600 flex-shrink-0">{initials}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.fullName}</p>
              <p className="text-xs text-slate-500 truncate">Patient Account</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ label, path, icon: Icon }) => {
            const active = path === '/patient/settings'
            return (
              <button key={path} onClick={() => router.push(path)}
                className={'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ' +
                  (active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')}
              >
                <Icon size={18} className={active ? 'text-blue-600' : 'text-slate-400'} />
                {label}
              </button>
            )
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-200">
          <button onClick={() => { logout(); router.push('/login') }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all">
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-slate-50/50">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-10 flex-shrink-0">
          <div>
            <h1 className="text-[17px] font-semibold text-slate-800">Account Settings</h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage your personal and security information</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          {loading ? (
            <p className="text-slate-500 text-sm">Loading settings...</p>
          ) : (
            <div className="max-w-2xl space-y-6">
              
              {/* Profile Card */}
              <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                  <User className="text-blue-500" size={18} />
                  <h2 className="text-sm font-semibold text-slate-800">Personal & Medical Information</h2>
                </div>
                <div className="p-6">
                  {profileMsg && (
                    <div className={\`mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 \${profileMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}\`}>
                      {profileMsg.text}
                    </div>
                  )}
                  <form onSubmit={handleProfileSave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Full Name</label>
                        <input type="text" value={profileForm.fullName} onChange={e => setProfileForm({...profileForm, fullName: e.target.value})} className="w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" required />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Phone Number</label>
                        <input type="text" value={profileForm.phoneNumber} onChange={e => setProfileForm({...profileForm, phoneNumber: e.target.value})} className="w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Date of Birth</label>
                        <input type="date" value={profileForm.dateOfBirth} onChange={e => setProfileForm({...profileForm, dateOfBirth: e.target.value})} className="w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Blood Type</label>
                        <select value={profileForm.bloodType} onChange={e => setProfileForm({...profileForm, bloodType: e.target.value})} className="w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all">
                          <option value="">Unknown</option>
                          <option value="A+">A+</option><option value="A-">A-</option>
                          <option value="B+">B+</option><option value="B-">B-</option>
                          <option value="AB+">AB+</option><option value="AB-">AB-</option>
                          <option value="O+">O+</option><option value="O-">O-</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Allergies (comma separated)</label>
                        <input type="text" value={profileForm.allergies} onChange={e => setProfileForm({...profileForm, allergies: e.target.value})} className="w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="e.g. Penicillin, Peanuts" />
                      </div>
                    </div>
                    <div className="pt-3 flex justify-end">
                      <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all shadow-sm shadow-blue-500/20 active:scale-[0.98]">Save Profile</button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Password Card */}
              <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                  <ShieldCheck className="text-amber-500" size={18} />
                  <h2 className="text-sm font-semibold text-slate-800">Security & Password</h2>
                </div>
                <div className="p-6">
                  {pwdMsg && (
                    <div className={\`mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 \${pwdMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}\`}>
                      {pwdMsg.text}
                    </div>
                  )}
                  <form onSubmit={handlePasswordSave} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Current Password</label>
                      <input type="password" value={pwdForm.currentPassword} onChange={e => setPwdForm({...pwdForm, currentPassword: e.target.value})} className="w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all" required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">New Password</label>
                        <input type="password" value={pwdForm.newPassword} onChange={e => setPwdForm({...pwdForm, newPassword: e.target.value})} className="w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all" required />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Confirm New Password</label>
                        <input type="password" value={pwdForm.confirmPassword} onChange={e => setPwdForm({...pwdForm, confirmPassword: e.target.value})} className="w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all" required />
                      </div>
                    </div>
                    <div className="pt-3 flex justify-end">
                      <button type="submit" className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-xl transition-all shadow-sm active:scale-[0.98]">Update Password</button>
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
