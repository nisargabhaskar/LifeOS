import { useState } from 'react'
import { useApp } from '../../lib/AppContext'
import { Check, Eye, EyeOff } from 'lucide-react'
import './Settings.css'

const PERSONAS = ['Student', 'Professional', 'Freelancer', 'Entrepreneur', 'Creative']
const OLLAMA_MODELS = ['llama3.1', 'llama3.1:70b', 'mistral', 'gemma2', 'phi3']

export default function Settings() {
  const { settings, updateSettings, toggleTheme } = useApp()
  const [showClaude, setShowClaude] = useState(false)
  const [showGemini, setShowGemini] = useState(false)
  const [saved, setSaved] = useState(false)

  function set(key, val) { updateSettings({ [key]: val }) }

  function saveKeys() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const MODEL_AUTO = {
    classify: 'Ollama',
    plan:     'Gemini',
    research: 'Claude',
    chat:     'Ollama',
    finance:  'Ollama',
    schedule: 'Gemini',
  }

  return (
    <div className="settings stagger">
      <h2 className="settings-title">Settings</h2>

      <section className="settings-section">
        <h3>Appearance</h3>
        <div className="setting-row">
          <div>
            <p className="setting-label">Theme</p>
            <p className="setting-desc">Switch between light and dark</p>
          </div>
          <div className="theme-toggle-wrap">
            <button className={`theme-option ${settings.theme === 'light' ? 'active' : ''}`} onClick={() => set('theme','light')}>Light</button>
            <button className={`theme-option ${settings.theme === 'dark'  ? 'active' : ''}`} onClick={() => set('theme','dark')}>Dark</button>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3>Persona</h3>
        <p className="section-desc">Shapes how the AI plans your day and gives suggestions</p>
        <div className="persona-grid">
          {PERSONAS.map(p => (
            <button
              key={p}
              className={`persona-btn ${settings.persona === p.toLowerCase() ? 'active' : ''}`}
              onClick={() => set('persona', p.toLowerCase())}
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h3>Ollama</h3>
        <p className="section-desc">Runs locally on your Mac — no API key needed. Make sure Ollama is running (<code>ollama serve</code>).</p>
        <div className="setting-row">
          <p className="setting-label">Model</p>
          <select value={settings.ollama_model || 'llama3.1'} onChange={e => set('ollama_model', e.target.value)}>
            {OLLAMA_MODELS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      </section>

    </div>
  )
}
