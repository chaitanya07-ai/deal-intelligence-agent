# 🧠 Deal Intelligence Agent

> **AI-powered sales intelligence with persistent Hindsight memory.**  
> Recall every objection, competitor mention, and stakeholder note — instantly.

Built for the **Vectorize Hindsight Hackathon**.

---

## ✨ What It Does

The Deal Intelligence Agent gives sales teams a persistent AI memory layer across every deal in their pipeline:

| Feature | Description |
|---|---|
| **Persistent Deal Memory** | Objections, competitors, pricing, and stakeholder notes stored via [Hindsight](https://hindsight.vectorize.io/) |
| **Conversational Agent** | Ask natural-language questions about any deal, grounded in real memory |
| **Pre-Call Briefings** | AI-generated briefings pulling from full deal history |
| **Email Drafting** | Personalized follow-up emails anchored to memory context |
| **SMS via Twilio** | One-click personalized SMS to prospects |
| **Voice Calls via Twilio** | AI-powered outbound voice calls with deal context |
| **Competitor Intelligence** | Track every competitor mentioned; surface counter-strategies that worked |
| **Risk Heatmap** | Real-time deal risk scoring with closure probability |
| **Win/Loss Pattern Learning** | Agent learns which objection-handling approaches win deals |
| **Revenue Forecasting** | Weighted pipeline forecast broken down by stage and probability |

---

## 🚀 Quickstart (Docker — 2 minutes)

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) + [Docker Compose](https://docs.docker.com/compose/)
- A [Groq API key](https://console.groq.com) (free tier available)
- Optional: [Hindsight API key](https://hindsight.vectorize.io) for persistent memory

### 1. Clone and configure

```bash
git clone https://github.com/your-username/deal-intelligence-agent.git
cd deal-intelligence-agent

# Copy and fill in your API keys
cp .env.example .env
nano .env   # or: code .env
```

Minimum required — add your Groq key:
```
GROQ_API_KEY=gsk_your_key_here
```

### 2. Launch

```bash
docker-compose up --build
```

- **Frontend** → http://localhost:3000  
- **Backend API** → http://localhost:8000  
- **API docs** → http://localhost:8000/docs

### 3. Seed data

Once running, click **"Seed AI Deals"** on the Dashboard — or via API:

```bash
curl -X POST http://localhost:8000/api/seed \
  -H "Content-Type: application/json" \
  -d '{"num_deals": 6}'
```

The LLM generates 6 realistic enterprise deals with full histories, objections, competitors, and stakeholders — all stored in Hindsight memory.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   React Frontend                     │
│  Dashboard · Chat · Deals · Intelligence · Analytics │
└──────────────────────┬──────────────────────────────┘
                       │ REST + WebSocket
┌──────────────────────▼──────────────────────────────┐
│              FastAPI Backend (Python)                │
│                                                      │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │ Memory Svc   │  │  LLM Svc   │  │ Deal Svc   │  │
│  │ (Hindsight)  │  │  (Groq)    │  │ (Business) │  │
│  └──────┬───────┘  └─────┬──────┘  └─────┬──────┘  │
│         │                │               │          │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌─────▼──────┐  │
│  │  Email Svc  │  │ Twilio Svc  │  │ Analytics  │  │
│  │  (SMTP)     │  │ (SMS+Voice) │  │ (Forecast) │  │
│  └─────────────┘  └─────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│            Hindsight Memory Layer                    │
│     Vectorized deal context · Semantic search        │
│     Persistent across sessions · Pattern learning    │
└─────────────────────────────────────────────────────┘
```

---

## 🎬 Demo Script (Hackathon Flow)

This script shows the agent's intelligence growing over 20 interactions.

### Setup
1. Open http://localhost:3000
2. Click **Seed AI Deals** (Dashboard) — wait ~30 seconds
3. Navigate to **Deals** → pick any deal (e.g., first one listed)
4. Open **Agent Chat** with that deal selected

---

### 🎬 Interaction 1–3: Cold Start
**Ask:** *"What do you know about this deal?"*

> **Expected:** Agent gives generic advice. Notes it has no history yet.  
> **Why it matters:** Shows the baseline — no memory yet.

---

### 🎬 Interaction 4–5: Memory Injection
Navigate to the deal's **Memory** tab. Notice objections, competitors, stakeholders already stored from seeding.

**Ask:** *"What objections did this prospect raise and how should I handle them?"*

> **Expected:** Agent recalls specific objections from Hindsight memory with tailored counter-strategies.  
> **Key phrase to highlight:** *"Based on our interaction history with [Company]..."*

---

### 🎬 Interaction 6–8: Competitor Strategy
**Ask:** *"Who are the competitors and what's our win rate against them?"*

Navigate to **Intelligence** tab → show the competitor radar chart.

> **Expected:** Agent names exact competitors from memory, cites win-rate patterns from similar deals.

---

### 🎬 Interaction 9–10: Email Generation
Click **Draft Email** on the deal detail page.

> **Expected:** Fully personalized email referencing the prospect's specific objections and stakeholders by name.  
> Show the "Key Points Addressed" section — memory-grounded.

---

### 🎬 Interaction 11–13: Pre-Call Briefing
Click **Generate Briefing**.

> **Expected:** Structured briefing with risk analysis, stakeholder map, talking points, and recommended actions — all drawn from memory.

---

### 🎬 Interaction 14–15: Twilio SMS
Click **Send SMS** (requires Twilio config) or show the preview message.

> **Expected:** Hyper-personalized SMS referencing the last interaction. Without Twilio configured, shows the preview text.

---

### 🎬 Interaction 16–17: Voice Call Simulation
Click **Voice Call**.

> **Expected:** Twilio initiates call (or shows simulation text). Agent would greet the prospect by name with deal-specific context.

---

### 🎬 Interaction 18–20: Executive Briefing
Navigate to **Analytics** page.

**Ask in chat:** *"Predict the closure probability and generate an executive briefing for this deal."*

> **Expected:** Risk score, closure probability, recommended actions, predicted close date — all from Hindsight memory analysis.  
> Show the Risk Heatmap on Dashboard for the "wow" moment.

---

## 🔑 API Keys Setup

### Groq (LLM — Required)
1. Go to https://console.groq.com
2. Create an API key
3. Add to `.env`: `GROQ_API_KEY=gsk_...`

### Hindsight by Vectorize (Memory — Recommended)
1. Go to https://hindsight.vectorize.io
2. Create a pipeline named `deal-intelligence-agent`
3. Add to `.env`:
   ```
   HINDSIGHT_API_KEY=your_key
   HINDSIGHT_PIPELINE_ID=deal-intelligence-agent
   ```
Without this, memory is in-process (resets on restart). With it, memory persists across sessions.

### Twilio (SMS + Voice — Optional)
1. Go to https://console.twilio.com
2. Get Account SID, Auth Token, and a phone number
3. Add to `.env`:
   ```
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_FROM_NUMBER=+1...
   ```

### Email / SMTP (Optional)
For Gmail with App Passwords:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your_app_password
EMAIL_ENABLED=true
```

---

## 💻 Local Development (without Docker)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example ../.env
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev   # → http://localhost:3000
```

---

## 📁 Project Structure

```
deal-intelligence-agent/
├── backend/
│   ├── main.py                  # FastAPI app, all routes
│   ├── requirements.txt
│   ├── Dockerfile
│   └── services/
│       ├── memory_service.py    # Hindsight SDK integration
│       ├── llm_service.py       # Groq completions + prompts
│       ├── deal_service.py      # Deal CRUD + AI analysis
│       ├── email_service.py     # SMTP email drafting
│       └── twilio_service.py    # SMS + Voice calls
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Router + sidebar layout
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx    # Stats, heatmap, forecast
│   │   │   ├── Chat.jsx         # Conversational agent
│   │   │   ├── Deals.jsx        # Deal list + create
│   │   │   ├── DealDetail.jsx   # Full deal view + actions
│   │   │   ├── Intelligence.jsx # Competitor + pattern analysis
│   │   │   └── Analytics.jsx    # Revenue charts
│   │   └── utils/
│   │       ├── api.js           # All API calls
│   │       └── format.js        # Currency, dates, risk colors
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🏆 Hackathon Judging Notes

| Criterion | How We Address It |
|---|---|
| **Innovation (30%)** | Persistent AI memory across the sales cycle — the agent literally gets smarter with every interaction |
| **Hindsight Memory (25%)** | Core to every feature: chat context, email personalization, briefings, risk analysis, and win/loss learning all pull from Hindsight |
| **Technical Implementation (20%)** | FastAPI + React, graceful fallback for missing API keys, streaming chat, background seeding, WebSocket support |
| **User Experience (15%)** | Cinematic dark UI, one-click actions, real-time memory counter, deal context switching |
| **Real-world Impact (10%)** | Solves real sales rep pain: losing context between calls, inconsistent objection handling, missed follow-ups |

---

## 📄 License

MIT — build freely, sell intelligently.
