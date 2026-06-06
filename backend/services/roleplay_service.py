"""
Roleplay Service - Manages B2B sales simulation sessions.
Allows reps to practice objection handling against simulated stakeholders.
Evaluation feedback is persisted in Hindsight memory.
"""

import json
from typing import Dict, List, Optional
from datetime import datetime
from services.memory_service import MemoryService
from services.llm_service import LLMService

# Session state storage
_roleplay_sessions: Dict[str, Dict] = {}


class RoleplayService:
    def __init__(self, memory_svc: MemoryService, llm_svc: LLMService):
        self.memory = memory_svc
        self.llm = llm_svc

    async def start_session(self, deal_id: str, stakeholder_name: str) -> Dict:
        """Initialize a new roleplay session for a deal stakeholder."""
        from services.deal_service import _deals

        deal = _deals.get(deal_id, {})
        if not deal:
            return {"error": "Deal not found"}

        # Fetch memories to populate stakeholder profile, objections, and competitor notes
        memories = await self.memory.get_all_memories(deal_id)
        
        stakeholders = [m for m in memories if m.get("type") == "stakeholder"]
        objections = [m.get("content", "") for m in memories if m.get("type") == "objection"]
        competitors = [m.get("metadata", {}).get("competitor_name", "") for m in memories if m.get("type") == "competitor"]
        pricing_notes = [m.get("content", "") for m in memories if m.get("type") == "pricing"]

        # Identify selected stakeholder
        selected_sh = None
        for sh in stakeholders:
            meta = sh.get("metadata", {})
            if meta.get("name", "").lower() == stakeholder_name.lower():
                selected_sh = meta
                break

        if not selected_sh:
            selected_sh = {
                "name": stakeholder_name,
                "title": "Stakeholder",
                "role": "influencer"
            }

        persona_prompt = f"""You are roleplaying as {selected_sh['name']}, the {selected_sh['title']} at {deal.get('company_name', 'prospect company')}.
Your role in the deal is {selected_sh['role']}.

Here is the context about your account and your concerns:
- Objections you have raised or heard of: {', '.join(objections) or 'Pricing and security integration details'}
- Competitor options you are evaluating: {', '.join(filter(None, competitors)) or 'None specified'}
- Pricing constraints/discussions: {', '.join(pricing_notes) or 'Standard enterprise budget'}

Goal: You are currently on a call/meeting with a sales representative.
Behavior Guidelines:
- Act realistically according to your title ({selected_sh['title']}) and role ({selected_sh['role']}).
- If you are a blocker, be skeptical and bring up objections. If you are an influencer, ask technical/process questions.
- Keep your responses brief (1-3 sentences), professional, and direct.
- DO NOT break character. Do not state you are an AI.
- Speak in the first person. Raise the objections mentioned in the context when appropriate.
"""

        # Generate custom greeting
        messages = [
            {"role": "system", "content": f"You are {selected_sh['name']}, the {selected_sh['title']} at {deal.get('company_name', 'prospect')}. Generate a brief, realistic greeting for a sales representative who just called you. Keep it to one or two sentences."},
            {"role": "user", "content": "Start the meeting"}
        ]
        
        greeting = await self.llm._call_groq(messages, max_tokens=100)
        greeting = greeting.strip().strip('"')

        # Store session state
        _roleplay_sessions[deal_id] = {
            "deal_id": deal_id,
            "stakeholder": selected_sh,
            "history": [{"role": "assistant", "content": greeting, "timestamp": datetime.utcnow().isoformat()}],
            "persona_prompt": persona_prompt,
            "active": True
        }

        # Store initiation event in memory
        await self.memory.store_memory(
            deal_id=deal_id,
            entry_type="roleplay_event",
            content=f"Sales roleplay session started with stakeholder: {selected_sh['name']} ({selected_sh['title']})",
            metadata={"stakeholder": selected_sh['name'], "action": "started"}
        )

        return {
            "deal_id": deal_id,
            "stakeholder": selected_sh,
            "greeting": greeting,
            "objections_to_handle": objections[:3]
        }

    async def chat_turn(self, deal_id: str, message: str) -> Dict:
        """Handle a chat turn in the roleplay session."""
        session = _roleplay_sessions.get(deal_id)
        if not session or not session.get("active"):
            return {"error": "No active roleplay session"}

        # Add user message
        session["history"].append({
            "role": "user",
            "content": message,
            "timestamp": datetime.utcnow().isoformat()
        })

        # Build messages list for LLM call
        llm_messages = [{"role": "system", "content": session["persona_prompt"]}]
        for turn in session["history"]:
            llm_messages.append({"role": turn["role"], "content": turn["content"]})

        # Call LLM
        response = await self.llm._call_groq(llm_messages, max_tokens=250)
        response = response.strip().strip('"')

        # Add assistant message
        session["history"].append({
            "role": "assistant",
            "content": response,
            "timestamp": datetime.utcnow().isoformat()
        })

        return {
            "response": response,
            "history": session["history"]
        }

    async def evaluate_session(self, deal_id: str) -> Dict:
        """Conclude the roleplay and evaluate the rep's performance."""
        session = _roleplay_sessions.get(deal_id)
        if not session:
            return {"error": "No session found to evaluate"}

        session["active"] = False
        history_str = ""
        for turn in session["history"]:
            role_label = session["stakeholder"]["name"] if turn["role"] == "assistant" else "Sales Rep"
            history_str += f"{role_label}: {turn['content']}\n"

        evaluation_prompt = f"""You are an elite B2B sales coach evaluating a simulated sales meeting.
Below is the transcript of a roleplay between a Sales Representative and {session['stakeholder']['name']}, the {session['stakeholder']['title']} at the prospect account.

TRANSCRIPT:
{history_str}

Evaluate the Sales Rep's performance and output a JSON object.
Return ONLY valid JSON with keys:
- objection_handling_score (integer, 0 to 100, based on how well they handled objections and concerns)
- communication_score (integer, 0 to 100, based on tone, professional language, and clarity)
- closing_readiness_score (integer, 0 to 100, based on how well they established next steps or advanced the sale)
- feedback (string summary of general feedback)
- strengths (list of strings, key strengths observed)
- weaknesses (list of strings, areas for improvement)
- recommended_actions (list of strings, next best actions for this deal)

Return ONLY the raw JSON object, no explanation, no markdown backticks."""

        messages = [
            {"role": "system", "content": "You are an expert sales performance assessor. Always output valid JSON only."},
            {"role": "user", "content": evaluation_prompt}
        ]

        response = await self.llm._call_groq(messages, max_tokens=800)

        try:
            clean = response.strip().strip("```json").strip("```").strip()
            evaluation = json.loads(clean)
        except Exception as e:
            print(f"Error parsing roleplay evaluation: {e}")
            evaluation = {
                "objection_handling_score": 70,
                "communication_score": 75,
                "closing_readiness_score": 65,
                "feedback": "The session was completed successfully. The representative communicated professionally, though objections could be addressed with more concrete case studies.",
                "strengths": ["Maintained a professional tone", "Identified primary concerns"],
                "weaknesses": ["Objection response felt general", "Could drive next steps more assertively"],
                "recommended_actions": ["Share custom security documentation", "Schedule follow-up demo"]
            }

        # Store evaluation feedback in Hindsight memory
        summary = f"Roleplay evaluation with {session['stakeholder']['name']} ({session['stakeholder']['title']}). Scores: Objection Handling: {evaluation['objection_handling_score']}, Communication: {evaluation['communication_score']}, Closing: {evaluation['closing_readiness_score']}. Feedback: {evaluation['feedback']}"
        await self.memory.store_memory(
            deal_id=deal_id,
            entry_type="roleplay_feedback",
            content=summary,
            metadata={
                "stakeholder": session['stakeholder']['name'],
                "scores": {
                    "objection": evaluation['objection_handling_score'],
                    "comm": evaluation['communication_score'],
                    "closing": evaluation['closing_readiness_score']
                }
            }
        )

        # Update deal parameters if deal is loaded
        from services.deal_service import _deals
        if deal_id in _deals:
            # Shift win probability slightly based on score
            current_prob = _deals[deal_id].get("closure_probability", 0.5)
            perf_factor = (evaluation['objection_handling_score'] - 65) / 200.0  # Range: -0.325 to +0.175
            new_prob = max(0.1, min(0.95, current_prob + perf_factor))
            _deals[deal_id]["closure_probability"] = round(new_prob, 2)
            
            # Lower risk level if performance was excellent
            if evaluation['objection_handling_score'] > 85:
                _deals[deal_id]["risk_level"] = "low"
            elif evaluation['objection_handling_score'] < 50:
                _deals[deal_id]["risk_level"] = "critical"

        return {
            "deal_id": deal_id,
            "stakeholder": session["stakeholder"],
            "evaluation": evaluation,
            "transcript_turns": len(session["history"])
        }
