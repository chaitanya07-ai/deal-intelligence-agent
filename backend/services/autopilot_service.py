"""
Autopilot Service - Executes the autonomous sales agent loop.
Scans deals, retrieves unresolved objections, queries cross-deal Hindsight memory
for similar handled issues, and drafts Action Playbooks.
"""

import asyncio
import json
from typing import Dict, List, Optional
from datetime import datetime
from services.memory_service import MemoryService
from services.llm_service import LLMService

# Global state for logs and generated action playbooks
_autopilot_logs: List[Dict] = []
_autopilot_actions: Dict[str, List[Dict]] = {}
_is_running = False


class AutopilotService:
    def __init__(self, memory_svc: MemoryService, llm_svc: LLMService):
        self.memory = memory_svc
        self.llm = llm_svc

    def add_log(self, level: str, message: str):
        """Append a timestamped log to the execution console."""
        timestamp = datetime.utcnow().strftime("%H:%M:%S")
        _autopilot_logs.append({
            "time": timestamp,
            "level": level,  # 'INFO', 'PROCESS', 'RECALL', 'MATCH', 'REASON', 'SUCCESS', 'WARNING'
            "message": message
        })
        print(f"[{level}] {message}")

    def get_logs(self) -> List[Dict]:
        return _autopilot_logs

    def is_running(self) -> bool:
        global _is_running
        return _is_running

    async def get_all_actions(self) -> List[Dict]:
        """Collect all autopilot action playbooks from memory and active store."""
        actions = []
        for deal_id, deal_actions in _autopilot_actions.items():
            for action in deal_actions:
                actions.append(action)
        return actions

    async def run_autopilot_loop(self):
        """Executes the autonomous scan and resolution loop."""
        global _is_running, _autopilot_logs, _autopilot_actions
        
        if _is_running:
            return
        
        _is_running = True
        _autopilot_logs = []  # Clear previous logs
        
        self.add_log("INFO", "Autopilot Agent triggered. Initializing CRM pipeline scan...")
        await asyncio.sleep(0.5)

        from services.deal_service import _deals
        active_deals = [d for d in _deals.values() if d.get("outcome") == "active"]

        if not active_deals:
            self.add_log("WARNING", "No active deals found in CRM. Seed deals to run Autopilot.")
            _is_running = False
            return

        self.add_log("INFO", f"CRM scan completed. Found {len(active_deals)} active accounts to analyze.")
        await asyncio.sleep(0.8)

        for deal in active_deals:
            deal_id = deal["id"]
            company = deal.get("company_name", "Unknown Corp")
            self.add_log("PROCESS", f"Analyzing account context: '{company}'...")
            await asyncio.sleep(0.6)

            # 1. Retrieve all objections for this deal
            memories = await self.memory.get_all_memories(deal_id, filter_type="objection")
            if not memories:
                self.add_log("RECALL", f"No unresolved objections found in Hindsight for '{company}'. Deal stage: {deal.get('stage')}.")
                await asyncio.sleep(0.4)
                continue

            self.add_log("RECALL", f"Retrieved {len(memories)} unresolved objections from Hindsight for '{company}'.")
            await asyncio.sleep(0.5)

            # Process the primary objection
            primary_obj = memories[0]
            obj_text = primary_obj.get("content", "")
            obj_category = primary_obj.get("metadata", {}).get("category", "general")
            
            self.add_log("RECALL", f"Primary objection identified: \"{obj_text[:60]}...\" [Category: {obj_category}]")
            await asyncio.sleep(0.6)

            # 2. Search cross-deal Hindsight memory for similar objections in WON deals
            self.add_log("PROCESS", f"Cross-Deal Search: Querying Hindsight for historical resolution patterns...")
            await asyncio.sleep(0.8)

            # Semantic search across other deals
            search_query = f"resolved {obj_category} objection {obj_text}"
            raw_matches = await self.memory.semantic_search(search_query, limit=5)
            
            resolved_strategy = None
            matched_deal_name = None

            # Look for matches from deals that are "closed_won"
            for match in raw_matches:
                m_deal_id = match.get("deal_id")
                if m_deal_id and m_deal_id != deal_id:
                    m_deal = _deals.get(m_deal_id)
                    if m_deal and m_deal.get("outcome") == "won":
                        resolved_strategy = match.get("content")
                        matched_deal_name = m_deal.get("company_name")
                        break

            if resolved_strategy:
                self.add_log("MATCH", f"Success! Found historical match in CLOSED-WON deal: '{matched_deal_name}'.")
                self.add_log("REASON", f"Recall resolution strategy: \"{resolved_strategy[:80]}...\"")
                await asyncio.sleep(0.8)
            else:
                self.add_log("PROCESS", "No exact historical resolution pattern found. Synthesizing strategy via Groq...")
                await asyncio.sleep(0.8)

            # 3. Generate the playbook and drafts using LLM
            self.add_log("PROCESS", f"Drafting Objection Resolution Playbook for '{company}'...")
            
            # Formulate prompt for playbook synthesis
            resolved_context = f"In a similar won deal '{matched_deal_name}', we handled it by: {resolved_strategy}" if resolved_strategy else "No direct historical match. Synthesize an enterprise-grade consultative response."
            
            prompt = f"""You are the B2B Sales Auto-Pilot.
Generate an Objection Playbook for:
Deal: {json.dumps(deal)}
Objection: {obj_text}
Category: {obj_category}
Reference Strategy: {resolved_context}

Return JSON with keys:
- playbook_title (compelling title, e.g. "Security Compliance Playbook")
- strategy (a detailed, step-by-step handled approach)
- draft_email (a complete draft email for {deal.get('contact_name')} answering this concern)
- draft_sms (a complete SMS under 160 characters)
- risk_reduction (integer, estimate from 5 to 35, showing risk reduction points)

Return ONLY valid JSON."""

            messages = [
                {"role": "system", "content": "You are the Autonomous B2B Sales Agent. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ]

            response = await self.llm._call_groq(messages, max_tokens=1000)

            try:
                clean = response.strip().strip("```json").strip("```").strip()
                playbook = json.loads(clean)
            except Exception as e:
                print(f"Error parsing playbook: {e}")
                playbook = {
                    "playbook_title": f"Objection Resolution for {company}",
                    "strategy": "Emphasize our enterprise security measures and GDPR compliance standards. Share client testimonials.",
                    "draft_email": f"Hi {deal.get('contact_name')},\n\nI wanted to follow up on your concern regarding {obj_text}. We take this very seriously...",
                    "draft_sms": f"Hi {deal.get('contact_name')}, following up on your question about compliance. I've compiled details to share: [Link]",
                    "risk_reduction": 15
                }

            # Save action playbook state
            playbook_entry = {
                "deal_id": deal_id,
                "company_name": company,
                "contact_name": deal.get("contact_name", "there"),
                "contact_email": deal.get("contact_email", ""),
                "contact_phone": deal.get("contact_phone", ""),
                "objection": obj_text,
                "title": playbook["playbook_title"],
                "strategy": playbook["strategy"],
                "draft_email": playbook["draft_email"],
                "draft_sms": playbook["draft_sms"],
                "risk_reduction": playbook["risk_reduction"],
                "timestamp": datetime.utcnow().isoformat()
            }

            if deal_id not in _autopilot_actions:
                _autopilot_actions[deal_id] = []
            
            _autopilot_actions[deal_id].append(playbook_entry)

            # Store autopilot playbook in Hindsight memory
            summary = f"Auto-Pilot Playbook generated: '{playbook['playbook_title']}'. Strategy: {playbook['strategy'][:100]}... Potential risk reduction: -{playbook['risk_reduction']}%"
            await self.memory.store_memory(
                deal_id=deal_id,
                entry_type="autopilot_action",
                content=summary,
                metadata={
                    "playbook_title": playbook["playbook_title"],
                    "risk_reduction": playbook["risk_reduction"]
                }
            )

            self.add_log("SUCCESS", f"Objection Resolution Playbook generated for '{company}' (Risk reduction: -{playbook['risk_reduction']}%).")
            await asyncio.sleep(0.6)

        self.add_log("SUCCESS", "Autopilot Loop execution completed successfully. All active deals analyzed.")
        _is_running = False
