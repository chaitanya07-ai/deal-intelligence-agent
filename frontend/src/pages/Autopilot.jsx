import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Play, Loader2, FileText, Send, Mail, CheckCircle2,
  AlertTriangle, Brain, Terminal, Shield, ArrowUpRight, Check
} from 'lucide-react'
import { runAutopilot, fetchAutopilotLogs, fetchAutopilotActions } from '../utils/api'

function LogRow({ log }) {
  const levelColors = {
    INFO: 'text-frost',
    PROCESS: 'text-signal/80',
    RECALL: 'text-pulse font-semibold',
    MATCH: 'text-safe font-bold',
    REASON: 'text-yellow-400 font-medium',
    SUCCESS: 'text-safe font-bold',
    WARNING: 'text-ember font-bold'
  }

  const color = levelColors[log.level] || 'text-ghost'

  return (
    <div className="font-mono text-xs leading-relaxed flex items-start gap-2 select-all">
      <span className="text-ghost/40 select-none">[{log.time}]</span>
      <span className={`${color} shrink-0`}>[{log.level}]</span>
      <span className="text-frost/90">{log.message}</span>
    </div>
  )
}

export default function Autopilot() {
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState([])
  const [actions, setActions] = useState([])
  const [loadingActions, setLoadingActions] = useState(true)
  const [sendingEmailId, setSendingEmailId] = useState(null)
  const [sendingSMSId, setSendingSMSId] = useState(null)
  const [sentStatus, setSentStatus] = useState({}) // { [actionId_type]: true }
  
  const consoleEndRef = useRef(null)
  const pollRef = useRef(null)

  const loadActions = async () => {
    try {
      const res = await fetchAutopilotActions()
      setActions(res.actions || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingActions(false)
    }
  }

  useEffect(() => {
    loadActions()
    
    // Check if autopilot was already running on load
    fetchAutopilotLogs().then(res => {
      setLogs(res.logs || [])
      if (res.running) {
        setRunning(true)
        startPolling()
      }
    })

    return () => stopPolling()
  }, [])

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const startPolling = () => {
    stopPolling()
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetchAutopilotLogs()
        setLogs(res.logs || [])
        if (!res.running) {
          stopPolling()
          setRunning(false)
          loadActions() // Refresh actions when run finishes
        }
      } catch (err) {
        console.error(err)
        stopPolling()
        setRunning(false)
      }
    }, 1000)
  }

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const handleTrigger = async () => {
    setRunning(true)
    setLogs([])
    try {
      await runAutopilot()
      
      // Dispatch log event for header ticker
      window.dispatchEvent(new CustomEvent('hindsight-log', {
        detail: { type: 'PROCESS', message: 'Triggered B2B Sales Autopilot loop' }
      }))
      
      startPolling()
    } catch (e) {
      alert(`Error launching autopilot: ${e}`)
      setRunning(false)
    }
  }

  const handleSendAction = async (actionId, type, content) => {
    if (type === 'email') setSendingEmailId(actionId)
    else setSendingSMSId(actionId)

    // Simulate sending SMS/Email
    await new Promise(resolve => setTimeout(resolve, 1200))

    // Dispatch log event for header ticker
    window.dispatchEvent(new CustomEvent('hindsight-log', {
      detail: { type: 'RETAIN', message: `Sent autonomous B2B ${type} follow-up for action ID: ${actionId.slice(0, 5)}` }
    }))

    setSentStatus(prev => ({ ...prev, [`${actionId}_${type}`]: true }))
    setSendingEmailId(null)
    setSendingSMSId(null)
  }

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-frost">Auto-Pilot Console</h1>
          <p className="text-sm text-ghost mt-0.5">Autonomous Sales Co-pilot leveraging cross-deal Hindsight recall to resolve objections</p>
        </div>
        <button
          onClick={handleTrigger}
          disabled={running}
          className="btn-primary py-2.5 px-6 rounded-xl flex items-center gap-2 text-sm font-semibold hover:glow transition-all shrink-0 disabled:opacity-50"
        >
          {running ? (
            <>
              <Loader2 size={16} className="animate-spin text-signal" /> Loop Running...
            </>
          ) : (
            <>
              <Play size={15} fill="currentColor" /> Activate B2B Auto-Pilot
            </>
          )}
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-5 overflow-hidden">
        
        {/* Left Side: System Explanation & Terminal Logs */}
        <div className="w-full lg:w-96 flex flex-col gap-4 shrink-0 overflow-y-auto">
          {/* Loop Card */}
          <div className="glass gradient-border rounded-2xl p-5 border border-border/40 space-y-4">
            <h2 className="font-display text-sm font-bold text-frost flex items-center gap-2">
              <Shield size={16} className="text-pulse animate-pulse-slow" /> Autonomous Loop Design
            </h2>
            <div className="space-y-3 text-xs text-frost/80">
              <p>The Auto-Pilot checks all active pipeline deals and triggers the **Retain-Recall-Act** loop:</p>
              <div className="space-y-2 font-mono text-[10px] pl-2 border-l border-border/50 text-ghost">
                <div className="flex gap-2">
                  <span className="text-signal">1. Recall:</span>
                  <span>Fetch unresolved objections from Hindsight database.</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-pulse">2. Cross-Search:</span>
                  <span>Query Hindsight globally for matching issues in WON deals.</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-safe">3. Learn & Act:</span>
                  <span>Extract matched strategy, synthesize customized B2B objection drafts.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Console Terminal */}
          <div className="flex-1 min-h-[200px] glass border border-border/60 bg-black/60 rounded-2xl p-4 flex flex-col font-mono select-none">
            <div className="flex items-center justify-between pb-2 border-b border-border/20 mb-3 text-[10px] text-ghost/50">
              <span className="flex items-center gap-1.5 font-bold"><Terminal size={12} /> execution_loop_logs</span>
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-danger/50" />
                <span className="h-1.5 w-1.5 rounded-full bg-caution/50" />
                <span className="h-1.5 w-1.5 rounded-full bg-safe/50" />
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {logs.length === 0 ? (
                <div className="text-xs text-ghost/40 py-8 text-center italic">Auto-Pilot inactive. Click activation above to scan pipeline.</div>
              ) : (
                logs.map((log, i) => <LogRow key={i} log={log} />)
              )}
              <div ref={consoleEndRef} />
            </div>
          </div>
        </div>

        {/* Right Side: Generated Actions Panel */}
        <div className="flex-1 glass gradient-border rounded-2xl p-5 border border-border/40 bg-obsidian/40 flex flex-col overflow-hidden">
          <div className="pb-3 border-b border-border/40 mb-4 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-frost flex items-center gap-2">
              <Brain size={16} className="text-signal" /> Autopilot Recommendations ({actions.length})
            </h2>
            <span className="text-[10px] text-ghost font-mono">Retrieved from memory</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {loadingActions ? (
              <div className="flex h-full items-center justify-center py-16">
                <Loader2 className="animate-spin text-signal" size={24} />
              </div>
            ) : actions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                <FileText size={40} className="text-ghost/20" />
                <p className="text-ghost text-sm">No playbooks generated yet.</p>
                <p className="text-xs text-ghost/50 max-w-xs">Run the Auto-Pilot scan loop to check your CRM pipelines and build playbooks.</p>
              </div>
            ) : (
              actions.map((act, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="glass-elevated border border-border/50 rounded-xl p-4 space-y-4 bg-surface/30 hover:border-signal/20 transition-all"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm text-frost">{act.company_name}</h3>
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-signal/15 text-signal border border-signal/25">
                          Playbook: {act.title}
                        </span>
                      </div>
                      <p className="text-xs text-ghost mt-0.5">Contact: {act.contact_name} · {act.contact_email}</p>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-safe/10 border border-safe/25 text-safe shrink-0">
                      <ArrowUpRight size={12} />
                      <span className="text-xs font-mono font-bold">-{act.risk_reduction}% Risk</span>
                    </div>
                  </div>

                  {/* Objection Box */}
                  <div className="bg-ember/5 border border-ember/25 text-ember text-xs p-3 rounded-lg flex gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold uppercase tracking-wider text-[9px]">Unresolved Objection: </span>
                      {act.objection}
                    </div>
                  </div>

                  {/* Playbook Strategy */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-ghost uppercase tracking-wide font-bold">Hindsight Resolution Strategy</span>
                    <p className="text-xs text-frost/80 leading-relaxed bg-surface/40 border border-border/30 p-3 rounded-lg">
                      {act.strategy}
                    </p>
                  </div>

                  {/* Drafts Tab accordion */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Draft Email */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-ghost uppercase tracking-wide font-bold flex items-center gap-1"><Mail size={12} /> Email Draft</span>
                        <button
                          onClick={() => handleSendAction(act.deal_id, 'email', act.draft_email)}
                          disabled={sendingEmailId === act.deal_id || sentStatus[`${act.deal_id}_email`]}
                          className={`btn-primary px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1 transition-all cursor-pointer ${
                            sentStatus[`${act.deal_id}_email`] ? 'bg-safe/20 border-safe/40 text-safe' : ''
                          }`}
                        >
                          {sendingEmailId === act.deal_id ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : sentStatus[`${act.deal_id}_email`] ? (
                            <Check size={10} />
                          ) : (
                            <Send size={10} />
                          )}
                          {sentStatus[`${act.deal_id}_email`] ? 'Email Sent' : 'Send Email'}
                        </button>
                      </div>
                      <div className="font-sans text-xs text-frost/70 bg-black/40 border border-border/40 p-3 rounded-lg whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                        {act.draft_email}
                      </div>
                    </div>

                    {/* Draft SMS */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-ghost uppercase tracking-wide font-bold flex items-center gap-1"><Zap size={11} /> SMS text</span>
                        <button
                          onClick={() => handleSendAction(act.deal_id, 'sms', act.draft_sms)}
                          disabled={sendingSMSId === act.deal_id || sentStatus[`${act.deal_id}_sms`]}
                          className={`btn-primary px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1 transition-all cursor-pointer ${
                            sentStatus[`${act.deal_id}_sms`] ? 'bg-safe/20 border-safe/40 text-safe' : ''
                          }`}
                        >
                          {sendingSMSId === act.deal_id ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : sentStatus[`${act.deal_id}_sms`] ? (
                            <Check size={10} />
                          ) : (
                            <Send size={10} />
                          )}
                          {sentStatus[`${act.deal_id}_sms`] ? 'SMS Sent' : 'Send SMS'}
                        </button>
                      </div>
                      <div className="font-sans text-xs text-frost/70 bg-black/40 border border-border/40 p-3 rounded-lg leading-relaxed max-h-36 overflow-y-auto">
                        {act.draft_sms}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
