"""
Memory Service - Hindsight (Vectorize) Integration
https://hindsight.vectorize.io/
https://github.com/vectorize-io/hindsight

This is the CORE of the Deal Intelligence Agent.
All deal context, objections, competitors, and stakeholder notes
are stored and retrieved via Hindsight's persistent memory layer.
"""

import os
import json
import asyncio
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from collections import defaultdict
import hashlib

try:
    # Try to import Hindsight SDK
    # pip install hindsight-memory
    import hindsight
    HINDSIGHT_AVAILABLE = True
except ImportError:
    HINDSIGHT_AVAILABLE = False

# Fallback in-memory store for demo/dev without API keys
_fallback_store: Dict[str, List[Dict]] = defaultdict(list)
_interaction_counts: Dict[str, int] = defaultdict(int)


class MemoryService:
    """
    Wraps Hindsight memory SDK with graceful fallback.
    When HINDSIGHT_API_KEY is set, uses real Hindsight memory.
    Otherwise uses an in-process store for demos.
    """

    def __init__(self):
        self.api_key = os.getenv("HINDSIGHT_API_KEY", "")
        self.pipeline_id = os.getenv("HINDSIGHT_PIPELINE_ID", "deal-intelligence")
        self.use_hindsight = HINDSIGHT_AVAILABLE and bool(self.api_key)

        if self.use_hindsight:
            self.client = hindsight.Client(
                api_key=self.api_key,
                pipeline_id=self.pipeline_id
            )
            print("✅ Hindsight memory connected")
        else:
            print("⚠️  Using in-memory fallback (set HINDSIGHT_API_KEY for persistent memory)")

    # ─── Core Memory Operations ────────────────────────────────────────────────

    async def store_memory(
        self,
        deal_id: str,
        entry_type: str,
        content: str,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Store a memory entry for a deal."""
        entry = {
            "id": self._generate_id(deal_id, content),
            "deal_id": deal_id,
            "type": entry_type,
            "content": content,
            "metadata": metadata or {},
            "timestamp": datetime.utcnow().isoformat(),
            "embedding_text": f"[{entry_type.upper()}] Deal {deal_id}: {content}"
        }

        if self.use_hindsight:
            try:
                result = await asyncio.to_thread(
                    self.client.memory.store,
                    user_id=deal_id,
                    text=entry["embedding_text"],
                    metadata={
                        "deal_id": deal_id,
                        "type": entry_type,
                        "content": content,
                        **entry["metadata"]
                    }
                )
                entry["hindsight_id"] = result.get("id")
            except Exception as e:
                print(f"Hindsight store error: {e}, falling back to local")
                _fallback_store[deal_id].append(entry)
        else:
            _fallback_store[deal_id].append(entry)

        return entry

    async def store_interaction(
        self,
        deal_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict] = None
    ) -> None:
        """Track a conversation interaction — Hindsight learns from these."""
        _interaction_counts[deal_id] += 1

        if self.use_hindsight:
            try:
                await asyncio.to_thread(
                    self.client.memory.add_message,
                    user_id=deal_id,
                    role=role,
                    content=content,
                    metadata=metadata or {}
                )
            except Exception as e:
                print(f"Hindsight interaction store error: {e}")

        # Also persist locally
        entry = {
            "id": self._generate_id(deal_id, content),
            "deal_id": deal_id,
            "type": "interaction",
            "role": role,
            "content": content,
            "metadata": metadata or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        _fallback_store[deal_id].append(entry)

    async def get_relevant_memories(
        self,
        deal_id: str,
        query: str,
        limit: int = 10
    ) -> List[Dict]:
        """Retrieve memories relevant to a query using semantic search."""
        if self.use_hindsight:
            try:
                results = await asyncio.to_thread(
                    self.client.memory.search,
                    user_id=deal_id,
                    query=query,
                    limit=limit
                )
                return results.get("memories", [])
            except Exception as e:
                print(f"Hindsight search error: {e}, using fallback")

        # Fallback: simple keyword search
        all_memories = _fallback_store.get(deal_id, [])
        query_words = query.lower().split()

        scored = []
        for mem in all_memories:
            text = mem.get("content", "").lower()
            score = sum(1 for word in query_words if word in text)
            if score > 0:
                scored.append((score, mem))

        scored.sort(key=lambda x: -x[0])
        return [m for _, m in scored[:limit]]

    async def get_all_memories(
        self,
        deal_id: str,
        filter_type: Optional[str] = None
    ) -> List[Dict]:
        """Get all memories for a deal."""
        if self.use_hindsight:
            try:
                results = await asyncio.to_thread(
                    self.client.memory.list,
                    user_id=deal_id
                )
                memories = results.get("memories", [])
                if filter_type:
                    memories = [m for m in memories if m.get("metadata", {}).get("type") == filter_type]
                return memories
            except Exception as e:
                print(f"Hindsight list error: {e}")

        memories = _fallback_store.get(deal_id, [])
        if filter_type:
            memories = [m for m in memories if m.get("type") == filter_type]
        return sorted(memories, key=lambda x: x.get("timestamp", ""))

    async def semantic_search(
        self,
        query: str,
        deal_id: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict]:
        """Cross-deal semantic search."""
        if deal_id:
            return await self.get_relevant_memories(deal_id, query, limit)

        # Search across all deals
        all_results = []
        for d_id, memories in _fallback_store.items():
            for mem in memories:
                if query.lower() in mem.get("content", "").lower():
                    all_results.append({**mem, "deal_id": d_id})

        return all_results[:limit]

    async def get_timeline(self, deal_id: str) -> List[Dict]:
        """Get chronological timeline for a deal."""
        memories = await self.get_all_memories(deal_id)
        return sorted(memories, key=lambda x: x.get("timestamp", ""))

    # ─── Analytics & Pattern Recognition ──────────────────────────────────────

    async def analyze_patterns(self) -> Dict:
        """Analyze win/loss patterns from deal memories."""
        all_deals = {}
        for deal_id, memories in _fallback_store.items():
            # Find outcome
            outcome = None
            for m in memories:
                if m.get("type") == "outcome":
                    outcome = m.get("metadata", {}).get("outcome")
                    break

            if outcome in ("won", "lost"):
                objections = [m for m in memories if m.get("type") == "objection"]
                competitors = [m for m in memories if m.get("type") == "competitor"]
                all_deals[deal_id] = {
                    "outcome": outcome,
                    "objections": objections,
                    "competitors": competitors
                }

        # Compute patterns
        won_objections = defaultdict(int)
        lost_objections = defaultdict(int)
        competitor_win_rate = defaultdict(lambda: {"won": 0, "total": 0})

        for deal_id, data in all_deals.items():
            for obj in data["objections"]:
                content = obj.get("content", "")[:50]
                if data["outcome"] == "won":
                    won_objections[content] += 1
                else:
                    lost_objections[content] += 1

            for comp in data["competitors"]:
                name = comp.get("metadata", {}).get("competitor_name", "Unknown")
                competitor_win_rate[name]["total"] += 1
                if data["outcome"] == "won":
                    competitor_win_rate[name]["won"] += 1

        return {
            "total_analyzed_deals": len(all_deals),
            "won": sum(1 for d in all_deals.values() if d["outcome"] == "won"),
            "lost": sum(1 for d in all_deals.values() if d["outcome"] == "lost"),
            "common_won_objections": dict(sorted(won_objections.items(), key=lambda x: -x[1])[:5]),
            "common_lost_objections": dict(sorted(lost_objections.items(), key=lambda x: -x[1])[:5]),
            "competitor_win_rates": {
                name: {
                    "win_rate": data["won"] / data["total"] if data["total"] > 0 else 0,
                    "appearances": data["total"]
                }
                for name, data in competitor_win_rate.items()
            }
        }

    async def get_competitor_intel(self) -> Dict:
        """Aggregate competitor intelligence from all deals."""
        competitors = defaultdict(lambda: {
            "mentions": 0, "deals": [], "strategies": [], "outcomes": {"won": 0, "lost": 0}
        })

        for deal_id, memories in _fallback_store.items():
            outcome = None
            for m in memories:
                if m.get("type") == "outcome":
                    outcome = m.get("metadata", {}).get("outcome")

            for mem in memories:
                if mem.get("type") == "competitor":
                    name = mem.get("metadata", {}).get("competitor_name", "Unknown")
                    competitors[name]["mentions"] += 1
                    if deal_id not in competitors[name]["deals"]:
                        competitors[name]["deals"].append(deal_id)
                    if outcome:
                        competitors[name]["outcomes"][outcome] = competitors[name]["outcomes"].get(outcome, 0) + 1
                    strategy = mem.get("metadata", {}).get("counter_strategy")
                    if strategy:
                        competitors[name]["strategies"].append(strategy)

        return {"competitors": dict(competitors)}

    async def get_top_objections(self, limit: int = 10) -> Dict:
        """Get most common objections across all deals."""
        objection_counts = defaultdict(lambda: {"count": 0, "examples": [], "handled_successfully": 0})

        for deal_id, memories in _fallback_store.items():
            outcome = None
            for m in memories:
                if m.get("type") == "outcome":
                    outcome = m.get("metadata", {}).get("outcome")

            for mem in memories:
                if mem.get("type") == "objection":
                    # Categorize by first few words
                    category = mem.get("metadata", {}).get("category", "general")
                    objection_counts[category]["count"] += 1
                    if len(objection_counts[category]["examples"]) < 3:
                        objection_counts[category]["examples"].append(mem.get("content", "")[:100])
                    if outcome == "won":
                        objection_counts[category]["handled_successfully"] += 1

        sorted_objections = sorted(
            objection_counts.items(),
            key=lambda x: -x[1]["count"]
        )
        return {"objections": dict(sorted_objections[:limit])}

    def get_interaction_count(self, deal_id: str) -> int:
        return _interaction_counts.get(deal_id, 0)

    # ─── Helpers ───────────────────────────────────────────────────────────────

    def _generate_id(self, deal_id: str, content: str) -> str:
        raw = f"{deal_id}:{content}:{datetime.utcnow().isoformat()}"
        return hashlib.md5(raw.encode()).hexdigest()[:12]
