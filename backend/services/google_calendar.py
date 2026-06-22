"""
Google Calendar サービス
システム用Googleアカウント1つで全メンバーのイベントを作成。
トークンは.envに保存し、自動リフレッシュ。
"""
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REFRESH_TOKEN = os.getenv("GOOGLE_REFRESH_TOKEN", "")

SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/gmail.send",
]


def _get_credentials() -> Credentials:
    creds = Credentials(
        token=None,
        refresh_token=GOOGLE_REFRESH_TOKEN,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        scopes=SCOPES,
    )
    if not creds.valid:
        creds.refresh(Request())
    return creds


def create_meet_event(
    summary: str,
    start_datetime: datetime,
    mentor_name: str,
    mentor_email: str,
    new_member_name: str,
    new_member_email: str,
    program_number: int,
) -> dict:
    """
    Google Meetイベントをシステムアカウントで作成し、
    メンターと新メンバーを参加者として招待する。
    返り値: {"event_id": str, "meet_url": str}
    """
    if not GOOGLE_CLIENT_ID or not GOOGLE_REFRESH_TOKEN:
        dummy_url = f"https://meet.google.com/dummy-{program_number:03d}"
        return {"event_id": "dummy", "meet_url": dummy_url}

    try:
        creds = _get_credentials()
        service = build("calendar", "v3", credentials=creds)

        end_datetime = start_datetime + timedelta(hours=1)

        event = {
            "summary": f"BNI パスポート #{program_number} - {mentor_name} × {new_member_name}",
            "description": f"BNI 47∞チャプター パスポートプログラム #{program_number}\nメンター: {mentor_name}\n新メンバー: {new_member_name}",
            "start": {
                "dateTime": start_datetime.isoformat(),
                "timeZone": "Asia/Tokyo",
            },
            "end": {
                "dateTime": end_datetime.isoformat(),
                "timeZone": "Asia/Tokyo",
            },
            "attendees": [
                {"email": mentor_email, "displayName": mentor_name},
                {"email": new_member_email, "displayName": new_member_name},
            ],
            "conferenceData": {
                "createRequest": {
                    "requestId": f"bni-{program_number}-{int(start_datetime.timestamp())}",
                    "conferenceSolutionKey": {"type": "hangoutsMeet"},
                }
            },
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "email", "minutes": 60},
                    {"method": "popup", "minutes": 10},
                ],
            },
        }

        created = service.events().insert(
            calendarId="primary",
            body=event,
            conferenceDataVersion=1,
            sendUpdates="all",
        ).execute()

        meet_url = ""
        conf = created.get("conferenceData", {})
        for ep in conf.get("entryPoints", []):
            if ep.get("entryPointType") == "video":
                meet_url = ep.get("uri", "")
                break

        return {"event_id": created["id"], "meet_url": meet_url}

    except HttpError as e:
        print(f"Google Calendar API error: {e}")
        raise RuntimeError(f"Google Meetの作成に失敗しました: {e}")


def delete_event(event_id: str):
    if not GOOGLE_CLIENT_ID or not GOOGLE_REFRESH_TOKEN or event_id == "dummy":
        return
    try:
        creds = _get_credentials()
        service = build("calendar", "v3", credentials=creds)
        service.events().delete(calendarId="primary", eventId=event_id).execute()
    except HttpError:
        pass
