"""
Google Calendar サービス
システム用Googleアカウント1つで全メンバーのイベントを作成。
トークンは.envに保存し、自動リフレッシュ。
"""
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request, AuthorizedSession
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

# Meet REST API 用。新スコープ未付与の refresh token でも Calendar が壊れないよう、資格情報は分離する
MEET_SCOPES = ["https://www.googleapis.com/auth/meetings.space.created"]


def _get_credentials(scopes: list[str] | None = None) -> Credentials:
    creds = Credentials(
        token=None,
        refresh_token=GOOGLE_REFRESH_TOKEN,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        scopes=scopes or SCOPES,
    )
    if not creds.valid:
        creds.refresh(Request())
    return creds


def _create_open_meet_url() -> str | None:
    """
    Meet REST API で accessType=OPEN（リンクを知っている人は承認なしで入室可）の部屋を作る。
    失敗時は None を返し、呼び出し側が従来方式にフォールバックする。
    """
    try:
        session = AuthorizedSession(_get_credentials(MEET_SCOPES))
        resp = session.post(
            "https://meet.googleapis.com/v2/spaces",
            json={"config": {"accessType": "OPEN"}},
            timeout=15,
        )
        if resp.status_code != 200:
            print(f"Meet API error: {resp.status_code} {resp.text[:300]}")
            return None
        return resp.json().get("meetingUri") or None
    except Exception as e:
        print(f"Meet API failed, falling back to conferenceData: {e}")
        return None


def create_meet_event(
    summary: str,
    start_datetime: datetime,
    mentor_name: str,
    mentor_email: str,
    new_member_name: str,
    new_member_email: str,
    program_number: int,
    zoom_url: str | None = None,
) -> dict:
    """
    システムアカウントでカレンダーイベントを作成し、
    メンターと新メンバーを参加者として招待する。
    zoom_url が指定されている場合は Google Meet を発行せず、
    詳細欄に Zoom URL を記載する。
    返り値: {"event_id": str, "meet_url": str}
    """
    if not GOOGLE_CLIENT_ID or not GOOGLE_REFRESH_TOKEN:
        if zoom_url:
            return {"event_id": "dummy", "meet_url": zoom_url}
        dummy_url = f"https://meet.google.com/dummy-{program_number:03d}"
        return {"event_id": "dummy", "meet_url": dummy_url}

    try:
        creds = _get_credentials()
        service = build("calendar", "v3", credentials=creds)

        end_datetime = start_datetime + timedelta(hours=1)

        # DB は naive UTC で保存している前提。Google Calendar には UTC として明示的に渡し、
        # timeZone は表示用に Asia/Tokyo を指定する（dateTime に Z があれば UTC が優先される）
        start_iso = start_datetime.isoformat() + "Z"
        end_iso = end_datetime.isoformat() + "Z"

        open_meet_url = None if zoom_url else _create_open_meet_url()

        description = f"BNI 47∞チャプター パスポートプログラム #{program_number}\nメンター: {mentor_name}\n新メンバー: {new_member_name}"
        if zoom_url:
            description += f"\n\nZoom URL: {zoom_url}"
        elif open_meet_url:
            description += f"\n\nGoogle Meet: {open_meet_url}"

        event = {
            "summary": f"BNI パスポート #{program_number} - {mentor_name} × {new_member_name}",
            "description": description,
            "start": {
                "dateTime": start_iso,
                "timeZone": "Asia/Tokyo",
            },
            "end": {
                "dateTime": end_iso,
                "timeZone": "Asia/Tokyo",
            },
            "attendees": [
                {"email": mentor_email, "displayName": mentor_name},
                {"email": new_member_email, "displayName": new_member_name},
            ],
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "email", "minutes": 60},
                    {"method": "popup", "minutes": 10},
                ],
            },
        }

        if zoom_url:
            event["location"] = zoom_url
        elif open_meet_url:
            event["location"] = open_meet_url
        else:
            event["conferenceData"] = {
                "createRequest": {
                    "requestId": f"bni-{program_number}-{int(start_datetime.timestamp())}",
                    "conferenceSolutionKey": {"type": "hangoutsMeet"},
                }
            }

        created = service.events().insert(
            calendarId="primary",
            body=event,
            conferenceDataVersion=1,
            sendUpdates="all",
        ).execute()

        if zoom_url:
            return {"event_id": created["id"], "meet_url": zoom_url}
        if open_meet_url:
            return {"event_id": created["id"], "meet_url": open_meet_url}

        meet_url = ""
        conf = created.get("conferenceData", {})
        for ep in conf.get("entryPoints", []):
            if ep.get("entryPointType") == "video":
                meet_url = ep.get("uri", "")
                break

        return {"event_id": created["id"], "meet_url": meet_url}

    except HttpError as e:
        print(f"Google Calendar API error: {e}")
        raise RuntimeError(f"カレンダーイベントの作成に失敗しました: {e}")


def delete_event(event_id: str):
    if not GOOGLE_CLIENT_ID or not GOOGLE_REFRESH_TOKEN or event_id == "dummy":
        return
    try:
        creds = _get_credentials()
        service = build("calendar", "v3", credentials=creds)
        service.events().delete(calendarId="primary", eventId=event_id).execute()
    except HttpError:
        pass
