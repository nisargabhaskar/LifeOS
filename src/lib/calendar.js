// Google Calendar API integration

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events'

let tokenClient = null
let accessToken = null

export function initGoogleAuth() {
  return new Promise((resolve) => {
    if (typeof window.google === 'undefined') {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.onload = () => resolve(setupClient())
      document.head.appendChild(script)
    } else {
      resolve(setupClient())
    }
  })
}

function setupClient() {
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (resp) => { accessToken = resp.access_token }
  })
  return tokenClient
}

export function connectCalendar() {
  return new Promise((resolve, reject) => {
    if (!tokenClient) { reject(new Error('Google not initialised')); return }
    tokenClient.callback = (resp) => {
      if (resp.error) { reject(resp); return }
      accessToken = resp.access_token
      localStorage.setItem('gcal_token', accessToken)
      resolve(accessToken)
    }
    tokenClient.requestAccessToken({ prompt: 'consent' })
  })
}

export function isConnected() {
  if (accessToken) return true
  const stored = localStorage.getItem('gcal_token')
  if (stored) { accessToken = stored; return true }
  return false
}

export async function getTodayEvents() {
  if (!accessToken) return []
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start}&timeMax=${end}&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) { accessToken = null; localStorage.removeItem('gcal_token'); return [] }
    const data = await res.json()
    return (data.items || []).map(e => ({
      id: e.id,
      title: e.summary || 'Untitled event',
      start: e.start?.dateTime || e.start?.date,
      end:   e.end?.dateTime   || e.end?.date,
      location: e.location || null,
      description: e.description || null,
      allDay: !e.start?.dateTime
    }))
  } catch {
    return []
  }
}

export async function getUpcomingEvents(days = 7) {
  if (!accessToken) return []
  const start = new Date().toISOString()
  const end   = new Date(Date.now() + days * 86400000).toISOString()

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start}&timeMax=${end}&singleEvents=true&orderBy=startTime&maxResults=20`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.items || []).map(e => ({
      id: e.id,
      title: e.summary || 'Untitled event',
      start: e.start?.dateTime || e.start?.date,
      end:   e.end?.dateTime   || e.end?.date,
      allDay: !e.start?.dateTime
    }))
  } catch {
    return []
  }
}

export async function createEvent({ title, start, end, description }) {
  if (!accessToken) throw new Error('Calendar not connected')
  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: title,
        description,
        start: { dateTime: start, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        end:   { dateTime: end,   timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }
      })
    }
  )
  if (!res.ok) throw new Error('Failed to create event')
  return res.json()
}
