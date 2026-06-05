import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  ArrowLeft, Brain, FileText, Mail, MessageSquare,
  Phone, AlertTriangle, Users, DollarSign, Clock,
  ChevronDown, Loader2, Zap, CheckCircle, X,
  Shield, TrendingUp, Target, RefreshCw
} from 'lucide-react'
import {
  fetchDeal, fetchDealBriefing, fetchDealRisk,
  fetchDealMemories, draftEmail, sendSMS, initiateCall,
  storeMemory, updateDeal
} from '../utils/api'
import { formatCurrency, formatRelative, riskBg, riskColor, stageLabel, pct } from '../utils/format'

const MEMORY_TYPES = [
  { key: null,         label: 'All',        icon: Brain },
  { key: 'objection',  label: 'Objections', icon: AlertTriangle },
  { key: 'competitor', label: 'Competitors', icon: Shield },
  { key: 'stakeholder',label: 'Stakeholders',icon: Users },
  { key: 'pricing',    label: 'Pricing',    icon: DollarSign },
]

const MEMORY_ICONS = {
  objection:   { icon: AlertTriangle, color: 'text-ember',  bg: 'bg-ember/10 border-ember/20' },
  competitor:  { icon: Shield,        color: 'text-pulse',  bg: 'bg-pulse/10 border-pulse/20' },
  stakeholder: { icon: Users,         color: 'text-signal', bg: 'bg-signal/10 border-signal/20' },
  pricing:     { icon: DollarSign,    color: 'text-safe',   bg: 'bg-safe/10 border-safe/20' },
  default:     { icon: Brain,         color: 'text-ghost',  bg: 'bg-surface/60 border-border/40' },
}

