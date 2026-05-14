import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Home from './components/pages/Home'
import Pomodoro from './components/pages/Pomodoro'
import Tasks from './components/pages/Tasks'
import Finance from './components/pages/Finance'
import Stats from './components/pages/Stats'
import Entertainment from './components/pages/Entertainment'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/"             element={<Home />} />
          <Route path="/work"         element={<Pomodoro mode="work" />} />
          <Route path="/learning"     element={<Pomodoro mode="learning" />} />
          <Route path="/class"        element={<Pomodoro mode="class" />} />
          <Route path="/tasks"        element={<Tasks />} />
          <Route path="/finance"      element={<Finance />} />
          <Route path="/stats"        element={<Stats />} />
          <Route path="/entertainment" element={<Entertainment />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
