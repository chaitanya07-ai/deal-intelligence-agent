"""
Twilio Service - SMS and Voice call integration.
Enables two-way SMS and AI voice calls with prospects.
"""

import os
import json
from typing import Dict, Optional
from datetime import datetime


class TwilioService:
    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
        self.from_number = os.getenv("TWILIO_FROM_NUMBER", "")
        self.base_url = os.getenv("APP_BASE_URL", "http://localhost:8000")
        self.enabled = bool(self.account_sid and self.auth_token and self.from_number)

        if self.enabled:
            try:
                from twilio.rest import Client
                self.client = Client(self.account_sid, self.auth_token)
                print("✅ Twilio connected")
            except ImportError:
                print("⚠️  twilio package not installed — run: pip install twilio")
                self.enabled = False
        else:
            print("⚠️  Twilio not configured — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER")

    async def send_sms(
        self,
        deal_id: str,
        phone_number: str,
        message_type: str,
        memory_svc,
        llm_svc
    ) -> Dict:
        """Send personalized SMS using deal memory context."""
        from services.deal_service import _deals

        deal = _deals.get(deal_id, {})
        memories = await memory_svc.get_relevant_memories(
            deal_id=deal_id,
            query="recent interaction objection follow up",
            limit=5
        )

        message_body = await llm_svc.generate_sms_message(
            deal_context=deal,
            memories=memories,
            message_type=message_type
        )

        # Store in memory
        await memory_svc.store_memory(
            deal_id=deal_id,
            entry_type="sms_sent",
            content=f"SMS sent to {phone_number}: {message_body[:80]}...",
            metadata={"phone": phone_number, "type": message_type}
        )

        if not self.enabled:
            return {
                "sent": False,
                "preview": message_body,
                "reason": "Twilio not configured",
                "phone": phone_number
            }

        try:
            msg = self.client.messages.create(
                body=message_body,
                from_=self.from_number,
                to=phone_number
            )
            return {
                "sent": True,
                "sid": msg.sid,
                "body": message_body,
                "phone": phone_number,
                "status": msg.status,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {"sent": False, "error": str(e), "preview": message_body}

    async def initiate_call(
        self,
        deal_id: str,
        phone_number: str,
        memory_svc,
        llm_svc
    ) -> Dict:
        """Initiate an AI-powered voice call via Twilio."""
        from services.deal_service import _deals

        deal = _deals.get(deal_id, {})
        contact_name = deal.get("contact_name", "there")

        # Store call initiation in memory
        await memory_svc.store_memory(
            deal_id=deal_id,
            entry_type="call_initiated",
            content=f"Voice call initiated to {phone_number} for {deal.get('company_name', '')}",
            metadata={"phone": phone_number}
        )

        if not self.enabled:
            return {
                "initiated": False,
                "reason": "Twilio not configured",
                "simulation": f"AI would call {phone_number} and greet {contact_name} with deal-specific context"
            }

        try:
            twiml_url = f"{self.base_url}/api/voice/webhook?deal_id={deal_id}"
            call = self.client.calls.create(
                url=twiml_url,
                from_=self.from_number,
                to=phone_number
            )
            return {
                "initiated": True,
                "call_sid": call.sid,
                "phone": phone_number,
                "status": call.status,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {"initiated": False, "error": str(e)}

    def generate_twiml(self, greeting: str = "") -> str:
        """Generate TwiML for voice calls."""
        default_greeting = (
            "Hello, this is your Deal Intelligence Agent calling. "
            "I'm reaching out to follow up on our recent conversation. "
            "Press 1 to hear our latest proposal, or press 2 to speak with a representative."
        )
        text = greeting or default_greeting

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna" language="en-US">{text}</Say>
    <Gather numDigits="1" action="/api/voice/gather" method="POST">
        <Say>Press 1 for the proposal summary, or 2 to speak with someone.</Say>
    </Gather>
</Response>"""
