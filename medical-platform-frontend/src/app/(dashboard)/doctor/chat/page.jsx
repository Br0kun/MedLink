'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import api from '@/lib/api'
import { getSocket } from '@/lib/socket'
import {
  Activity, LogOut, LayoutDashboard, Users, Inbox, MessageSquare, Send, Search, Circle, CheckCheck, Check, Stethoscope, ArrowLeft, FlaskConical, Pill, ExternalLink, FileText, Share2, ShieldCheck, UserCheck, Calendar
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard',     path: '/doctor',          icon: LayoutDashboard },
  { label: 'Inbox',         path: '/doctor/inbox',    icon: Inbox },
  { label: 'Patients',      path: '/doctor/patients', icon: Users },
  { label: 'Duty & Status', path: '/doctor/duty',     icon: UserCheck },
  { label: 'Chat',          path: '/doctor/chat',     icon: MessageSquare },
  { label: 'Staff',         path: '/doctor/staff',    icon: ShieldCheck },
  { label: 'Schedule',      path: '/doctor/schedule', icon: Calendar },
]

const specialtyLabel = (s) => s.charAt(0) + s.slice(1).toLowerCase()

const timeStr = (date) => {
  const d = new Date(date)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7)  return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function DoctorChatPage() {
  const user   = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()

  const [doctors,       setDoctors]       = useState([])
  const [selected,      setSelected]      = useState(null)  // { userId, fullName, specialty, ... }
  const [messages,      setMessages]      = useState([])
  const [draft,         setDraft]         = useState('')
  const [sending,       setSending]       = useState(false)
  const [loadingDocs,   setLoadingDocs]   = useState(true)
  const [loadingMsgs,   setLoadingMsgs]   = useState(false)
  const [search,        setSearch]        = useState('')
  const [totalUnread,   setTotalUnread]   = useState(0)
  const [inboxCount,    setInboxCount]    = useState(0)
  const [mobileView,    setMobileView]    = useState('list') // 'list' | 'chat'

  const bottomRef    = useRef(null)
  const inputRef     = useRef(null)
  const initials     = user?.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  // ── Load doctor list ──────────────────────────────────────
  const loadDoctors = useCallback(async () => {
    try {
      const [docsRes, unreadRes, inboxRes] = await Promise.all([
        api.get('/doctor/chat/doctors'),
        api.get('/doctor/chat/unread-total'),
        api.get('/doctor/inbox/count'),
      ])
      setDoctors(docsRes.data)
      setTotalUnread(unreadRes.data.count)
      setInboxCount(inboxRes.data.count)
    } catch (err) {
      console.error('[Chat] loadDoctors error:', err)
    } finally {
      setLoadingDocs(false)
    }
  }, [])

  // ── Load messages for selected doctor ────────────────────
  const loadMessages = useCallback(async (otherUserId) => {
    setLoadingMsgs(true)
    try {
      const res = await api.get(`/doctor/chat/${otherUserId}/messages`)
      setMessages(res.data)
      // Mark that doctor's unread as 0 locally
      setDoctors((prev) =>
        prev.map((d) => d.userId === otherUserId ? { ...d, unread: 0 } : d)
      )
      // Recalculate total unread
      const unreadRes = await api.get('/doctor/chat/unread-total')
      setTotalUnread(unreadRes.data.count)
    } catch (err) {
      console.error('[Chat] loadMessages error:', err)
    } finally {
      setLoadingMsgs(false)
    }
  }, [])

  // ── Socket.IO listeners ───────────────────────────────────
  useEffect(() => {
    loadDoctors()
    const socket = getSocket()

    socket.on('chat_message', (msg) => {
      // If the message is from the currently open conversation, append it
      setSelected((sel) => {
        if (sel?.userId === msg.senderId) {
          setMessages((prev) => [...prev, msg])
          // Auto mark read (the API call is already done when we fetched)
          api.get(`/doctor/chat/${msg.senderId}/messages`).catch(() => {})
        } else {
          // Increment unread for that sender
          setDoctors((prev) =>
            prev.map((d) =>
              d.userId === msg.senderId ? { ...d, unread: (d.unread || 0) + 1 } : d
            )
          )
          setTotalUnread((n) => n + 1)
        }
        return sel
      })
    })

    socket.on('messages_read', ({ conversationKey }) => {
      // The other person has read our messages — update read status visually
      setMessages((prev) =>
        prev.map((m) => conversationKey.includes(m.receiverId) ? { ...m, isRead: true } : m)
      )
    })

    return () => {
      socket.off('chat_message')
      socket.off('messages_read')
    }
  }, [loadDoctors])

  // ── Auto-scroll to bottom ─────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Select a doctor to chat ───────────────────────────────
  const selectDoctor = (doc) => {
    setSelected(doc)
    setMessages([])
    setMobileView('chat')
    loadMessages(doc.userId)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // ── Send message ──────────────────────────────────────────
  const handleSend = async () => {
    if (!draft.trim() || !selected || sending) return
    setSending(true)
    const content = draft.trim()
    setDraft('')
    try {
      const res = await api.post(`/doctor/chat/${selected.userId}`, { content })
      setMessages((prev) => [...prev, res.data])
    } catch (err) {
      console.error('[Chat] sendMessage error:', err)
      setDraft(content) // restore on failure
    } finally {
      setSending(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const filtered = doctors.filter((d) =>
    d.fullName.toLowerCase().includes(search.toLowerCase()) ||
    d.specialty.toLowerCase().includes(search.toLowerCase())
  )

  // ── Sidebar ───────────────────────────────────────────────
  const Sidebar = () => (
    <aside className="w-56 h-screen bg-[#080C14] border-r border-slate-800/60 flex flex-col flex-shrink-0 hidden md:flex">
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
              {label === 'Inbox' && inboxCount > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-white">{inboxCount}</span>
              )}
              {label === 'Chat' && totalUnread > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-600 text-white animate-pulse">{totalUnread}</span>
              )}
            </button>
          )
        })}
      </nav>
      <div className="p-3 border-t border-slate-800/60 space-y-1">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-800/60 bg-slate-900/40">
          <div className="w-7 h-7 rounded-full bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-[11px] font-medium text-teal-400 flex-shrink-0">{initials}</div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-slate-200 truncate">{user?.fullName}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.specialty ? user.specialty : 'Doctor'}{user?.licenseNumber ? ` • ${user.licenseNumber}` : ''}</p>
          </div>
        </div>
        <button onClick={() => { logout(); router.push('/login') }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
        ><LogOut size={15} strokeWidth={1.5} /><span>Sign out</span></button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[#0B0F19] text-slate-200 font-sans">
      <Sidebar />

      {/* ── Doctor list panel ─────────────────────── */}
      <div className={`w-full md:w-72 flex-shrink-0 flex flex-col border-r border-slate-800/60 bg-[#080C14] ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="h-14 flex items-center gap-2 px-4 border-b border-slate-800/60 flex-shrink-0">
          <MessageSquare size={16} strokeWidth={1.5} className="text-blue-400" />
          <p className="text-[13px] font-semibold text-slate-200 flex-1">Consultations</p>
          {totalUnread > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">{totalUnread} new</span>
          )}
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-800/40">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search doctors..."
              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-[12px] text-slate-300 placeholder-slate-600 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </div>

        {/* Doctor list */}
        <div className="flex-1 overflow-y-auto">
          {loadingDocs ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 bg-slate-800 rounded w-2/3" />
                    <div className="h-2 bg-slate-800/60 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <Stethoscope size={24} strokeWidth={1} className="text-slate-700 mx-auto mb-3" />
              <p className="text-[12px] text-slate-600">No doctors found</p>
            </div>
          ) : (
            filtered.map((doc) => {
              const isActive = selected?.userId === doc.userId
              const docInitials = doc.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
              return (
                <button
                  key={doc.userId}
                  onClick={() => selectDoctor(doc)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all duration-150 border-b border-slate-800/40 text-left group
                    ${isActive ? 'bg-blue-600/10 border-l-2 border-l-blue-500' : 'hover:bg-slate-800/40'}`}
                >
                  <div className="relative flex-shrink-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold border
                      ${isActive ? 'bg-blue-600/20 border-blue-500/40 text-blue-300' : 'bg-slate-800 border-slate-700/60 text-slate-400'}`}>
                      {docInitials}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#080C14]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-[12px] font-medium truncate ${isActive ? 'text-blue-300' : 'text-slate-300 group-hover:text-slate-200'}`}>
                        Dr. {doc.fullName}
                      </p>
                      {doc.unread > 0 && (
                        <span className="ml-1 flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">{doc.unread}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-600 truncate mt-0.5">{specialtyLabel(doc.specialty)}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── Chat panel ────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
              <MessageSquare size={28} strokeWidth={1} className="text-blue-400" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-slate-300">Doctor Consultations</p>
              <p className="text-[12px] text-slate-600 mt-1 max-w-xs">
                Select a colleague from the left to start a secure, real-time consultation.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="h-14 flex items-center gap-3 px-5 border-b border-slate-800/60 bg-[#080C14] flex-shrink-0">
              <button
                onClick={() => setMobileView('list')}
                className="md:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors mr-1"
              >
                <ArrowLeft size={16} strokeWidth={1.5} />
              </button>
              <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[11px] font-semibold text-blue-300 flex-shrink-0">
                {selected.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-slate-200">Dr. {selected.fullName}</p>
                <div className="flex items-center gap-1.5">
                  <Circle size={6} className="text-emerald-500 fill-emerald-500" />
                  <p className="text-[10px] text-slateald-500 text-slate-500">{specialtyLabel(selected.specialty)} · Online</p>
                </div>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1" style={{ background: 'linear-gradient(180deg, #0B0F19 0%, #080C14 100%)' }}>
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-[11px] text-slate-600">Loading messages...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center">
                    <MessageSquare size={20} strokeWidth={1} className="text-slate-600" />
                  </div>
                  <p className="text-[12px] text-slate-600">No messages yet</p>
                  <p className="text-[11px] text-slate-700">Send a message to start the consultation</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => {
                    const isMe = msg.senderId === user?.id
                    const prevMsg = messages[idx - 1]
                    const showTime = !prevMsg || new Date(msg.sentAt) - new Date(prevMsg.sentAt) > 5 * 60 * 1000

                    return (
                      <div key={msg.id}>
                        {showTime && (
                          <div className="flex items-center justify-center my-3">
                            <span className="text-[10px] text-slate-700 bg-slate-900/60 px-2.5 py-1 rounded-full border border-slate-800/60">
                              {timeStr(msg.sentAt)}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}>
                          {(() => {
                            const isSharedRecord = msg.content?.startsWith('[SHARED_RECORD:') && msg.content?.endsWith(']')
                            let recordData = null
                            if (isSharedRecord) {
                              try { recordData = JSON.parse(msg.content.slice(15, -1)) } catch (e) {}
                            }

                            if (isSharedRecord && recordData) {
                              return (
                                <div className={`relative max-w-[88%] sm:max-w-[78%] rounded-2xl text-[13px] leading-relaxed shadow-lg border overflow-hidden ${
                                  isMe ? 'bg-[#0d1527] border-blue-500/40 text-slate-200 rounded-br-md' : 'bg-[#091224] border-emerald-500/40 text-slate-200 rounded-bl-md'
                                }`}>
                                  {/* Card Header */}
                                  <div className="bg-gradient-to-r from-blue-950/80 to-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-md bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                                        {recordData.type === 'file' && <FlaskConical size={12} />}
                                        {recordData.type === 'prescription' && <Pill size={12} />}
                                        {recordData.type === 'diagnosis' && <Stethoscope size={12} />}
                                      </div>
                                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300">
                                        Shared {recordData.type === 'file' ? 'Analysis' : recordData.type}
                                      </span>
                                    </div>
                                    <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-semibold">Consultation</span>
                                  </div>

                                  {/* Card Body */}
                                  <div className="p-4 space-y-3">
                                    <div>
                                      <p className="text-[10px] uppercase font-bold text-slate-500">Patient</p>
                                      <p className="text-xs font-semibold text-slate-200">{recordData.patientName} <span className="text-slate-400 font-normal">({recordData.patientEmail})</span></p>
                                    </div>

                                    <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800/80">
                                      <p className="text-[10px] uppercase font-bold text-slate-500">Record Title / Content</p>
                                      <p className="text-xs font-semibold text-blue-300 mt-0.5">{recordData.title}</p>
                                    </div>

                                    {recordData.note && (
                                      <div className="bg-blue-500/5 rounded-xl p-3 border border-blue-500/15">
                                        <p className="text-[10px] uppercase font-bold text-blue-400">Clinical Consultation Note</p>
                                        <p className="text-xs italic text-slate-300 mt-0.5">"{recordData.note}"</p>
                                      </div>
                                    )}

                                    {/* Action button */}
                                    <button
                                      onClick={() => router.push(`/doctor/patients?email=${encodeURIComponent(recordData.patientEmail)}`)}
                                      className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
                                    >
                                      <ExternalLink size={13} />
                                      Open Patient Dossier
                                    </button>
                                  </div>

                                  {/* Timestamp */}
                                  <div className={`px-4 pb-2.5 flex items-center gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <span className="text-[9px] text-slate-500">
                                      {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isMe && (
                                      msg.isRead ? <CheckCheck size={11} className="text-blue-400" /> : <Check size={11} className="text-slate-500" />
                                    )}
                                  </div>
                                </div>
                              )
                            }

                            return (
                              <div
                                className={`relative max-w-[70%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm
                                  ${isMe
                                    ? 'bg-blue-600 text-white rounded-br-md'
                                    : 'bg-slate-800/80 border border-slate-700/60 text-slate-200 rounded-bl-md'
                                  }`}
                              >
                                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                  <span className={`text-[9px] ${isMe ? 'text-blue-200/70' : 'text-slate-600'}`}>
                                    {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {isMe && (
                                    msg.isRead
                                      ? <CheckCheck size={11} className="text-blue-200/80" />
                                      : <Check size={11} className="text-blue-200/50" />
                                  )}
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Input bar */}
            <div className="px-5 py-4 border-t border-slate-800/60 bg-[#080C14] flex-shrink-0">
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value)
                      e.target.style.height = 'auto'
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message Dr. ${selected.fullName.split(' ')[0]}...`}
                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-[13px] text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none overflow-hidden min-h-[42px]"
                    style={{ lineHeight: '1.5' }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!draft.trim() || sending}
                  className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-150 shadow-md hover:shadow-blue-500/20 active:scale-95"
                >
                  {sending
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Send size={16} strokeWidth={1.5} className="text-white" />
                  }
                </button>
              </div>
              <p className="text-[10px] text-slate-700 mt-2">Press Enter to send · Shift+Enter for new line</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
