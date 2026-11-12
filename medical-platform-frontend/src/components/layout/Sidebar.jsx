'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { LayoutDashboard, FolderOpen, ShieldCheck, Bell, Users, BarChart3, LogOut, Heart, ChevronRight, Clock, UserCheck, Inbox, MessageSquare, ShieldAlert } from 'lucide-react'

const navByRole = {
  PATIENT: [
    { label: 'Dashboard',     path: '/patient',               icon: LayoutDashboard },
    { label: 'My dossier',    path: '/patient/dossier',       icon: FolderOpen },
    { label: 'Access',        path: '/patient/access',        icon: ShieldCheck },
    { label: 'Notifications', path: '/patient/notifications', icon: Bell },
  ],
  DOCTOR: [
    { label: 'Dashboard',     path: '/doctor',                icon: LayoutDashboard },
    { label: 'Inbox',         path: '/doctor/inbox',          icon: Inbox },
    { label: 'Patients',      path: '/doctor/patients',       icon: Users },
    { label: 'Safety Net',    path: '/doctor/duty',           icon: ShieldAlert },
    { label: 'Chat',          path: '/doctor/chat',           icon: MessageSquare },
  ],
  LAB: [
    { label: 'Dashboard',     path: '/lab',                   icon: LayoutDashboard },
  ],
  ADMIN: [
    { label: 'Overview',      path: '/admin',                 icon: LayoutDashboard },
    { label: 'SLA Analytics', path: '/admin/sla',             icon: Clock },
    { label: 'Users',         path: '/admin/users',           icon: Users },
    { label: 'Audit log',     path: '/admin/audit',           icon: BarChart3 },
  ],
}

export default function Sidebar() {
  const router   = useRouter()
  const pathname = usePathname()
  const user     = useAuthStore((s) => s.user)
  const logout   = useAuthStore((s) => s.logout)
  const nav      = navByRole[user?.role] || []

  return (
    <aside className="w-64 h-screen bg-[#070A11] border-r border-slate-800/80 flex flex-col flex-shrink-0 relative z-20">
      {/* Living Logo Section */}
      <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-800/80 flex-shrink-0">
        <div className="relative flex items-center justify-center w-8 h-8">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping opacity-75" />
          <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)] z-10">
            <Heart size={16} strokeWidth={2.5} className="text-white animate-heartbeat" />
          </div>
        </div>
        <span className="text-[15px] font-bold text-slate-100 tracking-tight">MedPlatform</span>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 py-3">Menu</p>
        {nav.map(({ label, path, icon: Icon }) => {
          const active = pathname === path
          return (
            <button
              key={path}
              onClick={() => router.push(path)}
              className={
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200 active:scale-95 ' +
                (active 
                  ? 'bg-blue-500/10 text-blue-400 font-medium border border-blue-500/20 shadow-[inset_0_0_10px_rgba(59,130,246,0.05)]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent font-normal')
              }
            >
              <Icon size={16} strokeWidth={active ? 2 : 1.5} />
              <span className="flex-1 text-left">{label}</span>
              {active && <ChevronRight size={14} strokeWidth={2} className="text-blue-500/50" />}
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-800/80">
        <button
          onClick={() => { logout(); router.push('/login') }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 active:scale-95 transition-all duration-200"
        >
          <LogOut size={16} strokeWidth={1.5} />
          <span className="font-medium">Sign out</span>
        </button>
      </div>
    </aside>
  )
}