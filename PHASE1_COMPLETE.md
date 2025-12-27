# Phase 1 MVP機能 実装完了

Phase 1の4つの主要機能がすべて実装されました。

## 実装された機能

### 1. Markdownパーサー（YAMLメタデータ抽出）✅

**場所**: `taskai-server/internal/parser/`

**機能**:
- YAMLフロントマター付きMarkdownのパース
- タスクメタデータの抽出と検証
- モデルへの変換
- 受け入れ条件（AC）の抽出
- Markdown生成（編集用）

**主要ファイル**:
- `markdown.go` - パーサー本体
- `markdown_test.go` - テストスイート

**使用例**:
```go
parser := parser.NewMarkdownParser()
parsed, err := parser.Parse(markdownContent)
task, err := parsed.ToTask(projectID)
```

---

### 2. タスクCRUD API✅

**場所**: `taskai-server/internal/`

**実装レイヤー**:
- **Repository** (`repository/task_repository.go`, `project_repository.go`)
  - データベースアクセス
  - CRUD操作
  - フィルタリング
  - 全文検索

- **Service** (`service/task_service.go`, `project_service.go`)
  - ビジネスロジック
  - Markdownパースの統合
  - バリデーション

- **API** (`api/task_handlers.go`, `project_handlers.go`)
  - HTTPハンドラー
  - リクエスト/レスポンス処理
  - エラーハンドリング

**エンドポイント**:

#### Projects
- `GET /api/v1/projects` - プロジェクト一覧
- `POST /api/v1/projects` - プロジェクト作成
- `GET /api/v1/projects/:projectId` - プロジェクト取得
- `PUT /api/v1/projects/:projectId` - プロジェクト更新
- `DELETE /api/v1/projects/:projectId` - プロジェクト削除

#### Tasks
- `GET /api/v1/projects/:projectId/tasks` - タスク一覧（フィルタ対応）
- `POST /api/v1/projects/:projectId/tasks` - タスク作成（Markdown）
- `GET /api/v1/projects/:projectId/tasks/:taskId` - タスク取得
- `PUT /api/v1/projects/:projectId/tasks/:taskId` - タスク更新
- `DELETE /api/v1/projects/:projectId/tasks/:taskId` - タスク削除

**フィルタ機能**:
- `status` - ステータス（複数可）
- `priority` - 優先度（複数可）
- `assignee` - 担当者（複数可）
- `label` - ラベル（複数可）

---

### 3. SavedViewクエリパーサー✅

**場所**: `taskai-server/internal/query/`

**機能**:
- クエリ文字列のパース
- SQLクエリの生成
- 相対日付の解決
- ソート・グループ化・制限のサポート

**実装レイヤー**:
- **Query Parser** (`query/parser.go`)
  - トークン化
  - フィルタパース
  - 表示オプションパース

- **SQL Builder** (`query/sql_builder.go`)
  - SQLクエリ生成
  - パラメータバインディング
  - 安全なクエリ構築

- **Repository** (`repository/view_repository.go`)
  - SavedViewの永続化
  - クエリ実行

- **Service** (`service/view_service.go`)
  - ビジネスロジック
  - クエリ正規化

- **API** (`api/view_handlers.go`)
  - HTTPハンドラー

**クエリ構文**:
```
# 基本フィルタ
assignee:me status:open priority:(P0 P1)

# 否定
-status:(done archived)

# 日付比較
due:<=2026-01-31

# 相対日付
due:today due:this_week updated:last_7d

# 表示オプション
sort:priority_desc group:status limit:50 view:table
```

**エンドポイント**:
- `GET /api/v1/projects/:projectId/views` - ビュー一覧
- `POST /api/v1/projects/:projectId/views` - ビュー作成
- `GET /api/v1/projects/:projectId/views/:viewId` - ビュー取得
- `PUT /api/v1/projects/:projectId/views/:viewId` - ビュー更新
- `DELETE /api/v1/projects/:projectId/views/:viewId` - ビュー削除
- `POST /api/v1/projects/:projectId/views/:viewId/execute` - ビュー実行

---

### 4. 基本認証（JWT）✅

**場所**: `taskai-server/internal/auth/`, `internal/service/`, `internal/api/`

**機能**:
- JWT生成・検証
- パスワードハッシュ化（Argon2）
- ユーザー登録・ログイン
- 認証ミドルウェア

**実装コンポーネント**:

- **Auth** (`auth/jwt.go`, `auth/password.go`)
  - JWTトークン管理
  - Argon2パスワードハッシュ

- **Repository** (`repository/user_repository.go`)
  - ユーザーデータアクセス

- **Service** (`service/auth_service.go`)
  - 認証ビジネスロジック
  - ユーザー登録・ログイン

- **API** (`api/auth_handlers.go`)
  - 認証エンドポイント
  - 認証ミドルウェア

