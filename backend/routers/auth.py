from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
import os
from dotenv import load_dotenv
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

from database import get_db
import models
import auth as auth_utils

load_dotenv()

router = APIRouter(prefix="/api/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

SCOPES = ["https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile", "openid"]


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    facebook_url: str = ""


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    name: str
    email: str
    role: str


@router.post("/register")
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == req.email).first()
    # パスワード未設定の既存ユーザー（シード投入のみ）は初回パスワード設定として扱う
    needs_password_setup = existing and existing.is_active and not existing.password_hash
    if existing and existing.is_active and existing.password_hash:
        raise HTTPException(status_code=400, detail="このメールアドレスは既に登録されています")

    if existing and (not existing.is_active or needs_password_setup):
        # 過去に削除（無効化）された / シード投入されただけのアカウントを有効化する
        existing.password_hash = auth_utils.get_password_hash(req.password)
        existing.is_active = True
        # 名前は本人入力を尊重（管理者が事前に設定した名前を保持したい場合もあるが、
        # 本人による初回ログイン時の入力を優先する）
        existing.name = req.name
        # 既にメンター/管理者として登録されているならロールは維持、未割当なら new_member
        if not existing.mentor and not existing.new_member:
            existing.role = models.RoleEnum.new_member
            db.add(models.NewMember(
                user_id=existing.id,
                facebook_url=req.facebook_url,
                program_term=12,
            ))
        elif existing.new_member:
            existing.new_member.facebook_url = req.facebook_url
        db.commit()
        db.refresh(existing)
        user = existing
    else:
        user = models.User(
            name=req.name,
            email=req.email,
            password_hash=auth_utils.get_password_hash(req.password),
            role=models.RoleEnum.new_member,
        )
        db.add(user)
        db.flush()

        member = models.NewMember(
            user_id=user.id,
            facebook_url=req.facebook_url,
            program_term=12,
        )
        db.add(member)
        db.commit()
        db.refresh(user)

    token = auth_utils.create_access_token({"sub": str(user.id)})
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.value,
    )


@router.post("/login", response_model=LoginResponse)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form.username).first()
    if not user or not user.password_hash or not auth_utils.verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが正しくありません")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="このアカウントは無効です")

    token = auth_utils.create_access_token({"sub": str(user.id)})
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.value,
    )


def _build_flow():
    return Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [GOOGLE_REDIRECT_URI],
            }
        },
        scopes=SCOPES,
    )


@router.get("/google")
async def google_auth_url():
    """Google認証URL生成（ログイン・登録共通）"""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth未設定")

    flow = _build_flow()
    flow.redirect_uri = GOOGLE_REDIRECT_URI

    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return {"auth_url": auth_url}


@router.get("/google/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    """Google OAuth コールバック - フロントエンドへリダイレクトしてトークンを渡す"""
    from fastapi.responses import RedirectResponse

    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth未設定")

    flow = _build_flow()
    flow.redirect_uri = GOOGLE_REDIRECT_URI
    flow.fetch_token(code=code)

    creds = flow.credentials
    service = build("oauth2", "v2", credentials=creds)
    user_info = service.userinfo().get().execute()

    email = user_info.get("email")
    name = user_info.get("name", email)

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        # 新規ユーザーは new_member として作成（責任者が後でロール変更可）
        user = models.User(name=name, email=email, role=models.RoleEnum.new_member)
        db.add(user)
        db.flush()
        db.add(models.NewMember(user_id=user.id))
        db.commit()
        db.refresh(user)

    token = auth_utils.create_access_token({"sub": str(user.id)})
    # フロントエンドに ?token=... 付きでリダイレクト
    import urllib.parse
    params = urllib.parse.urlencode({
        "token": token,
        "role": user.role.value,
        "name": user.name,
        "user_id": user.id,
    })
    return RedirectResponse(url=f"{FRONTEND_URL}/?{params}#auth-callback")


@router.get("/me")
async def get_me(current_user: models.User = Depends(auth_utils.get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role.value,
    }
