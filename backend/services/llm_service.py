"""
LLM Service - Groq Integration
Handles all AI completions with memory-augmented context
"""

import os
import json
import asyncio
from typing import Optional, List, Dict, Any, AsyncGenerator

import httpx

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
DEFAULT_MODEL = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")

SYSTEM_PROMPT = """You are the Deal Intelligence Agent — an elite AI sales strategist with deep memory of every interaction, objection, competitor mention, and negotiation in the deal cycle.

Your capabilities:
- Recall past objections and what handling approaches worked
- Analyze competitor positioning and suggest counter-strategies
- Draft personalized follow-up emails based on deal history
- Generate pre-call briefings with stakeholder context
- Predict deal risk and closure probability
- Learn from win/loss patterns across all deals

When answering questions:
- Reference specific memories when available (show "Based on our history with this prospect...")
- Be concrete and actionable, not generic
- If memory shows past objections, address them proactively
- Highlight patterns (e.g., "This objection pattern appears in 73% of lost deals")
- Sound like an experienced sales strategist, not a chatbot

If no memories exist yet for a deal, give excellent general advice while noting you're learning this account.
Always end with 1-2 specific next-step recommendations."""


class LLMService:
    def __init__(self):
        self.api_key = GROQ_API_KEY
        self.model = DEFAULT_MODEL
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        if not self.api_key:
            print("⚠️  GROQ_API_KEY not set — LLM calls will return mock responses")

    async def chat_with_context(
        self,
        user_message: str,
        memories: List[Dict],
        deal_id: Optional[str] = None,
        extra_context: Optional[Dict] = None
    ) -> Dict:
        """Generate response with Hindsight memory context injected."""

        # Build memory context block
        memory_block = self._format_memories(memories)

        # Build context
        context_parts = []
        if deal_id:
            context_parts.append(f"Current Deal ID: {deal_id}")
        if memory_block:
            context_parts.append(f"Relevant Memories from Hindsight:\n{memory_block}")
        if extra_context:
            context_parts.append(f"Additional Context: {json.dumps(extra_context)}")

        context_str = "\n\n".join(context_parts)

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
        ]

        if context_str:
            messages.append({
                "role": "user",
                "content": f"[MEMORY CONTEXT]\n{context_str}\n\n[USER QUERY]\n{user_message}"
            })
        else:
            messages.append({"role": "user", "content": user_message})

        response_text = await self._call_groq(messages)

        # Extract suggestions
        suggestions = self._extract_suggestions(response_text)

        return {
            "content": response_text,
            "model": self.model,
            "memories_used": len(memories),
            "suggestions": suggestions
        }

    async def stream_chat(
        self,
        user_message: str,
        memories: List[Dict],
        deal_id: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """Stream chat response chunks."""
        memory_block = self._format_memories(memories)
        context = f"[MEMORY CONTEXT]\n{memory_block}\n\n[USER QUERY]\n{user_message}" if memory_block else user_message

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": context}
        ]

        async for chunk in self._stream_groq(messages):
            yield chunk

    async def generate_briefing(
        self,
        deal_context: Dict,
        memories: List[Dict]
    ) -> str:
        """Generate a comprehensive pre-call deal briefing."""
        memory_block = self._format_memories(memories)

        prompt = f"""Generate a comprehensive pre-call Deal Briefing for:

Deal: {json.dumps(deal_context, indent=2)}

Memory Context:
{memory_block or "No prior interactions recorded yet."}

Format the briefing as:
## 🎯 Deal Overview
## ⚠️  Key Risks & Objections  
## 🏆 Competitor Landscape
## 👥 Stakeholder Map
## 💰 Pricing & Negotiation Notes
## 🎯 Recommended Talking Points
## ✅ Next Best Actions

Be specific, actionable, and reference memory items where relevant."""

        messages = [
            {"role": "system", "content": "You are an elite sales intelligence briefing generator."},
            {"role": "user", "content": prompt}
        ]
        return await self._call_groq(messages, max_tokens=1500)

    async def generate_email(
        self,
        email_type: str,
        deal_context: Dict,
        memories: List[Dict],
        recipient_email: str
    ) -> Dict:
        """Draft a personalized email from deal memory."""
        memory_block = self._format_memories(memories)

        type_instructions = {
            "follow_up": "Write a warm, professional follow-up email referencing our last conversation and specific points raised.",
            "proposal": "Write a compelling proposal email that addresses known objections and highlights ROI based on their specific concerns.",
            "objection_response": "Write a response to their objections that uses proven handling approaches from similar deals."
        }

        instruction = type_instructions.get(email_type, "Write a professional sales email.")

        prompt = f"""{instruction}

Deal Context: {json.dumps(deal_context, indent=2)}
Recipient: {recipient_email}
Memory/History:
{memory_block or "First outreach — no prior history."}

Return JSON with keys:
- subject (compelling subject line)
- body (full email body with personalization)
- key_points (list of 3 main points addressed)
- tone (e.g., "consultative", "urgent", "reassuring")

Return ONLY valid JSON, no markdown."""

        messages = [
            {"role": "system", "content": "You are an elite B2B sales email writer. Always return valid JSON only."},
            {"role": "user", "content": prompt}
        ]

        response = await self._call_groq(messages, max_tokens=1000)

        try:
            # Strip potential markdown fences
            clean = response.strip()
            if clean.startswith("```"):
                clean = clean.split("```")[1]
                if clean.startswith("json"):
                    clean = clean[4:]
            return json.loads(clean.strip())
        except json.JSONDecodeError:
            return {
                "subject": f"Following up on our conversation",
                "body": response,
                "key_points": [],
                "tone": "professional"
            }

    async def analyze_risk(
        self,
        deal_context: Dict,
        memories: List[Dict]
    ) -> Dict:
        """Analyze deal risk score from memory patterns."""
        memory_block = self._format_memories(memories)

        prompt = f"""Analyze this deal for closure risk and return a JSON risk assessment.

Deal: {json.dumps(deal_context, indent=2)}
History & Memories:
{memory_block or "No history yet — new deal."}

Return JSON with:
- risk_score (0-100, where 100 = very high risk of losing)
- risk_level ("low", "medium", "high", "critical")
- risk_factors (list of specific risk factors observed)
- positive_signals (list of positive indicators)
- closure_probability (0.0 to 1.0)
- recommended_actions (list of 3 immediate actions)
- predicted_close_date (ISO date string estimate)

Return ONLY valid JSON."""

        messages = [
            {"role": "system", "content": "You are a sales analytics AI. Always return valid JSON only."},
            {"role": "user", "content": prompt}
        ]

        response = await self._call_groq(messages, max_tokens=800)

        try:
            clean = response.strip().strip("```json").strip("```").strip()
            return json.loads(clean)
        except json.JSONDecodeError:
            return {
                "risk_score": 50,
                "risk_level": "medium",
                "risk_factors": ["Insufficient data for analysis"],
                "positive_signals": [],
                "closure_probability": 0.5,
                "recommended_actions": ["Schedule discovery call", "Identify decision maker", "Clarify budget"],
                "predicted_close_date": None
            }

    async def generate_sms_message(
        self,
        deal_context: Dict,
        memories: List[Dict],
        message_type: str
    ) -> str:
        """Generate a personalized SMS from deal memory."""
        memory_block = self._format_memories(memories)

        prompt = f"""Write a personalized, concise SMS (under 160 chars) for a {message_type} message.

Deal context: {deal_context.get('company_name', 'this company')}, contact: {deal_context.get('contact_name', 'the prospect')}
Key memory: {memories[0].get('content', '') if memories else 'No history yet'}

SMS must be friendly, specific, and have a clear CTA. Return ONLY the SMS text, nothing else."""

        messages = [
            {"role": "system", "content": "You are a concise B2B SMS writer."},
            {"role": "user", "content": prompt}
        ]

        return await self._call_groq(messages, max_tokens=100)

    async def seed_deals(
        self,
        num_deals: int = 5,
        industry: Optional[str] = None
    ) -> List[Dict]:
        """Use LLM to generate realistic enterprise deal histories."""
        industry_str = f" in the {industry} industry" if industry else ""

        prompt = f"""Generate {num_deals} realistic enterprise B2B deal records{industry_str} for a CRM system.

Each deal should have:
- company_name (real-sounding enterprise company)
- contact_name (realistic full name)
- contact_title (e.g., VP of Operations, CTO, Head of Procurement)
- contact_email
- contact_phone (US format)
- deal_value (between $25,000 and $500,000)
- industry
- stage (one of: prospecting, qualification, proposal, negotiation, closed_won, closed_lost)
- objections (list of 2-4 realistic objections with text and category)
- competitors (list of 1-3 competitors mentioned)
- stakeholders (list of 2-4 stakeholders with name, title, role: decision_maker/influencer/blocker)
- pricing_notes (list of pricing discussions)
- key_interactions (list of 3-5 interaction notes with dates)
- outcome (won/lost/active)
- win_loss_reason (if closed)

Make these feel like real enterprise sales deals — include specific technical objections, real competitor names (Salesforce, HubSpot, SAP, etc.), and detailed negotiation notes.

Return ONLY a valid JSON array. No markdown, no explanation."""

        messages = [
            {"role": "system", "content": "You are a B2B sales data generator. Return only valid JSON arrays."},
            {"role": "user", "content": prompt}
        ]

        response = await self._call_groq(messages, max_tokens=4000)

        try:
            clean = response.strip().strip("```json").strip("```").strip()
            return json.loads(clean)
        except json.JSONDecodeError as e:
            print(f"Failed to parse seeded deals: {e}")
            return self._fallback_deals(num_deals)

    # ─── Internal ──────────────────────────────────────────────────────────────

    async def _call_groq(self, messages: List[Dict], max_tokens: int = 1200) -> str:
        if not self.api_key:
            return self._mock_response(messages[-1]["content"])

        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.7
        }

        async with httpx.AsyncClient(timeout=60) as client:
            try:
                resp = await client.post(
                    f"{GROQ_BASE_URL}/chat/completions",
                    json=payload,
                    headers=self.headers
                )
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            except httpx.HTTPStatusError as e:
                print(f"Groq API error {e.response.status_code}: {e.response.text}")
                return self._mock_response(messages[-1]["content"])
            except Exception as e:
                print(f"Groq call failed: {e}")
                return self._mock_response(messages[-1]["content"])

    async def _stream_groq(self, messages: List[Dict]) -> AsyncGenerator[str, None]:
        if not self.api_key:
            mock = self._mock_response(messages[-1]["content"])
            for word in mock.split(" "):
                yield word + " "
                await asyncio.sleep(0.03)
            return

        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": 1200,
            "temperature": 0.7,
            "stream": True
        }

        async with httpx.AsyncClient(timeout=60) as client:
            async with client.stream(
                "POST",
                f"{GROQ_BASE_URL}/chat/completions",
                json=payload,
                headers=self.headers
            ) as resp:
                async for line in resp.aiter_lines():
                    if line.startswith("data: ") and line != "data: [DONE]":
                        try:
                            chunk = json.loads(line[6:])
                            delta = chunk["choices"][0]["delta"].get("content", "")
                            if delta:
                                yield delta
                        except (json.JSONDecodeError, KeyError):
                            pass

    def _format_memories(self, memories: List[Dict]) -> str:
        if not memories:
            return ""

        lines = []
        for i, mem in enumerate(memories, 1):
            mem_type = mem.get("type", mem.get("metadata", {}).get("type", "note"))
            content = mem.get("content", mem.get("text", ""))
            timestamp = mem.get("timestamp", "")[:10] if mem.get("timestamp") else ""
            ts_str = f" [{timestamp}]" if timestamp else ""
            lines.append(f"{i}. [{mem_type.upper()}]{ts_str} {content}")

        return "\n".join(lines)

    def _extract_suggestions(self, text: str) -> List[str]:
        suggestions = []
        lines = text.split("\n")
        for line in lines:
            line = line.strip()
            if line.startswith(("- ", "• ", "✅ ", "→ ", "* ")):
                clean = line.lstrip("- •✅→* ").strip()
                if len(clean) > 10 and len(clean) < 150:
                    suggestions.append(clean)
        return suggestions[:5]

    def _mock_response(self, user_input: str) -> str:
        """Return a helpful mock response when API key is not set."""
        return (
            "I'm the Deal Intelligence Agent. To unlock full AI-powered responses, "
            "please set your GROQ_API_KEY environment variable.\n\n"
            "Once configured, I'll analyze deal history, recall past objections, "
            "suggest personalized strategies, and generate briefings using "
            "Hindsight memory context.\n\n"
            "**Next Steps:**\n"
            "- Set GROQ_API_KEY in your .env file\n"
            "- Optionally set HINDSIGHT_API_KEY for persistent memory\n"
            "- Seed sample deals via the /api/seed endpoint"
        )

    def _fallback_deals(self, num: int) -> List[Dict]:
        return [
            {
                "company_name": f"Acme Corp {i+1}",
                "contact_name": f"Jane Smith {i+1}",
                "contact_title": "VP of Sales",
                "contact_email": f"jane{i+1}@acme.com",
                "contact_phone": "+15551234567",
                "deal_value": 75000 + (i * 25000),
                "industry": "SaaS",
                "stage": "negotiation",
                "objections": [
                    {"text": "Price is too high", "category": "pricing"},
                    {"text": "Integration concerns", "category": "technical"}
                ],
                "competitors": ["Salesforce", "HubSpot"],
                "stakeholders": [
                    {"name": "Jane Smith", "title": "VP Sales", "role": "decision_maker"},
                    {"name": "Bob Jones", "title": "CTO", "role": "influencer"}
                ],
                "pricing_notes": ["Asked for 20% discount", "Interested in annual plan"],
                "key_interactions": ["Discovery call — positive", "Demo completed", "Proposal sent"],
                "outcome": "active"
            }
            for i in range(num)
        ]
