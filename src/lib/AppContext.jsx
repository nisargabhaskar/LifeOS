import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [settings, setSettings] = useState({
    theme: 'light',
    persona: 'student',
    ai_model: 'ollama',
    ollama_model: 'llama3.1',
    ai_override: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('lifeos_settings')
    if (saved) {
      try { setSettings(JSON.parse(saved)) } catch {}
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme)
    localStorage.setItem('lifeos_settings', JSON.stringify(settings))
  }, [settings])

  function updateSettings(patch) {
    setSettings(prev => ({ ...prev, ...patch }))
  }

  function toggleTheme() {
    updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' })
  }

  return (
    <AppContext.Provider value={{ user, settings, updateSettings, toggleTheme, loading }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
