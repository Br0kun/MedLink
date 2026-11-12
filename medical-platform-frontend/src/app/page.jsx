'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'

export default function Home() {
  const router = useRouter()
  const { user, init } = useAuthStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    init()
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    if (!user) { router.push('/login'); return }
    const routes = { PATIENT: '/patient', DOCTOR: '/doctor', LAB: '/lab', ADMIN: '/admin', ASSISTANT: '/assistant' }
    router.push(routes[user.role] || '/login')
  }, [ready, user])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-xs text-slate-400">Redirecting...</p>
    </div>
  )
}