'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSocket } from '@/lib/socket'
import api from '@/lib/api'
import {
  Activity, Bell, LayoutDashboard, FolderOpen, ShieldCheck, LogOut, CheckCheck, Calendar
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard',     path: '/patient',               icon: LayoutDashboard },
  { label: 'My dossier',    path: '/patient/dossier',       icon: FolderOpen },
  { label: 'Access',        path: '/patient/access',        icon: ShieldCheck },
  { label: 'Notifications', path: '/patient/notifications', icon: Bell },
  { label: 'Book Appointment', path: '/patient/doctors',            icon: Calendar },
]

export default function NotificationsPage() {
  const user   = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()
  const [notifications, setNotifications] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [unread,        setUnread]        = useState(0)
  const [pulse,         setPulse]         = useState(false)
  const [theme,         setTheme]         = useState('light')

  const initials = user?.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  const load = async () => {
    try { const r = await api.get('/notifications'); setNotifications(r.data); setUnread(r.data.filter((n) => !n.isRead).length) }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    const handleSync = () => {
      setTheme(localStorage.getItem('dossier-theme') || 'light')
    }
    window.addEventListener('themechange', handleSync)
    handleSync()

    load()
    const socket = getSocket()
    socket.on('notification', (n) => { setNotifications((prev) => [n, ...prev]); setUnread((p) => p + 1); setPulse(true); setTimeout(() => setPulse(false), 3000) })
    return () => {
      socket.off('notification')
      window.removeEventListener('themechange', handleSync)
    }
  }, [])

  const markAllRead = async () => {
    await api.put('/notifications/read-all')
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnread(0)
  }

  const markRead = async (id) => {
    await api.put('/notifications/' + id + '/read')
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n))
    setUnread((p) => Math.max(0, p - 1))
  }

  const timeAgo = (date) => {
    const mins = Math.floor((Date.now() - new Date(date)) / 60000)
    if (mins < 60) return mins + 'm ago'
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return hrs + 'h ago'
    return Math.floor(hrs / 24) + 'd ago'
  }

  const isLight = theme === 'light'

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 ${
      isLight ? 'bg-[#f4f4f5] text-slate-800' : 'bg-black text-slate-200'
    } selection:bg-emerald-500/30`}>

      {/* Sidebar */}
      <aside className={`w-56 h-screen flex flex-col flex-shrink-0 border-r transition-colors duration-300 ${
        isLight ? 'bg-[#fafaf9] border-zinc-200' : 'bg-[#0a0a0c] border-zinc-800/60'
      }`}>
        <div className={`h-14 flex items-center gap-2.5 px-4 border-b flex-shrink-0 transition-colors duration-300 ${
          isLight ? 'border-zinc-200' : 'border-zinc-800/60'
        }`}>
          <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Activity size={14} strokeWidth={2} className="text-white" />
          </div>
          <span className={`text-[13px] font-semibold tracking-tight transition-colors duration-300 ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>MedPlatform</span>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-2 ${
            isLight ? 'text-slate-400' : 'text-slate-600'
          }`}>Navigation</p>
          {navItems.map(({ label, path, icon: Icon }) => {
            const active = typeof window !== 'undefined' && window.location.pathname === path
            return (
              <button key={path} onClick={() => router.push(path)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-300 relative overflow-hidden group border ${
                  active 
                    ? isLight 
                      ? 'bg-emerald-50 text-emerald-600 font-semibold border-emerald-100' 
                      : 'bg-emerald-600/10 text-emerald-400 font-medium border-emerald-500/20'
                    : isLight 
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-200 border-transparent font-normal' 
                      : 'text-slate-500 hover:text-slate-200 hover:bg-zinc-900 hover:border-zinc-800/40 border-transparent font-normal'
                }`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500 rounded-r transition-transform duration-300 ${active ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100'}`} />
                <Icon size={15} strokeWidth={1.5} className="group-hover:text-emerald-500 transition-colors duration-200" />
                <span className="flex-1 text-left group-hover:translate-x-0.5 transition-transform duration-200">{label}</span>
                {label === 'Notifications' && unread > 0 && (
                  <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{unread}</span>
                )}
              </button>
            )
          })}
        </nav>
        <div className={`p-3 border-t space-y-1 transition-colors duration-300 ${
          isLight ? 'border-zinc-200' : 'border-zinc-800/60'
        }`}>
          <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors duration-300 ${
            isLight ? 'border-zinc-200 bg-[#f4f4f5]' : 'border-zinc-800/60 bg-zinc-900/50'
          }`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${
              isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            }`}>{initials}</div>
            <div className="flex-1 min-w-0">
              <p className={`text-[12px] font-semibold truncate ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{user?.fullName}</p>
              <p className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Patient</p>
            </div>
          </div>
          <button onClick={() => { logout(); router.push('/login') }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 ${
              isLight ? 'text-slate-500 hover:text-red-600 hover:bg-red-50' : 'text-slate-500 hover:text-red-400 hover:bg-red-500/5'
            }`}>
            <LogOut size={15} strokeWidth={1.5} /><span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className={`h-14 border-b flex items-center justify-between px-6 flex-shrink-0 transition-colors duration-300 ${
          isLight ? 'bg-[#fafaf9] border-zinc-200' : 'bg-[#0a0a0c] border-zinc-800/60'
        }`}>
          <div>
            <p className={`text-[13px] font-semibold transition-colors duration-300 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>Notifications</p>
            <p className="text-[11px] text-slate-500">{unread > 0 ? unread + ' unread' : 'All caught up'}</p>
          </div>
          <div className="flex items-center gap-3">
            {unread > 0 && (
              <button onClick={markAllRead} className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold border rounded-lg transition-all ${
                isLight 
                  ? 'text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border-slate-200' 
                  : 'text-slate-400 hover:text-slate-200 bg-zinc-900 hover:bg-zinc-800 border-zinc-800'
              }`}>
                <CheckCheck size={13} strokeWidth={1.5} /> Mark all read
              </button>
            )}
            <div className={`w-px h-5 ${isLight ? 'bg-zinc-200' : 'bg-zinc-800'}`} />
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold ${
              isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            }`}>{initials}</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {loading ? (
            <div className={`h-64 rounded-2xl border animate-pulse transition-colors duration-300 ${
              isLight ? 'bg-white border-zinc-200' : 'bg-zinc-900/40 border-zinc-800/60'
            }`} />
          ) : notifications.length === 0 ? (
            <div className={`border rounded-2xl p-14 text-center transition-colors duration-300 ${
              isLight ? 'bg-[#fafaf9] border-zinc-200 shadow-sm' : 'bg-[#121214] border-zinc-800/80'
            }`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                isLight ? 'bg-slate-100 border border-slate-200' : 'bg-zinc-900 border border-zinc-800'
              }`}>
                <Bell size={20} strokeWidth={1.5} className="text-slate-400" />
              </div>
              <p className="text-[13px] text-slate-500">No notifications yet</p>
            </div>
          ) : (
            <div className={`border rounded-2xl overflow-hidden transition-colors duration-300 ${
              isLight ? 'bg-[#fafaf9] border-zinc-200 shadow-sm' : 'bg-[#121214] border-zinc-800/80'
            }`}>
              <div className={`divide-y transition-colors duration-300 ${
                isLight ? 'divide-slate-100' : 'divide-zinc-800/40'
              }`}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) markRead(n.id)
                      if (n.type === 'LAB_RESULT_UPLOADED') router.push('/patient/dossier')
                      if (n.type === 'PRESCRIPTION_ADDED')  router.push('/patient/dossier')
                      if (n.type === 'ACCESS_REQUEST')      router.push('/patient/access')
                      if (n.type === 'ACCESS_GRANTED')      router.push('/patient/dossier')
                      if (n.type === 'ACCESS_REVOKED')      router.push('/patient/dossier')
                      if (n.type === 'DOSSIER_VIEWED')      router.push('/patient/dossier')
                    }}
                    className={`flex items-start gap-4 px-6 py-4 transition-colors cursor-pointer ${
                      !n.isRead 
                        ? isLight ? 'hover:bg-emerald-50/40' : 'hover:bg-zinc-900/30' 
                        : isLight ? 'opacity-60 hover:bg-slate-50' : 'opacity-60 hover:bg-zinc-900/20'
                    }`}
                  >
                    <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                      !n.isRead 
                        ? isLight 
                          ? 'bg-emerald-100 border-emerald-200 text-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                        : isLight 
                          ? 'bg-slate-100 border-slate-200 text-slate-400' 
                          : 'bg-zinc-900 border-zinc-800 text-slate-500'
                    }`}>
                      <Bell size={14} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <p className={`text-[13px] font-semibold truncate ${
                          !n.isRead 
                            ? isLight ? 'text-slate-800' : 'text-slate-200' 
                            : 'text-slate-500'
                        }`}>{n.message}</p>
                        <span className="text-[11px] font-mono text-slate-500 flex-shrink-0">{timeAgo(n.createdAt)}</span>
                      </div>
                    </div>
                    {!n.isRead && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-2" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
