'use client'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import api from '@/lib/api'
import { getSocket } from '@/lib/socket'

export default function Navbar() {
  const user   = useAuthStore((s) => s.user)
  const router = useRouter()
  const [unread, setUnread]   = useState(0)
  const [pulse,  setPulse]    = useState(false)

  useEffect(() => {
    if (!user) return

    // Load initial unread count
    if (user.role === 'PATIENT') {
      api.get('/notifications/unread').then((r) => setUnread(r.data.count)).catch(() => {})
    }

    // Listen for real-time notifications
    const socket = getSocket()
    socket.on('notification', (n) => {
      setUnread((prev) => prev + 1)
      setPulse(true)
      setTimeout(() => setPulse(false), 3000)
    })

    return () => socket.off('notification')
  }, [user])

  const initials = user?.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  const roleColor = {
    PATIENT: 'bg-blue-50 text-blue-700',
    DOCTOR:  'bg-teal-50 text-teal-700',
    LAB:     'bg-violet-50 text-violet-700',
    ADMIN:   'bg-amber-50 text-amber-700',
  }

  return (
    <header className="h-14 bg-white border-b border-zinc-200/60 flex items-center justify-between px-6 flex-shrink-0">
      <div />
      <div className="flex items-center gap-2">
        {user?.role === 'PATIENT' && (
          <button
            onClick={() => { router.push('/patient/notifications'); setUnread(0) }}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all duration-150"
          >
            <Bell
              size={15}
              strokeWidth={1.5}
              className={pulse ? 'animate-bounce text-blue-500' : ''}
            />
            {unread > 0 && (
              <span className={
                'absolute top-1 right-1 min-w-[14px] h-[14px] bg-blue-600 text-white text-[8px] font-medium rounded-full flex items-center justify-center px-0.5 ' +
                (pulse ? 'animate-ping' : '')
              }>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
            {pulse && (
              <span className="absolute top-1 right-1 min-w-[14px] h-[14px] bg-blue-400 rounded-full animate-ping opacity-75" />
            )}
          </button>
        )}
        <div className="w-px h-5 bg-zinc-200/60 mx-1" />
        <div className="flex items-center gap-2">
          <div className={'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium ' + (roleColor[user?.role] || 'bg-zinc-100 text-zinc-600')}>
            {initials}
          </div>
          <div className="hidden sm:block">
            <p className="text-[12px] font-medium text-zinc-900 leading-none">{user?.fullName}</p>
            <p className="text-[10px] text-zinc-400 mt-0.5 capitalize">{user?.role?.toLowerCase()}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
