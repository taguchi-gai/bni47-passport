"""
Google OAuth refresh token acquisition script.
Run once to get the refresh token, then save to .env as GOOGLE_REFRESH_TOKEN.
"""
import os
import sys
import json

# Force UTF-8 output to avoid cp932 errors on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)

from google_auth_oauthlib.flow import InstalledAppFlow
from dotenv import load_dotenv

load_dotenv()

SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/gmail.send",
]

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")

if not CLIENT_ID or not CLIENT_SECRET:
    print("エラー: .env に GOOGLE_CLIENT_ID と GOOGLE_CLIENT_SECRET を設定してください")
    exit(1)

client_config = {
    "installed": {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"],
    }
}

print("=" * 60)
print("BNI パスポート - Google 認証セットアップ")
print("=" * 60)
print("\nブラウザが開きます。システム用Googleアカウントでログインし、")
print("Calendar と Gmail の権限を許可してください。\n")

flow = InstalledAppFlow.from_client_config(client_config, scopes=SCOPES)
creds = flow.run_local_server(port=0, prompt="consent", access_type="offline")

print("\n" + "=" * 60)
print("[OK] 認証成功！以下の値を .env に設定してください：")
print("=" * 60)
print(f"\nGOOGLE_REFRESH_TOKEN={creds.refresh_token}\n")

env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        content = f.read()

    if "GOOGLE_REFRESH_TOKEN=" in content:
        lines = content.splitlines()
        new_lines = []
        for line in lines:
            if line.startswith("GOOGLE_REFRESH_TOKEN="):
                new_lines.append(f"GOOGLE_REFRESH_TOKEN={creds.refresh_token}")
            else:
                new_lines.append(line)
        content = "\n".join(new_lines) + "\n"
    else:
        content += f"\nGOOGLE_REFRESH_TOKEN={creds.refresh_token}\n"

    with open(env_path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"[OK] .env ファイルを自動更新しました: {env_path}")
else:
    print(f"[!!] .env ファイルが見つかりません。手動で上記の値を設定してください。")
