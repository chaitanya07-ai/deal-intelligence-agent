"""
Deal Service - Core business logic for deal management.
Orchestrates memory storage and LLM analysis.
"""

import os
import json
import asyncio
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import uuid

from services.memory_service import MemoryService
from services.llm_service import LLMService

# In-memory deal store (replace with Postgres in production)
_deals: Dict[str, Dict] = {}
_seed_status = {"running": False, "completed": 0, "total": 0, "error": None}


class DealService:
    def __init__(self, memory_svc: MemoryService, llm_svc: LLMService):
        self.memory = memory_svc
        self.llm = llm_svc

    # ─── CRUD ──────────────────────────────────────────────────────────────────

    async def create_deal(self, data: Dict) -> Dict:
        deal_id = str(uuid.uuid4())[:8]
        deal = {
            "id": deal_id,
            "company_name": data.get("company_name", ""),
            "contact_name": data.get("contact_name", ""),
            "contact_email": data.get("contact_email", ""),
            "contact_phone": data.get("contact_phone", ""),
            "contact_title": data.get("contact_title", ""),
            "deal_value": data.get("deal_value", 0),
            "industry": data.get("industry", ""),
            "stage": data.get("stage", "prospecting"),
            "outcome": data.get("outcome", "active"),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        _deals[deal_id] = deal

        # Store initial memory
        await self.memory.store_memory(
            deal_id=deal_id,
            entry_type="deal_created",
            content=f"Deal created for {deal['company_name']} — {deal['contact_name']} ({deal['contact_title']}). Value: ${deal['deal_value']:,.0f}",
            metadata={"stage": deal["stage"]}
        )
        return deal

    async def get_deal(self, deal_id: str) -> Optional[Dict]:
        return _deals.get(deal_id)

    async def list_all_deals(self) -> List[Dict]:
        return sorted(_deals.values(), key=lambda d: d.get("updated_at", ""), reverse=True)

    async def update_deal(self, deal_id: str, updates: Dict) -> Dict:
        if deal_id not in _deals:
            return {}
        _deals[deal_id].update(updates)
        _deals[deal_id]["updated_at"] = datetime.utcnow().isoformat()

        # Store outcome in memory
        if "outcome" in updates:
            await self.memory.store_memory(
                deal_id=deal_id,
                entry_type="outcome",
                content=f"Deal {updates['outcome'].upper()} — {_deals[deal_id].get('company_name')}",
                metadata={"outcome": updates["outcome"]}
            )

        if "stage" in updates:
            await self.memory.store_memory(
                deal_id=deal_id,
                entry_type="stage_change",
                content=f"Stage moved to: {updates['stage']}",
                metadata={"stage": updates["stage"]}
            )

        return _deals[deal_id]

    # ─── AI Features ───────────────────────────────────────────────────────────

    async def generate_briefing(self, deal_id: str) -> Dict:
        deal = _deals.get(deal_id)
        if not deal:
            return {"error": "Deal not found"}

        memories = await self.memory.get_all_memories(deal_id)
        briefing_text = await self.llm.generate_briefing(deal, memories)

        # Store briefing generation as a memory event
        await self.memory.store_memory(
            deal_id=deal_id,
            entry_type="briefing",
            content=f"Pre-call briefing generated",
            metadata={"timestamp": datetime.utcnow().isoformat()}
        )

        return {
            "deal_id": deal_id,
            "deal": deal,
            "briefing": briefing_text,
            "memories_used": len(memories),
            "generated_at": datetime.utcnow().isoformat()
        }

    async def analyze_risk(self, deal_id: str) -> Dict:
        deal = _deals.get(deal_id)
        if not deal:
            return {"error": "Deal not found"}

        memories = await self.memory.get_all_memories(deal_id)
        risk = await self.llm.analyze_risk(deal, memories)

        # Update deal with risk score
        _deals[deal_id]["risk_score"] = risk.get("risk_score", 50)
        _deals[deal_id]["risk_level"] = risk.get("risk_level", "medium")
        _deals[deal_id]["closure_probability"] = risk.get("closure_probability", 0.5)

        return {**risk, "deal_id": deal_id, "analyzed_at": datetime.utcnow().isoformat()}

    # ─── Dashboard Analytics ───────────────────────────────────────────────────

    async def get_dashboard_stats(self) -> Dict:
        deals = list(_deals.values())
        total = len(deals)
        won = sum(1 for d in deals if d.get("outcome") == "won")
        lost = sum(1 for d in deals if d.get("outcome") == "lost")
        active = sum(1 for d in deals if d.get("outcome") == "active")
        total_pipeline = sum(d.get("deal_value", 0) for d in deals if d.get("outcome") == "active")
        won_revenue = sum(d.get("deal_value", 0) for d in deals if d.get("outcome") == "won")
        avg_deal_size = (sum(d.get("deal_value", 0) for d in deals) / total) if total > 0 else 0
        win_rate = (won / (won + lost)) if (won + lost) > 0 else 0

        # Stage distribution
        stages = {}
        for d in deals:
            s = d.get("stage", "unknown")
            stages[s] = stages.get(s, 0) + 1

        # Risk distribution
        high_risk = sum(1 for d in deals if d.get("risk_level") in ("high", "critical"))
        med_risk = sum(1 for d in deals if d.get("risk_level") == "medium")
        low_risk = sum(1 for d in deals if d.get("risk_level") == "low")

        return {
            "total_deals": total,
            "active_deals": active,
            "won_deals": won,
            "lost_deals": lost,
            "total_pipeline_value": total_pipeline,
            "won_revenue": won_revenue,
            "avg_deal_size": avg_deal_size,
            "win_rate": round(win_rate * 100, 1),
            "stage_distribution": stages,
            "risk_distribution": {"high": high_risk, "medium": med_risk, "low": low_risk},
            "deals_this_month": sum(
                1 for d in deals
                if d.get("created_at", "")[:7] == datetime.utcnow().strftime("%Y-%m")
            )
        }

    async def get_risk_heatmap(self) -> List[Dict]:
        heatmap = []
        for deal in _deals.values():
            heatmap.append({
                "id": deal["id"],
                "company": deal.get("company_name", ""),
                "value": deal.get("deal_value", 0),
                "stage": deal.get("stage", ""),
                "risk_score": deal.get("risk_score", 50),
                "risk_level": deal.get("risk_level", "medium"),
                "closure_probability": deal.get("closure_probability", 0.5),
                "outcome": deal.get("outcome", "active")
            })
        return sorted(heatmap, key=lambda x: -x["risk_score"])

    async def get_revenue_forecast(self) -> Dict:
        deals = list(_deals.values())
        active = [d for d in deals if d.get("outcome") == "active"]

        # Weighted pipeline by stage probability
        stage_weights = {
            "prospecting": 0.10,
            "qualification": 0.25,
            "proposal": 0.45,
            "negotiation": 0.70,
            "closed_won": 1.0,
            "closed_lost": 0.0
        }

        weighted_pipeline = sum(
            d.get("deal_value", 0) * stage_weights.get(d.get("stage", ""), 0.3)
            for d in active
        )

        # Monthly breakdown (mock trend + real data)
        months = []
        now = datetime.utcnow()
        for i in range(6):
            month = (now - timedelta(days=30 * (5 - i)))
            month_str = month.strftime("%b %Y")
            month_key = month.strftime("%Y-%m")
            month_won = sum(
                d.get("deal_value", 0) for d in deals
                if d.get("outcome") == "won" and d.get("updated_at", "")[:7] == month_key
            )
            months.append({"month": month_str, "revenue": month_won})

        return {
            "weighted_pipeline": round(weighted_pipeline),
            "best_case": round(sum(d.get("deal_value", 0) for d in active)),
            "committed": round(
                sum(d.get("deal_value", 0) for d in active if d.get("stage") in ("negotiation",))
            ),
            "monthly_trend": months,
            "forecast_accuracy": 0.84
        }

    # ─── Data Seeding ──────────────────────────────────────────────────────────

    async def seed_realistic_deals(self, num_deals: int = 5, industry: Optional[str] = None):
        global _seed_status
        _seed_status = {"running": True, "completed": 0, "total": num_deals, "error": None}

        try:
            raw_deals = await self.llm.seed_deals(num_deals, industry)

            for raw in raw_deals:
                # Create the deal record
                deal_data = {
                    "company_name": raw.get("company_name", ""),
                    "contact_name": raw.get("contact_name", ""),
                    "contact_email": raw.get("contact_email", ""),
                    "contact_phone": raw.get("contact_phone", ""),
                    "contact_title": raw.get("contact_title", ""),
                    "deal_value": raw.get("deal_value", 50000),
                    "industry": raw.get("industry", industry or "Enterprise SaaS"),
                    "stage": raw.get("stage", "qualification"),
                    "outcome": raw.get("outcome", "active")
                }
                deal = await self.create_deal(deal_data)
                deal_id = deal["id"]

                # Seed objections into Hindsight memory
                for obj in raw.get("objections", []):
                    text = obj if isinstance(obj, str) else obj.get("text", str(obj))
                    category = obj.get("category", "general") if isinstance(obj, dict) else "general"
                    await self.memory.store_memory(
                        deal_id=deal_id,
                        entry_type="objection",
                        content=text,
                        metadata={"category": category}
                    )

                # Seed competitors
                for comp in raw.get("competitors", []):
                    name = comp if isinstance(comp, str) else comp.get("name", str(comp))
                    strategy = comp.get("counter_strategy", "") if isinstance(comp, dict) else ""
                    await self.memory.store_memory(
                        deal_id=deal_id,
                        entry_type="competitor",
                        content=f"Competitor mentioned: {name}",
                        metadata={"competitor_name": name, "counter_strategy": strategy}
                    )

                # Seed stakeholders
                for sh in raw.get("stakeholders", []):
                    name = sh.get("name", "Unknown") if isinstance(sh, dict) else str(sh)
                    title = sh.get("title", "") if isinstance(sh, dict) else ""
                    role = sh.get("role", "influencer") if isinstance(sh, dict) else "influencer"
                    await self.memory.store_memory(
                        deal_id=deal_id,
                        entry_type="stakeholder",
                        content=f"{name} ({title}) — {role}",
                        metadata={"name": name, "title": title, "role": role}
                    )

                # Seed pricing notes
                for note in raw.get("pricing_notes", []):
                    text = note if isinstance(note, str) else note.get("note", str(note))
                    await self.memory.store_memory(
                        deal_id=deal_id,
                        entry_type="pricing",
                        content=text,
                        metadata={}
                    )

                # Seed interaction history
                for interaction in raw.get("key_interactions", []):
                    text = interaction if isinstance(interaction, str) else interaction.get("note", str(interaction))
                    await self.memory.store_interaction(
                        deal_id=deal_id,
                        role="assistant",
                        content=text,
                        metadata={"type": "historical_interaction"}
                    )

                # Store win/loss reason
                if raw.get("win_loss_reason"):
                    await self.memory.store_memory(
                        deal_id=deal_id,
                        entry_type="outcome",
                        content=raw["win_loss_reason"],
                        metadata={"outcome": raw.get("outcome", "active")}
                    )

                # Run risk analysis
                await self.analyze_risk(deal_id)

                _seed_status["completed"] += 1
                await asyncio.sleep(0.1)  # Rate limiting

        except Exception as e:
            _seed_status["error"] = str(e)
            print(f"Seeding error: {e}")
        finally:
            _seed_status["running"] = False

    async def get_seed_status(self) -> Dict:
        return _seed_status
