import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'
import {
  Shield, TrendingUp, AlertTriangle, Brain,
  Loader2, RefreshCw, Target, Zap
} from 'lucide-react'
import { fetchCompetitorIntel, fetchPatterns, searchMemories } from '../utils/api'

function CompetitorCard({ name, data, index }) {
  const winRate = data.outcomes?.won > 0
    ? Math.round((data.outcomes.won / (data.outcomes.won + (data.outcomes.lost || 0))) * 100)
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass gradient-border rounded-xl p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-display font-semibold text-frost">{name}</h3>
          <p className="text-xs text-ghost mt-0.5">{data.mentions} deal mention{data.mentions !== 1 ? 's' : ''}</p>
        </div>
        <div className={`rounded-lg px-2 py-1 text-xs font-mono font-bold ${
          winRate >= 60 ? 'bg-safe/10 text-safe' :
          winRate >= 40 ? 'bg-yellow-500/10 text-yellow-400' :
          'bg-danger/10 text-danger'
        }`}>
          {winRate}% win rate
        </div>
      </div>

      {/* Win/loss bar */}
      <div className="h-1.5 bg-surface rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full"
          style={{
            width: `${winRate}%`,
            background: `linear-gradient(90deg, ${winRate >= 60 ? '#22c55e' : winRate >= 40 ? '#eab308' : '#ef4444'}, #7c3aed)`
          }}
        />
      </div>

      {/* Outcomes */}
      <div className="flex gap-3 text-xs mb-3">
        <span className="text-safe">✓ {data.outcomes?.won || 0} won</span>
        <span className="text-danger">✗ {data.outcomes?.lost || 0} lost</span>
        <span className="text-ghost">{data.deals?.length || 0} deals</span>
      </div>

      {/* Strategies */}
      {data.strategies?.length > 0 && (
        <div>
          <p className="text-[10px] text-ghost uppercase tracking-wide mb-2">Counter Strategies</p>
          <ul className="space-y-1">
            {data.strategies.slice(0, 3).map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-frost/80">
                <Target size={9} className="text-signal mt-0.5 shrink-0" />{s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  )
}

export default function Intelligence() {
  const [competitors, setCompetitors] = useState({})
  const [patterns, setPatterns]       = useState(null)
  const [searchQ, setSearchQ]         = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching]     = useState(false)
  const [loading, setLoading]         = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [c, p] = await Promise.all([fetchCompetitorIntel(), fetchPatterns()])
      setCompetitors(c.competitors || {})
      setPatterns(p)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQ.trim()) return
    setSearching(true)
    try {
      const r = await searchMemories(searchQ)
      setSearchResults(r.results || [])
    } catch (e) { console.error(e) }
    finally { setSearching(false) }
  }

  const compList = Object.entries(competitors)
  const radarData = compList.slice(0, 8).map(([name, data]) => ({
    competitor: name.length > 12 ? name.slice(0, 12) + '…' : name,
    mentions: data.mentions || 0,
    winRate: data.outcomes?.won > 0
      ? Math.round((data.outcomes.won / (data.outcomes.won + (data.outcomes.lost || 0))) * 100)
      : 50
  }))

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="animate-spin text-signal" size={28} />
    </div>
  )

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-frost">Intelligence Center</h1>
          <p className="text-sm text-ghost mt-0.5">Competitor analysis & win/loss patterns from memory</p>
        </div>
        <button onClick={load} className="btn-ghost flex items-center gap-2">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Memory search */}
      <div className="glass gradient-border rounded-xl p-5">
        <h2 className="font-display text-sm font-semibold text-frost mb-3 flex items-center gap-2">
          <Brain size={16} className="text-signal" /> Semantic Memory Search
        </h2>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Search across all deal memories... e.g. 'pricing concerns' or 'integration issues'"
            className="flex-1 rounded-lg border border-border/60 bg-surface/60 px-4 py-2 text-sm text-frost placeholder-ghost/40 focus:border-signal/40 focus:outline-none"
          />
          <button type="submit" disabled={searching} className="btn-primary flex items-center gap-2 shrink-0">
            {searching ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            Search
          </button>
        </form>
        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map((r, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg bg-surface/40 border border-border/40 p-3">
                <div className="h-1.5 w-1.5 rounded-full bg-signal mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs text-frost">{r.content || r.text}</p>
                  <p className="text-[10px] text-ghost mt-0.5">Deal: {r.deal_id} · {r.type}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Win/Loss patterns */}
      {patterns && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass gradient-border rounded-xl p-5">
            <h2 className="font-display text-sm font-semibold text-frost mb-1 flex items-center gap-2">
              <TrendingUp size={15} className="text-safe" /> Win Patterns
            </h2>
            <p className="text-xs text-ghost mb-4">
              {patterns.total_analyzed_deals} deals analyzed · {patterns.won} won · {patterns.lost} lost
            </p>
            {Object.keys(patterns.common_won_objections || {}).length > 0 ? (
              <div className="space-y-2">
                <p className="text-[10px] text-ghost uppercase tracking-wide">Top Handled Objections</p>
                {Object.entries(patterns.common_won_objections).map(([obj, count], i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-frost truncate flex-1 mr-2">{obj}</span>
                    <span className="text-safe font-mono shrink-0">{count}×</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ghost">Seed deals with outcomes to see patterns</p>
            )}
          </div>

          <div className="glass gradient-border rounded-xl p-5">
            <h2 className="font-display text-sm font-semibold text-frost mb-4 flex items-center gap-2">
              <AlertTriangle size={15} className="text-ember" /> Loss Patterns
            </h2>
            {Object.keys(patterns.common_lost_objections || {}).length > 0 ? (
              <div className="space-y-2">
                <p className="text-[10px] text-ghost uppercase tracking-wide">Unresolved Objections</p>
                {Object.entries(patterns.common_lost_objections).map(([obj, count], i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-frost truncate flex-1 mr-2">{obj}</span>
                    <span className="text-danger font-mono shrink-0">{count}×</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ghost">Seed deals with outcomes to see patterns</p>
            )}
          </div>
        </div>
      )}

      {/* Competitor Radar */}
      {radarData.length > 2 && (
        <div className="glass gradient-border rounded-xl p-5">
          <h2 className="font-display text-sm font-semibold text-frost mb-4 flex items-center gap-2">
            <Shield size={15} className="text-pulse" /> Competitor Presence
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#2a2a45" />
              <PolarAngleAxis dataKey="competitor" tick={{ fill: '#8892a4', fontSize: 10 }} />
              <Radar name="Mentions" dataKey="mentions" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.2} strokeWidth={2} />
              <Radar name="Win Rate" dataKey="winRate" stroke="#00d4ff" fill="#00d4ff" fillOpacity={0.15} strokeWidth={1.5} />
              <Tooltip
                contentStyle={{ background: '#1a1a28', border: '1px solid #2a2a45', borderRadius: '8px', fontSize: '11px' }}
                labelStyle={{ color: '#c8d6f0' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Competitor cards */}
      {compList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Shield size={40} className="text-ghost/20 mb-4" />
          <p className="text-ghost">No competitor data yet</p>
          <p className="text-xs text-ghost/60 mt-1">Seed AI deals from the Dashboard to populate intel</p>
        </div>
      ) : (
        <div>
          <h2 className="font-display text-sm font-semibold text-frost mb-4">Competitor Profiles</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {compList.map(([name, data], i) => (
              <CompetitorCard key={name} name={name} data={data} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
