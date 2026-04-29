import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Sparkles, CheckCircle2, Circle, Clock, Calendar, BookOpen, AlertCircle, Plus } from 'lucide-react'
import { useApp } from '../../lib/AppContext'
import { generateDayPlan } from '../../lib/ai'
import { getTodayEvents, isConnected } from '../../lib/calendar'
import { supabase } from '../../lib/supabase'
import './Today.css'

const TYPE_COLORS = {
  calendar: 'blue',
  task: 'accent',
  focus: 'purple',
  break: 'amber',
  academic: 'red',
}

export default function Today() {
  const { settings } = useApp()
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [checked, setChecked] = useState({})
  const [scheduleApproval, setScheduleApproval] = useState(null)

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const greeting = getGreeting()

  useEffect(() => { loadPlan() }, [])

  async function loadPlan(forceRegenerate = false) {
    setLoading(true)
    setError(null)
    try {
      // First check if we have a saved plan for today
      const { data: existingPlan, error: planError } = await supabase
        .from('day_plans')
        .select('plan_data')
        .eq('date', todayStr)
        .single()

      if (existingPlan && !planError && !forceRegenerate) {
        // Load existing plan
        setPlan(existingPlan.plan_data)
      } else {
        // Generate new plan
        const [events, tasksRes, academicRes, remindersRes, capturesRes] = await Promise.all([
          isConnected() ? getTodayEvents() : Promise.resolve([]),
          supabase.from('tasks').select('*').eq('done', false).order('created_at'),
          supabase.from('academics').select('*').lt('progress', 100).order('due_at'),
          supabase.from('reminders').select('*').eq('done', false).order('remind_at'),
          // Get recent captures from the last 7 days
          supabase.from('captures').select('*')
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: false })
            .limit(20)
        ])

        const generated = await generateDayPlan({
          events,
          tasks: tasksRes.data || [],
          academics: academicRes.data || [],
          reminders: remindersRes.data || [],
          captures: capturesRes.data || [],
          persona: settings.persona,
          settings: settings
        })

        // Save or update the plan
        if (existingPlan && !planError) {
          const { error: updateError } = await supabase.from('day_plans')
            .update({ plan_data: generated, updated_at: new Date().toISOString() })
            .eq('date', todayStr)
          if (updateError) console.warn('Failed to update day plan:', updateError)
        } else {
          const { error: insertError } = await supabase.from('day_plans').insert([{
            date: todayStr,
            plan_data: generated
          }])
          if (insertError) console.warn('Failed to save day plan:', insertError)
        }

        setPlan(generated)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function toggleCheck(i) {
    setChecked(prev => ({ ...prev, [i]: !prev[i] }))
  }

  const done = Object.values(checked).filter(Boolean).length
  const total = plan?.flow?.length || 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="today stagger">
      <div className="today-header">
        <div className="today-date">
          <span className="today-day">{format(today, 'EEEE')}</span>
          <span className="today-full">{format(today, 'MMMM d, yyyy')}</span>
        </div>
        <button className="refresh-btn" onClick={() => loadPlan(true)} disabled={loading}>
          <Sparkles size={14} />
          {loading ? 'Planning…' : 'Regenerate'}
        </button>
      </div>

      {loading ? (
        <div className="today-loading">
          <div className="loading-bar" />
          <p>Building your day plan…</p>
        </div>
      ) : (
        <>
          {plan?.greeting && (
            <div className="today-greeting">
              <h2>{plan.greeting}</h2>
              <p>{plan.summary}</p>
            </div>
          )}

          {error && (
            <div className="today-error">
              <AlertCircle size={14} />
              <span>{error} — showing default plan</span>
            </div>
          )}

          {total > 0 && (
            <div className="progress-bar-wrap">
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="progress-label">{done}/{total} done</span>
            </div>
          )}

          <div className="flow-list stagger">
            {plan?.flow?.map((item, i) => (
              <div
                key={i}
                className={`flow-card ${checked[i] ? 'done' : ''} type-${TYPE_COLORS[item.type] || 'accent'}`}
                onClick={() => toggleCheck(i)}
              >
                <div className="flow-check">
                  {checked[i] ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                </div>
                <div className="flow-body">
                  <div className="flow-top">
                    <span className="flow-title">{item.title}</span>
                    <span className={`flow-tag tag-${TYPE_COLORS[item.type] || 'accent'}`}>{item.type}</span>
                  </div>
                  <div className="flow-meta">
                    <span><Clock size={11} /> {item.time}</span>
                    {item.duration && <span>{item.duration}</span>}
                    {item.source && <span><Calendar size={11} /> {item.source}</span>}
                  </div>
                  {item.note && <p className="flow-note">{item.note}</p>}
                </div>
              </div>
            ))}
          </div>

          {plan?.flow?.length === 0 && (
            <div className="empty-day">
              <p>Your day looks clear.</p>
              {plan.empty_day_suggestion && <p className="empty-suggestion">{plan.empty_day_suggestion}</p>}
              {plan.focus_project && (
                <div className="focus-project">
                  <BookOpen size={14} />
                  <span>Consider picking up: <strong>{plan.focus_project}</strong></span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
