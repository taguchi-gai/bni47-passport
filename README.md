# BNI Chapter 47 Passport Program

フルスタック Web アプリケーション：FastAPI バックエンド + React フロントエンド
- Google Calendar API 統合（自動イベント作成・Meet URL生成）
- Gmail SMTP（自動通知）
- JWT 認証、bcrypt 暗号化
- 複数ロール対応（管理者・メンター・新メンバー）

---

## 🚀 クイックデプロイ

### **Render.com へのワンクリックデプロイ**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=taguchi-gai/bni47-passport)

上記ボタンをクリックして、以下の手順に従います：

1. **Render アカウント** で GitHub ログイン
2. **Web Service** 設定画面で以下を確認：
   - Name: `bni47-api`
   - Environment: `Python 3`
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port 10000`

3. **Environment Variables** を設定：
   ```
   SECRET_KEY=bni47passport-super-secret-jwt-key-2026
   GOOGLE_CLIENT_ID=<backend/.env より>
   GOOGLE_CLIENT_SECRET=<backend/.env より>
   GOOGLE_REFRESH_TOKEN=<backend/.env より>
   SMTP_EMAIL=taguchi.aix@gmail.com
   SMTP_APP_PASSWORD=<backend/.env より>
   FRONTEND_URL=https://bni-chapter47-passport-app.web.app
   ```

4. **Deploy** をクリック
5. デプロイ完了後、サービス URL を確認

---

## 📚 デプロイメントガイド

### 詳細なセットアップ手順

- **[Render.com デプロイ](RENDER_DEPLOY.md)** ← 推奨
- [GCP Cloud Run デプロイ](GCP_SETUP_QUICK.md)
- [本番環境デプロイメント](DEPLOYMENT.md)

---

## 📁 プロジェクト構成

```
bni47-passport/
├── backend/              # FastAPI アプリケーション
│   ├── main.py          # エントリーポイント
│   ├── models.py        # SQLAlchemy モデル
│   ├── database.py      # DB 設定
│   ├── routers/         # API エンドポイント
│   ├── services/        # Google Calendar, Email
│   ├── Dockerfile       # Docker イメージ
│   └── requirements.txt # Python 依存関係
│
├── frontend/            # React + TypeScript
│   ├── src/
│   │   ├── pages/       # ページコンポーネント
│   │   ├── components/  # UI コンポーネント
│   │   ├── api/         # API クライアント
│   │   └── main.tsx     # エントリーポイント
│   ├── vite.config.ts   # Vite 設定
│   └── .env.production  # 本番環境変数
│
└── render.yaml          # Render.com 設定ファイル
```

---

## 🔐 テストアカウント

### 管理者
- **ユーザー**: `taguchi.aix@gmail.com`
- **パスワード**: `admin123`

### 新メンバー
- **ユーザー**: `taguchishunsuke@gmail.com`
- **パスワード**: `member123`

---

## 🛠️ ローカル開発

### バックエンド起動

```bash
cd backend
uv run uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### フロントエンド起動

```bash
cd frontend
npm run dev
# ブラウザで http://localhost:5174 にアクセス
```

---

## 📋 機能一覧

✅ **認証**
- JWT + bcrypt 暗号化
- 3役割システム（admin/mentor/new_member）

✅ **スケジュール管理**
- 週単位カレンダー（8-20時、1時間スロット）
- 新メンバー複数スロット選択
- メンター 1 スロット予約

✅ **Google Calendar 統合**
- 自動イベント作成
- Google Meet URL 自動生成
- リフレッシュトークン無期限化

✅ **Gmail 通知**
- SMTP（App Password 方式）
- 自動メール送信

✅ **ダッシュボード**
- 完了マーク機能
- 進捗状況表示

✅ **管理画面**
- メンバー・プログラム・メンター編集

---

## 🚀 デプロイ状況

| 環境 | URL | ステータス |
|------|-----|-----------|
| フロントエンド | https://bni-chapter47-passport-app.web.app | ✅ Firebase Hosting |
| バックエンド | https://bni47-api-xxxxx.onrender.com | ⏳ Render.com（セットアップ中） |

---

## 📞 サポート

問題が発生した場合、以下を確認してください：

1. **[RENDER_DEPLOY.md](RENDER_DEPLOY.md)** - Render トラブルシューティング
2. **Render Logs** - バックエンド エラーログ
3. **Browser Console** - フロントエンド エラーログ

---

## 📄 ライセンス

Private Project - BNI Chapter 47

---

**最終更新**: 2026年6月22日
