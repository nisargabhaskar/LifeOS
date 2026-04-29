// AI — Ollama only

async function callOllama(prompt, systemPrompt, model = 'llama3.1') {
  const res = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt }
      ]
    })
  })
  if (!res.ok) throw new Error('Ollama not running — start it with: ollama serve')
  const data = await res.json()
  return data.message?.content || ''
}

export async function aiCall({ prompt, systemPrompt, settings = {} }) {
  const model = settings.ollama_model || 'llama3.1'
  return callOllama(prompt, systemPrompt, model)
}

export async function classifyCapture(content, settings) {
  const systemPrompt = `You are a personal assistant classifier. Given user input, respond with ONLY valid JSON — no markdown, no explanation.

Classify into one of: note, task, project, list, finance, reminder, academic

Return exactly this shape:
{
  "type": "note",
  "title": "short title max 60 chars",
  "summary": "one sentence",
  "category": null,
  "urgency": "low",
  "items": [],
  "amount": null,
  "finance_type": null,
  "remind_at": null,
  "due_at": null,
  "suggest_schedule": false,
  "suggested_time": null
}`

  const raw = await callOllama(content, systemPrompt, settings.ollama_model || 'llama3.1')
  try {
    const clean = raw.replace(/```json[\s\S]*?```|```/g, '').trim()
    const match = clean.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : { type: 'note', title: content.slice(0, 60), summary: content }
  } catch {
    return { type: 'note', title: content.slice(0, 60), summary: content }
  }
}

export async function generateDayPlan({ events, tasks, academics, reminders, captures, persona, settings }) {
  const systemPrompt = `You are a personal life assistant for a ${persona || 'student'}. Given the user's day data, create a realistic day plan. Respond with ONLY valid JSON.

Return:
{
  "greeting": "short warm greeting",
  "summary": "1-2 sentence overview",
  "flow": [
    {
      "time": "9:00 AM",
      "title": "activity title",
      "type": "calendar|task|focus|break|academic",
      "source": "where this came from",
      "duration": "1 hour",
      "note": "optional tip"
    }
  ],
  "empty_day_suggestion": null,
  "focus_project": null
}`

  const prompt = `Today's data:
Calendar events: ${JSON.stringify(events)}
Open tasks: ${JSON.stringify(tasks)}
Academic deadlines: ${JSON.stringify(academics)}
Reminders: ${JSON.stringify(reminders)}
Recent captures: ${JSON.stringify(captures)}
Current time: ${new Date().toLocaleTimeString()}`

  const raw = await callOllama(prompt, systemPrompt, settings.ollama_model || 'llama3.1')
  try {
    const match = raw.replace(/```json[\s\S]*?```|```/g, '').match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : { greeting: 'Good morning!', summary: 'Here is your day.', flow: [] }
  } catch {
    return { greeting: 'Good morning!', summary: 'Here is your day.', flow: [] }
  }
}

export async function generateActionPlan(projectTitle, summary, settings) {
  const systemPrompt = `You are a project planning assistant. Return a concise action plan as JSON only — no markdown.

Return:
{
  "steps": [
    { "order": 1, "title": "step title", "description": "what to do", "estimated": "time estimate" }
  ],
  "references": [
    { "title": "resource title", "url": "https://..." }
  ],
  "first_action": "the single most important first thing to do"
}`

  const raw = await callOllama(
    `Project: ${projectTitle}\nContext: ${summary}`,
    systemPrompt,
    settings.ollama_model || 'llama3.1'
  )
  try {
    const match = raw.replace(/```json[\s\S]*?```|```/g, '').match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : { steps: [], references: [], first_action: '' }
  } catch {
    return { steps: [], references: [], first_action: '' }
  }
}
