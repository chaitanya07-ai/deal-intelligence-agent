# 🧠 Deal Intelligence Agent

<div align="center">

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Hindsight](https://img.shields.io/badge/Hindsight-Persistent%20Memory-blueviolet?style=for-the-badge)
![Groq](https://img.shields.io/badge/Groq-Llama%203.3-orange?style=for-the-badge)
![Twilio](https://img.shields.io/badge/Twilio-SMS%20%26%20Voice-red?style=for-the-badge&logo=twilio&logoColor=white)

**Sales Intelligence with a persistent, semantic memory layer.**  
*Never forget an objection, competitor mention, or stakeholder context across the entire sales pipeline.*

[Key Features](#-key-features) • [Architecture](#-architecture) • [Quickstart](#-quickstart-docker---2-minutes) • [Setup Guide](#-api-keys-setup) • [Demo Walkthrough](#-demo-walkthrough) • [Judging Criteria](#-judging-notes)

</div>

---

## ✨ What It Does

The **Deal Intelligence Agent** equips sales teams with a persistent AI memory layer across every account in their CRM. By implementing a stateful **Retain-Recall Loop** using [Hindsight](https://hindsight.vectorize.io/), the agent grows smarter with every call, email, and chat session — and now includes two powerful new modules: a **Sales Simulator** for objection practice and an **Autopilot** for autonomous deal management.

| Feature | Capabilities powered by Hindsight Memory |
| :--- | :--- |
| 🧠 **Persistent Deal Memory** | Vectorized ingestion of objections, pricing, and stakeholder dynamics that persist across sessions. |
| 💬 **Memory-Augmented Chat** | Stream chat completions with context-aware suggestions grounded in semantic historical recall. |
| 📄 **Pre-Call Briefings** | Instantly compile structured summaries of past risks, pricing pushbacks, and stakeholder maps. |
| ✉️ **Contextual Email Drafting** | Generate hyper-personalized emails that cite specific historical constraints and contact names. |
| 📱 **Twilio SMS & Voice** | Outbound communications automatically enriched with the most recent deal interaction context. |
| 📊 **Risk Heatmap** | A visual command center showing deal-by-deal closure probabilities derived from historical behavior. |
| 📈 **Revenue Forecasting** | Weighted revenue forecasting driven by stage analysis and probability mapping. |
| ⚔️ **Competitor Radar** | Tracks win/loss ratios and maps effective counter-strategies against key competitors. |
| 🎭 **Sales Simulator** | Role-play live objection-handling sessions against AI-powered stakeholder personas grounded in Hindsight deal memory. |
| 🤖 **Autopilot Agent** | Autonomous background agent that scans the CRM, retrieves unresolved objections from Hindsight, and generates Action Playbooks for every active deal. |

---

## 🆕 New: Sales Simulator

The **Sales Simulator** (`/roleplay`) lets reps practice high-stakes conversations before they happen.

**How it works:**

1. Select any active deal from the dropdown.
2. Choose a stakeholder persona (e.g. VP of Operations, CTO, Procurement Lead).
3. The simulator loads that stakeholder's history, objections, competitor preferences, and communication style directly from Hindsight memory.
4. A live chat session begins where the AI plays the stakeholder — raising real objections from the deal record, negotiating on real pricing constraints, and responding with context from past interactions.
5. End the session to receive an **AI-generated performance evaluation** with scores on objection handling, discovery quality, and closing technique.
6. Evaluation results are written back into Hindsight memory so future coaching suggestions improve over time.

**Roleplay API surface (`RoleplayService`):**

| Method | Description |
| :--- | :--- |
| `start_session(deal_id, stakeholder_name)` | Initializes the session, loads persona from Hindsight, returns opening greeting. |
| `chat_turn(deal_id, message)` | Processes a rep message and returns the stakeholder's in-character response. |
| `evaluate_session(deal_id)` | Ends the session and returns a structured performance scorecard, saved to Hindsight. |

---

## 🆕 New: Autopilot Agent

The **Autopilot Agent** (`/autopilot`) is a fully autonomous AI loop that works through your entire pipeline while you sleep.

**What it does:**

1. **CRM Scan** — Enumerates all active deals in the pipeline.
2. **Hindsight Recall** — For each deal, retrieves unresolved objections, competitor threats, and stale follow-up reminders via semantic search.
3. **Cross-Deal Pattern Matching** — Queries Hindsight for similar objections that were successfully handled in other deals and surfaces the winning counter-strategies.
4. **Action Playbook Generation** — The LLM synthesizes the retrieved context and generates a structured **Action Playbook**: a prioritized list of recommended next steps, suggested email talking points, and risk flags.
5. **Real-Time Execution Console** — A live log stream shows every step the agent is taking (scan, recall, match, reason, action) as it processes each deal.

**Autopilot API surface (`AutopilotService`):**

| Method | Description |
| :--- | :--- |
| `run_autopilot_loop()` | Triggers the full autonomous scan-recall-act pipeline across all active deals. |
| `get_all_actions()` | Returns all generated Action Playbooks from the most recent run. |
| `get_logs()` | Streams the timestamped execution log for display in the console UI. |
| `is_running()` | Returns whether the autopilot loop is currently active. |

**Log levels shown in the Autopilot console:**

`INFO` · `PROCESS` · `RECALL` · `MATCH` · `REASON` · `SUCCESS` · `WARNING`

---

## 🏗️ Architecture

The application is built around the **Retain → Recall → Act** loop. State is persisted in [Vectorize Hindsight memory](https://vectorize.io/what-is-agent-memory), removing the limitations of stateless chat completions.

```
┌──────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                      │
│  Dashboard · Chat · Deals · Simulator · Autopilot ·          │
│  Intelligence · Analytics                                     │
└───────────────────────────┬──────────────────────────────────┘
                            │ REST + Server-Sent Events + WS
┌───────────────────────────▼──────────────────────────────────┐
│                  FastAPI Backend (Python)                     │
│                                                              │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────────┐  │
│  │ Memory Svc   │  │  LLM Svc   │  │    Deal Service    │  │
│  │ (Hindsight)  │  │  (Groq)    │  │  CRUD + AI Analysis│  │
│  └──────┬───────┘  └──────┬──────┘  └────────────────────┘  │
│         │                 │                                  │
│  ┌──────▼──────┐  ┌───────▼──────┐  ┌────────────────────┐  │
│  │  Email Svc  │  │  Twilio Svc  │  │  Analytics/Forecast│  │
│  │  (SMTP)     │  │  (SMS+Voice) │  │                    │  │
│  └─────────────┘  └──────────────┘  └────────────────────┘  │
│                                                              │
│  ┌───────────────────────┐  ┌────────────────────────────┐  │
│  │   Roleplay Service    │  │    Autopilot Service       │  │
│  │  start_session        │  │  run_autopilot_loop        │  │
│  │  chat_turn            │  │  get_all_actions           │  │
│  │  evaluate_session     │  │  get_logs / is_running     │  │
│  └───────────────────────┘  └────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                  Hindsight Memory Layer                       │
│  Persistent semantic memory · Retain-Recall Loop             │
│  Objections · Competitors · Stakeholders · Eval Scores       │
└──────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
deal-intelligence-agent/
├── backend/
│   ├── main.py                    # FastAPI app, all routes
│   ├── requirements.txt
│   ├── Dockerfile
│   └── services/
│       ├── memory_service.py      # Hindsight SDK integration
│       ├── llm_service.py         # Groq completions + prompts
│       ├── deal_service.py        # Deal CRUD + AI analysis
│       ├── email_service.py       # SMTP email drafting
│       ├── twilio_service.py      # SMS + Voice calls
│       ├── roleplay_service.py    # 🆕 Sales Simulator sessions
│       └── autopilot_service.py   # 🆕 Autonomous deal agent loop
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Router + sidebar layout
│   │   └── pages/
│   │       ├── Dashboard.jsx      # Stats, heatmap, forecast
│   │       ├── Chat.jsx           # Conversational agent
│   │       ├── Deals.jsx          # Deal list + create
│   │       ├── DealDetail.jsx     # Full deal view + actions
│   │       ├── Intelligence.jsx   # Competitor + pattern analysis
│   │       ├── Analytics.jsx      # Revenue charts
│   │       ├── Roleplay.jsx       # 🆕 Sales Simulator UI
│   │       └── Autopilot.jsx      # 🆕 Autonomous agent console
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🚀 Quickstart (Docker - 2 minutes)

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/)
- A [Groq API key](https://console.groq.com) (free tier is sufficient)
- A [Hindsight API key](https://hindsight.vectorize.io) for persistent memory

### 1. Clone and Configure

```bash
git clone https://github.com/chaitanya07-ai/deal-intelligence-agent.git
cd deal-intelligence-agent

cp .env.example .env
```

Open `.env` and configure your keys:

```env
GROQ_API_KEY=gsk_your_key_here
HINDSIGHT_API_KEY=your_hindsight_key_here
HINDSIGHT_PIPELINE_ID=deal-intelligence
```

### 2. Run the Application

```bash
docker-compose up --build
```

| URL | Description |
| :--- | :--- |
| http://localhost:3000 | React frontend |
| http://localhost:8000 | FastAPI backend |
| http://localhost:8000/docs | Interactive API docs |

### 3. Seed Mock Data

Click **"Seed AI Deals"** on the Dashboard. The backend uses Groq to generate 6 realistic enterprise deals with full histories, stakeholder maps, objections, and competitor intel — all stored in Hindsight memory.

---

## 🔑 API Keys Setup

### Groq (Inference Layer — Required)
1. Go to the [Groq Console](https://console.groq.com).
2. Create an API Key.
3. Add to `.env`: `GROQ_API_KEY=gsk_...`

### Hindsight (Memory Layer — Recommended)
1. Register at [Hindsight by Vectorize](https://hindsight.vectorize.io/).
2. Create a pipeline named `deal-intelligence`.
3. Add to `.env`:
   ```env
   HINDSIGHT_API_KEY=your_key
   HINDSIGHT_PIPELINE_ID=deal-intelligence
   ```
> Without Hindsight, the system gracefully degrades to an in-process memory store that resets on restart.

### Twilio (SMS + Voice — Optional)
1. Log in to your [Twilio Console](https://console.twilio.com).
2. Obtain Account SID, Auth Token, and a phone number.
3. Add to `.env`:
   ```env
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_FROM_NUMBER=+1...
   ```

### SMTP Email (Optional)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_ENABLED=true
```

---

## 💻 Local Development (without Docker)

### Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev   # → http://localhost:3000
```

---

## 🎬 Demo Walkthrough

### 1. Seed and Baseline
- Open http://localhost:3000 and click **Seed AI Deals** on the Dashboard.
- Open **Agent Chat** without a deal selected and ask: *"What objections did this prospect raise?"*
- The agent gives generic advice — no memory yet.

### 2. Memory-Grounded Chat
- Select a deal (e.g. *Initech Cloud Migration*) from the context dropdown.
- Ask the same question again.
- The agent now cites specific objections, stakeholder names, and dates pulled directly from Hindsight.

### 3. Deal Actions (Email + Briefing)
- Go to **Deals** → click into a deal → open the **Actions** panel.
- Click **Draft Email** → a personalized email grounded in Hindsight context.
- Click **Generate Briefing** → full pre-call dossier with risk analysis and talking points.

### 4. Sales Simulator
- Open **Simulator** from the sidebar.
- Select a deal and a stakeholder (e.g. *Sarah Jenkins, VP of Operations*).
- Begin the roleplay session — the AI plays that stakeholder, raising the objections and pricing concerns stored in Hindsight.
- End the session to receive a scored performance evaluation saved back to memory.

### 5. Autopilot Agent
- Open **Auto-Pilot** from the sidebar.
- Click **Run Autopilot**.
- Watch the live execution console stream each step: CRM scan → Hindsight recall → cross-deal pattern matching → Action Playbook generation.
- Scroll through the generated Action Playbooks for every active deal.

### 6. Intelligence & Analytics
- Open **Intelligence** to view the Competitor Radar and Win/Loss patterns aggregated across all deals.
- Open **Analytics** for the weighted revenue forecast and pipeline breakdown.

---

## 🏆 Judging Notes

| Criterion | How we address it |
| :--- | :--- |
| **Hindsight Integration** | Every action — chat, email, SMS/voice, roleplay evaluation, autopilot recall — creates or queries Hindsight memory. The Retain-Recall Loop is the backbone of every feature. |
| **Technical Execution** | FastAPI + React + Groq with graceful degrading fallbacks for all external APIs. The Simulator and Autopilot are both first-class backend services with clean async interfaces. |
| **Real-world Value** | Solves context drift in long B2B sales cycles. The Simulator builds rep skill before high-stakes calls; the Autopilot surfaces unresolved blockers before they kill deals. |
| **User Experience** | Glassmorphism dark UI, real-time autopilot execution logs, live roleplay chat, memory counter, and clean data visualization throughout. |

---

## 📄 License

MIT — build freely, sell intelligently.
