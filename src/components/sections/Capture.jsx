import { useState, useRef, useEffect } from 'react'
import { Send, Loader, CheckCircle, Calendar, ChevronDown, ChevronUp, ExternalLink, X, FileText, ArrowLeft, Save } from 'lucide-react'
import { useApp } from '../../lib/AppContext'
import { classifyCapture, generateActionPlan } from '../../lib/ai'
import { createEvent } from '../../lib/calendar'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import './Capture.css'

// ── Note Editor ──────────────────────────────────────────────────────────────
function NoteEditor({ note, onClose, onSave }) {
  const [title, setTitle] = useState(note.title || note.content?.slice(0, 60) || '')
  const [body, setBody]   = useState(note.body || note.content || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const bodyRef = useRef(null)

  useEffect(() => { bodyRef.current?.focus() }, [])

  async function save() {
    setSaving(true)
    const updated = { ...note, title, body, content: title || body, updated_at: new Date().toISOString() }
    await supabase.from('captures').update({ action_plan: { ...note.action_plan, title, body } }).eq('id', note.id)
    setSaved(true)
    setSaving(false)
    onSave(updated)
    setTimeout(() => setSaved(false), 2000)
  }

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0

  return (
    <div className="note-editor fade-in">
      <div className="note-editor-topbar">
        <button className="note-back-btn" onClick={onClose}>
          <ArrowLeft size={15} /> Back
        </button>
        <div className="note-editor-meta">
          <span className="note-wordcount">{wordCount} words</span>
          <span className={`type-badge badge-${note.type || 'note'}`}>{note.type || 'note'}</span>
        </div>
        <button className="note-save-btn" onClick={save} disabled={saving}>
          {saving ? <Loader size={13} className="spin" /> : saved ? <CheckCircle size={13} /> : <Save size={13} />}
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
        </button>
      </div>

      <div className="note-editor-body">
        <input
          className="note-title-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); bodyRef.current?.focus() } }}
        />
        <textarea
          ref={bodyRef}
          className="note-body-input"
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Write anything — this is your space. Continue where you left off, add more context, paste links, keep notes…"
        />
      </div>

      {note.action_plan?.steps?.length > 0 && (
        <div className="note-action-plan">
          <p className="plan-section-title">Action plan</p>
          {note.action_plan.first_action && (
            <div className="first-action" style={{ marginBottom: 8 }}>
              <CheckCircle size={13} />
              <span>Start here: {note.action_plan.first_action}</span>
            </div>
          )}
          {note.action_plan.steps.map((s, i) => (
            <div key={i} className="plan-step">
              <span className="step-num">{s.order}</span>
              <div>
                <p className="step-title">{s.title}</p>
                <p className="step-desc">{s.description}</p>
              </div>
            </div>
          ))}
          {note.action_plan.references?.length > 0 && (
            <div className="references" style={{ marginTop: 12 }}>
              <p className="ref-title">References</p>
              {note.action_plan.references.map((r, i) => (
                <a key={i} href={r.url} target="_blank" rel="noreferrer" className="ref-link">
                  <ExternalLink size={11} /> {r.title}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Capture ──────────────────────────────────────────────────────────────
export default function Capture() {
  const { settings } = useApp()
  const [input, setInput]       = useState('')
  const [items, setItems]       = useState([])
  const [processing, setProcessing] = useState(false)
  const [model, setModel]       = useState('auto')
  const [expanded, setExpanded] = useState({})
  const [openNote, setOpenNote] = useState(null)
  const [dbError, setDbError]   = useState(null)
  const inputRef  = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => { loadCaptures() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [items])

  async function loadCaptures() {
    const { data, error } = await supabase
      .from('captures')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) setDbError(error.message)
    if (data) setItems(data.filter(d => d.status !== 'archived').reverse())
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || processing) return
    setInput('')
    setProcessing(true)
    setDbError(null)

    const tempId = `temp_${Date.now()}`
    const tempItem = { id: tempId, content: text, role: 'user', processing: true }
    setItems(prev => [...prev, tempItem])

    try {
      const settings = settings
      const classification  = await classifyCapture(text, settings)
      let actionPlan = null
      if (classification.type === 'project') {
        actionPlan = await generateActionPlan(classification.title, classification.summary, settings)
      }

      // Build the capture object — no user_id
      const capture = {
        content:          text,
        type:             classification.type || 'note',
        ai_response:      buildResponse(classification),
        action_plan:      actionPlan ? { ...actionPlan, title: classification.title, body: '' } : { title: classification.title, body: '' },
        status:           'active',
        scheduled_at:     classification.suggested_time || null,
        schedule_approved: false,
      }

      // Insert into Supabase — handle error gracefully
      const { data: insertedData, error: insertError } = await supabase
        .from('captures')
        .insert([capture])
        .select()
        .single()

      // If Supabase insert fails, fall back to local-only record
      const saved = insertedData ?? { ...capture, id: tempId, created_at: new Date().toISOString() }

      if (insertError) {
        setDbError(`DB: ${insertError.message} — saved locally for this session`)
      }

      // Secondary inserts — only if we have a real DB id
      const realId = insertedData?.id
      if (realId) {
        if (classification.type === 'task' && classification.title) {
          await supabase.from('tasks').insert([{
            capture_id:  realId,
            title:       classification.title,
            category:    classification.category || null,
            due_at:      classification.due_at || null,
          }])
        }
        if (classification.type === 'reminder' && classification.remind_at) {
          await supabase.from('reminders').insert([{
            text:       classification.title || text,
            remind_at:  classification.remind_at,
          }])
        }
        if (classification.type === 'academic') {
          await supabase.from('academics').insert([{
            name:     classification.title || text,
            due_at:   classification.due_at || null,
            progress: 0,
          }])
        }
        if (classification.type === 'finance' && classification.amount) {
          await supabase.from('finance').insert([{
            type:     classification.finance_type || 'expense',
            amount:   classification.amount,
            category: classification.category || 'Other',
            note:     text,
            date:     new Date().toISOString().slice(0, 10),
          }])
        }
      }

      setItems(prev => prev.map(i => i.id === tempId
        ? { ...saved, role: 'capture' }
        : i
      ))

    } catch (e) {
      // AI is offline — save as plain note anyway
      const fallback = {
        id:           tempId,
        content:      text,
        type:         'note',
        ai_response:  'Saved as note (AI offline)',
        action_plan:  { title: text.slice(0, 60), body: text },
        status:       'active',
        role:         'capture',
        created_at:   new Date().toISOString(),
        schedule_approved: false,
      }
      setItems(prev => prev.map(i => i.id === tempId ? fallback : i))
    } finally {
      setProcessing(false)
      inputRef.current?.focus()
    }
  }

  function buildResponse(c) {
    const labels = {
      note:     'Saved as a note — tap to open and write more',
      task:     `Added to tasks${c.due_at ? ` · due ${format(new Date(c.due_at), 'MMM d')}` : ''}`,
      project:  'Project saved with action plan — tap to open',
      list:     'Saved your list — tap to open and edit',
      finance:  `Logged as ${c.finance_type || 'expense'}${c.amount ? ` · $${c.amount}` : ''}`,
      reminder: `Reminder set${c.remind_at ? ` for ${format(new Date(c.remind_at), 'MMM d, h:mm a')}` : ''}`,
      academic: `Added to academic tracker${c.due_at ? ` · due ${format(new Date(c.due_at), 'MMM d')}` : ''}`,
    }
    return labels[c.type] || 'Saved — tap to open'
  }

  async function approveSchedule(item) {
    if (!item.scheduled_at) return
    try {
      const start = new Date(item.scheduled_at)
      const end   = new Date(start.getTime() + 60 * 60 * 1000)
      await createEvent({
        title:       item.action_plan?.title || item.content,
        start:       start.toISOString(),
        end:         end.toISOString(),
        description: item.content,
      })
      await supabase.from('captures').update({ schedule_approved: true }).eq('id', item.id)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, schedule_approved: true } : i))
    } catch (e) {
      setDbError('Could not add to calendar: ' + e.message)
    }
  }

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  async function dismiss(id) {
    await supabase.from('captures').update({ status: 'archived' }).eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function openNoteEditor(item) {
    setOpenNote(item)
  }

  function onNoteSave(updated) {
    setItems(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i))
  }

  const isOpenable = (item) => ['note', 'project', 'list', 'task'].includes(item.type)

  // ── Note editor view ──
  if (openNote) {
    return <NoteEditor note={openNote} onClose={() => setOpenNote(null)} onSave={onNoteSave} />
  }

  // ── Main feed view ──
  return (
    <div className="capture-wrap">
      {dbError && (
        <div className="capture-db-error">
          {dbError}
          <button onClick={() => setDbError(null)}><X size={12} /></button>
        </div>
      )}

      <div className="capture-feed">
        {items.length === 0 && (
          <div className="capture-empty fade-in">
            <p>Throw anything in here — a thought, task, grocery list, project idea, reminder, expense…</p>
            <p>I'll figure out what it is and act on it.</p>
          </div>
        )}

        <div className="feed-items stagger">
          {items.map(item => (
            <div key={item.id} className={`feed-item ${item.role === 'user' ? 'user-msg' : 'ai-card'} ${item.processing ? 'processing' : ''}`}>
              {item.role === 'user' || item.processing ? (
                <div className="user-bubble">
                  <span>{item.content}</span>
                  {item.processing && <Loader size={12} className="spin" />}
                </div>
              ) : (
                <div
                  className={`ai-capture-card ${isOpenable(item) ? 'openable' : ''}`}
                  onClick={() => isOpenable(item) && openNoteEditor(item)}
                >
                  <div className="card-header">
                    <div className="card-left">
                      <span className={`type-badge badge-${item.type}`}>{item.type}</span>
                      <span className="card-title">
                        {item.action_plan?.title || (item.content.length > 80 ? item.content.slice(0, 80) + '…' : item.content)}
                      </span>
                    </div>
                    <div className="card-actions">
                      {isOpenable(item) && (
                        <button className="open-note-btn" onClick={e => { e.stopPropagation(); openNoteEditor(item) }} title="Open note">
                          <FileText size={13} />
                        </button>
                      )}
                      <button className="dismiss-btn" onClick={e => { e.stopPropagation(); dismiss(item.id) }}><X size={13} /></button>
                    </div>
                  </div>

                  <p className="card-response">{item.ai_response}</p>

                  {item.action_plan?.body && (
                    <p className="card-body-preview">{item.action_plan.body.slice(0, 120)}{item.action_plan.body.length > 120 ? '…' : ''}</p>
                  )}

                  {item.action_plan?.steps?.length > 0 && (
                    <div className="action-plan" onClick={e => e.stopPropagation()}>
                      <button className="plan-toggle" onClick={() => toggleExpand(item.id)}>
                        <span>Action plan ({item.action_plan.steps.length} steps)</span>
                        {expanded[item.id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      {expanded[item.id] && (
                        <div className="plan-steps fade-in">
                          {item.action_plan.first_action && (
                            <div className="first-action">
                              <CheckCircle size={13} />
                              <span>Start here: {item.action_plan.first_action}</span>
                            </div>
                          )}
                          {item.action_plan.steps.map((s, i) => (
                            <div key={i} className="plan-step">
                              <span className="step-num">{s.order}</span>
                              <div>
                                <p className="step-title">{s.title}</p>
                                <p className="step-desc">{s.description}</p>
                                {s.estimated && <span className="step-est">{s.estimated}</span>}
                              </div>
                            </div>
                          ))}
                          {item.action_plan.references?.length > 0 && (
                            <div className="references">
                              <p className="ref-title">References</p>
                              {item.action_plan.references.map((r, i) => (
                                <a key={i} href={r.url} target="_blank" rel="noreferrer" className="ref-link">
                                  <ExternalLink size={11} /> {r.title}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {item.scheduled_at && !item.schedule_approved && (
                    <div className="schedule-approval" onClick={e => e.stopPropagation()}>
                      <div className="schedule-suggestion">
                        <Calendar size={13} />
                        <span>Suggested: {format(new Date(item.scheduled_at), 'EEE MMM d, h:mm a')}</span>
                      </div>
                      <button className="approve-btn" onClick={() => approveSchedule(item)}>
                        Add to calendar
                      </button>
                    </div>
                  )}
                  {item.schedule_approved && (
                    <div className="schedule-done">
                      <CheckCircle size={12} /> Added to calendar
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <div ref={bottomRef} />
      </div>
      <div className="capture-input-bar">
        <textarea
          ref={inputRef}
          className="capture-textarea"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Type anything… task, note, idea, grocery list, expense, reminder"
          rows={2}
          disabled={processing}
        />
        <button className="send-btn" onClick={handleSend} disabled={!input.trim() || processing}>
          {processing ? <Loader size={16} className="spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  )
}
