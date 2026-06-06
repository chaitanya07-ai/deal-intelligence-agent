import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, Send, Loader2, Sparkles, AlertTriangle,
  Award, TrendingUp, CheckCircle, XCircle, ArrowRight,
  Shield, Users, DollarSign, MessageSquare, RefreshCw
} from 'lucide-react'
import { fetchDeals, fetchDealMemories, startRoleplay, sendRoleplayChat, evaluateRoleplay } from '../utils/api'
import { formatRelative } from '../utils/format'

function ScoreRing({ score, label, color }) {
  const radius = 35
  const stroke = 6
  const normalizedRadius = radius - stroke * 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
          <circle
            stroke="#1a1a28"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <span className="absolute font-mono text-sm font-bold text-frost">{score}%</span>
      </div>
      <span className="text-[10px] text-ghost mt-2 font-medium uppercase tracking-wider">{label}</span>
    </div>
  )
}

export default function Roleplay() {
  const [deals, setDeals] = useState([])
  const [selectedDeal, setSelectedDeal] = useState('')
  const [stakeholders, setStakeholders] = useState([])
  const [selectedSH, setSelectedSH] = useState('')
  const [loadingDeals, setLoadingDeals] = useState(true)
  const [starting, setStarting] = useState(false)
  const [activeSession, setActiveSession] = useState(null)
  
  // Chat state
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  
  // Evaluation state
  const [evaluating, setEvaluating] = useState(false)
  const [evalResult, setEvalResult] = useState(null)

  const chatEndRef = useRef(null)

  useEffect(() => {
    fetchDeals()
      .then(res => {
        setDeals(res.deals || [])
        setLoadingDeals(false)
      })
      .catch(err => console.error(err))
  }, [])

  useEffect(() => {
    if (!selectedDeal) {
      setStakeholders([])
      setSelectedSH('')
      return
    }

    // Fetch stakeholders for this deal from Hindsight
    fetchDealMemories(selectedDeal, 'stakeholder')
      .then(res => {
        const shList = (res.memories || []).map(m => m.metadata || {})
        setStakeholders(shList)
        if (shList.length > 0) {
          setSelectedSH(shList[0].name)
        } else {
          setSelectedSH('Sarah Jenkins') // Fallback default
        }
      })
      .catch(() => {
        setSelectedSH('Sarah Jenkins')
      })
  }, [selectedDeal])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleStart = async () => {
    if (!selectedDeal || !selectedSH) return
    setStarting(true)
    setEvalResult(null)
    try {
      const res = await startRoleplay(selectedDeal, selectedSH)
      // Custom event to trigger top-bar log notifier
      window.dispatchEvent(new CustomEvent('hindsight-log', {
        detail: { type: 'RECALL', message: `Recalled stakeholder context & ${res.objections_to_handle.length} objections for meeting` }
      }))
      
      setActiveSession(res)
      setMessages([{
        role: 'assistant',
        content: res.greeting,
        timestamp: new Date().toISOString()
      }])
    } catch (e) {
      alert(`Error starting simulation: ${e}`)
    } finally {
      setStarting(false)
    }
  }

  const handleSend = async (e) => {
    e?.preventDefault()
    if (!input.trim() || sending) return
    const msg = input.trim()
    setInput('')
    setSending(true)

    setMessages(prev => [...prev, {
      role: 'user', content: msg, timestamp: new Date().toISOString()
    }])

    try {
      const res = await sendRoleplayChat(selectedDeal, msg)
      
      // Dispatch log event
      window.dispatchEvent(new CustomEvent('hindsight-log', {
        detail: { type: 'RETAIN', message: `Stored transaction and evaluated reply against prospect profile` }
      }))

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.response,
        timestamp: new Date().toISOString()
      }])
    } catch (err) {
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  const handleEvaluate = async () => {
    setEvaluating(true)
    try {
      const res = await evaluateRoleplay(selectedDeal)
      
      // Dispatch log event
      window.dispatchEvent(new CustomEvent('hindsight-log', {
        detail: { type: 'RETAIN', message: `Analyzed roleplay metrics and saved performance review to Hindsight` }
      }))

      setEvalResult(res.evaluation)
      setActiveSession(null)
      setMessages([])
    } catch (e) {
      alert(`Error evaluating: ${e}`)
    } finally {
      setEvaluating(false)
    }
  }

  const currentDealObj = deals.find(d => d.id === selectedDeal)

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold text-frost">Meeting Simulator</h1>
        <p className="text-sm text-ghost mt-0.5">Practice pitch handling against simulated accounts powered by historical memories</p>
      </div>

      {loadingDeals ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-signal" size={28} />
        </div>
      ) : !activeSession && !evalResult ? (
        /* Configuration Panel */
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass gradient-border rounded-2xl p-6 w-full max-w-lg border border-border/50 space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="mx-auto h-12 w-12 rounded-xl bg-signal/10 flex items-center justify-center ring-1 ring-signal/30 signal-glow">
                <Brain size={22} className="text-signal" />
              </div>
              <h2 className="font-display text-lg font-bold text-frost">Setup Sales Meeting</h2>
              <p className="text-xs text-ghost max-w-sm mx-auto">Select a deal context and stakeholder. Hindsight will load their custom objections, competitor history, and negotiation constraints.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-ghost mb-1 font-medium">Select Deal Context</label>
                <select
                  value={selectedDeal}
                  onChange={e => setSelectedDeal(e.target.value)}
                  className="w-full rounded-xl border border-border/60 bg-surface/60 px-4 py-3 text-sm text-frost focus:border-signal/40 focus:outline-none"
                >
                  <option value="">-- Choose an active deal --</option>
                  {deals.filter(d => d.outcome === 'active').map(d => (
                    <option key={d.id} value={d.id}>{d.company_name} (${(d.deal_value/1000).toFixed(0)}k)</option>
                  ))}
                </select>
              </div>

              {selectedDeal && (
                <div>
                  <label className="block text-xs text-ghost mb-1 font-medium">Select Stakeholder Persona</label>
                  <select
                    value={selectedSH}
                    onChange={e => setSelectedSH(e.target.value)}
                    className="w-full rounded-xl border border-border/60 bg-surface/60 px-4 py-3 text-sm text-frost focus:border-signal/40 focus:outline-none"
                  >
                    {stakeholders.length > 0 ? (
                      stakeholders.map(sh => (
                        <option key={sh.name} value={sh.name}>{sh.name} ({sh.title} · {sh.role})</option>
                      ))
                    ) : (
                      <>
                        <option value="Sarah Jenkins">Sarah Jenkins (VP of Operations · Decision Maker)</option>
                        <option value="David Miller">David Miller (CTO · Blocker)</option>
                        <option value="John Doe">John Doe (Purchasing Agent · Influencer)</option>
                      </>
                    )}
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={handleStart}
              disabled={starting || !selectedDeal}
              className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold hover:glow transition-all disabled:opacity-40"
            >
              {starting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Retrieving context...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Start Simulation Call
                </>
              )}
            </button>
          </motion.div>
        </div>
      ) : activeSession ? (
        /* Active Simulation Dashboard */
        <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
          
          {/* Left Panel - Meeting Monitor */}
          <div className="w-full lg:w-80 glass gradient-border rounded-2xl p-5 flex flex-col justify-between border border-border/40 bg-obsidian/20 shrink-0">
            <div className="space-y-5">
              <div>
                <p className="text-[10px] text-ghost uppercase tracking-wider font-semibold mb-2">Simulated Contact</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-signal/10 border border-signal/20 flex items-center justify-center text-signal font-bold text-sm">
                    {activeSession.stakeholder?.name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-frost">{activeSession.stakeholder?.name}</h3>
                    <p className="text-xs text-ghost">{activeSession.stakeholder?.title}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-pulse animate-pulse-slow" />
                  <span className="text-[10px] text-pulse uppercase font-mono tracking-wider">Role: {activeSession.stakeholder?.role}</span>
                </div>
              </div>

              <div className="h-px bg-border/40" />

              <div>
                <p className="text-[10px] text-ghost uppercase tracking-wider font-semibold mb-2 flex items-center gap-1">
                  <AlertTriangle size={10} className="text-ember" /> Active Objections
                </p>
                {activeSession.objections_to_handle?.length > 0 ? (
                  <ul className="space-y-2">
                    {activeSession.objections_to_handle.map((obj, i) => (
                      <li key={i} className="text-xs text-frost bg-surface/50 border border-border/40 p-2.5 rounded-xl flex items-start gap-2">
                        <span className="text-ember font-mono shrink-0">#{i+1}</span>
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-ghost">Default objections loaded (Pricing/Implementation).</p>
                )}
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <div className="bg-safe/5 border border-safe/20 text-safe rounded-xl p-3 text-[10px] flex items-center gap-2 font-mono">
                <Brain size={12} className="animate-pulse shrink-0" />
                Hindsight Learning Active
              </div>
              <button
                onClick={handleEvaluate}
                disabled={evaluating}
                className="w-full bg-danger/10 border border-danger/30 hover:bg-danger/20 text-danger text-xs py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {evaluating ? <Loader2 size={13} className="animate-spin" /> : <Award size={13} />}
                End Call & Evaluate
              </button>
            </div>
          </div>

          {/* Right Panel - Chat Area */}
          <div className="flex-1 glass gradient-border rounded-2xl flex flex-col overflow-hidden border border-border/40 bg-obsidian/40">
            {/* Call Status bar */}
            <div className="bg-surface/40 px-5 py-3 border-b border-border/40 flex items-center justify-between text-xs text-ghost">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-safe animate-pulse" />
                Live Call Connection
              </span>
              <span className="font-mono text-signal/80">
                {currentDealObj?.company_name}
              </span>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((msg, i) => {
                const isUser = msg.role === 'user'
                return (
                  <div key={i} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ring-1 ${
                      isUser ? 'bg-pulse/20 text-pulse ring-pulse/30' : 'bg-signal/15 text-signal ring-signal/30'
                    }`}>
                      {isUser ? 'Rep' : activeSession.stakeholder?.name?.charAt(0) || 'S'}
                    </div>
                    {/* Bubble */}
                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm border ${
                      isUser
                        ? 'bg-pulse/10 text-frost border-pulse/25 rounded-tr-none'
                        : 'bg-surface/50 text-frost border-border/60 rounded-tl-none'
                    }`}>
                      <p className="leading-relaxed">{msg.content}</p>
                      <span className="block text-[8px] text-ghost/50 text-right mt-1.5 font-mono">{formatRelative(msg.timestamp)}</span>
                    </div>
                  </div>
                )
              })}
              {sending && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-signal/15 text-signal flex items-center justify-center text-xs font-bold animate-pulse">
                    {activeSession.stakeholder?.name?.charAt(0) || 'S'}
                  </div>
                  <div className="bg-surface/50 border border-border/60 rounded-2xl rounded-tl-none px-4 py-3 flex items-center justify-center">
                    <div className="flex gap-1 h-3 items-center">
                      {[0, 1, 2].map(d => (
                        <div key={d} className="h-1.5 w-1.5 bg-signal/60 rounded-full animate-bounce" style={{ animationDelay: `${d*0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="p-4 border-t border-border/40 bg-surface/30 flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`Respond to ${activeSession.stakeholder?.name}...`}
                disabled={sending}
                className="flex-1 bg-surface/60 border border-border/60 rounded-xl px-4 py-3 text-sm text-frost placeholder-ghost/40 focus:outline-none focus:border-signal/40"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="h-11 w-11 rounded-xl bg-signal/10 border border-signal/30 text-signal flex items-center justify-center hover:bg-signal/25 transition-all disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Evaluation Report Card View */
        <div className="flex-1 overflow-y-auto space-y-6 max-w-4xl mx-auto p-2">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass gradient-border rounded-2xl p-6 border border-border/50 space-y-6 bg-obsidian/20"
          >
            {/* Ring charts and score header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-border/40">
              <div className="space-y-1.5 text-center md:text-left">
                <span className="px-3 py-1 rounded-full bg-safe/15 border border-safe/30 text-safe font-mono text-[10px] tracking-wide uppercase font-bold animate-pulse-slow inline-block">
                  Evaluation Saved to Hindsight
                </span>
                <h2 className="font-display text-xl font-bold text-frost">Meeting Report Card</h2>
                <p className="text-xs text-ghost">Feedback generated from conversation and cross-referenced with account history.</p>
              </div>
              <div className="flex gap-6 items-center">
                <ScoreRing score={evalResult.objection_handling_score} label="Objection Handling" color="#00d4ff" />
                <ScoreRing score={evalResult.communication_score} label="Communication" color="#7c3aed" />
                <ScoreRing score={evalResult.closing_readiness_score} label="Closing Power" color="#22c55e" />
              </div>
            </div>

            {/* Main feedback text */}
            <div className="space-y-2">
              <h3 className="text-xs text-ghost uppercase tracking-wide font-bold flex items-center gap-1.5">
                <MessageSquare size={13} className="text-signal" /> Summary Feedback
              </h3>
              <p className="text-sm text-frost leading-relaxed bg-surface/30 border border-border/40 p-4 rounded-xl">
                {evalResult.feedback}
              </p>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-xs text-ghost uppercase tracking-wide font-bold flex items-center gap-1.5">
                  <CheckCircle size={13} className="text-safe" /> Strengths
                </h3>
                <ul className="space-y-1.5">
                  {evalResult.strengths?.map((s, i) => (
                    <li key={i} className="text-xs text-frost flex items-start gap-2">
                      <span className="text-safe mt-0.5 shrink-0">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="text-xs text-ghost uppercase tracking-wide font-bold flex items-center gap-1.5">
                  <XCircle size={13} className="text-danger" /> Areas of Improvement
                </h3>
                <ul className="space-y-1.5">
                  {evalResult.weaknesses?.map((w, i) => (
                    <li key={i} className="text-xs text-frost flex items-start gap-2">
                      <span className="text-danger mt-0.5 shrink-0">✗</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="h-px bg-border/40" />

            {/* Action checklist */}
            <div className="space-y-3">
              <h3 className="text-xs text-ghost uppercase tracking-wide font-bold flex items-center gap-1.5">
                <TrendingUp size={13} className="text-pulse" /> Action Plan to Close Account
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {evalResult.recommended_actions?.map((act, i) => (
                  <div key={i} className="bg-surface/50 border border-border/40 rounded-xl p-3.5 flex items-start gap-3">
                    <span className="h-5 w-5 rounded-full bg-pulse/15 text-pulse shrink-0 flex items-center justify-center font-mono text-xs font-bold">
                      {i+1}
                    </span>
                    <span className="text-xs text-frost">{act}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer with actions */}
            <div className="flex gap-3 pt-4 justify-end">
              <button
                onClick={() => setEvalResult(null)}
                className="btn-ghost flex items-center gap-1.5 text-xs font-semibold py-2.5 px-4 cursor-pointer"
              >
                <RefreshCw size={13} /> Try Another Simulation
              </button>
              <Link
                to={`/deals/${selectedDeal}`}
                className="btn-primary flex items-center gap-1.5 text-xs font-semibold py-2.5 px-4 cursor-pointer"
              >
                Go to Account Detail <ArrowRight size={13} />
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
