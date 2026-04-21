// AI Router — auto-selects model by task type, allows manual override

const TASK_MODEL_MAP = {
  classify:  'ollama',   // quick classification of captures
  plan:      'gemini',   // day planning, morning briefing
  research:  'claude',   // project research, references
  chat:      'ollama',   // conversational notes
  finance:   'ollama',   // finance categorisation
  schedule:  'gemini',   // scheduling suggestions
}

function getModel(taskType, settings) {
  if (settings?.ai_override) return settings.ai_override
  return TASK_MODEL_MAP[taskType] || settings?.ai_model || 'ollama'
}

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

async function callGemini(prompt, systemPrompt, apiKey) {
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
    }
  )
  if (!res.ok) throw new Error('Gemini API error')
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function callClaude(prompt, systemPrompt, apiKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt || 'You are a helpful personal assistant.',
      messages: [{ role: 'user', content: prompt }]
    })
  })
  if (!res.ok) throw new Error('Claude API error')
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

export async function aiCall({ taskType, prompt, systemPrompt, settings = {} }) {
  const model = getModel(taskType, settings)

  try {
    switch (model) {
      case 'ollama':
        return await callOllama(prompt, systemPrompt, settings.ollama_model || 'llama3.1')
      case 'gemini':
        if (!settings.gemini_key) throw new Error('No Gemini API key set in Settings')
        return await callGemini(prompt, systemPrompt, settings.gemini_key)
      case 'claude':
        if (!settings.claude_key) throw new Error('No Claude API key set in Settings')
        return await callClaude(prompt, systemPrompt, settings.claude_key)
      default:
        return await callOllama(prompt, systemPrompt, settings.ollama_model || 'llama3.1')
    }
  } catch (err) {
    console.error(`[AI:${model}] ${err.message}`)
    throw err
  }
}

// Classify a capture into type + extract structured data
export async function classifyCapture(content, settings) {
  const systemPrompt = `You are a personal assistant classifier. Given user input, respond with ONLY valid JSON — no markdown, no explanation.

Classify into one of: note, task, project, list, finance, reminder, academic

Return:
{
  "type": "task",
  "title": "short title",
  "summary": "one sentence",
  "category": "optional category",
  "urgency": "low|medium|high",
  "items": ["item1", "item2"],        // for lists/projects
  "amount": 0,                         // for finance (number)
  "finance_type": "expense|income",    // for finance
  "remind_at": "ISO date or null",     // for reminders
  "due_at": "ISO date or null",        // for tasks/academic
  "suggest_schedule": true,            // if scheduling might help
  "suggested_time": "ISO date or null" // suggested calendar slot
}`

  const raw = await aiCall({ taskType: 'classify', prompt: content, systemPrompt, settings })
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return { type: 'note', title: content.slice(0, 60), summary: content }
  }
}

// Generate morning briefing as structured day plan
export async function generateDayPlan({ events, tasks, academics, reminders, persona, settings }) {
  const systemPrompt = `You are a personal life assistant for a ${persona || 'student'}. Given the user's day data, create a realistic, kind, and motivating day plan. Respond with ONLY valid JSON.

Return:
{
  "greeting": "short warm greeting",
  "summary": "1-2 sentence overview of today",
  "flow": [
    {
      "time": "9:00 AM",
      "title": "activity title",
      "type": "calendar|task|focus|break|academic",
      "source": "where this came from",
      "duration": "1 hour",
      "note": "optional short tip"
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
Current time: ${new Date().toLocaleTimeString()}`

  const raw = await aiCall({ taskType: 'plan', prompt, systemPrompt, settings })
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return { greeting: 'Good morning!', summary: 'Here is your day.', flow: [] }
  }
}

// Generate action plan for a project capture
export async function generateActionPlan(projectTitle, summary, settings) {
  const systemPrompt = `You are a project planning assistant. Given a project idea, return a concise action plan as JSON only.

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

  const raw = await aiCall({
    taskType: 'research',
    prompt: `Project: ${projectTitle}\nContext: ${summary}`,
    systemPrompt,
    settings
  })
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return { steps: [], references: [], first_action: '' }
  }
}
