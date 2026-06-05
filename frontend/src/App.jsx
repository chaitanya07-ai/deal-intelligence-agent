import React from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, MessageSquare, Briefcase,
  Brain, BarChart3, Settings, Zap, ChevronRight
} from 'lucide-react'

import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Deals from './pages/Deals'
import DealDetail from './pages/DealDetail'
import Intelligence from './pages/Intelligence'
import Analytics from './pages/Analytics'

const NAV = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/chat',         icon: MessageSquare,   label: 'Agent Chat' },
  { to: '/deals',        icon: Briefcase,       label: 'Deals' },
  { to: '/intelligence', icon: Brain,           label: 'Intelligence' },
  { to: '/analytics',    icon: BarChart3,       label: 'Analytics' },
]

export default function App() {
  const location = useLocation()

  return (
    <div className="noise-bg flex h-screen overflow-hidden bg-void">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-64 left-1/4 h-[600px] w-[600px] rounded-full bg-signal/4 blur-[120px]" />
        <div className="absolute -bottom-64 right-1/4 h-[500px] w-[500px] rounded-full bg-pulse/5 blur-[100px]" />
      </div>

      {/* Sidebar */}
      <aside className="relative z-10 flex w-16 flex-col items-center border-r border-border/50 bg-obsidian/80 py-6 backdrop-blur-xl lg:w-56 lg:items-start lg:px-4">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-3 px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal/10 ring-1 ring-signal/30">
            <Zap size={16} className="text-signal" />
          </div>
          <span className="hidden font-display text-sm font-semibold tracking-wide text-frost lg:block">
            Deal IQ
          </span>
        </div>

        {/* Nav */}
        <nav className="flex w-full flex-col gap-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-all duration-200 lg:px-3 ` +
                (isActive
                  ? 'bg-signal/10 text-signal ring-1 ring-signal/20'
                  : 'text-ghost hover:bg-surface hover:text-frost')
              }
            >
              <Icon size={16} className="shrink-0" />
              <span className="hidden text-sm font-medium lg:block">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="mt-auto flex w-full items-center gap-3 rounded-lg border border-border/40 bg-surface/50 px-2 py-2 lg:px-3">
          <div className="h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-signal to-pulse" />
          <div className="hidden lg:block">
            <p className="text-xs font-medium text-frost">AI Agent</p>
            <p className="text-[10px] text-ghost">Hindsight Memory</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="relative flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center border-b border-border/40 bg-obsidian/60 px-6 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs text-ghost">
            <span className="font-medium text-frost">
              {NAV.find(n => n.to === location.pathname)?.label || 'Deal Intelligence Agent'}
            </span>
            <ChevronRight size={12} />
            <span className="font-mono text-signal/70">hindsight://memory</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-safe/10 px-3 py-1 text-xs text-safe ring-1 ring-safe/20">
              <span className="h-1.5 w-1.5 rounded-full bg-safe animate-pulse-slow" />
              Memory Active
            </span>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Routes>
                <Route path="/"              element={<Dashboard />} />
                <Route path="/chat"          element={<Chat />} />
                <Route path="/chat/:dealId"  element={<Chat />} />
                <Route path="/deals"         element={<Deals />} />
                <Route path="/deals/:id"     element={<DealDetail />} />
                <Route path="/intelligence"  element={<Intelligence />} />
                <Route path="/analytics"     element={<Analytics />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
