# Life OS

Your personal life operating system — built with React, Supabase, Google Calendar, and AI (Ollama / Gemini / Claude).

---

## Quick start

### 1. Install dependencies
```bash
cd life-os
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
```
Open `.env` and fill in your values (see setup guides below).

### 3. Run the app
```bash
npm run dev
```
Open http://localhost:3000

---

## Setup guides

### Supabase (database + sync)
1. Go to https://supabase.com and create a free project
2. In the SQL editor, paste and run the entire schema from `src/lib/supabase.js`
3. Copy your project URL and anon key into `.env`

### Ollama (local AI — free, no key needed)
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model (choose one)
ollama pull llama3.1        # recommended — fast and capable
ollama pull mistral         # good alternative
ollama pull llama3.1:70b   # smarter, needs 40GB+ RAM

# Start Ollama (runs in background)
ollama serve
```

### Gemini (free AI — good for day planning)
1. Go to https://aistudio.google.com/app/apikey
2. Create a free API key
3. Add to Settings > API keys in the app (or `.env`)

### Claude (best AI — ~$3-5/month)
1. Go to https://console.anthropic.com
2. Create an API key
3. Add to Settings > API keys in the app (or `.env`)

### Google Calendar
1. Go to https://console.cloud.google.com
2. Create a new project
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials (Web application)
5. Add `http://localhost:3000` to authorised JavaScript origins
6. Copy the Client ID into `.env`

---

## Deploy to iPhone (PWA)

### Option A — Deploy to Vercel (free, recommended)
```bash
npm run build
# Install Vercel CLI
npm i -g vercel
vercel
```
Then on iPhone: open the deployed URL in Safari → Share → Add to Home Screen

### Option B — Local network
```bash
npm run dev -- --host
```
Open `http://YOUR_MAC_IP:3000` on Safari → Add to Home Screen

---

## Build as Mac app (Electron)

```bash
# Install Electron builder
npm install --save-dev electron electron-builder

# Add to package.json scripts:
# "electron": "electron .",
# "build-mac": "electron-builder --mac"

# Copy main.js and preload.js from the /electron folder
# Then build:
npm run build-mac
```
The `.app` file will be in `dist/`. Drag to Applications.

---

## Project structure

```
life-os/
├── src/
│   ├── components/
│   │   ├── layout/         # Sidebar, topbar, mobile nav
│   │   └── sections/       # Today, Capture, Academic, Finance, Calendar, Reminders, Settings
│   ├── lib/
│   │   ├── ai.js           # Ollama / Gemini / Claude router
│   │   ├── calendar.js     # Google Calendar API
│   │   ├── supabase.js     # Database client + schema
│   │   └── AppContext.jsx  # Global state, settings, theme
│   ├── styles/
│   │   └── globals.css     # Design tokens, light/dark theme
│   ├── App.jsx             # Routes
│   └── main.jsx            # Entry point
├── public/
│   └── manifest.json       # PWA manifest
├── .env.example
├── vite.config.js
└── README.md
```

---

## How the AI works

The app auto-selects which AI model to use based on the task:

| Task | Default model | Why |
|------|--------------|-----|
| Classify a capture | Ollama | Fast, offline, no cost |
| Morning day plan | Gemini | Free, great at scheduling |
| Project research | Claude | Best reasoning |
| Chat / notes | Ollama | Instant response |

You can override this anytime in Settings → AI model.

---

## The Capture screen

This is the core of the app. Type anything — the AI figures out what it is:

- **"buy milk eggs bread"** → grocery list + suggests shopping slot
- **"build a portfolio website idea"** → project card + action plan + references
- **"dentist appointment next tuesday 2pm"** → reminder + calendar slot suggestion (needs your approval)
- **"spent $45 on lunch"** → finance log, categorised as Food
- **"essay due friday on impressionism"** → academic tracker entry

Scheduling always needs your explicit approval before anything is added to Google Calendar.

---

## Finance email (monthly summary)

To enable monthly expense emails, set up a free account at https://resend.com and add:
```
VITE_RESEND_API_KEY=your_key
VITE_FINANCE_EMAIL=your@email.com
```
The app will send a summary on the 1st of each month.
