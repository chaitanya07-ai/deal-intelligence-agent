import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, CartesianGrid
} from 'recharts'
import { Loader2, TrendingUp, BarChart3, RefreshCw, DollarSign } from 'lucide-react'
import { fetchDashboardStats, fetchRevenueForecast, fetchRiskHeatmap } from '../utils/api'
import { formatCurrency, stageLabel } from '../utils/format'

const COLORS = ['#00d4ff','#7c3aed','#22c55e','#f97316','#eab308','#ef4444','#a78bfa']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-ghost mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-mono">
          {p.name}: {typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

function StatPill({ label, value, color = 'text-signal' }) {
  return (
    <div className="glass gradient-border rounded-xl p-4 text-center">
      <p className="text-xs text-ghost mb-1">{label}</p>
      <p className={`text-xl font-display font-bold ${color}`}>{value}</p>
    </div>
  )
}

export default function Analytics() {
  const [stats, setStats]       = useState(null)
  const [forecast, setForecast] = useState(null)
  const [heatmap, setHeatmap]   = useState([])
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, f, h] = await Promise.all([
        fetchDashboardStats(), fetchRevenueForecast(), fetchRiskHeatmap()
      ])
      setStats(s); setForecast(f); setHeatmap(h)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="animate-spin text-signal" size={28} />
    </div>
  )

  const stageData = stats?.stage_distribution
    ? Object.entries(stats.stage_distribution).map(([k, v]) => ({ name: stageLabel(k), value: v }))
    : []

  const riskData = stats?.risk_distribution
    ? [
        { name: 'Low', value: stats.risk_distribution.low || 0, fill: '#22c55e' },
        { name: 'Medium', value: stats.risk_distribution.medium || 0, fill: '#eab308' },
        { name: 'High+', value: (stats.risk_distribution.high || 0) + (stats.risk_distribution.critical || 0), fill: '#ef4444' },
      ]
    : []

  const monthlyData = forecast?.monthly_trend || []

  // Build deal value distribution from heatmap
  const valueBuckets = [
    { range: '<$50k',    count: 0 },
    { range: '$50–100k', count: 0 },
    { range: '$100–250k',count: 0 },
    { range: '>$250k',   count: 0 },
  ]
  heatmap.forEach(d => {
    const v = d.value || 0
    if (v < 50000) valueBuckets[0].count++
    else if (v < 100000) valueBuckets[1].count++
    else if (v < 250000) valueBuckets[2].count++
    else valueBuckets[3].count++
  })

  // Closure probability distribution
  const probBuckets = [
    { range: '0-20%',  count: 0 },
    { range: '20-40%', count: 0 },
    { range: '40-60%', count: 0 },
    { range: '60-80%', count: 0 },
    { range: '80-100%',count: 0 },
  ]
  heatmap.forEach(d => {
    const p = (d.closure_probability || 0.5) * 100
    if (p < 20) probBuckets[0].count++
    else if (p < 40) probBuckets[1].count++
    else if (p < 60) probBuckets[2].count++
    else if (p < 80) probBuckets[3].count++
    else probBuckets[4].count++
  })

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-frost">Analytics</h1>
          <p className="text-sm text-ghost mt-0.5">Revenue forecasting & pipeline intelligence</p>
        </div>
        <button onClick={load} className="btn-ghost flex items-center gap-2">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatPill label="Pipeline" value={formatCurrency(stats.total_pipeline_value)} color="text-signal" />
          <StatPill label="Won Revenue" value={formatCurrency(stats.won_revenue)} color="text-safe" />
          <StatPill label="Win Rate" value={`${stats.win_rate}%`} color="text-pulse" />
          <StatPill label="Avg Deal Size" value={formatCurrency(stats.avg_deal_size)} color="text-ember" />
        </div>
      )}

      {/* Forecast panels */}
      {forecast && (
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { label: 'Committed', value: formatCurrency(forecast.committed), color: 'text-signal', desc: 'Negotiation stage' },
            { label: 'Weighted Pipeline', value: formatCurrency(forecast.weighted_pipeline), color: 'text-pulse', desc: 'Probability-adjusted' },
            { label: 'Best Case', value: formatCurrency(forecast.best_case), color: 'text-safe', desc: 'If all active close' },
          ].map(({ label, value, color, desc }) => (
            <div key={label} className="glass gradient-border rounded-xl p-5">
              <p className="text-[10px] text-ghost uppercase tracking-wide mb-1">{label}</p>
              <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
              <p className="text-xs text-ghost/60 mt-1">{desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Monthly revenue trend */}
        <div className="glass gradient-border rounded-xl p-5">
          <h2 className="font-display text-sm font-semibold text-frost mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-signal" /> Monthly Revenue
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a28" />
              <XAxis dataKey="month" tick={{ fill: '#8892a4', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8892a4', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#00d4ff" strokeWidth={2} fill="url(#areaGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stage distribution pie */}
        <div className="glass gradient-border rounded-xl p-5">
          <h2 className="font-display text-sm font-semibold text-frost mb-4 flex items-center gap-2">
            <BarChart3 size={14} className="text-pulse" /> Pipeline by Stage
          </h2>
          {stageData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stageData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  strokeWidth={0}
                >
                  {stageData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.85} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: '10px', color: '#8892a4' }} />
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-ghost text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Second row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Deal value distribution */}
        <div className="glass gradient-border rounded-xl p-5">
          <h2 className="font-display text-sm font-semibold text-frost mb-4 flex items-center gap-2">
            <DollarSign size={14} className="text-safe" /> Deal Size Distribution
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={valueBuckets}>
              <XAxis dataKey="range" tick={{ fill: '#8892a4', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8892a4', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Deals" radius={[4,4,0,0]}>
                {valueBuckets.map((_, i) => <Cell key={i} fill={COLORS[i]} opacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Closure probability distribution */}
        <div className="glass gradient-border rounded-xl p-5">
          <h2 className="font-display text-sm font-semibold text-frost mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-ember" /> Closure Probability Spread
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={probBuckets}>
              <XAxis dataKey="range" tick={{ fill: '#8892a4', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8892a4', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Deals" radius={[4,4,0,0]}>
                {probBuckets.map((b, i) => {
                  const p = parseInt(b.range)
                  return <Cell key={i} fill={i >= 3 ? '#22c55e' : i === 2 ? '#eab308' : '#ef4444'} opacity={0.8} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Risk summary */}
      {riskData.length > 0 && (
        <div className="glass gradient-border rounded-xl p-5">
          <h2 className="font-display text-sm font-semibold text-frost mb-4">Risk Distribution</h2>
          <div className="grid grid-cols-3 gap-4">
            {riskData.map(({ name, value, fill }) => (
              <div key={name} className="text-center">
                <div className="text-3xl font-display font-bold" style={{ color: fill }}>{value}</div>
                <p className="text-xs text-ghost mt-1">{name} Risk</p>
              </div>
            ))}
          </div>
          <div className="mt-4 h-2 bg-surface rounded-full overflow-hidden flex">
            {riskData.map(({ fill, value }, i) => {
              const total = riskData.reduce((a, b) => a + b.value, 0) || 1
              return <div key={i} style={{ width: `${(value/total)*100}%`, background: fill }} />
            })}
          </div>
        </div>
      )}
    </div>
  )
}
