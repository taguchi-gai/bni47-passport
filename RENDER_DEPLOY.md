# Render.com へのデプロイメント - クイックガイド

> **無料範囲**: 月 750 時間（無制限のアップタイム）、PostgreSQL データベース

---

## ステップ 1: Render アカウント作成・GitHub 連携（2分）

1. https://render.com にアクセス
2. **Sign up** → GitHub でサインアップ
3. GitHub リポジトリへのアクセスを許可

---

## ステップ 2: Web Service 作成（2分）

1. Render Dashboard へ移動
2. **New +** → **Web Service**
3. リポジトリ選択: `taguchi-gai/bni47-passport`
4. 以下を設定：

| 項目 | 値 |
|------|-----|
| **Name** | `bni47-api` |
| **Environment** | `Python 3` |
| **Root Directory** | `backend` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port 10000` |
| **Plan** | `Free` |
| **Region** | `Singapore` (または `Oregon`) |

5. **Create Web Service** をクリック

---

## ステップ 3: 環境変数設定（2分）

デプロイ中に以下を Environment Variables に設定：

```
SECRET_KEY=bni47passport-super-secret-jwt-key-2026
GOOGLE_CLIENT_ID=329812578380-1ljpbeb70co7ho2m5986ej5blvdm251a.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<backend/.env から>
GOOGLE_REFRESH_TOKEN=<backend/.env から>
SMTP_EMAIL=taguchi.aix@gmail.com
SMTP_APP_PASSWORD=<backend/.env から>
FRONTEND_URL=https://bni-chapter47-passport-app.web.app
DATABASE_URL=<自動生成される PostgreSQL URL>
```

---

## ステップ 4: PostgreSQL データベース追加（オプション）

> SQLite から PostgreSQL に切り替える場合

1. **New +** → **PostgreSQL**
2. **Name**: `bni47-db`
3. **Plan**: `Free`
4. 作成 → DATABASE_URL を Web Service に設定

---

## ステップ 5: デプロイ確認（1分）

1. Render Dashboard で `bni47-api` を確認
2. **Logs** タブで以下のメッセージを確認：
   ```
   Uvicorn running on 0.0.0.0:10000
   ```
3. Service URL を確認（例: `https://bni47-api-xxxxx.onrender.com`）

---

## ステップ 6: フロントエンド API URL 更新（1分）

`frontend/.env.production` を更新：

```env
VITE_API_URL=https://bni47-api-xxxxx.onrender.com
```

---

## ステップ 7: Firebase フロントエンド再デプロイ（2分）

```bash
cd frontend
npm run build
firebase deploy --only hosting
```

---

## トラブルシューティング

### デプロイが失敗する場合

**ログを確認:**
1. Render Dashboard → `bni47-api` → **Logs** タブ
2. エラーメッセージを確認

**よくある原因:**
- Python バージョン不一致 → Build Command で指定
- requirements.txt が見つからない → Root Directory を `backend` に設定
- 環境変数不足 → 未設定の変数を確認

### Free プランの注意

- **スリープモード**: 15分アイドル時にスリープ
- **コールドスタート**: 起動に 1-2 分かかる場合あり
- **回避策**: Ping サービス（UptimeRobot 等）で定期的にアクセス

---

## Render 無料プランの制限

| 項目 | 制限 |
|------|------|
| Web Service | 月 750 時間（無制限 uptime） |
| PostgreSQL | 無料（小規模のみ） |
| 転送量 | 無制限 |
| メモリ | 0.5GB |
| CPU | 共有 |

---

## 参考資料

- [Render ドキュメント](https://render.com/docs)
- [Render Python デプロイ](https://render.com/docs/deploy-python)
- [Render PostgreSQL](https://render.com/docs/databases)

---

## 次のステップ

- ✅ GitHub リポジトリ作成
- ✅ Render Web Service デプロイ（このガイド）
- ✅ フロントエンド API URL 更新
- ✅ Firebase 再デプロイ
- ⏳ テスト・本番稼働

**予想時間**: 10分
