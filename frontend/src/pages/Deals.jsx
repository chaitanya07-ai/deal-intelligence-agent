import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Briefcase, Plus, Search, Filter, Loader2,
  TrendingUp, AlertTriangle, ChevronRight, X
} from 'lucide-react'
import { fetchDeals, createDeal } from '../utils/api'
import { formatCurrency, riskBg, riskColor, stageLabel } from '../utils/format'

const STAGES = ['all','prospecting','qualification','proposal','negotiation','closed_won','closed_lost']

function CreateDealModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    company_name: '', contact_name: '', contact_email: '',
    contact_title: '', deal_value: '', industry: '', stage: 'prospecting'
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.company_name || !form.contact_name) return
    setSaving(true)
    try {
      const deal = await createDeal({ ...form, deal_value: parseFloat(form.deal_value) || 0 })
      onCreate(deal); onClose()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-elevated rounded-2xl p-6 w-full max-w-md mx-4 border border-border/60"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-bold text-frost">New Deal</h2>
          <button onClick={onClose} className="text-ghost hover:text-frost transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          {[
            { key: 'company_name', label: 'Company Name', placeholder: 'Acme Corp', required: true },
            { key: 'contact_name', label: 'Contact Name', placeholder: 'Jane Smith', required: true },
            { key: 'contact_email', label: 'Email', placeholder: 'jane@acme.com', type: 'email' },
            { key: 'contact_title', label: 'Title', placeholder: 'VP of Operations' },
            { key: 'deal_value', label: 'Deal Value ($)', placeholder: '75000', type: 'number' },
            { key: 'industry', label: 'Industry', placeholder: 'Enterprise SaaS' },
          ].map(({ key, label, placeholder, required, type }) => (
            <div key={key}>
              <label className="block text-xs text-ghost mb-1">{label}{required && ' *'}</label>
              <input
                type={type || 'text'}
                value={form[key]}
                onChange={e => set(key, e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-lg border border-border/60 bg-surface/60 px-3 py-2 text-sm text-frost placeholder-ghost/40 focus:border-signal/40 focus:outline-none transition-all"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs text-ghost mb-1">Stage</label>
            <select
              value={form.stage}
              onChange={e => set('stage', e.target.value)}
              className="w-full rounded-lg border border-border/60 bg-surface/60 px-3 py-2 text-sm text-frost focus:border-signal/40 focus:outline-none"
            >
              {STAGES.filter(s => s !== 'all').map(s => (
                <option key={s} value={s}>{stageLabel(s)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Create Deal
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function Deals() {
  const [deals, setDeals]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [stage, setStage]       = useState('all')
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await fetchDeals(); setDeals(r.deals || []) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = deals.filter(d => {
    const matchSearch = !search ||
      d.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.contact_name?.toLowerCase().includes(search.toLowerCase())
    const matchStage = stage === 'all' || d.stage === stage
    return matchSearch && matchStage
  })

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-frost">Deals</h1>
          <p className="text-sm text-ghost mt-0.5">{deals.length} total · {deals.filter(d => d.outcome === 'active').length} active</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={14} /> New Deal
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ghost" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search deals..."
            className="w-full rounded-lg border border-border/60 bg-surface/60 pl-9 pr-3 py-2 text-sm text-frost placeholder-ghost/40 focus:border-signal/40 focus:outline-none"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {STAGES.map(s => (
            <button
              key={s}
              onClick={() => setStage(s)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                stage === s
                  ? 'bg-signal/15 text-signal border border-signal/30'
                  : 'text-ghost hover:text-frost hover:bg-surface border border-transparent'
              }`}
            >
              {s === 'all' ? 'All' : stageLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-signal" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Briefcase size={40} className="text-ghost/30 mb-4" />
          <p className="text-ghost">No deals found</p>
          <p className="text-xs text-ghost/60 mt-1">Seed AI-generated deals from the Dashboard</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((deal, i) => (
            <motion.div
              key={deal.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link to={`/deals/${deal.id}`}>
                <div className="glass gradient-border rounded-xl p-4 flex items-center gap-4 hover:bg-elevated/60 transition-all group">
                  {/* Risk dot */}
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                    deal.risk_level === 'critical' ? 'bg-red-400' :
                    deal.risk_level === 'high'     ? 'bg-orange-400' :
                    deal.risk_level === 'medium'   ? 'bg-yellow-400' :
                    deal.risk_level === 'low'      ? 'bg-green-400' : 'bg-slate-500'
                  }`} />

                  {/* Company */}
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-frost text-sm">{deal.company_name}</p>
                    <p className="text-xs text-ghost truncate">{deal.contact_name} · {deal.contact_title || deal.industry}</p>
                  </div>

                  {/* Stage badge */}
                  <span className={`stage-badge stage-${deal.stage} hidden sm:inline`}>
                    {stageLabel(deal.stage)}
                  </span>

                  {/* Value */}
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-mono font-semibold text-frost">{formatCurrency(deal.deal_value)}</p>
                    {deal.closure_probability != null && (
                      <p className={`text-xs font-mono ${riskColor(deal.risk_level)}`}>
                        {Math.round(deal.closure_probability * 100)}% close
                      </p>
                    )}
                  </div>

                  {/* Arrow */}
                  <ChevronRight size={16} className="text-ghost/40 group-hover:text-signal/60 transition-colors shrink-0" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateDealModal
          onClose={() => setShowCreate(false)}
          onCreate={(deal) => setDeals(prev => [deal, ...prev])}
        />
      )}
    </div>
  )
}
