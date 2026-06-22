import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_EMAIL = os.getenv("SMTP_EMAIL", "")
SMTP_APP_PASSWORD = os.getenv("SMTP_APP_PASSWORD", "")


async def send_email(to: str, subject: str, body_html: str):
    if not SMTP_EMAIL or not SMTP_APP_PASSWORD:
        print(f"[Email Skip] To: {to}, Subject: {subject}")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"BNI 47∞チャプター パスポート <{SMTP_EMAIL}>"
    msg["To"] = to

    msg.attach(MIMEText(body_html, "html", "utf-8"))

    await aiosmtplib.send(
        msg,
        hostname=SMTP_HOST,
        port=SMTP_PORT,
        username=SMTP_EMAIL,
        password=SMTP_APP_PASSWORD,
        start_tls=True,
    )


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
