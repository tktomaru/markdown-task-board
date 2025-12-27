# TaskMD Server

TaskMDのバックエンドサーバー（Go言語実装）

## 概要

TaskMD Serverは、Markdownを唯一の真実として扱うタスク管理システムのバックエンドAPIです。

### 主な機能

- **Markdownファースト**: タスク本文をMarkdown原文のまま保存
- **柔軟な検索**: 複雑なクエリ構文でタスクをフィルタリング
- **SavedView**: よく使う検索条件と表示設定を保存
- **Task Pack生成**: AI引き渡し用のフォーマット済みMarkdownを生成
- **変更履歴**: すべてのタスク変更を記録
- **監査ログ**: すべての重要アクションを追跡

## ディレクトリ構成

```
taskai-server/
├── cmd/
│   └── server/          # メインエントリーポイント
│       └── main.go
├── internal/
│   ├── api/             # HTTPハンドラとルーティング
│   │   ├── router.go
│   │   └── middleware.go
│   ├── config/          # 設定管理
│   │   └── config.go
│   ├── database/        # データベース接続
│   │   └── database.go
│   ├── models/          # データモデル
│   │   └── models.go
│   ├── parser/          # Markdownパーサ（今後実装）
│   ├── query/           # クエリパーサ（今後実装）
│   └── service/         # ビジネスロジック（今後実装）
├── pkg/                 # 公開パッケージ（今後実装）
├── .env.example         # 環境変数サンプル
├── Dockerfile           # Dockerイメージビルド用
├── go.mod               # Go モジュール定義
└── README.md            # このファイル
```

## セットアップ

### 前提条件

- Go 1.22以上
- PostgreSQL 14以上
- （オプション）Docker & Docker Compose

### ローカル開発

1. **リポジトリのクローン**

```bash
git clone <repository-url>
cd taskai/taskai-server
```

2. **環境変数の設定**

```bash
cp .env.example .env
# .envファイルを編集して、DB_PASSWORDなどを設定
```

3. **依存関係のインストール**

```bash
go mod download
```

4. **データベースの準備**

```bash
# データベースが起動していることを確認
cd ../db
./init.sh --seed
```

5. **サーバーの起動**

```bash
go run cmd/server/main.go
```

サーバーは `http://localhost:8080` で起動します。

### Docker での起動

```bash
# イメージをビルド
docker build -t taskai-server .

# コンテナを起動
docker run -p 8080:8080 --env-file .env taskai-server
```

## API エンドポイント

### ヘルスチェック

- `GET /healthz` - サーバーの稼働状態
- `GET /readyz` - サーバーの準備状態（DB接続含む）

### API v1

#### Projects

- `GET /api/v1/projects` - プロジェクト一覧
- `POST /api/v1/projects` - プロジェクト作成
- `GET /api/v1/projects/:projectId` - プロジェクト取得
- `PUT /api/v1/projects/:projectId` - プロジェクト更新
- `DELETE /api/v1/projects/:projectId` - プロジェクト削除

#### Tasks

- `GET /api/v1/projects/:projectId/tasks` - タスク一覧
- `POST /api/v1/projects/:projectId/tasks` - タスク作成
- `GET /api/v1/projects/:projectId/tasks/:taskId` - タスク取得
- `PUT /api/v1/projects/:projectId/tasks/:taskId` - タスク更新
- `DELETE /api/v1/projects/:projectId/tasks/:taskId` - タスク削除

#### Saved Views

- `GET /api/v1/projects/:projectId/views` - ビュー一覧
- `POST /api/v1/projects/:projectId/views` - ビュー作成
- `GET /api/v1/projects/:projectId/views/:viewId` - ビュー取得
- `PUT /api/v1/projects/:projectId/views/:viewId` - ビュー更新
- `DELETE /api/v1/projects/:projectId/views/:viewId` - ビュー削除
- `POST /api/v1/projects/:projectId/views/:viewId/execute` - ビュー実行

#### Task Packs

- `POST /api/v1/task-packs` - Task Pack生成

#### Auth

- `POST /api/v1/auth/login` - ログイン
- `POST /api/v1/auth/logout` - ログアウト
- `GET /api/v1/auth/me` - 現在のユーザー情報

> **注**: 現在、多くのエンドポイントはプレースホルダーです。実装は順次追加されます。

## 設定

環境変数で設定を行います。`.env.example` を参照してください。

### 主要な設定項目

#### Server

- `PORT` - サーバーポート（デフォルト: 8080）
- `HOST` - バインドアドレス（デフォルト: 0.0.0.0）
- `CORS_ORIGINS` - 許可するオリジン（カンマ区切り）

#### Database

- `DB_HOST` - PostgreSQLホスト
- `DB_PORT` - PostgreSQLポート
- `DB_USER` - データベースユーザー
- `DB_PASSWORD` - データベースパスワード（必須）
- `DB_NAME` - データベース名
- `DB_SSLMODE` - SSL接続モード

#### Authentication

- `AUTH_MODE` - 認証モード（`password` or `oidc`）
- `JWT_SECRET` - JWT署名用シークレット
- `JWT_EXPIRES_IN` - JWT有効期限

#### OIDC（AUTH_MODE=oidcの場合）

- `OIDC_ISSUER` - OIDCプロバイダーのIssuer URL
- `OIDC_CLIENT_ID` - OIDCクライアントID
- `OIDC_CLIENT_SECRET` - OIDCクライアントシークレット

#### Logging

- `LOG_LEVEL` - ログレベル（debug, info, warn, error）
- `LOG_FORMAT` - ログフォーマット（json or text）

## 開発

### テストの実行

```bash
go test ./...
```

### ビルド

```bash
go build -o server cmd/server/main.go
./server
```

### コードフォーマット

```bash
go fmt ./...
```

### Linting

```bash
go vet ./...
# または golangci-lint
golangci-lint run
```

## 今後の実装予定

### Phase 1: MVP（最小限の機能）

- [x] プロジェクト構成
- [x] データベース接続
- [x] 基本的なルーティング
- [ ] Markdownパーサ（YAMLメタデータ抽出）
- [ ] タスクCRUD実装
- [ ] SavedViewクエリパーサ
- [ ] 基本的な認証（パスワード）

### Phase 2: コア機能

- [ ] 全文検索
- [ ] Task Pack生成
- [ ] タスク関連管理
- [ ] 変更履歴表示
- [ ] 監査ログAPI

### Phase 3: 拡張機能

- [ ] OIDC認証
- [ ] レート制限
- [ ] WebSocket（リアルタイム更新）
- [ ] コメント機能
- [ ] 添付ファイル（S3/MinIO）

## ライセンス

MIT

## 貢献

プルリクエストを歓迎します！

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチをプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成
