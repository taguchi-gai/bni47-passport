from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from database import engine, SessionLocal
import models
from routers import auth, availability, bookings, admin, mentors

load_dotenv()

models.Base.metadata.create_all(bind=engine)


def auto_seed():
    db = SessionLocal()
    try:
        if db.query(models.User).count() == 0:
            from seed import run as seed_run
            seed_run(db)
    except Exception as e:
        print(f"Auto-seed error: {e}")
    finally:
        db.close()


auto_seed()

app = FastAPI(title="BNI 47∞ パスポートプログラム API")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(availability.router)
app.include_router(bookings.router)
app.include_router(admin.router)
app.include_router(mentors.router)


@app.get("/")
async def root():
    return {"message": "BNI 47∞ パスポートプログラム API v1.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/health/email")
async def health_email():
    """Brevo経由のメール送信疎通確認用の一時的な診断エンドポイント"""
    from services.email_service import send_email, SMTP_EMAIL, BREVO_API_KEY
    try:
        await send_email(SMTP_EMAIL, "BNIパスポート メール疎通テスト", "<p>テストメールです。届いていれば設定は正常です。</p>")
        return {
            "status": "ok",
            "smtp_email_set": bool(SMTP_EMAIL),
            "brevo_api_key_set": bool(BREVO_API_KEY),
        }
    except Exception as e:
        return {
            "status": "error",
            "detail": str(e),
            "smtp_email_set": bool(SMTP_EMAIL),
            "brevo_api_key_set": bool(BREVO_API_KEY),
        }


@app.get("/health/google")
async def health_google():
    """
    Google refresh_token を定期的に「使用」して失効を防ぐためのヘルスチェック。
    Calendar API を軽い読み取り操作で呼び出すことで、トークンをアクティブに保つ。
    calendar.events スコープで呼べる events().list() を使う。
    """
    try:
        from services.google_calendar import _get_credentials
        from googleapiclient.discovery import build
        creds = _get_credentials()
        service = build("calendar", "v3", credentials=creds)
        # calendar.events スコープで呼べる軽量な API（primary カレンダーの最新1件だけ取得）
        service.events().list(calendarId="primary", maxResults=1).execute()
        return {"status": "ok", "google": "refresh_token active"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
