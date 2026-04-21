import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './lib/AppContext'
import Layout from './components/layout/Layout'
import Today from './components/sections/Today'
import Capture from './components/sections/Capture'
import Academic from './components/sections/Academic'
import Finance from './components/sections/Finance'
import Calendar from './components/sections/Calendar'
import Reminders from './components/sections/Reminders'
import Settings from './components/sections/Settings'

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/today" replace />} />
            <Route path="today"     element={<Today />} />
            <Route path="capture"   element={<Capture />} />
            <Route path="academic"  element={<Academic />} />
            <Route path="finance"   element={<Finance />} />
            <Route path="calendar"  element={<Calendar />} />
            <Route path="reminders" element={<Reminders />} />
            <Route path="settings"  element={<Settings />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  )
}
