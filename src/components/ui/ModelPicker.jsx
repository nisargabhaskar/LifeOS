import { useState } from 'react'
import { Cpu } from 'lucide-react'
import './ModelPicker.css'

const MODELS = [
  { id: 'auto',   label: 'Auto' },
  { id: 'ollama', label: 'Ollama' },
  { id: 'gemini', label: 'Gemini' },
  { id: 'claude', label: 'Claude' },
]

export default function ModelPicker({ value, onChange, taskType }) {
  const [open, setOpen] = useState(false)
  const current = MODELS.find(m => m.id === (value || 'auto'))

  return (
    <div className="model-picker">
      <button className="model-trigger" onClick={() => setOpen(v => !v)}>
        <Cpu size={12} />
        <span>{current.label}</span>
        <span className="model-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="model-dropdown fade-in">
          {MODELS.map(m => (
            <button
              key={m.id}
              className={`model-option ${(value || 'auto') === m.id ? 'active' : ''}`}
              onClick={() => { onChange(m.id); setOpen(false) }}
            >
              <span className={`model-dot dot-${m.id}`} />
              {m.label}
              {m.id === 'auto' && taskType && <span className="model-hint">→ {autoFor(taskType)}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function autoFor(taskType) {
  const map = { classify: 'Ollama', plan: 'Gemini', research: 'Claude', chat: 'Ollama', finance: 'Ollama', schedule: 'Gemini' }
  return map[taskType] || 'Ollama'
}
