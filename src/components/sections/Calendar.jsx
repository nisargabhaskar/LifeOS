import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight, Link } from 'lucide-react'
import { getTodayEvents, getUpcomingEvents, connectCalendar, isConnected, initGoogleAuth } from '../../lib/calendar'
import './Calendar.css'

export default function Calendar() {
  const [current, setCurrent] = useState(new Date())
  const [events, setEvents] = useState([])
  const [selected, setSelected] = useState(new Date())
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    setConnected(isConnected())
    if (isConnected()) loadEvents()
  }, [])

  async function loadEvents() {
    const ev = await getUpcomingEvents(60)
    setEvents(ev)
  }

  async function connect() {
    setConnecting(true)
    try {
      await initGoogleAuth()
      await connectCalendar()
      setConnected(true)
      loadEvents()
    } catch (e) {
      alert('Could not connect calendar: ' + e.message)
    } finally {
      setConnecting(false)
    }
  }

  const monthStart = startOfMonth(current)
  const monthEnd   = endOfMonth(current)
  const calStart   = startOfWeek(monthStart)
  const calEnd     = endOfWeek(monthEnd)
  const days       = eachDayOfInterval({ start: calStart, end: calEnd })

  const dayEvents = (day) => events.filter(e => e.start && isSameDay(new Date(e.start), day))
  const selectedEvents = dayEvents(selected)

  return (
    <div className="calendar-wrap stagger">
      <div className="cal-header">
        <div className="cal-nav">
          <button onClick={() => setCurrent(subMonths(current, 1))}><ChevronLeft size={16} /></button>
          <h2>{format(current, 'MMMM yyyy')}</h2>
          <button onClick={() => setCurrent(addMonths(current, 1))}><ChevronRight size={16} /></button>
        </div>
        {!connected && (
          <button className="connect-btn" onClick={connect} disabled={connecting}>
            <Link size={13} />
            {connecting ? 'Connecting…' : 'Connect Google Calendar'}
          </button>
        )}
      </div>

      <div className="cal-grid-wrap">
        <div className="day-labels">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <span key={d} className="day-label">{d}</span>
          ))}
        </div>
        <div className="cal-grid">
          {days.map(day => {
            const ev = dayEvents(day)
            const inMonth = day.getMonth() === current.getMonth()
            return (
              <button
                key={day.toISOString()}
                className={`cal-day ${isToday(day) ? 'today' : ''} ${isSameDay(day, selected) ? 'selected' : ''} ${!inMonth ? 'out-month' : ''}`}
                onClick={() => setSelected(day)}
              >
                <span className="day-num">{format(day, 'd')}</span>
                {ev.length > 0 && (
                  <div className="event-dots">
                    {ev.slice(0, 3).map((e, i) => <span key={i} className="event-dot" />)}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="selected-events">
        <p className="sel-date">{format(selected, 'EEEE, MMMM d')}</p>
        {!connected && (
          <div className="cal-empty">Connect Google Calendar to see your events here.</div>
        )}
        {connected && selectedEvents.length === 0 && (
          <div className="cal-empty">Nothing scheduled. A good day to focus.</div>
        )}
        {selectedEvents.map(e => (
          <div key={e.id} className="event-card">
            <div className="event-time">
              {e.allDay ? 'All day' : e.start ? format(new Date(e.start), 'h:mm a') : ''}
            </div>
            <div className="event-body">
              <p className="event-title">{e.title}</p>
              {e.location && <p className="event-loc">{e.location}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
