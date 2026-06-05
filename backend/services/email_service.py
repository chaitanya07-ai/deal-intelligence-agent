"""
Email Service - Draft and send personalized deal emails.
Integrates with SMTP / SendGrid when configured.
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Optional
from datetime import datetime


class EmailService:
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_pass = os.getenv("SMTP_PASS", "")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_user)
        self.enabled = bool(self.smtp_user and self.smtp_pass)

    async def draft_email(
        self,
        deal_id: str,
        email_type: str,
        recipient_email: str,
        memory_svc,
        llm_svc
    ) -> Dict:
        """Generate personalized email using deal memory."""
        from services.deal_service import _deals

        deal = _deals.get(deal_id, {})
        memories = await memory_svc.get_all_memories(deal_id)

        email_data = await llm_svc.generate_email(
            email_type=email_type,
            deal_context=deal,
            memories=memories,
            recipient_email=recipient_email
        )

        # Store the draft event in memory
        await memory_svc.store_memory(
            deal_id=deal_id,
            entry_type="email_drafted",
            content=f"{email_type.replace('_', ' ').title()} email drafted for {recipient_email}. Subject: {email_data.get('subject', '')}",
            metadata={"email_type": email_type, "recipient": recipient_email}
        )

        return {
            "deal_id": deal_id,
            "recipient": recipient_email,
            "email_type": email_type,
            "subject": email_data.get("subject", "Following up"),
            "body": email_data.get("body", ""),
            "key_points": email_data.get("key_points", []),
            "tone": email_data.get("tone", "professional"),
            "drafted_at": datetime.utcnow().isoformat(),
            "sent": False
        }

    async def send_email(self, email_data: Dict) -> Dict:
        """Send email via SMTP."""
        if not self.enabled:
            return {"sent": False, "reason": "SMTP not configured — set SMTP_USER and SMTP_PASS"}

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = email_data["subject"]
            msg["From"] = self.from_email
            msg["To"] = email_data["recipient"]

            body_plain = email_data.get("body", "")
            body_html = self._to_html(body_plain)

            msg.attach(MIMEText(body_plain, "plain"))
            msg.attach(MIMEText(body_html, "html"))

            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_pass)
                server.sendmail(self.from_email, email_data["recipient"], msg.as_string())

            return {"sent": True, "timestamp": datetime.utcnow().isoformat()}
        except Exception as e:
            return {"sent": False, "error": str(e)}

    def _to_html(self, text: str) -> str:
        paragraphs = text.split("\n\n")
        html_parts = []
        for p in paragraphs:
            if p.startswith("##"):
                tag = "h3"
                content = p.lstrip("# ").strip()
            elif p.startswith("-") or p.startswith("•"):
                lines = p.split("\n")
                items = "".join(f"<li>{l.lstrip('-• ').strip()}</li>" for l in lines if l.strip())
                html_parts.append(f"<ul>{items}</ul>")
                continue
            else:
                tag = "p"
                content = p.replace("\n", "<br>")
            html_parts.append(f"<{tag}>{content}</{tag}>")

        return f"""<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; color: #1a1a2e; max-width: 600px; margin: 0 auto; padding: 24px;">
{"".join(html_parts)}
<hr style="margin-top: 32px; border: none; border-top: 1px solid #e2e8f0;">
<p style="color: #64748b; font-size: 12px;">Sent via Deal Intelligence Agent</p>
</body>
</html>"""
