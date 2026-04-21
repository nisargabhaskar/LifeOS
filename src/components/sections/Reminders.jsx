import { useState, useEffect } from 'react'
import { Plus, X, Bell, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import ModelPicker from '../ui/ModelPicker'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import './Reminders.css'

export default function Reminders() {
  const [reminders, setReminders] = useState([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ text: '', remind_at: '' })
  const [saving, setSaving] = useState(false)
  const [model, setModel] = useState('auto')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('reminders').select('*').order('remind_at', { ascending: true })
    if (data) setReminders(data)
  }

  async function save() {
    if (!form.text.trim() || !form.remind_at) return
    setSaving(true)
    await supabase.from('reminders').insert([form])
    setForm({ text: '', remind_at: '' })
    setAdding(false)
    setSaving(false)
    load()
  }

  async function complete(id) {
    await supabase.from('reminders').update({ done: true }).eq('id', id)
    setReminders(prev => prev.map(r => r.id === id ? { ...r, done: true } : r))
  }

  async function remove(id) {
    await supabase.from('reminders').delete().eq('id', id)
    setReminders(prev => prev.filter(r => r.id !== id))
  }

  function timeLabel(dt) {
    const d = new Date(dt)
    if (isToday(d)) return `Today · ${format(d, 'h:mm a')}`
    if (isTomorrow(d)) return `Tomorrow · ${format(d, 'h:mm a')}`
    return format(d, 'EEE MMM d · h:mm a')
  }

  function urgency(dt) {
    const d = new Date(dt)
    if (isPast(d)) return 'overdue'
    if (isToday(d)) return 'today'
    return 'upcoming'
  }

  const pending   = reminders.filter(r => !r.done)
  const completed = reminders.filter(r => r.done)

  return (
    <div className="reminders stagger">
      <div className="section-header">
        <h2>Reminders</h2>
        <button className="add-btn" onClick={() => setAdding(true)}><Plus size={15} /> Add</button>
      </div>

      {adding && (
        <div className="add-form fade-in">
          <input placeholder="What do you need to remember? *" value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} />
          <div className="nw-field">
            <label>When</label>
            <input type="datetime-local" value={form.remind_at} onChange={e => setForm(f => ({ ...f, remind_at: e.target.value }))} />
          </div>
          <div className="form-actions">
            <button className="cancel-btn" onClick={() => setAdding(false)}>Cancel</button>
            <button className="save-btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      )}

      {pending.length === 0 && !adding && (
        <div className="empty-state">No reminders. Add one and I'll keep track.</div>
      )}

      <div className="reminder-list">
        {pending.map(r => {
          const u = urgency(r.remind_at)
          return (
            <div key={r.id} className={`reminder-card urgency-${u}`}>
              <Bell size={14} className={`bell-icon bell-${u}`} />
              <div className="reminder-body">
                <p className="reminder-text">{r.text}</p>
                <p className={`reminder-time time-${u}`}>{timeLabel(r.remind_at)}</p>
              </div>
              <div className="reminder-actions">
                <button className="done-btn" onClick={() => complete(r.id)} title="Mark done"><CheckCircle size={16} /></button>
                <button className="icon-btn" onClick={() => remove(r.id)}><X size={13} /></button>
              </div>
            </div>
          )
        })}
      </div>

      {completed.length > 0 && (
        <div className="done-section" style={{ marginTop: 24 }}>
          <p className="done-label">Completed ({completed.length})</p>
          {completed.slice(0, 5).map(r => (
            <div key={r.id} className="reminder-card done-card">
              <CheckCircle size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div className="reminder-body">
                <p className="reminder-text done-name">{r.text}</p>
              </div>
              <button className="icon-btn" onClick={() => remove(r.id)}><X size={12} /></button>
            </div>
          ))}
        </div>
      )}
      <div className="section-footer">
        <ModelPicker value={model} onChange={setModel} taskType="schedule" />
      </div>
    </div>
  )
}
