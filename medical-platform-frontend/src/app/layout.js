'use client'
import { Inter } from 'next/font/google'
import './globals.css'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import MedicalBackground from '../components/MedicalBackground'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }) {
  const [theme,   setTheme]   = useState('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('dossier-theme') || 'light'
    setTheme(savedTheme)

    const handleSync = () => {
      setTheme(localStorage.getItem('dossier-theme') || 'light')
    }
    window.addEventListener('themechange', handleSync)
    return () => window.removeEventListener('themechange', handleSync)
  }, [])

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme')
      document.body.classList.remove('dark-theme')
    } else {
      document.body.classList.add('dark-theme')
      document.body.classList.remove('light-theme')
    }
  }, [theme])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('dossier-theme', next)
    window.dispatchEvent(new Event('themechange'))
  }

  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {/* Canvas-based living particle network background — renders on every page */}
        {mounted && <MedicalBackground theme={theme} />}

        {children}

        {/* Global light / dark theme toggle */}
        {mounted && (
          <button
            onClick={toggleTheme}
            className="fixed bottom-6 right-6 w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:scale-110 active:scale-95 z-50 cursor-pointer"
            aria-label="Toggle Light/Dark Theme"
          >
            {theme === 'light' ? <Moon size={18} strokeWidth={2} /> : <Sun size={18} strokeWidth={2} />}
          </button>
        )}
      </body>
    </html>
  )
}
