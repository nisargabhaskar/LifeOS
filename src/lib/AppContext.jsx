import { createContext, useContext, useEffect, useState } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [settings, setSettings] = useState({
    theme: 'light',
    persona: 'student',
    ollama_model: 'llama3.1',
  })

  useEffect(() => {
    const saved = localStorage.getItem('lifeos_settings')
    if (saved) {
      try { setSettings(prev => ({ ...prev, ...JSON.parse(saved) })) } catch {}
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
    <AppContext.Provider value={{ settings, updateSettings, toggleTheme }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
