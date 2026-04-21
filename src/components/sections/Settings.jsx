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
        <h3>AI model</h3>
        <p className="section-desc">Override which model to use. Leave on Auto to let the app decide per task.</p>

        <div className="auto-table">
          <p className="auto-title">Auto-select defaults</p>
          {Object.entries(MODEL_AUTO).map(([task, model]) => (
            <div key={task} className="auto-row">
              <span className="auto-task">{task}</span>
              <span className="auto-model">{model}</span>
            </div>
          ))}
        </div>

        <div className="setting-row" style={{ marginTop: 16 }}>
          <div>
            <p className="setting-label">Override model</p>
            <p className="setting-desc">Force all tasks to use one model</p>
          </div>
          <select value={settings.ai_override || ''} onChange={e => set('ai_override', e.target.value || null)}>
            <option value="">Auto (recommended)</option>
            <option value="ollama">Ollama (local)</option>
            <option value="gemini">Gemini</option>
            <option value="claude">Claude</option>
          </select>
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

      <section className="settings-section">
        <h3>API keys</h3>
        <p className="section-desc">Only needed if you use Gemini or Claude. Keys are stored locally on your device.</p>

        <div className="key-field">
          <label>Gemini API key</label>
          <div className="key-input-wrap">
            <input
              type={showGemini ? 'text' : 'password'}
              placeholder="AIza…"
              value={settings.gemini_key || ''}
              onChange={e => set('gemini_key', e.target.value)}
            />
            <button onClick={() => setShowGemini(v => !v)}>
              {showGemini ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="key-link">Get free Gemini key →</a>
        </div>

        <div className="key-field">
          <label>Claude API key</label>
          <div className="key-input-wrap">
            <input
              type={showClaude ? 'text' : 'password'}
              placeholder="sk-ant-…"
              value={settings.claude_key || ''}
              onChange={e => set('claude_key', e.target.value)}
            />
            <button onClick={() => setShowClaude(v => !v)}>
              {showClaude ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer" className="key-link">Get Claude key →</a>
        </div>

        <button className="save-keys-btn" onClick={saveKeys}>
          {saved ? <><Check size={14} /> Saved</> : 'Save keys'}
        </button>
      </section>

      <section className="settings-section">
        <h3>Supabase</h3>
        <p className="section-desc">Your database for syncing across devices. Add your project credentials to <code>.env</code>.</p>
        <div className="code-block">
          <p>VITE_SUPABASE_URL=your_url</p>
          <p>VITE_SUPABASE_ANON_KEY=your_key</p>
        </div>
        <a href="https://supabase.com" target="_blank" rel="noreferrer" className="key-link">Create free Supabase project →</a>
      </section>

      <section className="settings-section">
        <h3>Google Calendar</h3>
        <p className="section-desc">Add your Google OAuth client ID to <code>.env</code> to enable calendar sync.</p>
        <div className="code-block">
          <p>VITE_GOOGLE_CLIENT_ID=your_client_id</p>
        </div>
        <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="key-link">Set up Google OAuth →</a>
      </section>
    </div>
  )
}
