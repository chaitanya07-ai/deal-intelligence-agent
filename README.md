# 🧠 Deal Intelligence Agent

<div align="center">

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Hindsight](https://img.shields.io/badge/Hindsight-Persistent%20Memory-blueviolet?style=for-the-badge&logo=brain circuit)
![Groq](https://img.shields.io/badge/Groq-Llama%203.3-orange?style=for-the-badge)
![Twilio](https://img.shields.io/badge/Twilio-SMS%20%26%20Voice-red?style=for-the-badge&logo=twilio&logoColor=white)

**Sales Intelligence with a persistent, semantic memory layer.**
*Never forget an objection, competitor mention, or stakeholder context across the entire sales pipeline.*

[Key Features](#-key-features) • [Architecture](#-architecture) • [Quickstart](#-quickstart-docker---2-minutes) • [Setup Guide](#-api-keys-setup) • [Demo Walkthrough](#-demo-walkthrough) • [Judging Criteria](#-judging-notes)

</div>

---

## ✨ What It Does

The **Deal Intelligence Agent** equips sales teams with a persistent AI memory layer across every account in their CRM. By implementing a stateful **Retain-Recall Loop** using [Hindsight](https://hindsight.vectorize.io/), the agent grows smarter with every call, email, and chat session.

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

---

## 🏗️ Architecture

The application is architected around the **Retain $\rightarrow$ Recall $\rightarrow$ Act** loop. State is persisted in [Vectorize Hindsight memory](https://vectorize.io/what-is-agent-memory), removing the limitations of stateless chat completions.

```
┌─────────────────────────────────────────────────────┐
│                 React Frontend (Vite)               │
│  Dashboard · Chat Canvas · Deal Detail · Analytics   │
└──────────────────────┬──────────────────────────────┘
                       │ REST + Server-Sent Events
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
└──────────────────────┬──────────────────────────────┘
                       │ 
 ┌─────────────────────▼─────────────────────────────┐
 │            Hindsight Memory Layer                 │
 │   Persistent semantic memory · Retain-Recall Loop │
 └───────────────────────────────────────────────────┘
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

# Create environment configuration
cp .env.example .env
```

Open `.env` in your editor and configure your keys:
```env
GROQ_API_KEY=gsk_your_key_here
HINDSIGHT_API_KEY=your_hindsight_key_here
HINDSIGHT_PIPELINE_ID=deal-intelligence
```

### 2. Run the Application

```bash
docker-compose up --build
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Interactive Docs:** http://localhost:8000/docs

### 3. Seed Mock Data
Once the application loads, click the **"Seed AI Deals"** button on the top-right of the Dashboard. The backend uses the Groq LLM to generate 6 highly realistic enterprise deals, complete with historical interactions, stakeholder maps, and competitor threats, and inserts them directly into Hindsight memory.

---

## 🔑 API Keys Setup

### Groq (Inference Layer)
1. Go to the [Groq Console](https://console.groq.com).
2. Create an API Key.
3. Configure `GROQ_API_KEY=gsk_...` in your `.env`.

### Hindsight (Memory Layer)
1. Register at [Hindsight by Vectorize](https://hindsight.vectorize.io/).
2. Create a memory pipeline named `deal-intelligence`.
3. Configure `HINDSIGHT_API_KEY` and `HINDSIGHT_PIPELINE_ID` in your `.env`.
*Note: If no Hindsight API key is set, the system gracefully degrades to an in-memory fallback store (resets on server restart).*

### Twilio (Communication Integrations - Optional)
To enable the live SMS and calling features:
1. Log in to your [Twilio Console](https://console.twilio.com).
2. Obtain your Account SID, Auth Token, and a Twilio phone number.
3. Configure the following variables in `.env`:
   ```env
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_FROM_NUMBER=+1...
   ```

### SMTP Email (Optional)
To enable real email drafting and delivery:
1. Obtain an app-specific password if using Gmail.
2. Add configurations to `.env`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   EMAIL_ENABLED=true
   ```

---

## 💻 Local Development (without Docker)

If you prefer to run the backend and frontend locally outside of Docker:

### Backend (FastAPI)
```bash
cd backend
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

---

## 🎬 Demo Walkthrough

Use this walk-through script to demonstrate the power of the **Hindsight memory layer**.

### 1. The Baseline (Stateless Chat)
- Open http://localhost:3000
- Click on **Agent Chat** in the sidebar. Do *not* select a deal context.
- Ask the agent: *"What objections did this prospect raise?"*
- **Result:** The agent replies with generic, boilerplate sales advice. It doesn't know the client, the history, or the deal state.

### 2. Enabling Hindsight
- Go to the **Dashboard** and click **Seed AI Deals**. Wait about 30 seconds for the seeding to finish.
- Note the **Memory Active** indicator and the total memory count in the sidebar header incrementing.

### 3. The Before/After Moment (Contextual Chat)
- Return to **Agent Chat**. Select a deal context from the dropdown (e.g. `Initech Cloud Migration`).
- Ask the exact same question: *"What objections did this prospect raise?"*
- **Result:** The agent queries Hindsight using semantic search. It responds citing specific objections (e.g., European database shard migration timeline concerns) raised by specific stakeholders (e.g., Sarah Jenkins, VP of Operations) on exact dates.

### 4. Downstream Action Hub (Emails & Briefings)
- Go to the **Deals** page and click into your selected deal to open the **Deal Detail** canvas.
- Click the **Memory** tab. You will see the raw, indexed memories stored in Hindsight categorized by type.
- Go to the **Actions** panel:
  - Click **Draft Email**. The LLM queries Hindsight, retrieves relevant objections, and structures a highly personalized email.
  - Click **Generate Briefing**. It builds a complete dossier containing risk analysis, competitor profiles, and talking points using Hindsight as its ground truth.

### 5. Aggregated Pattern Learning
- Open the **Intelligence** page.
- View the **Competitor Radar Chart**. The system aggregates competitor memories across all deals to compute live win rates.
- Read the **Win/Loss Patterns**. The agent surfaces tactical objection-handling strategies that have historically led to closed-won deals.

---

## 🏆 Judging Notes

| Criterion | How we address it |
| :--- | :--- |
| **Hindsight Integration** | Every action—chat inputs, emails, outbound SMS/calls, status updates—creates a persistent event stored in the Hindsight memory. All generation queries perform real-time semantic retrieval from Hindsight. |
| **Technical Execution** | Highly responsive split-stack built with FastAPI, React, and Groq. Implements graceful degrading fallbacks for external APIs (SMTP, Twilio, Hindsight) to ensure zero setup blocks. |
| **Real-world Value** | Solves context drift in B2B sales cycles. Reps no longer lose track of historical discussions across weeks of chat interactions. |
| **User Experience** | Fluid glassmorphism interface styled in deep dark tones with active memory indicator metrics, interactive logs, and clean data visualization panels. |

---

## 📄 License
This project is licensed under the MIT License.
