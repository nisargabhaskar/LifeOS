import { useState, useRef, useEffect } from 'react'
import { Send, Loader, CheckCircle, Calendar, ChevronDown, ChevronUp, ExternalLink, X } from 'lucide-react'
import { useApp } from '../../lib/AppContext'
import { classifyCapture, generateActionPlan } from '../../lib/ai'
import { createEvent } from '../../lib/calendar'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import './Capture.css'

export default function Capture() {
  const { settings } = useApp()
  const [input, setInput] = useState('')
  const [items, setItems] = useState([])
  const [processing, setProcessing] = useState(false)
  const [expanded, setExpanded] = useState({})
  const inputRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => { loadCaptures() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [items])

  async function loadCaptures() {
    const { data } = await supabase
      .from('captures')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setItems(data.reverse())
  }

  async function handleSend() {

    const { data: { user } } = await supabase.auth.getUser()

    // if (!user) {
    //   alert('You must be logged in')
    //   return
    // }


    const text = input.trim()
    if (!text || processing) return
    setInput('')
    setProcessing(true)

    const tempId = Date.now()
    const userMsg = { id: tempId, content: text, role: 'user', processing: true }
    setItems(prev => [...prev, userMsg])
    console.log(userMsg)
    try {
      const classification = await classifyCapture(text, settings)
      let actionPlan = null
      if (classification.type === 'project') {
        actionPlan = await generateActionPlan(classification.title, classification.summary, settings)
      }

      const capture = {
        user_id: user.id, 
        content: text,
        type: classification.type,
        ai_response: buildResponse(classification),
        action_plan: actionPlan,
        status: 'active',
        scheduled_at: classification.suggested_time || null,
        schedule_approved: false,
      }

      const { data, error } = await supabase.from('captures').insert([capture]).select().single()
      const saved = data || { ...capture, id: tempId }

      if (classification.type === 'task' && classification.title) {
        await supabase.from('tasks').insert([{
          capture_id: saved.id,
          title: classification.title,
          category: classification.category,
          due_at: classification.due_at,
        }])
      }

      if (classification.type === 'reminder' && classification.remind_at) {
        await supabase.from('reminders').insert([{
          text: classification.title || text,
          remind_at: classification.remind_at,
        }])
      }

      if (classification.type === 'academic') {
        await supabase.from('academics').insert([{
          name: classification.title || text,
          due_at: classification.due_at,
          progress: 0,
        }])
      }

      setItems(prev => prev.map(i => i.id === tempId ? { ...saved, role: 'capture' } : i))
    } catch (e) {
      setItems(prev => prev.map(i => i.id === tempId
        ? { ...i, processing: false, role: 'capture', type: 'note', ai_response: `Saved as note. (AI offline: ${e.message})` }
        : i
      ))
    } finally {
      setProcessing(false)
      inputRef.current?.focus()
    }
  }

  function buildResponse(c) {
    const typeLabels = {
      note: 'Saved as a note',
      task: `Added to tasks${c.due_at ? ` · due ${format(new Date(c.due_at), 'MMM d')}` : ''}`,
      project: 'Starting an action plan for this project',
      list: 'Saved your list',
      finance: `Logged as ${c.finance_type || 'transaction'}${c.amount ? ` · $${c.amount}` : ''}`,
      reminder: `Reminder set${c.remind_at ? ` for ${format(new Date(c.remind_at), 'MMM d, h:mm a')}` : ''}`,
      academic: `Added to academic tracker${c.due_at ? ` · due ${format(new Date(c.due_at), 'MMM d')}` : ''}`,
    }
    return typeLabels[c.type] || 'Saved'
  }

  async function approveSchedule(item) {
    if (!item.scheduled_at) return
    try {
      const start = new Date(item.scheduled_at)
      const end = new Date(start.getTime() + 60 * 60 * 1000)
      await createEvent({ title: item.type === 'list' ? item.content : (item.ai_response || item.content), start: start.toISOString(), end: end.toISOString() })
      await supabase.from('captures').update({ schedule_approved: true }).eq('id', item.id)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, schedule_approved: true } : i))
    } catch (e) {
      alert('Could not add to calendar: ' + e.message)
    }
  }

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  async function dismiss(id) {
    await supabase.from('captures').update({ status: 'archived' }).eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="capture-wrap">
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
                <div className="ai-capture-card">
                  <div className="card-header">
                    <div className="card-left">
                      <span className={`type-badge badge-${item.type}`}>{item.type}</span>
                      <span className="card-title">{item.content.length > 80 ? item.content.slice(0, 80) + '…' : item.content}</span>
                    </div>
                    <button className="dismiss-btn" onClick={() => dismiss(item.id)}><X size={13} /></button>
                  </div>

                  <p className="card-response">{item.ai_response}</p>

                  {item.action_plan && (
                    <div className="action-plan">
                      <button className="plan-toggle" onClick={() => toggleExpand(item.id)}>
                        <span>Action plan ({item.action_plan.steps?.length || 0} steps)</span>
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
                          {item.action_plan.steps?.map((s, i) => (
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
                    <div className="schedule-approval">
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
