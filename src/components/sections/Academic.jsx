import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format, differenceInDays, isPast } from 'date-fns'
import './Academic.css'

const PROGRESS_STEPS = [
  { label: 'Not started', value: 0 },
  { label: 'Just started', value: 25 },
  { label: 'Halfway',      value: 50 },
  { label: 'Almost done',  value: 75 },
  { label: 'Done',         value: 100 },
]

export default function Academic() {
  const [items, setItems]   = useState([])
  const [form, setForm]     = useState({ name: '', subject: '', due_at: '', progress: 0, notes: '' })
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [model, setModel]   = useState('auto')
  const [error, setError]   = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setError(null)
    const { data, error: err } = await supabase.from('academics').select('*').order('due_at', { ascending: true })
    if (err) { setError('Could not load — check your Supabase config in .env'); return }
    if (data) setItems(data)
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const { error: err } = await supabase.from('academics').insert([{ ...form, progress: Number(form.progress) }])
    if (err) { setError(err.message); setSaving(false); return }
    setForm({ name: '', subject: '', due_at: '', progress: 0, notes: '' })
    setAdding(false)
    setSaving(false)
    load()
  }

  async function setProgress(id, value) {
    await supabase.from('academics').update({ progress: value }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, progress: value } : i))
  }

  async function remove(id) {
    await supabase.from('academics').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function urgency(due) {
    if (!due) return 'none'
    const days = differenceInDays(new Date(due), new Date())
    if (isPast(new Date(due))) return 'overdue'
    if (days <= 3) return 'urgent'
    if (days <= 7) return 'soon'
    return 'ok'
  }

  const active = items.filter(i => i.progress < 100)
  const done   = items.filter(i => i.progress === 100)

  return (
    <div className="academic">
      <div className="section-header">
        <h2>Academic</h2>
        <button className="add-btn" onClick={() => setAdding(true)}>
          <Plus size={15} /> Add
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {adding && (
        <div className="add-form fade-in">
          <input
            placeholder="Assignment or subject name *"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            autoFocus
          />
          <div className="form-two-col">
            <input
              placeholder="Subject (e.g. Maths)"
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            />
            <input
              type="date"
              value={form.due_at}
              onChange={e => setForm(f => ({ ...f, due_at: e.target.value }))}
            />
          </div>
          <div className="progress-pick-label">Starting progress</div>
          <div className="progress-steps">
            {PROGRESS_STEPS.map(s => (
              <button
                key={s.value}
                className={`prog-step ${Number(form.progress) === s.value ? 'active' : ''}`}
                onClick={() => setForm(f => ({ ...f, progress: s.value }))}
              >
                <span className="prog-step-pct">{s.value}%</span>
                <span className="prog-step-label">{s.label}</span>
              </button>
            ))}
          </div>
          <textarea
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={2}
          />
          <div className="form-actions">
            <button className="cancel-btn" onClick={() => setAdding(false)}>Cancel</button>
            <button className="save-btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      )}

      {active.length === 0 && !adding && !error && (
        <div className="empty-state">No active assignments. Hit Add to track one.</div>
      )}

      <div className="acad-list stagger">
        {active.map(item => {
          const u = urgency(item.due_at)
          return (
            <div key={item.id} className={`acad-card urgency-${u}`}>
              <div className="acad-top">
                <div className="acad-info">
                  <p className="acad-name">{item.name}</p>
                  {item.subject && <p className="acad-subject">{item.subject}</p>}
                </div>
                <div className="acad-right">
                  {item.due_at && (
                    <span className={`due-badge due-${u}`}>
                      {u === 'overdue' ? 'Overdue'
                        : u === 'urgent' ? `${differenceInDays(new Date(item.due_at), new Date())}d left`
                        : format(new Date(item.due_at), 'MMM d')}
                    </span>
                  )}
                  <button className="icon-btn" onClick={() => remove(item.id)}><X size={13} /></button>
                </div>
              </div>

              <div className="prog-bar-visual">
                <div className="prog-bar-fill" style={{ width: `${item.progress}%` }} />
              </div>

              <div className="progress-steps compact">
                {PROGRESS_STEPS.map(s => (
                  <button
                    key={s.value}
                    className={`prog-step ${item.progress === s.value ? 'active' : ''} ${item.progress > s.value ? 'passed' : ''}`}
                    onClick={() => setProgress(item.id, s.value)}
                    title={s.label}
                  >
                    <span className="prog-step-pct">{s.value}%</span>
                    <span className="prog-step-label">{s.label}</span>
                  </button>
                ))}
              </div>

              {item.notes && <p className="acad-notes">{item.notes}</p>}
            </div>
          )
        })}
      </div>

      {done.length > 0 && (
        <div className="done-section">
          <p className="done-label">Completed ({done.length})</p>
          {done.map(item => (
            <div key={item.id} className="acad-card done-card">
              <div className="acad-top">
                <p className="acad-name done-name">{item.name}</p>
                <button className="icon-btn" onClick={() => remove(item.id)}><X size={12} /></button>
              </div>
              <div className="prog-bar-visual"><div className="prog-bar-fill" style={{ width: '100%' }} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
