import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import {
  TrendingUp, Zap, AlertTriangle, CheckCircle,
  XCircle, Users, MessageSquare, RefreshCw,
  ArrowUpRight, Loader2, Database
} from 'lucide-react'
import {
  fetchDashboardStats, fetchRiskHeatmap, fetchRevenueForecast,
  fetchTopObjections, seedDeals, fetchSeedStatus
} from '../utils/api'
import { formatCurrency, riskBg, riskColor, stageLabel } from '../utils/format'

const RISK_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs">
      <p className="text-ghost mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-mono">
          {typeof p.value === 'number' ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

function StatCard({ label, value, sub, icon: Icon, color = 'text-signal', trend }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass gradient-border rounded-xl p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-ghost mb-1 font-medium uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-ghost mt-1">{sub}</p>}
        </div>
        <div className={`rounded-lg p-2 bg-current/10 ${color}`}>
          <Icon size={18} />
        </div>
      </div>
      {trend != null && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <ArrowUpRight size={12} className="text-safe" />
          <span className="text-safe">{trend}</span>
        </div>
      )}
    </motion.div>
  )
}

export default function Dashboard() {
  const [stats, setStats]       = useState(null)
  const [heatmap, setHeatmap]   = useState([])
  const [forecast, setForecast] = useState(null)
  const [objections, setObjections] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [seeding, setSeeding]   = useState(false)
  const [seedMsg, setSeedMsg]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, h, f, o] = await Promise.all([
        fetchDashboardStats(),
        fetchRiskHeatmap(),
        fetchRevenueForecast(),
        fetchTopObjections()
      ])
      setStats(s); setHeatmap(h); setForecast(f); setObjections(o)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSeed = async () => {
    setSeeding(true); setSeedMsg('Generating AI deals...')
    try {
      await seedDeals(6, null)
      // Poll for completion
      let attempts = 0
      const poll = setInterval(async () => {
        try {
          const st = await fetchSeedStatus()
          setSeedMsg(`Seeding ${st.completed}/${st.total} deals...`)
          if (!st.running) {
            clearInterval(poll); await load(); setSeeding(false); setSeedMsg('')
          }
        } catch { clearInterval(poll); setSeeding(false) }
        if (++attempts > 30) { clearInterval(poll); setSeeding(false) }
      }, 1500)
    } catch (e) { setSeedMsg(String(e)); setSeeding(false) }
  }

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="animate-spin text-signal" size={32} />
    </div>
  )

  const monthlyData = forecast?.monthly_trend || []
  const topObjectionList = objections ? Object.entries(objections.objections || {}).slice(0, 6) : []
  const heatItems = heatmap.slice(0, 12)

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-frost">Command Center</h1>
          <p className="text-sm text-ghost mt-0.5">Deal Intelligence · Powered by Hindsight Memory</p>
        </div>
        <div className="flex items-center gap-3">
          {seeding && <span className="text-xs text-signal animate-pulse">{seedMsg}</span>}
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="btn-primary flex items-center gap-2"
          >
            {seeding ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
            Seed AI Deals
          </button>
          <button onClick={load} className="btn-ghost flex items-center gap-2">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Pipeline Value"
            value={formatCurrency(stats.total_pipeline_value)}
            sub={`${stats.active_deals} active deals`}
            icon={TrendingUp}
            color="text-signal"
            trend={`+${stats.deals_this_month} this month`}
          />
          <StatCard
            label="Win Rate"
            value={`${stats.win_rate}%`}
            sub={`${stats.won_deals} won / ${stats.lost_deals} lost`}
            icon={CheckCircle}
            color="text-safe"
          />
          <StatCard
            label="Won Revenue"
            value={formatCurrency(stats.won_revenue)}
            sub="Closed deals"
            icon={Zap}
            color="text-pulse"
          />
          <StatCard
            label="At Risk"
            value={stats.risk_distribution?.high + stats.risk_distribution?.critical || 0}
            sub="High/critical deals"
            icon={AlertTriangle}
            color="text-ember"
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue Forecast */}
        {forecast && (
          <div className="glass gradient-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-sm font-semibold text-frost">Revenue Trend</h2>
              <div className="flex gap-4 text-xs">
                <span className="text-ghost">Weighted: <span className="text-signal font-mono">{formatCurrency(forecast.weighted_pipeline)}</span></span>
                <span className="text-ghost">Best: <span className="text-safe font-mono">{formatCurrency(forecast.best_case)}</span></span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: '#8892a4', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8892a4', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#00d4ff" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Stage Distribution */}
        {stats?.stage_distribution && (
          <div className="glass gradient-border rounded-xl p-5">
            <h2 className="font-display text-sm font-semibold text-frost mb-4">Pipeline by Stage</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={Object.entries(stats.stage_distribution).map(([k, v]) => ({ stage: stageLabel(k), count: v }))}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              >
                <XAxis dataKey="stage" tick={{ fill: '#8892a4', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8892a4', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {Object.keys(stats.stage_distribution).map((k, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? '#7c3aed' : '#00d4ff'} opacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Risk Heatmap + Objections */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Risk Heatmap */}
        <div className="glass gradient-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm font-semibold text-frost">Deal Risk Heatmap</h2>
            <div className="flex items-center gap-3 text-[10px] text-ghost">
              {['critical','high','medium','low'].map(l => (
                <span key={l} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm" style={{ background: RISK_COLORS[l] }} />
                  {l}
                </span>
              ))}
            </div>
          </div>
          {heatItems.length === 0 ? (
            <p className="text-center text-ghost text-sm py-8">No deals yet — seed some above</p>
          ) : (
            <div className="space-y-2">
              {heatItems.map(d => (
                <Link key={d.id} to={`/deals/${d.id}`}>
                  <div className={`flex items-center gap-3 rounded-lg border p-3 transition-all hover:opacity-90 ${riskBg(d.risk_level)}`}>
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ background: RISK_COLORS[d.risk_level] || '#64748b' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-frost truncate">{d.company}</p>
                      <p className="text-[10px] text-ghost">{stageLabel(d.stage)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-mono text-frost">{formatCurrency(d.value)}</p>
                      <p className={`text-[10px] font-mono ${riskColor(d.risk_level)}`}>
                        {Math.round((d.closure_probability || 0.5) * 100)}% close
                      </p>
                    </div>
                    <div className="w-16 h-1.5 bg-black/30 rounded-full overflow-hidden shrink-0">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(d.closure_probability || 0.5) * 100}%`,
                          background: RISK_COLORS[d.risk_level] || '#64748b'
                        }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top Objections */}
        <div className="glass gradient-border rounded-xl p-5">
          <h2 className="font-display text-sm font-semibold text-frost mb-4">Top Objections</h2>
          {topObjectionList.length === 0 ? (
            <p className="text-center text-ghost text-sm py-8">No objection data yet</p>
          ) : (
            <div className="space-y-3">
              {topObjectionList.map(([category, data], i) => {
                const successRate = data.count > 0 ? (data.handled_successfully / data.count) * 100 : 0
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-frost capitalize">{category}</span>
                      <div className="flex items-center gap-3 text-ghost">
                        <span>{data.count}×</span>
                        <span className={successRate > 50 ? 'text-safe' : 'text-ember'}>
                          {Math.round(successRate)}% handled
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${successRate}%`,
                          background: successRate > 50 ? '#22c55e' : '#f97316'
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Quick links */}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link to="/chat" className="flex items-center gap-2 rounded-lg bg-signal/5 border border-signal/20 px-3 py-2 text-xs text-signal hover:bg-signal/10 transition-colors">
              <MessageSquare size={12} /> Chat with Agent
            </Link>
            <Link to="/intelligence" className="flex items-center gap-2 rounded-lg bg-pulse/5 border border-pulse/20 px-3 py-2 text-xs text-pulse hover:bg-pulse/10 transition-colors">
              <Users size={12} /> Competitor Intel
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
