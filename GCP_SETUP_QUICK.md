# GCP Cloud Run デプロイ - クイックセットアップ

## ステップ 1: GCP プロジェクト作成・API有効化（5分）

```bash
# ターミナルで実行（gcloud CLI インストール必須）
gcloud projects create bni47-passport --name="BNI Chapter 47 Passport"
gcloud config set project bni47-passport
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
```

**または** GCP Console で:
1. https://console.cloud.google.com に移動
2. 新規プロジェクト作成: `bni47-passport`
3. APIs & Services → Cloud Run, Cloud Build を有効化

---

## ステップ 2: Service Account 作成・キー取得（3分）

```bash
gcloud iam service-accounts create github-deployer \
  --display-name="GitHub Cloud Run Deployer"

gcloud projects add-iam-policy-binding bni47-passport \
  --member=serviceAccount:github-deployer@bni47-passport.iam.gserviceaccount.com \
  --role=roles/run.admin

gcloud iam service-accounts keys create ~/gcp-key.json \
  --iam-account=github-deployer@bni47-passport.iam.gserviceaccount.com
```

**または** GCP Console で:
1. Service Accounts → Create Service Account
2. `github-deployer` という名前で作成
3. Role: Cloud Run Admin を付与
4. Keys タブで JSON キーを作成・ダウンロード

---

## ステップ 3: GitHub Secrets 登録（2分）

リポジトリ Settings → Secrets and variables → Actions で、以下を追加:

| Name | Value |
|------|-------|
| `GCP_SA_KEY` | gcp-key.json の全内容（JSON） |
| `GCP_PROJECT_ID` | `bni47-passport` |
| `SECRET_KEY` | `bni47passport-super-secret-jwt-key-2026` |
| `GOOGLE_CLIENT_ID` | backend/.env から |
| `GOOGLE_CLIENT_SECRET` | backend/.env から |
| `GOOGLE_REFRESH_TOKEN` | backend/.env から |
| `SMTP_EMAIL` | `taguchi.aix@gmail.com` |
| `SMTP_APP_PASSWORD` | backend/.env から |
| `FRONTEND_URL` | `https://bni-chapter47-passport-app.web.app` |

---

## ステップ 4: Cloud Run へのデプロイ（1分）

### 方法 A: GitHub Actions 自動デプロイ

```bash
# リポジトリの backend/Dockerfile に変更をプッシュ
# GitHub Actions が自動的に Cloud Run にデプロイ
git push origin master
```

### 方法 B: 手動デプロイ（gcloud CLI）

```bash
gcloud run deploy bni47-api \
  --source backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="SECRET_KEY=...,GOOGLE_CLIENT_ID=..., ..."
```

### 方法 C: GCP Console から

https://console.cloud.google.com/run → Create Service
- Container image: GitHub Actions で自動構築
- Dockerfile path: `backend/Dockerfile`

---

## ステップ 5: フロントエンド API URL 更新（1分）

Cloud Run デプロイ後、サービス URL を確認:

```bash
gcloud run services describe bni47-api \
  --platform managed --region us-central1
```

例: `https://bni47-api-xxxxx.run.app`

`frontend/.env.production` を更新:

```env
VITE_API_URL=https://bni47-api-xxxxx.run.app
```

---

## ステップ 6: Firebase フロントエンド再デプロイ（2分）

```bash
cd frontend
npm run build
firebase deploy --only hosting
```

---

## トラブルシューティング

**Cloud Run デプロイ失敗時:**
```bash
gcloud run logs read bni47-api --limit 20
```

**Service Account 権限不足:**
```bash
gcloud projects add-iam-policy-binding bni47-passport \
  --member=serviceAccount:github-deployer@bni47-passport.iam.gserviceaccount.com \
  --role=roles/iam.serviceAccountUser
```

---

## 次のステップ

- ✅ GitHub リポジトリ作成
- ⏳ GCP Cloud Run デプロイ（このガイド）
- ⏳ フロントエンド API URL 更新
- ⏳ テスト・本番稼働

**予想時間**: 15〜30分
