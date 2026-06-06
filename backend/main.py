"""
Deal Intelligence Agent - FastAPI Backend
Uses Hindsight memory from Vectorize for persistent deal context
"""

import os
import json
import asyncio
from typing import Optional, List, Dict, Any
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn

from services.memory_service import MemoryService
from services.llm_service import LLMService
from services.email_service import EmailService
from services.twilio_service import TwilioService
from services.deal_service import DealService
from services.roleplay_service import RoleplayService
from services.autopilot_service import AutopilotService

app = FastAPI(title="Deal Intelligence Agent API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
memory_svc = MemoryService()
llm_svc = LLMService()
email_svc = EmailService()
twilio_svc = TwilioService()
deal_svc = DealService(memory_svc, llm_svc)
roleplay_svc = RoleplayService(memory_svc, llm_svc)
autopilot_svc = AutopilotService(memory_svc, llm_svc)

# ─── Pydantic Models ───────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    message: str
    deal_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class DealCreate(BaseModel):
    company_name: str
    contact_name: str
    contact_email: Optional[str] = None
    deal_value: Optional[float] = None
    industry: Optional[str] = None
    stage: str = "prospecting"

class DealUpdate(BaseModel):
    stage: Optional[str] = None
    deal_value: Optional[float] = None
    outcome: Optional[str] = None  # "won", "lost"
    notes: Optional[str] = None

class MemoryEntry(BaseModel):
    deal_id: str
    entry_type: str  # objection, competitor, pricing, stakeholder, note
    content: str
    metadata: Optional[Dict[str, Any]] = {}

class EmailDraft(BaseModel):
    deal_id: str
    email_type: str  # follow_up, proposal, objection_response
    recipient_email: str
    send_immediately: bool = False

class SMSRequest(BaseModel):
    deal_id: str
    phone_number: str
    message_type: str  # follow_up, reminder, proposal

class SeedRequest(BaseModel):
    num_deals: int = 5
    industry: Optional[str] = None

class RoleplayStartRequest(BaseModel):
    deal_id: str
    stakeholder_name: str

class RoleplayChatRequest(BaseModel):
    deal_id: str
    message: str

# ─── Health Check ──────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

# ─── Chat Endpoints ────────────────────────────────────────────────────────────

@app.post("/api/chat")
async def chat(msg: ChatMessage):
    """Conversational AI with Hindsight memory context"""
    try:
        # Retrieve relevant memories for this deal
        memories = []
        if msg.deal_id:
            memories = await memory_svc.get_relevant_memories(
                deal_id=msg.deal_id,
                query=msg.message,
                limit=10
            )

        # Build response with memory context
        response = await llm_svc.chat_with_context(
            user_message=msg.message,
            memories=memories,
            deal_id=msg.deal_id,
            extra_context=msg.context
        )

        # Store this interaction in Hindsight memory
        if msg.deal_id:
            await memory_svc.store_interaction(
                deal_id=msg.deal_id,
                role="user",
                content=msg.message,
                metadata={"type": "chat_interaction"}
            )

        return {
            "response": response["content"],
            "memories_used": len(memories),
            "interaction_count": response.get("interaction_count", 0),
            "suggestions": response.get("suggestions", []),
            "deal_id": msg.deal_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/stream")
async def chat_stream(msg: ChatMessage):
    """Streaming chat response"""
    memories = []
    if msg.deal_id:
        memories = await memory_svc.get_relevant_memories(
            deal_id=msg.deal_id,
            query=msg.message,
            limit=10
        )

    async def generate():
        async for chunk in llm_svc.stream_chat(msg.message, memories, msg.deal_id):
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

# ─── Deal Endpoints ────────────────────────────────────────────────────────────

@app.get("/api/deals")
async def list_deals():
    deals = await deal_svc.list_all_deals()
    return {"deals": deals}

@app.post("/api/deals")
async def create_deal(deal: DealCreate):
    result = await deal_svc.create_deal(deal.dict())
    return result

@app.get("/api/deals/{deal_id}")
async def get_deal(deal_id: str):
    deal = await deal_svc.get_deal(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deal

@app.patch("/api/deals/{deal_id}")
async def update_deal(deal_id: str, update: DealUpdate):
    result = await deal_svc.update_deal(deal_id, update.dict(exclude_none=True))
    return result

@app.get("/api/deals/{deal_id}/briefing")
async def get_deal_briefing(deal_id: str):
    """Generate AI-powered deal briefing from memory"""
    briefing = await deal_svc.generate_briefing(deal_id)
    return briefing

@app.get("/api/deals/{deal_id}/risk")
async def get_deal_risk(deal_id: str):
    """Analyze deal risk using memory patterns"""
    risk = await deal_svc.analyze_risk(deal_id)
    return risk

@app.get("/api/deals/{deal_id}/memories")
async def get_deal_memories(deal_id: str, entry_type: Optional[str] = None):
    memories = await memory_svc.get_all_memories(deal_id, filter_type=entry_type)
    return {"memories": memories, "count": len(memories)}

@app.get("/api/deals/{deal_id}/timeline")
async def get_deal_timeline(deal_id: str):
    timeline = await memory_svc.get_timeline(deal_id)
    return {"timeline": timeline}

# ─── Memory Endpoints ──────────────────────────────────────────────────────────

@app.post("/api/memory")
async def store_memory(entry: MemoryEntry):
    result = await memory_svc.store_memory(
        deal_id=entry.deal_id,
        entry_type=entry.entry_type,
        content=entry.content,
        metadata=entry.metadata
    )
    return result

@app.get("/api/memory/search")
async def search_memories(q: str, deal_id: Optional[str] = None, limit: int = 10):
    results = await memory_svc.semantic_search(q, deal_id=deal_id, limit=limit)
    return {"results": results}

@app.get("/api/memory/patterns")
async def get_patterns():
    """Analyze win/loss patterns from all deal memories"""
    patterns = await memory_svc.analyze_patterns()
    return patterns

# ─── Email Endpoints ───────────────────────────────────────────────────────────

@app.post("/api/email/draft")
async def draft_email(req: EmailDraft):
    """Generate personalized email using deal memory"""
    email = await email_svc.draft_email(
        deal_id=req.deal_id,
        email_type=req.email_type,
        recipient_email=req.recipient_email,
        memory_svc=memory_svc,
        llm_svc=llm_svc
    )
    if req.send_immediately and os.getenv("EMAIL_ENABLED") == "true":
        await email_svc.send_email(email)
    return email

# ─── Twilio / SMS / Voice Endpoints ────────────────────────────────────────────

@app.post("/api/sms/send")
async def send_sms(req: SMSRequest):
    """Send SMS with personalized message from deal memory"""
    result = await twilio_svc.send_sms(
        deal_id=req.deal_id,
        phone_number=req.phone_number,
        message_type=req.message_type,
        memory_svc=memory_svc,
        llm_svc=llm_svc
    )
    return result

@app.post("/api/voice/call")
async def initiate_call(req: SMSRequest):
    """Initiate AI voice call via Twilio"""
    result = await twilio_svc.initiate_call(
        deal_id=req.deal_id,
        phone_number=req.phone_number,
        memory_svc=memory_svc,
        llm_svc=llm_svc
    )
    return result

@app.post("/api/voice/webhook")
async def voice_webhook(background_tasks: BackgroundTasks):
    """Twilio voice webhook for real-time call handling"""
    twiml = twilio_svc.generate_twiml()
    return twiml

# ─── Dashboard / Analytics Endpoints ──────────────────────────────────────────

@app.get("/api/dashboard/stats")
async def dashboard_stats():
    stats = await deal_svc.get_dashboard_stats()
    return stats

@app.get("/api/dashboard/heatmap")
async def risk_heatmap():
    heatmap = await deal_svc.get_risk_heatmap()
    return heatmap

@app.get("/api/dashboard/competitors")
async def competitor_intelligence():
    competitors = await memory_svc.get_competitor_intel()
    return competitors

@app.get("/api/dashboard/forecast")
async def revenue_forecast():
    forecast = await deal_svc.get_revenue_forecast()
    return forecast

@app.get("/api/dashboard/objections")
async def top_objections():
    objections = await memory_svc.get_top_objections()
    return objections

# ─── Roleplay & Autopilot Endpoints ──────────────────────────────────────────

@app.post("/api/roleplay/start")
async def start_roleplay(req: RoleplayStartRequest):
    result = await roleplay_svc.start_session(req.deal_id, req.stakeholder_name)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@app.post("/api/roleplay/chat")
async def chat_roleplay(req: RoleplayChatRequest):
    result = await roleplay_svc.chat_turn(req.deal_id, req.message)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.post("/api/roleplay/evaluate/{deal_id}")
async def evaluate_roleplay(deal_id: str):
    result = await roleplay_svc.evaluate_session(deal_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.post("/api/autopilot/run")
async def run_autopilot(background_tasks: BackgroundTasks):
    if autopilot_svc.is_running():
        return {"message": "Autopilot is already running", "status": "running"}
    background_tasks.add_task(autopilot_svc.run_autopilot_loop)
    return {"message": "Autopilot triggered in background", "status": "started"}

@app.get("/api/autopilot/logs")
async def get_autopilot_logs():
    return {"logs": autopilot_svc.get_logs(), "running": autopilot_svc.is_running()}

@app.get("/api/autopilot/actions")
async def get_autopilot_actions():
    actions = await autopilot_svc.get_all_actions()
    return {"actions": actions}

# ─── Data Seeding ──────────────────────────────────────────────────────────────

@app.post("/api/seed")
async def seed_data(req: SeedRequest, background_tasks: BackgroundTasks):
    """Use LLM to generate realistic enterprise deal histories"""
    background_tasks.add_task(
        deal_svc.seed_realistic_deals,
        num_deals=req.num_deals,
        industry=req.industry
    )
    return {"message": f"Seeding {req.num_deals} deals in background", "status": "started"}

@app.get("/api/seed/status")
async def seed_status():
    status = await deal_svc.get_seed_status()
    return status

# ─── WebSocket for real-time updates ──────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        pass

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