function MemoryCard({ mem }) {
  const type = mem.type || mem.metadata?.type || 'default'
  const { icon: Icon, color, bg } = MEMORY_ICONS[type] || MEMORY_ICONS.default

  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 ${bg}`}>
      <div className={`rounded-lg p-1.5 shrink-0 ${color} bg-current/10`}>
        <Icon size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-frost leading-relaxed">{mem.content || mem.text}</p>
        {mem.timestamp && (
          <p className="text-[10px] text-ghost/60 mt-1">{formatRelative(mem.timestamp)}</p>
        )}
      </div>
    </div>
  )
}

function AddMemoryForm({ dealId, onAdded }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('objection')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!content.trim()) return
    setSaving(true)
    try {
      await storeMemory(dealId, type, content.trim())
      setContent(''); onAdded()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="w-full text-center text-xs text-ghost hover:text-signal transition-colors py-2 border border-dashed border-border/40 rounded-xl hover:border-signal/30">
      + Add memory
    </button>
  )

  return (
    <div className="glass rounded-xl p-4 border border-signal/20 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-frost">Add Memory</span>
        <button onClick={() => setOpen(false)} className="text-ghost hover:text-frost"><X size={14} /></button>
      </div>
      <select
        value={type}
        onChange={e => setType(e.target.value)}
        className="w-full rounded-lg border border-border/60 bg-surface/60 px-3 py-2 text-xs text-frost"
      >
        <option value="objection">Objection</option>
        <option value="competitor">Competitor</option>
        <option value="stakeholder">Stakeholder</option>
        <option value="pricing">Pricing Note</option>
        <option value="note">General Note</option>
      </select>
      <textarea
        rows={3}
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Enter memory content..."
        className="w-full rounded-lg border border-border/60 bg-surface/60 px-3 py-2 text-xs text-frost placeholder-ghost/40 focus:border-signal/40 focus:outline-none resize-none"
      />
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="btn-ghost flex-1 text-xs py-1.5">Cancel</button>
        <button onClick={save} disabled={saving} className="btn-primary flex-1 text-xs py-1.5 flex items-center justify-center gap-1">
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
          Save to Memory
        </button>
      </div>
    </div>
  )
}

export default function DealDetail() {
  const { id } = useParams()
  const [deal, setDeal]         = useState(null)
  const [risk, setRisk]         = useState(null)
  const [memories, setMemories] = useState([])
  const [briefing, setBriefing] = useState(null)
  const [email, setEmail]       = useState(null)
  const [memType, setMemType]   = useState(null)
  const [tab, setTab]           = useState('overview')
  const [loading, setLoading]   = useState(true)
  const [loadingBriefing, setLoadingBriefing] = useState(false)
  const [loadingEmail, setLoadingEmail]       = useState(false)
  const [loadingSMS, setLoadingSMS]           = useState(false)
  const [loadingCall, setLoadingCall]         = useState(false)
  const [smsResult, setSmsResult]             = useState(null)
  const [callResult, setCallResult]           = useState(null)

  const loadDeal = useCallback(async () => {
    setLoading(true)
    try {
      const [d, r, m] = await Promise.all([
        fetchDeal(id),
        fetchDealRisk(id),
        fetchDealMemories(id, memType)
      ])
      setDeal(d); setRisk(r); setMemories(m.memories || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [id, memType])

  useEffect(() => { loadDeal() }, [loadDeal])

  const handleBriefing = async () => {
    setLoadingBriefing(true); setTab('briefing')
    try { const b = await fetchDealBriefing(id); setBriefing(b) }
    catch (e) { console.error(e) }
    finally { setLoadingBriefing(false) }
  }

  const handleEmail = async () => {
    if (!deal?.contact_email) return alert('No email address for this contact')
    setLoadingEmail(true); setTab('email')
    try { const e = await draftEmail(id, 'follow_up', deal.contact_email); setEmail(e) }
    catch (e) { console.error(e) }
    finally { setLoadingEmail(false) }
  }

  const handleSMS = async () => {
    if (!deal?.contact_phone) return alert('No phone number for this contact')
    setLoadingSMS(true)
    try { const r = await sendSMS(id, deal.contact_phone, 'follow_up'); setSmsResult(r) }
    catch (e) { console.error(e) }
    finally { setLoadingSMS(false) }
  }

  const handleCall = async () => {
    if (!deal?.contact_phone) return alert('No phone number for this contact')
    setLoadingCall(true)
    try { const r = await initiateCall(id, deal.contact_phone); setCallResult(r) }
    catch (e) { console.error(e) }
    finally { setLoadingCall(false) }
  }

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="animate-spin text-signal" size={28} />
    </div>
  )
  if (!deal) return (
    <div className="p-6 text-ghost">Deal not found. <Link to="/deals" className="text-signal">Back to deals</Link></div>
  )

  return (
    <div className="flex h-full flex-col lg:flex-row overflow-hidden">
      {/* Left panel */}
      <div className="w-full lg:w-72 xl:w-80 border-b lg:border-b-0 lg:border-r border-border/40 bg-obsidian/40 flex flex-col overflow-y-auto">
        {/* Deal header */}
        <div className="p-5 border-b border-border/40">
          <Link to="/deals" className="flex items-center gap-1 text-xs text-ghost hover:text-signal transition-colors mb-4">
            <ArrowLeft size={12} /> All Deals
          </Link>
          <h1 className="font-display text-lg font-bold text-frost">{deal.company_name}</h1>
          <p className="text-sm text-ghost mt-0.5">{deal.contact_name}</p>
          {deal.contact_title && <p className="text-xs text-ghost/60">{deal.contact_title}</p>}

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className={`stage-badge stage-${deal.stage}`}>{stageLabel(deal.stage)}</span>
            {risk && (
              <span className={`px-2 py-0.5 rounded text-xs border ${riskBg(risk.risk_level)} ${riskColor(risk.risk_level)}`}>
                {risk.risk_level} risk
              </span>
            )}
          </div>

          <p className="mt-3 text-xl font-display font-bold text-signal">{formatCurrency(deal.deal_value)}</p>

          {risk?.closure_probability != null && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-ghost mb-1">
                <span>Close probability</span>
                <span className="font-mono text-frost">{pct(risk.closure_probability)}</span>
              </div>
              <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(risk.closure_probability || 0) * 100}%`,
                    background: `linear-gradient(90deg, ${
                      risk.risk_level === 'low' ? '#22c55e' :
                      risk.risk_level === 'medium' ? '#eab308' : '#ef4444'
                    }, ${
                      risk.risk_level === 'low' ? '#00d4ff' : '#f97316'
                    })`
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="p-4 space-y-2 border-b border-border/40">
          <p className="text-[10px] text-ghost uppercase tracking-wider mb-3">Quick Actions</p>
          <button onClick={handleBriefing} className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs bg-signal/5 border border-signal/20 text-signal hover:bg-signal/10 transition-colors">
            {loadingBriefing ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
            Generate Briefing
          </button>
          <button onClick={handleEmail} className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs bg-pulse/5 border border-pulse/20 text-pulse hover:bg-pulse/10 transition-colors">
            {loadingEmail ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
            Draft Email
          </button>
          <button onClick={handleSMS} className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs bg-safe/5 border border-safe/20 text-safe hover:bg-safe/10 transition-colors">
            {loadingSMS ? <Loader2 size={13} className="animate-spin" /> : <MessageSquare size={13} />}
            Send SMS
          </button>
          <button onClick={handleCall} className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs bg-ember/5 border border-ember/20 text-ember hover:bg-ember/10 transition-colors">
            {loadingCall ? <Loader2 size={13} className="animate-spin" /> : <Phone size={13} />}
            Voice Call
          </button>
          <Link to={`/chat/${id}`} className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs bg-frost/5 border border-frost/10 text-frost hover:bg-frost/10 transition-colors">
            <Zap size={13} /> Chat with Agent
          </Link>
        </div>

        {/* SMS / Call results */}
        {(smsResult || callResult) && (
          <div className="p-4 space-y-2">
            {smsResult && (
              <div className={`rounded-xl border p-3 text-xs ${smsResult.sent ? 'bg-safe/10 border-safe/20 text-safe' : 'bg-surface border-border/40 text-ghost'}`}>
                {smsResult.sent ? '✓ SMS sent' : `SMS preview: ${smsResult.preview || smsResult.reason}`}
              </div>
            )}
            {callResult && (
              <div className={`rounded-xl border p-3 text-xs ${callResult.initiated ? 'bg-safe/10 border-safe/20 text-safe' : 'bg-surface border-border/40 text-ghost'}`}>
                {callResult.initiated ? `✓ Call initiated (${callResult.call_sid})` : `Call: ${callResult.simulation || callResult.error || callResult.reason}`}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-border/40 bg-obsidian/40 px-5 overflow-x-auto">
          {[
            { key: 'overview', label: 'Overview', icon: TrendingUp },
            { key: 'memories', label: `Memory (${memories.length})`, icon: Brain },
            { key: 'briefing', label: 'Briefing', icon: FileText },
            { key: 'email',    label: 'Email Draft', icon: Mail },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                tab === key
                  ? 'border-signal text-signal'
                  : 'border-transparent text-ghost hover:text-frost'
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">

          {/* Overview Tab */}
          {tab === 'overview' && (
            <div className="space-y-5 animate-fade-in">
              {/* Risk analysis */}
              {risk && (
                <div className={`rounded-xl border p-5 ${riskBg(risk.risk_level)}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-semibold text-frost text-sm">Risk Analysis</h3>
                    <span className={`text-sm font-bold font-mono ${riskColor(risk.risk_level)}`}>
                      {risk.risk_score}/100
                    </span>
                  </div>
                  {risk.risk_factors?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] text-ghost uppercase tracking-wide mb-2">Risk Factors</p>
                      <ul className="space-y-1">
                        {risk.risk_factors.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-frost">
                            <AlertTriangle size={10} className="text-ember mt-0.5 shrink-0" />{f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {risk.recommended_actions?.length > 0 && (
                    <div>
                      <p className="text-[10px] text-ghost uppercase tracking-wide mb-2">Recommended Actions</p>
                      <ul className="space-y-1">
                        {risk.recommended_actions.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-frost">
                            <Target size={10} className="text-signal mt-0.5 shrink-0" />{a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Contact info */}
              <div className="glass gradient-border rounded-xl p-5">
                <h3 className="font-display font-semibold text-frost text-sm mb-3">Contact Information</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    { label: 'Company',  value: deal.company_name },
                    { label: 'Contact',  value: deal.contact_name },
                    { label: 'Title',    value: deal.contact_title },
                    { label: 'Industry', value: deal.industry },
                    { label: 'Email',    value: deal.contact_email },
                    { label: 'Phone',    value: deal.contact_phone },
                  ].map(({ label, value }) => value ? (
                    <div key={label}>
                      <p className="text-ghost mb-0.5">{label}</p>
                      <p className="text-frost font-medium">{value}</p>
                    </div>
                  ) : null)}
                </div>
              </div>
            </div>
          )}

          {/* Memory Tab */}
          {tab === 'memories' && (
            <div className="space-y-4 animate-fade-in">
              {/* Memory type filter */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {MEMORY_TYPES.map(({ key, label, icon: Icon }) => (
                  <button
                    key={String(key)}
                    onClick={() => setMemType(key)}
                    className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      memType === key
                        ? 'bg-signal/15 text-signal ring-1 ring-signal/30'
                        : 'text-ghost hover:text-frost border border-border/40 hover:border-signal/20'
                    }`}
                  >
                    <Icon size={11} />{label}
                  </button>
                ))}
                <button onClick={loadDeal} className="shrink-0 text-ghost hover:text-signal transition-colors p-1.5">
                  <RefreshCw size={12} />
                </button>
              </div>

              {memories.length === 0 ? (
                <p className="text-center text-ghost text-sm py-8">No memories yet. Add context below or seed data.</p>
              ) : (
                <div className="space-y-2">
                  {memories.map((m, i) => <MemoryCard key={i} mem={m} />)}
                </div>
              )}

              <AddMemoryForm dealId={id} onAdded={loadDeal} />
            </div>
          )}

          {/* Briefing Tab */}
          {tab === 'briefing' && (
            <div className="animate-fade-in">
              {loadingBriefing ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="animate-spin text-signal" size={28} />
                  <p className="text-xs text-ghost">Generating briefing from memory...</p>
                </div>
              ) : briefing ? (
                <div className="glass gradient-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-semibold text-frost">Pre-Call Briefing</h3>
                    <span className="text-xs text-ghost">{briefing.memories_used} memories used</span>
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none
                    prose-p:text-frost prose-headings:text-signal prose-headings:font-display
                    prose-strong:text-frost prose-li:text-frost prose-ul:text-frost
                    prose-h2:text-base prose-h3:text-sm">
                    <ReactMarkdown>{briefing.briefing}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <FileText size={40} className="text-ghost/30" />
                  <p className="text-ghost text-sm">Click "Generate Briefing" to create a pre-call briefing</p>
                  <button onClick={handleBriefing} className="btn-primary flex items-center gap-2">
                    <Zap size={14} /> Generate Now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Email Tab */}
          {tab === 'email' && (
            <div className="animate-fade-in">
              {loadingEmail ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="animate-spin text-signal" size={28} />
                  <p className="text-xs text-ghost">Drafting personalized email from memory...</p>
                </div>
              ) : email ? (
                <div className="glass gradient-border rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold text-frost">Email Draft</h3>
                    <div className="flex gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium
                        ${email.sent ? 'bg-safe/10 text-safe' : 'bg-ghost/10 text-ghost'}`}>
                        {email.sent ? '✓ Sent' : 'Draft'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-surface text-ghost">{email.tone}</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex gap-2">
                      <span className="text-ghost w-12 shrink-0">To:</span>
                      <span className="text-signal">{email.recipient}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-ghost w-12 shrink-0">Subject:</span>
                      <span className="text-frost font-medium">{email.subject}</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-surface/40 border border-border/40 p-4 text-xs text-frost whitespace-pre-wrap leading-relaxed">
                    {email.body}
                  </div>
                  {email.key_points?.length > 0 && (
                    <div>
                      <p className="text-[10px] text-ghost uppercase tracking-wide mb-2">Key Points Addressed</p>
                      <ul className="space-y-1">
                        {email.key_points.map((p, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-frost">
                            <CheckCircle size={10} className="text-safe shrink-0" />{p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Mail size={40} className="text-ghost/30" />
                  <p className="text-ghost text-sm">Click "Draft Email" to generate a personalized email</p>
                  <button onClick={handleEmail} className="btn-primary flex items-center gap-2">
                    <Mail size={14} /> Draft Now
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