**エンドポイント**:
- `POST /api/v1/auth/register` - ユーザー登録
- `POST /api/v1/auth/login` - ログイン
- `POST /api/v1/auth/logout` - ログアウト
- `GET /api/v1/auth/me` - 現在のユーザー取得（要認証）

**認証方式**:
- Cookie（httpOnly）
- Authorization: Bearer ヘッダー

**セキュリティ**:
- Argon2idパスワードハッシュ
- JWTトークン（HS256）
- 定数時間比較

---

## プロジェクト構造

```
taskai-server/
├── cmd/server/
│   └── main.go                  # エントリーポイント
├── internal/
│   ├── api/                     # HTTPハンドラー
│   │   ├── router.go
│   │   ├── middleware.go
│   │   ├── auth_handlers.go    # 認証
│   │   ├── project_handlers.go # プロジェクト
│   │   ├── task_handlers.go    # タスク
│   │   └── view_handlers.go    # SavedView
│   ├── auth/                    # 認証ユーティリティ
│   │   ├── jwt.go
│   │   └── password.go
│   ├── config/                  # 設定
│   │   └── config.go
│   ├── database/                # DB接続
│   │   └── database.go
│   ├── models/                  # データモデル
│   │   └── models.go
│   ├── parser/                  # Markdownパーサー
│   │   ├── markdown.go
│   │   └── markdown_test.go
│   ├── query/                   # クエリパーサー
│   │   ├── parser.go
│   │   └── sql_builder.go
│   ├── repository/              # データアクセス
│   │   ├── project_repository.go
│   │   ├── task_repository.go
│   │   ├── user_repository.go
│   │   └── view_repository.go
│   └── service/                 # ビジネスロジック
│       ├── auth_service.go
│       ├── project_service.go
│       ├── task_service.go
│       └── view_service.go
└── go.mod
```

---

## 使用方法

### 1. サーバー起動

```bash
cd taskai-server
go mod download
go run cmd/server/main.go
```

### 2. ユーザー登録

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "id": "user-1",
    "email": "user@example.com",
    "name": "Test User",
    "password": "secure_password"
  }'
```

### 3. ログイン

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure_password"
  }'
```

### 4. プロジェクト作成

```bash
curl -X POST http://localhost:8080/api/v1/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "id": "proj-1",
    "name": "My Project",
    "description": "Test project",
    "visibility": "private"
  }'
```

### 5. タスク作成（Markdown）

```bash
curl -X POST http://localhost:8080/api/v1/projects/proj-1/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "markdown_body": "## T-1001: Test Task\n\n```yaml\nid: T-1001\nstatus: open\npriority: P1\nassignees: [user-1]\ndue: 2026-01-31\nlabels: [test]\n```\n\n### Description\n\nThis is a test task.\n\n### Acceptance Criteria\n\n- [ ] Task created\n- [ ] Task can be retrieved"
  }'
```

### 6. SavedView作成

```bash
curl -X POST http://localhost:8080/api/v1/projects/proj-1/views \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "id": "view-my-work",
    "name": "My Work",
    "scope": "private",
    "raw_query": "assignee:me -status:(done archived) sort:priority_desc"
  }'
```

### 7. SavedView実行

```bash
curl -X POST http://localhost:8080/api/v1/projects/proj-1/views/view-my-work/execute \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 次のステップ（Phase 2）

以下の機能が実装候補です：

1. **全文検索の強化**
   - Meilisearchの統合
   - 検索結果のハイライト

2. **Task Pack生成**
   - テンプレート管理
   - AI引き渡し用フォーマット生成

3. **タスク関連管理**
   - parent/child関係
   - blocks/blocked_by
   - 関連タスクの表示

4. **変更履歴表示**
   - リビジョン一覧
   - 差分表示

5. **監査ログAPI**
   - イベント一覧
   - フィルタリング

6. **WebSocket（リアルタイム更新）**
   - タスク変更の通知
   - SavedViewの自動更新

---

## テスト

```bash
# パーサーのテスト
cd internal/parser
go test -v

# すべてのテスト
go test ./...

# カバレッジ
go test -cover ./...
```

---

## トラブルシューティング

### データベース接続エラー

`.env`ファイルでDB_PASSWORDが正しく設定されているか確認してください。

### JWT検証エラー

JWT_SECRETが正しく設定されているか、トークンの有効期限が切れていないか確認してください。

### Markdownパースエラー

タスクMarkdownが正しい形式（タイトル + YAMLブロック）になっているか確認してください。

---

## 開発者向けメモ

- 現在、認証は`OptionalAuthMiddleware`を使用しているため、トークンなしでもアクセス可能です
- 本番環境では`AuthMiddleware()`に変更することを推奨
- パスワードは必ず環境変数で管理してください
- すべてのエンドポイントはJSON形式でリクエスト・レスポンスを処理します
