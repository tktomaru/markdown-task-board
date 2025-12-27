# テストガイド

このドキュメントでは、TaskMDサーバーのテスト実行方法について説明します。

## クイックスタート

### すべてのテストを実行

```bash
make test
```

または

```bash
./scripts/test.sh
```

### ユニットテストのみ実行

```bash
make test-unit
```

### カバレッジ付きテスト

```bash
make test-coverage
```

カバレッジレポートは `coverage/` ディレクトリに生成されます：
- `coverage/coverage.txt` - テキストレポート
- `coverage/coverage.html` - HTMLレポート

HTMLレポートを開く：

```bash
# macOS
open coverage/coverage.html

# Linux
xdg-open coverage/coverage.html

# Windows
start coverage/coverage.html
```

## テスト構成

### テストファイルの配置

テストファイルは各パッケージと同じディレクトリに配置されています：

```
internal/
├── parser/
│   ├── markdown.go
│   └── markdown_test.go
├── query/
│   ├── parser.go
│   ├── parser_test.go
│   ├── sql_builder.go
│   └── sql_builder_test.go
├── auth/
│   ├── jwt.go
│   ├── jwt_test.go
│   ├── password.go
│   └── password_test.go
├── websocket/
│   ├── hub.go
│   └── hub_test.go
└── service/
    ├── revision_service.go
    └── revision_service_test.go
```

### テストの種類

#### 1. ユニットテスト

データベースや外部サービスに依存しないテスト：

- **パーサーテスト** (`internal/parser/*_test.go`)
  - Markdownパース
  - YAMLメタデータ抽出
  - 検証ロジック

- **クエリテスト** (`internal/query/*_test.go`)
  - クエリパース
  - SQLビルド
  - 日付解決

- **認証テスト** (`internal/auth/*_test.go`)
  - JWT生成・検証
  - パスワードハッシュ
  - トークン抽出

- **WebSocketテスト** (`internal/websocket/*_test.go`)
  - Hub管理
  - メッセージブロードキャスト
  - クライアント接続管理

- **サービステスト** (`internal/service/*_test.go`)
  - リビジョン比較
  - 変更検出
  - Diffジェネレーション

#### 2. 統合テスト（今後追加予定）

データベースやAPIエンドポイントを含むテスト：

- APIハンドラーテスト
- リポジトリテスト（DB接続必要）
- E2Eテスト

## 利用可能なコマンド

### Make コマンド

```bash
make help          # ヘルプを表示
make test          # すべてのテストを実行
make test-unit     # ユニットテストのみ
make test-coverage # カバレッジ付きテスト
make test-verbose  # 詳細出力付きテスト
make clean         # テスト成果物を削除
```

### スクリプト

```bash
./scripts/test.sh           # すべてのテスト
./scripts/test-unit.sh      # ユニットテストのみ
./scripts/test-coverage.sh  # カバレッジ付き
```

### Goコマンド直接実行

```bash
# すべてのテスト
go test ./...

# 詳細出力
go test -v ./...

# 特定のパッケージ
go test ./internal/parser

# 特定のテスト
go test -run TestMarkdownParser_Parse ./internal/parser

# カバレッジ
go test -cover ./...

# Race detector付き
go test -race ./...

# ベンチマーク
go test -bench=. ./internal/auth
```

## テストの書き方

### テストファイルの作成

1. テスト対象ファイルと同じディレクトリに `*_test.go` ファイルを作成
2. 同じパッケージ名を使用
3. テスト関数は `Test` で始める

```go
package parser

import "testing"

func TestMyFunction(t *testing.T) {
    // テストコード
}
```

### テーブル駆動テスト

推奨されるテストパターン：

```go
func TestMyFunction(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    string
        wantErr bool
    }{
        {
            name:    "valid input",
            input:   "test",
            want:    "result",
            wantErr: false,
        },
        {
            name:    "invalid input",
            input:   "",
            wantErr: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := MyFunction(tt.input)

            if (err != nil) != tt.wantErr {
                t.Errorf("MyFunction() error = %v, wantErr %v", err, tt.wantErr)
                return
            }

            if got != tt.want {
                t.Errorf("MyFunction() = %v, want %v", got, tt.want)
            }
        })
    }
}
```

### ベンチマーク

パフォーマンステスト：

```go
func BenchmarkMyFunction(b *testing.B) {
    for i := 0; i < b.N; i++ {
        MyFunction("test")
    }
}
```

実行：

```bash
go test -bench=. ./internal/auth
```

## CI/CD

### GitHub Actions（例）

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.22'
      - run: make test-coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage.out
```

## トラブルシューティング

### テストが失敗する

1. 依存関係を更新：
   ```bash
   go mod download
   go mod verify
   ```

2. キャッシュをクリア：
   ```bash
   go clean -testcache
   ```

3. 詳細ログで実行：
   ```bash
   go test -v ./...
   ```

### スクリプトが実行できない

実行権限を付与：

```bash
chmod +x scripts/*.sh
```

## ベストプラクティス

1. **テストファーストで開発**
   - 新機能を追加する前にテストを書く
   - リファクタリング前にテストを書く

2. **テストは独立させる**
   - 各テストは他のテストに依存しない
   - グローバル状態を変更しない

3. **明確なテスト名**
   - 何をテストしているか分かる名前を付ける
   - `TestFunction_Scenario_ExpectedResult` 形式推奨

4. **エッジケースをテスト**
   - 正常系だけでなく異常系もテスト
   - 境界値をテスト

5. **カバレッジ目標**
   - 重要なビジネスロジックは80%以上
   - クリティカルパスは100%

## 参考資料

- [Go Testing Package](https://pkg.go.dev/testing)
- [Table Driven Tests](https://github.com/golang/go/wiki/TableDrivenTests)
- [Go Test Coverage](https://go.dev/blog/cover)
