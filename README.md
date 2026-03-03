# Aira | 余白便り

AI占い鑑定Webサービス。

## プラン仕様

| 機能 | 無料プラン | 有料プラン |
|------|-----------|-----------|
| Daily（余白便り） | 無制限（ログイン不要） | 同左 |
| 鑑定（相談） | 3回/日 | 回数増（TBD） |
| followup | 不可 | 利用可 |

- Daily は zodiacKey x JST日付 でキャッシュ（1日最大12生成）
- 鑑定の日次上限は `src/lib/constants.ts` の `FREE_PER_DAY` で管理

## 技術スタック

- Next.js 15 (App Router) / TypeScript
- Prisma + PostgreSQL (Supabase)
- Vercel AI SDK + Anthropic Claude
- Supabase Auth
- Upstash Redis（レート制限）
- Stripe（課金）
- Vercel（ホスティング）

## セットアップ

```bash
cp .env.example .env.local   # 環境変数を設定
npm install
npx prisma db push            # DBスキーマ反映
npm run dev
```

## 本番運用

### デプロイ

- `main` ブランチへの push で Vercel が自動デプロイ
- ビルド: `prisma generate && next build`
- DBスキーマ変更時は手動で `prisma db push` を実行（ビルドには含めない）

### DB スキーマ変更手順

```bash
# ローカルから本番DBに向けて実行（DIRECT_URL を使用）
DATABASE_URL="<本番DIRECT_URL>" DIRECT_URL="<本番DIRECT_URL>" npx prisma db push
```

または Supabase SQL Editor で直接 DDL を実行。

---

## 運用チェックリスト

### デプロイ後の確認

- [ ] `curl -sD - "https://uranai-ten.vercel.app/api/daily?zodiac=aries" | head -15`
  - HTTP 200 が返ること
  - `x-cache: hit` または `x-cache: miss` ヘッダがあること
- [ ] `https://uranai-ten.vercel.app/daily` を開く
  - 12星座ボタンが表示されること
  - 星座タップ → 結果が表示されること
- [ ] `https://uranai-ten.vercel.app/app` にログインして鑑定実行
  - 200 で結果が返ること
  - 「本日の残り回数」が正しくカウントダウンされること

### daily_fortunes テーブル確認

```sql
-- Supabase SQL Editor で実行
SELECT count(*) FROM daily_fortunes;
SELECT daily_key, zodiac_key, created_at FROM daily_fortunes ORDER BY created_at DESC LIMIT 10;
```

- `daily_key` が JST 日付（例: `2026-03-04`）であること
- 同じ `daily_key` + `zodiac_key` の組み合わせが重複していないこと

---

## /api/daily 異常時の切り分け

### 500 エラー

| 原因 | 確認方法 | 対処 |
|------|---------|------|
| daily_fortunes テーブルが存在しない | Supabase SQL Editor で `SELECT 1 FROM daily_fortunes LIMIT 1;` → エラーなら未作成 | `prisma db push` またはCREATE TABLE を実行 |
| DATABASE_URL 未設定/誤り | Vercel Dashboard → Settings → Environment Variables で確認 | 正しい接続文字列を設定 → Redeploy |
| ANTHROPIC_API_KEY 失効 | Vercel Logs で `401` や `authentication` エラーを検索 | Anthropic Console で新規キー発行 → Vercel env 更新 → Redeploy |
| Prisma Client 不一致 | Vercel Logs で `PrismaClientInitializationError` を検索 | Redeploy（`prisma generate` がビルド時に走る） |

### 503 エラー（generation_incomplete）

| 原因 | 確認方法 | 対処 |
|------|---------|------|
| トークン上限到達 | Vercel Logs で `AI generation incomplete` を検索 | `constants.ts` の `MAX_TOKENS_DAILY`（現在 900）を引き上げて再デプロイ |

### 429 エラー（rate_limited）

| 原因 | 確認方法 | 対処 |
|------|---------|------|
| IP レート制限超過 | 正常動作（5分間に10リクエスト超過） | 待機で自動解消。調整は `constants.ts` の `RATE_LIMIT_REQUESTS` / `RATE_LIMIT_WINDOW_SEC` |
| Upstash Redis 障害 | Upstash Console でステータス確認 | Redis 未設定時はレート制限が無効化されるため、一時的に env を外すことで回避可能 |

### Vercel Logs の確認方法

```bash
# Vercel CLI
vercel logs uranai-ten.vercel.app --since 1h

# または Vercel Dashboard → Deployments → Functions → Logs
# フィルタ: "[/api/daily]" で検索
```

ログ出力パターン:
- `[/api/daily] AI generation incomplete` → 503 の原因
- `[/api/daily] AI generation failed:` → 500 の原因（後続にエラー詳細）
