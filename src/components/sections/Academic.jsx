import { useState, useEffect } from 'react'
import { Plus, X, ChevronUp, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format, differenceInDays, isPast } from 'date-fns'
import './Academic.css'

export default function Academic() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ name: '', subject: '', due_at: '', progress: 0, notes: '' })
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('academics').select('*').order('due_at', { ascending: true })
    if (data) setItems(data)
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    await supabase.from('academics').insert([{ ...form, progress: Number(form.progress) }])
    setForm({ name: '', subject: '', due_at: '', progress: 0, notes: '' })
    setAdding(false)
    setSaving(false)
    load()
  }

  async function updateProgress(id, delta) {
    const item = items.find(i => i.id === id)
    if (!item) return
    const newProg = Math.min(100, Math.max(0, item.progress + delta))
    await supabase.from('academics').update({ progress: newProg }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, progress: newProg } : i))
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
    <div className="academic stagger">
      <div className="section-header">
        <h2>Academic</h2>
        <button className="add-btn" onClick={() => setAdding(true)}>
          <Plus size={15} /> Add
        </button>
      </div>

      {adding && (
        <div className="add-form fade-in">
          <input placeholder="Assignment / subject name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input placeholder="Subject (e.g. Mathematics)" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
          <input type="date" value={form.due_at} onChange={e => setForm(f => ({ ...f, due_at: e.target.value }))} />
          <div className="form-row">
            <label>Progress: {form.progress}%</label>
            <input type="range" min="0" max="100" step="5" value={form.progress} onChange={e => setForm(f => ({ ...f, progress: e.target.value }))} />
          </div>
          <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          <div className="form-actions">
            <button className="cancel-btn" onClick={() => setAdding(false)}>Cancel</button>
            <button className="save-btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      )}

      {active.length === 0 && !adding && (
        <div className="empty-state">No active assignments. Add one above.</div>
      )}

      <div className="acad-list">
        {active.map(item => {
          const u = urgency(item.due_at)
          return (
            <div key={item.id} className={`acad-card urgency-${u}`}>
              <div className="acad-top">
                <div>
                  <p className="acad-name">{item.name}</p>
                  {item.subject && <p className="acad-subject">{item.subject}</p>}
                </div>
                <div className="acad-right">
                  {item.due_at && (
                    <span className={`due-badge due-${u}`}>
                      {u === 'overdue' ? 'Overdue' : u === 'urgent' ? `${differenceInDays(new Date(item.due_at), new Date())}d left` : format(new Date(item.due_at), 'MMM d')}
                    </span>
                  )}
                  <button className="icon-btn" onClick={() => remove(item.id)}><X size={13} /></button>
                </div>
              </div>

              <div className="acad-progress">
                <div className="prog-track">
                  <div className="prog-fill" style={{ width: `${item.progress}%` }} />
                </div>
                <div className="prog-controls">
                  <button onClick={() => updateProgress(item.id, -10)}><ChevronDown size={13} /></button>
                  <span>{item.progress}%</span>
                  <button onClick={() => updateProgress(item.id, 10)}><ChevronUp size={13} /></button>
                </div>
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
                <button className="icon-btn" onClick={() => remove(item.id)}><X size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
