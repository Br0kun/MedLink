'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const { user, init } = useAuthStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    init()
    setReady(true)
  }, [])

  useEffect(() => {
    if (ready && !user) router.push('/login')
  }, [ready, user])

  if (!ready || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-black text-slate-400">
      <p className="text-xs font-semibold tracking-widest uppercase">Initializing Medical Environment...</p>
    </div>
  )

  return <>{children}</>
}