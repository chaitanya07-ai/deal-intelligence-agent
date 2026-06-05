import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  Send, Loader2, Brain, Zap, ChevronDown,
  Briefcase, Sparkles, Clock, X
} from 'lucide-react'
import { sendChat, fetchDeals } from '../utils/api'
import { formatRelative } from '../utils/format'

const STARTERS = [
  "What objections did this prospect raise before?",
  "Summarize the deal history and risks",
  "Draft a follow-up email for this account",
  "What competitors are involved and how do we counter?",
  "Give me a pre-call briefing",
  "What pricing discussions happened?",
  "Who are the key stakeholders and their positions?",
  "What's the recommended strategy to close this deal?",
]

function Message({ msg, isLast }) {
  const isUser = msg.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold
        ${isUser
          ? 'bg-pulse/20 text-pulse ring-1 ring-pulse/30'
          : 'bg-signal/10 text-signal ring-1 ring-signal/30'
        }`}>
        {isUser ? 'U' : <Zap size={12} />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] space-y-1 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`rounded-2xl px-4 py-3 text-sm
          ${isUser
            ? 'bg-pulse/15 text-frost rounded-tr-sm ring-1 ring-pulse/20'
            : 'glass text-frost rounded-tl-sm'
          }`}>
          {isUser ? (
            <p>{msg.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none
              prose-p:text-frost prose-p:leading-relaxed
              prose-headings:text-frost prose-headings:font-display
              prose-strong:text-signal prose-code:text-signal/80
              prose-code:bg-signal/10 prose-code:px-1 prose-code:rounded
              prose-ul:text-frost prose-li:text-frost">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className={`flex items-center gap-2 text-[10px] text-ghost ${isUser ? 'flex-row-reverse' : ''}`}>
          <span>{formatRelative(msg.timestamp)}</span>
          {!isUser && msg.memoriesUsed > 0 && (
            <span className="flex items-center gap-1 text-signal/70">
              <Brain size={10} />
              {msg.memoriesUsed} memories
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function Chat() {
  const { dealId: routeDealId } = useParams()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [deals, setDeals] = useState([])
  const [selectedDeal, setSelectedDeal] = useState(routeDealId || null)
  const [showDealPicker, setShowDealPicker] = useState(false)
  const [interactionCount, setInteractionCount] = useState(0)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    fetchDeals().then(r => setDeals(r.deals || []))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (routeDealId) setSelectedDeal(routeDealId)
  }, [routeDealId])

  const currentDeal = deals.find(d => d.id === selectedDeal)

  const send = useCallback(async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    setLoading(true)

    setMessages(prev => [...prev, {
      role: 'user', content: msg, timestamp: new Date().toISOString()
    }])

    try {
      const res = await sendChat(msg, selectedDeal)
      setInteractionCount(prev => prev + 1)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.response,
        memoriesUsed: res.memories_used || 0,
        suggestions: res.suggestions || [],
        timestamp: new Date().toISOString()
      }])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${e}`,
        timestamp: new Date().toISOString()
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading, selectedDeal])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); send()
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat header */}
      <div className="flex items-center gap-4 border-b border-border/40 bg-obsidian/60 px-6 py-3 backdrop-blur-xl">
        {/* Deal selector */}
        <div className="relative">
          <button
            onClick={() => setShowDealPicker(!showDealPicker)}
            className="flex items-center gap-2 rounded-lg border border-border/60 bg-surface/50 px-3 py-1.5 text-xs text-frost hover:bg-elevated transition-colors"
          >
            <Briefcase size={12} className="text-signal" />
            {currentDeal ? currentDeal.company_name : 'No deal selected'}
            <ChevronDown size={12} className="text-ghost" />
          </button>

          <AnimatePresence>
            {showDealPicker && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute top-full left-0 mt-1 z-50 glass rounded-xl border border-border/60 p-2 min-w-64 max-h-64 overflow-y-auto shadow-2xl"
              >
                <button
                  onClick={() => { setSelectedDeal(null); setShowDealPicker(false) }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-ghost hover:bg-surface transition-colors"
                >
                  No deal (general chat)
                </button>
                {deals.map(d => (
                  <button
                    key={d.id}
                    onClick={() => { setSelectedDeal(d.id); setShowDealPicker(false) }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                      selectedDeal === d.id ? 'bg-signal/10 text-signal' : 'text-frost hover:bg-surface'
                    }`}
                  >
                    <span className="font-medium">{d.company_name}</span>
                    <span className="text-ghost ml-2">{d.contact_name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Memory indicator */}
        {interactionCount > 0 && (
          <span className="flex items-center gap-1.5 text-[10px] text-signal/70">
            <Brain size={11} className="text-signal" />
            {interactionCount} interaction{interactionCount !== 1 ? 's' : ''} stored in memory
          </span>
        )}

        {selectedDeal && (
          <Link to={`/deals/${selectedDeal}`} className="ml-auto text-[10px] text-ghost hover:text-signal transition-colors">
            View deal →
          </Link>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full space-y-8 animate-fade-in">
            {/* Welcome */}
            <div className="text-center space-y-3">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-signal/10 ring-1 ring-signal/30 flex items-center justify-center signal-glow">
                <Zap size={24} className="text-signal" />
              </div>
              <h2 className="font-display text-xl font-bold text-frost">Deal Intelligence Agent</h2>
              <p className="text-sm text-ghost max-w-sm">
                {selectedDeal && currentDeal
                  ? `I have full memory context for ${currentDeal.company_name}. Ask me anything about this deal.`
                  : 'Select a deal for memory-augmented responses, or chat for general sales guidance.'}
              </p>
            </div>

            {/* Starters */}
            <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
              {STARTERS.slice(0, 6).map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  className="text-left rounded-xl border border-border/50 bg-surface/40 px-3 py-2.5 text-xs text-ghost hover:text-frost hover:border-signal/30 hover:bg-signal/5 transition-all"
                >
                  <Sparkles size={10} className="inline mr-1 text-signal/60" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <Message key={i} msg={msg} isLast={i === messages.length - 1} />
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="h-7 w-7 rounded-full bg-signal/10 ring-1 ring-signal/30 flex items-center justify-center">
              <Zap size={12} className="text-signal" />
            </div>
            <div className="glass rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-signal/60"
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-border/40 bg-obsidian/60 px-6 py-4 backdrop-blur-xl">
        {/* Quick starters when no messages */}
        {messages.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {STARTERS.slice(0, 4).map((s, i) => (
              <button
                key={i}
                onClick={() => send(s)}
                className="shrink-0 rounded-full border border-border/50 bg-surface/40 px-3 py-1 text-[11px] text-ghost hover:text-frost hover:border-signal/30 transition-all"
              >
                {s.split(' ').slice(0, 4).join(' ')}...
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={handleKey}
              placeholder={selectedDeal && currentDeal
                ? `Ask about ${currentDeal.company_name}...`
                : 'Ask the Deal Intelligence Agent...'}
              className="w-full resize-none rounded-xl border border-border/60 bg-surface/60 px-4 py-3 text-sm text-frost placeholder-ghost/50 focus:border-signal/40 focus:outline-none focus:bg-surface transition-all"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="h-11 w-11 rounded-xl bg-signal/10 border border-signal/30 flex items-center justify-center text-signal hover:bg-signal/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <p className="mt-2 text-[10px] text-ghost/50 text-center">
          Responses powered by Groq + Hindsight memory context
        </p>
      </div>
    </div>
  )
}
