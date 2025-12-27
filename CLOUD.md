# CLOUD.md — TaskMD（仮）クラウド/インフラ設計指針

本書は、TaskMD（仮）を **低コスト・自前運用（Redmine的）** で立ち上げ、Markdown中心の運用（AI引き渡し含む）を安定して回すためのクラウド/インフラ設計を固定します。  
「まずは1台で堅牢に」→「必要なら水平分割へ」の順で拡張できる構成を前提とします。

---

## 1. ゴール

- **無料〜低コストで運用可能**（VPS 1台 + Docker Compose を第一候補）
- **Markdownが唯一の真実**：タスク本文はMarkdown原文のまま保管・差分管理可能
- **AI引き渡しが一級**：Task Pack生成のためのAPI/テンプレ管理がシンプル
- **バックアップが容易**：DB/添付/テンプレが復旧手順込みで管理できる
- **セキュリティ最小要件**：TLS、認証、レート制限、監査ログ（最低限）

---

## 2. 推奨アーキテクチャ（段階別）

### 2.1 フェーズ1（推奨）：単一VPS / Docker Compose
- Nginx（リバースプロキシ / TLS終端）
- API（TaskMD Server）
- Web（SPA配信 or Nginxで静的配信）
- PostgreSQL（永続データ）
- （任意）Redis（セッション/レート制限/ジョブ）
- （任意）Meilisearch（全文検索：text/title/bodyの高速化）
- （任意）MinIO（S3互換：添付ファイル/画像をDBから分離）

> フェーズ1の狙い：運用面の摩擦を最小にし、機能開発に集中する。

### 2.2 フェーズ2：API水平スケール（Web/App分離）
- Nginx → APIを複数レプリカへ
- DBは単体 + バックアップ強化（必要ならレプリカ）
- 添付はS3互換へ移行（MinIO→マネージドS3など）

### 2.3 フェーズ3：クラウドマネージド（任意）
- AWS例：
  - ALB + ECS/Fargate（API/Web）
  - RDS Postgres
  - S3（添付）
  - CloudWatch / OpenSearch（ログ/検索）
- ただし初期は過剰になりやすいので「必要になったら」で十分。

---

## 3. コンポーネント責務

### 3.1 Web（フロント）
- SavedView（クエリ）編集・保存、タスク閲覧/編集、Task Packコピー導線
- 静的配信（Nginx）またはWebコンテナ（Node→ビルド→静的）

### 3.2 API（サーバ）
- Markdown原文の保存・取得・差分
- クエリ（文字列）→ AST → 正規化 → 検索の実行
- Task Pack生成（テンプレ差し込み + AC抽出）
- 認証・認可（プロジェクト/メンバー）
- 監査ログ（最低限：誰がいつ何を変えたか）

### 3.3 DB（PostgreSQL）
- タスク（markdown_bodyは text）
- メタ（status/priority/assignee/due 等は索引用カラム）
- SavedView（raw_query/normalized_query/presentation）
- 監査ログ（イベント）

### 3.4 検索（任意）
- フェーズ1は PostgreSQL の全文検索でも成立
- 本格化したら Meilisearch / OpenSearch を採用

### 3.5 添付（任意）
- 画像/ファイルは S3互換（MinIO → S3移行可能）
- タスク本文にリンクとして参照

---

## 4. データの「唯一の真実」と保存戦略

TaskMDは「Markdownが唯一の真実」を満たすため、原文を常に保持します。

### 4.1 原文保持
- `task.markdown_body` は **整形しない**（原文を保存）
- UI編集は最終的に原文へ反映（WYSIWYGで破壊しない）

### 4.2 差分/履歴（推奨）
- `task_revisions` テーブルで revision を保存（差分でも全量でも）
- 監査ログ（誰が/いつ/何を）を別テーブルで保持

### 4.3 Git同期（将来拡張）
- 「DBが正」から開始し、必要になったら Git へエクスポート/同期
- 競合解決が難しいため、初期から Git を正にするより実務的です

---

## 5. ネットワーク・ドメイン設計（例）

### 5.1 推奨URL
- `https://taskmd.example.com`（Web）
- `https://taskmd-api.example.com`（API）
- 同一ドメイン配下（`/api`）でも良いが、CORS/CSRFの設計を簡単にするなら分離が楽です

### 5.2 TLS
- Let’s Encrypt（自動更新）
- Nginxで終端
- HSTS（本番のみ）を有効化

