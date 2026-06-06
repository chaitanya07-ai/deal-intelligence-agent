import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({ baseURL: BASE, timeout: 60000 })

// Request interceptor to broadcast active memory operations
api.interceptors.request.use(config => {
  let type = 'QUERY'
  let message = `API Call to ${config.url}`
  
  if (config.url.includes('/chat')) {
    type = 'RECALL'
    message = 'Recalled Hindsight semantic memory context'
  } else if (config.url.includes('/memory') && config.method?.toLowerCase() === 'post') {
    type = 'RETAIN'
    message = 'Indexed new memory event in Hindsight'
  } else if (config.url.includes('/briefing')) {
    type = 'RECALL'
    message = 'Compiled account briefing using Hindsight context'
  } else if (config.url.includes('/risk')) {
    type = 'QUERY'
    message = 'Analysing Hindsight historical pattern risks'
  } else if (config.url.includes('/roleplay/start')) {
    type = 'RECALL'
    message = 'Recalled stakeholder profile & concerns'
  } else if (config.url.includes('/roleplay/evaluate')) {
    type = 'RETAIN'
    message = 'Analyzed response & stored score in Hindsight'
  } else if (config.url.includes('/autopilot/run')) {
    type = 'PROCESS'
    message = 'Autopilot pipeline check active'
  }
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hindsight-log', { detail: { type, message } }))
  }
  return config
})

api.interceptors.response.use(
  r => r.data,
  e => Promise.reject(e?.response?.data?.detail || e.message || 'Request failed')
)

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const sendChat = (message, dealId = null, context = null) =>
  api.post('/chat', { message, deal_id: dealId, context })

// ─── Deals ────────────────────────────────────────────────────────────────────
export const fetchDeals = () => api.get('/deals')
export const createDeal = (data) => api.post('/deals', data)
export const fetchDeal = (id) => api.get(`/deals/${id}`)
export const updateDeal = (id, data) => api.patch(`/deals/${id}`, data)
export const fetchDealBriefing = (id) => api.get(`/deals/${id}/briefing`)
export const fetchDealRisk = (id) => api.get(`/deals/${id}/risk`)
export const fetchDealMemories = (id, type = null) =>
  api.get(`/deals/${id}/memories${type ? `?entry_type=${type}` : ''}`)
export const fetchDealTimeline = (id) => api.get(`/deals/${id}/timeline`)

// ─── Memory ───────────────────────────────────────────────────────────────────
export const storeMemory = (dealId, type, content, metadata = {}) =>
  api.post('/memory', { deal_id: dealId, entry_type: type, content, metadata })
export const searchMemories = (q, dealId = null) =>
  api.get(`/memory/search?q=${encodeURIComponent(q)}${dealId ? `&deal_id=${dealId}` : ''}`)
export const fetchPatterns = () => api.get('/memory/patterns')

// ─── Email ────────────────────────────────────────────────────────────────────
export const draftEmail = (dealId, emailType, recipientEmail, sendNow = false) =>
  api.post('/email/draft', {
    deal_id: dealId, email_type: emailType,
    recipient_email: recipientEmail, send_immediately: sendNow
  })

// ─── SMS / Voice ──────────────────────────────────────────────────────────────
export const sendSMS = (dealId, phone, type = 'follow_up') =>
  api.post('/sms/send', { deal_id: dealId, phone_number: phone, message_type: type })
export const initiateCall = (dealId, phone) =>
  api.post('/voice/call', { deal_id: dealId, phone_number: phone, message_type: 'follow_up' })

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const fetchDashboardStats = () => api.get('/dashboard/stats')
export const fetchRiskHeatmap = () => api.get('/dashboard/heatmap')
export const fetchCompetitorIntel = () => api.get('/dashboard/competitors')
export const fetchRevenueForecast = () => api.get('/dashboard/forecast')
export const fetchTopObjections = () => api.get('/dashboard/objections')

// ─── Seed ─────────────────────────────────────────────────────────────────────
export const seedDeals = (numDeals = 5, industry = null) =>
  api.post('/seed', { num_deals: numDeals, industry })
export const fetchSeedStatus = () => api.get('/seed/status')

// ─── Roleplay ─────────────────────────────────────────────────────────────────
export const startRoleplay = (dealId, stakeholderName) =>
  api.post('/roleplay/start', { deal_id: dealId, stakeholder_name: stakeholderName })
export const sendRoleplayChat = (dealId, message) =>
  api.post('/roleplay/chat', { deal_id: dealId, message })
export const evaluateRoleplay = (dealId) =>
  api.post(`/roleplay/evaluate/${dealId}`)

// ─── Autopilot ────────────────────────────────────────────────────────────────
export const runAutopilot = () => api.post('/autopilot/run')
export const fetchAutopilotLogs = () => api.get('/autopilot/logs')
export const fetchAutopilotActions = () => api.get('/autopilot/actions')
