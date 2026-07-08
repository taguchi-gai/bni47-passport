import os
import httpx
from dotenv import load_dotenv

load_dotenv()

BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
SMTP_EMAIL = os.getenv("SMTP_EMAIL", "")

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


async def send_email(to: str, subject: str, body_html: str):
    if not BREVO_API_KEY or not SMTP_EMAIL:
        print(f"[Email Skip] To: {to}, Subject: {subject}")
        return

    payload = {
        "sender": {"name": "BNI 47∞チャプター パスポート", "email": SMTP_EMAIL},
        "to": [{"email": to}],
        "subject": subject,
        "htmlContent": body_html,
    }

    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.post(
            BREVO_API_URL,
            json=payload,
            headers={
                "api-key": BREVO_API_KEY,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )
        if res.status_code >= 300:
            raise RuntimeError(f"Brevo API error: {res.status_code} {res.text}")


async def send_booking_notification(
    mentor_name: str,
    mentor_email: str,
    new_member_name: str,
    new_member_email: str,
    meeting_datetime: str,
    meeting_url: str,
    program_number: int,
    program_title: str,
):
    meeting_type_label = "Google Meet" if "meet.google.com" in meeting_url else "Zoom"

    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">BNI 47∞ パスポートプログラム - 面談予約確定</h2>
      <hr/>
      <p>以下の面談が予約されました。</p>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; font-weight: bold; width: 140px;">プログラム</td>
            <td style="padding: 8px;">#{program_number} {program_title}</td></tr>
        <tr style="background:#f9f9f9;"><td style="padding: 8px; font-weight: bold;">メンター</td>
            <td style="padding: 8px;">{mentor_name}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">新メンバー</td>
            <td style="padding: 8px;">{new_member_name}</td></tr>
        <tr style="background:#f9f9f9;"><td style="padding: 8px; font-weight: bold;">日時</td>
            <td style="padding: 8px;">{meeting_datetime}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">{meeting_type_label} URL</td>
            <td style="padding: 8px;"><a href="{meeting_url}" style="color:#4f46e5;">{meeting_url}</a></td></tr>
      </table>
      <br/>
      <p style="color: #666; font-size: 12px;">このメールはBNI 47∞ パスポートシステムから自動送信されています。</p>
    </div>
    """

    subject = f"【BNI パスポート】#{program_number} 面談予約確定 - {meeting_datetime}"

    await send_email(mentor_email, subject, html)
    await send_email(new_member_email, subject, html)


async def send_completion_notification(
    new_member_name: str,
    new_member_email: str,
    program_number: int,
    program_title: str,
    mentor_name: str,
    completed_count: int,
    total_count: int,
):
    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">BNI 47∞ パスポートプログラム - 完了報告</h2>
      <hr/>
      <p>プログラムが完了しました。</p>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; font-weight: bold; width: 140px;">プログラム</td>
            <td style="padding: 8px;">#{program_number} {program_title}</td></tr>
        <tr style="background:#f9f9f9;"><td style="padding: 8px; font-weight: bold;">新メンバー</td>
            <td style="padding: 8px;">{new_member_name}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">担当メンター</td>
            <td style="padding: 8px;">{mentor_name}</td></tr>
        <tr style="background:#f9f9f9;"><td style="padding: 8px; font-weight: bold;">進捗</td>
            <td style="padding: 8px;">{completed_count} / {total_count} 完了</td></tr>
      </table>
      <br/>
      <p style="color: #666; font-size: 12px;">このメールはBNI 47∞ パスポートシステムから自動送信されています。</p>
    </div>
    """

    subject = f"【BNI パスポート】#{program_number} 完了 - {new_member_name}"
    await send_email(new_member_email, subject, html)
