# TaskMD Database Schema

このディレクトリには、TaskMDプロジェクトのPostgreSQLデータベーススキーマとマイグレーションファイルが含まれています。

## ディレクトリ構成

```
db/
├── schema/
│   ├── 001_initial_schema.sql      # 初期スキーマ（テーブル、インデックス、トリガー）
│   ├── 002_default_views.sql       # デフォルトSavedView生成
│   └── ...                         # 将来のマイグレーション
├── seeds/
│   └── dev_seed.sql                # 開発用サンプルデータ
└── README.md                       # このファイル
```

## データベース設計の原則

### 1. Markdownが唯一の真実
- `tasks.markdown_body` は原文を**そのまま保存**（整形しない）
- UI編集は最終的に原文へ反映
- 変更履歴は `task_revisions` テーブルで全量保持

### 2. フィルタ用メタデータの正規化
以下のフィールドは検索・フィルタリングのために正規化されたカラムとして保存：
- `status`（task_status enum）
- `priority`（task_priority enum）
- `assignees`（TEXT配列）
- `labels`（TEXT配列）
- `start_date`、`due_date`（DATE型）

### 3. 拡張性の確保
- `extra_meta`（JSONB）：将来の拡張用メタデータ
- `presentation`（JSONB）：SavedViewの表示設定
- `detail`（JSONB）：監査ログの詳細情報

## 主要テーブル

### Core Tables

#### `users`
ユーザー情報を管理。OIDC認証とメール/パスワード認証の両方に対応。

#### `projects`
プロジェクト情報を管理。visibility設定により、private/team/publicを制御。

#### `project_members`
プロジェクトとユーザーの関連を管理。role（owner/maintainer/member/viewer）で権限を制御。

#### `tasks`
タスクの本体。Markdown原文（`markdown_body`）と検索用メタデータを保持。
- 全文検索用の `search_vector` は自動生成（トリガー）
- 更新時に自動的に `task_revisions` へ履歴を保存

#### `task_relations`
タスク間の関係を管理（parent/child、blocks/blocked_by、related等）。

#### `saved_views`
保存されたクエリと表示設定。
- `raw_query`：ユーザーが入力したクエリ文字列
- `normalized_query`：正規化されたクエリ（安定性のため）
- `presentation`：sort/group/cols/view/limitなどの表示設定

### History & Audit Tables

#### `task_revisions`
タスクの全変更履歴を保持。
- `markdown_body`：変更前の本文
- `meta_snapshot`：変更前のメタデータ（JSONB）

#### `audit_logs`
すべての重要なアクションを記録。
- 誰が（`actor_user_id`）
- いつ（`created_at`）
- 何を（`action`、`target_type`、`target_id`）
- どのように（`detail` JSONB）

### Optional Tables（将来拡張用）

#### `task_comments`
タスクへのコメント機能。

#### `task_attachments`
添付ファイルのメタデータ（実体はS3/MinIOに保存）。

## データ型（Enum）

### `task_status`
- `open` - 未着手
- `in_progress` - 着手中
- `review` - レビュー/確認待ち
- `blocked` - 進行不能
- `done` - 完了
- `archived` - アーカイブ済み

### `task_priority`
- `P0` - 緊急
- `P1` - 今すぐ重要
- `P2` - 計画内重要
- `P3` - 余裕があれば
- `P4` - いつか

### `project_role`
- `owner` - オーナー（全権限）
- `maintainer` - メンテナー（タスク編集・削除可）
- `member` - メンバー（タスク作成・編集可）
- `viewer` - 閲覧者（読み取り専用）

### `view_scope`
- `private` - 個人ビュー
- `shared` - プロジェクト共有ビュー

## トリガーとオートメーション

### 自動更新トリガー
- `updated_at` カラムは更新時に自動的に現在時刻に設定

### 全文検索ベクトル
- `tasks.search_vector` はタスクの作成・更新時に自動生成
- title（重み A）、markdown_body（重み B）、labels（重み C）を結合

### リビジョン自動作成
- タスク更新時に、以下のいずれかが変更された場合、自動的にリビジョンを作成：
  - `markdown_body`
  - `status`
  - `priority`
  - `assignees`
  - `title`

### デフォルトビュー自動生成
- 新規プロジェクト作成時、自動的に8つの標準ビューを生成：
  1. My Work (Today)
  2. My Work (This Week)
  3. Review Queue
  4. Blocked
  5. P0/P1 Open
  6. Overdue
  7. All Open
  8. Recently Completed

## セットアップ手順

### 1. データベース作成

```bash
# PostgreSQL 16推奨
createdb taskmd
```

### 2. スキーマ適用

