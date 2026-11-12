import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user:  null,
  token: null,

  init: () => {
    try {
      const user  = JSON.parse(localStorage.getItem('user') || 'null')
      const token = localStorage.getItem('token') || null
      set({ user, token })
    } catch {
      set({ user: null, token: null })
    }
  },

  login: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('token', token)
    set({ user, token })
  },

  logout: () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },
}))