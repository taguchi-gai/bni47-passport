# BNI 47 Passport Program - デプロイメントガイド

## 無料デプロイメント: Google Cloud Run

### 前提条件
- Google Cloud Console にアクセス可能
- `gcloud` CLI インストール済み（オプション）
- GitHub リポジトリ: https://github.com/taguchi-gai/bni47-passport

---

## デプロイ手順

### 1. GCP プロジェクトの設定

#### 1.1 プロジェクト作成（初回のみ）
```bash
gcloud projects create bni47-passport --name="BNI Chapter 47 Passport"
gcloud config set project bni47-passport
```

#### 1.2 必要な API を有効化
```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com
```

---

### 2. Cloud SQL (PostgreSQL) セットアップ

#### 2.1 Cloud SQL インスタンス作成
```bash
gcloud sql instances create bni47-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=your-secure-password
```

#### 2.2 データベース作成
```bash
gcloud sql databases create bni47_passport \
  --instance=bni47-db
```

#### 2.3 Cloud SQL Proxy ユーザー作成
```bash
gcloud sql users create cloud-run-user \
  --instance=bni47-db \
  --password=your-secure-password
```

---

### 3. Service Account 作成（GitHub Actions 用）

#### 3.1 Service Account 作成
```bash
gcloud iam service-accounts create github-deployer \
  --display-name="GitHub Cloud Run Deployer"
```

#### 3.2 Cloud Run 権限付与
```bash
gcloud projects add-iam-policy-binding bni47-passport \
  --member=serviceAccount:github-deployer@bni47-passport.iam.gserviceaccount.com \
  --role=roles/run.admin

gcloud projects add-iam-policy-binding bni47-passport \
  --member=serviceAccount:github-deployer@bni47-passport.iam.gserviceaccount.com \
  --role=roles/iam.serviceAccountUser
```

#### 3.3 Service Account キー生成
```bash
gcloud iam service-accounts keys create ~/gcp-key.json \
  --iam-account=github-deployer@bni47-passport.iam.gserviceaccount.com
```

---

### 4. GitHub Secrets 設定

GitHub リポジトリ設定 → Secrets and variables → Actions で、以下を追加：

| Secret 名 | 値 | 説明 |
|-----------|-----|------|
| `GCP_SA_KEY` | `gcp-key.json` の内容（JSON 全文） | Service Account キー |
| `SECRET_KEY` | JWT シークレット (backend/.env から) | JWT シークレット |
| `GOOGLE_CLIENT_ID` | Google Calendar API クライアント ID (backend/.env から) | Google Calendar API クライアント ID |
| `GOOGLE_CLIENT_SECRET` | Google Calendar API シークレット (backend/.env から) | Google Calendar API シークレット |
| `GOOGLE_REFRESH_TOKEN` | Google Calendar リフレッシュトークン (backend/.env から) | Google Calendar リフレッシュトークン |
| `SMTP_EMAIL` | メールアドレス (backend/.env から) | Gmail メールアドレス |
| `SMTP_APP_PASSWORD` | Gmail App Password (backend/.env から) | Gmail App Password |
| `FRONTEND_URL` | `https://bni-chapter47-passport-app.web.app` | フロントエンド URL |
| `GCP_PROJECT_ID` | `bni47-passport` | GCP プロジェクト ID |

---

### 5. Cloud Run へのデプロイ（手動）

#### オプション A: Cloud Console から

1. https://console.cloud.google.com/run に移動
2. **Cloud Run サービスを作成** をクリック
3. 以下を設定：
   - **サービス名**: `bni47-api`
   - **リージョン**: `us-central1`
   - **コンテナイメージ**: GitHub リポジトリから自動構築
     - GitHub を接続 → `bni47-passport` リポジトリを選択
     - ブランチ: `master`
     - Dockerfile パス: `backend/Dockerfile`
   - **メモリ**: 512MB
   - **CPU**: 1
   - **タイムアウト**: 3600秒
4. **環境変数** タブで、secrets をマウント

#### オプション B: gcloud CLI から

```bash
gcloud run deploy bni47-api \
  --source backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --timeout=3600 \
  --set-env-vars="SECRET_KEY=${SECRET_KEY},GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID},GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET},GOOGLE_REFRESH_TOKEN=${GOOGLE_REFRESH_TOKEN},SMTP_EMAIL=${SMTP_EMAIL},SMTP_APP_PASSWORD=${SMTP_APP_PASSWORD},FRONTEND_URL=${FRONTEND_URL},DATABASE_URL=${DATABASE_URL}"
```

---

### 6. フロントエンド環境変数更新

Cloud Run デプロイ後、以下の情報を確認：
- **Cloud Run サービス URL** (例: `https://bni47-api-xxxxx.run.app`)

`frontend/.env.production` を更新：

```env
VITE_API_URL=https://bni47-api-xxxxx.run.app
```

---

### 7. Firebase フロントエンド再デプロイ

```bash
cd frontend
npm run build
firebase deploy --only hosting
```

---

## トラブルシューティング

### ログ確認
```bash
gcloud run logs read bni47-api --limit 50 --platform managed
```

### Cloud Run サービス確認
```bash
gcloud run services describe bni47-api --platform managed --region us-central1
```

### Cloud SQL 接続確認
```bash
gcloud sql connect bni47-db --user=root
```

---

## コスト見積もり

**無料ティア**（月額）:
- Cloud Run: 最初の 180 万リクエスト/月（無料）
- Cloud SQL: 最初の 1 つのインスタンス（db-f1-micro）（無料）

**有料リソース**（利用量に応じて）:
- Cloud Run: リクエスト数、CPU/メモリ使用時間
- Cloud SQL: インスタンス時間、ストレージ

---

## 参考資料

- [Cloud Run ドキュメント](https://cloud.google.com/run/docs)
- [Cloud SQL ドキュメント](https://cloud.google.com/sql/docs)
- [Cloud Run で Python アプリをデプロイ](https://cloud.google.com/run/docs/quickstarts/build-and-deploy)