```bash
# 初期スキーマ
psql -d taskmd -f db/schema/001_initial_schema.sql

# デフォルトビュー
psql -d taskmd -f db/schema/002_default_views.sql
```

### 3. 開発用サンプルデータ（オプション）

```bash
psql -d taskmd -f db/seeds/dev_seed.sql
```

## Docker Compose での利用

`docker-compose.yml` で定義されたPostgreSQLコンテナを使用する場合：

```bash
# コンテナ起動
docker compose up -d postgres

# スキーマ適用
docker compose exec postgres psql -U postgres -d taskmd -f /docker-entrypoint-initdb.d/001_initial_schema.sql
docker compose exec postgres psql -U postgres -d taskmd -f /docker-entrypoint-initdb.d/002_default_views.sql
```

または、`docker-entrypoint-initdb.d/` にマウントすることで初回起動時に自動実行：

```yaml
postgres:
  volumes:
    - ./db/schema:/docker-entrypoint-initdb.d:ro
```

## マイグレーション管理

将来的には、以下のツールの使用を推奨：
- **golang-migrate** - Goプロジェクトとの親和性が高い
- **Flyway** - エンタープライズ向け
- **sqitch** - Git風のマイグレーション管理

現時点では、連番付きSQLファイル（`001_`, `002_`, ...）で管理。

## バックアップとリストア

### バックアップ

```bash
# 全データベース
pg_dump -U postgres -d taskmd -F c -f taskmd_backup.dump

# スキーマのみ
pg_dump -U postgres -d taskmd --schema-only -f taskmd_schema.sql

# データのみ
pg_dump -U postgres -d taskmd --data-only -f taskmd_data.sql
```

### リストア

```bash
# カスタムフォーマット
pg_restore -U postgres -d taskmd -c taskmd_backup.dump

# SQLファイル
psql -U postgres -d taskmd -f taskmd_backup.sql
```

## パフォーマンス最適化

### インデックス戦略

主要なインデックスは既に定義済み：
- 単一カラム：`status`, `priority`, `due_date`, `created_at`, `updated_at`
- 複合インデックス：`(project_id, status)`, `(project_id, priority)`, `(status, priority)`
- GIN インデックス：`assignees`, `labels`, `search_vector`

### 全文検索

全文検索には以下の方法を推奨：
1. **初期（MVP）**: PostgreSQLの `search_vector` （既に実装済み）
2. **中規模**: Meilisearch（軽量・高速）
3. **大規模**: OpenSearch / Elasticsearch

### クエリ最適化

頻繁に実行されるクエリ例：

```sql
-- 担当者と期限でフィルタ
SELECT * FROM tasks
WHERE project_id = 'proj-1'
  AND 'user-1' = ANY(assignees)
  AND due_date <= CURRENT_DATE
  AND status NOT IN ('done', 'archived')
ORDER BY priority DESC, due_date ASC;

-- 全文検索
SELECT * FROM tasks
WHERE search_vector @@ to_tsquery('english', 'markdown & parser')
ORDER BY ts_rank(search_vector, to_tsquery('english', 'markdown & parser')) DESC;
```

## 監視

### 重要なメトリクス

```sql
-- テーブルサイズ
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- インデックス利用状況
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- 遅いクエリ（pg_stat_statements拡張が必要）
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

## セキュリティ

### アクセス制御

本番環境では、以下のようにロールを分離することを推奨：

```sql
-- アプリケーション用ロール（読み書き）
CREATE ROLE taskmd_app WITH LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE taskmd TO taskmd_app;
GRANT USAGE ON SCHEMA public TO taskmd_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO taskmd_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO taskmd_app;

-- 読み取り専用ロール（レポート等）
CREATE ROLE taskmd_readonly WITH LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE taskmd TO taskmd_readonly;
GRANT USAGE ON SCHEMA public TO taskmd_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO taskmd_readonly;
```

### SSL接続

本番環境では必ずSSL接続を使用：

```
DATABASE_URL=postgres://user:pass@host:5432/taskmd?sslmode=require
```

## トラブルシューティング

### よくある問題

#### 1. 拡張機能がインストールできない

```sql
-- スーパーユーザーで実行
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

#### 2. マイグレーションが失敗する

トランザクションを使用してロールバック可能にする：

```bash
psql -d taskmd -f migration.sql --single-transaction
```

#### 3. パフォーマンスが遅い

```sql
-- VACUUM と ANALYZE を実行
VACUUM ANALYZE;

-- 特定のテーブルのみ
VACUUM ANALYZE tasks;
```

## 参考資料

- [PostgreSQL公式ドキュメント](https://www.postgresql.org/docs/)
- [Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [Indexing Best Practices](https://www.postgresql.org/docs/current/indexes.html)