### 5.3 セキュリティヘッダ（推奨）
- `Content-Security-Policy`（段階導入）
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`（必要に応じて）
- `Referrer-Policy: no-referrer`
- `Permissions-Policy`（最小）

---

## 6. 認証・認可（クラウド要件）

### 6.1 認証方式（推奨優先順）
1. OIDC（Google/GitHub等）※運用が安定
2. メール+パスワード（自前）※MVPでも可能
3. 共有鍵（Admin用途）※限定用途のみ

### 6.2 認可
- Project単位：owner / maintainer / member / viewer
- SavedView：個人（private）/ プロジェクト共有（shared）

### 6.3 レート制限
- APIに `ip + user` 単位の制限（Nginxでもアプリでも可）
- `Task Pack生成` はやや重いので上限を別枠にする

---

## 7. 永続化（ボリューム設計）

最低限、以下が永続化対象です。

- Postgres: `/var/lib/postgresql/data`
- MinIO（任意）: `/data`
- テンプレ（Task Pack）: できれば **イメージ内に同梱**（変更頻度が高いならボリュームでも可）
- ログ: コンテナログは stdout（ローテーションはDocker側 or ログ基盤）

---

## 8. バックアップ & DR（復旧）

### 8.1 バックアップ対象
- DB（最重要）
- 添付（S3互換を使うならバケット）
- テンプレ（Git管理していれば不要）

### 8.2 推奨手順（例）
- DB：毎日 `pg_dump`（圧縮）＋世代管理（7日/30日）
- 添付：バケットのライフサイクル or rsyncミラー
- 復旧手順は **必ず演習**（最低：月1回）

### 8.3 復旧の定義
- RPO：1日（初期）
- RTO：数時間（初期）
- 本格化したらRPO/RTOを短縮（WAL/レプリカ）

---

## 9. 監視・ログ（運用の最低ライン）

### 9.1 ヘルスチェック
- API：`/healthz`（DB接続含む）
- Web：静的なら不要、アプリなら `GET /` でOK

### 9.2 監視（フェーズ1推奨）
- コンテナ死活（restart policy）
- CPU/メモリ/ディスク（node exporter等）
- DBの接続数/ディスク/遅いクエリ
- エラーレート（API 5xx/4xxの増加）

### 9.3 ログ
- API：構造化ログ（json推奨）
- 監査ログ：DBに永続（重要）
- 必要なら Loki / OpenSearch へ

---

## 10. CI/CD（最小で回るデプロイ）

### 10.1 推奨（VPS / Compose）
- GitHub Actions：
  - テスト → ビルド → イメージpush（GHCRなど）
  - VPSへSSH → `docker compose pull && up -d`
  - マイグレーション実行（手順固定）

### 10.2 ロールバック
- イメージはタグで世代管理（`release-YYYYMMDD-xxxx`）
- DBマイグレーションは **後方互換** を意識（ロールバック難易度を下げる）

---

## 11. docker-compose（本番）スケルトン例

> 実際の値（ドメイン/秘密情報）は環境変数で注入します。  
> Composeはあくまで雛形で、プロジェクトの実装に合わせて調整してください。

```yaml
services:
  nginx:
    image: nginx:stable
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deploy/nginx/conf.d:/etc/nginx/conf.d:ro
      - ./deploy/nginx/letsencrypt:/etc/letsencrypt:ro
      - ./deploy/nginx/www:/var/www/html:ro
    depends_on:
      - api
      - web
    restart: unless-stopped

  web:
    image: ghcr.io/your-org/taskmd-web:latest
    environment:
      - VITE_API_BASE=https://taskmd-api.example.com
    restart: unless-stopped

  api:
    image: ghcr.io/your-org/taskmd-api:latest
    environment:
      - DATABASE_URL=postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/taskmd?sslmode=disable
      - AUTH_MODE=oidc
      - OIDC_ISSUER=...
      - OIDC_CLIENT_ID=...
      - OIDC_CLIENT_SECRET=...
      - TASK_PACK_TEMPLATES_DIR=/app/templates
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:16
    environment:
      - POSTGRES_DB=taskmd
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    restart: unless-stopped

  # 任意：全文検索
  # meilisearch:
  #   image: getmeili/meilisearch:v1
  #   environment:
  #     - MEILI_MASTER_KEY=${MEILI_MASTER_KEY}
  #   volumes:
  #     - ./data/meili:/meili_data
  #   restart: unless-stopped

  # 任意：添付
  # minio:
  #   image: minio/minio
  #   command: server /data --console-address ":9001"
  #   environment:
  #     - MINIO_ROOT_USER=${MINIO_ROOT_USER}
  #     - MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}
  #   volumes:
  #     - ./data/minio:/data
  #   restart: unless-stopped
