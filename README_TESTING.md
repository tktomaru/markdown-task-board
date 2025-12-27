# テスト実行クイックガイド

## すぐに使えるコマンド

### シェルスクリプトで実行

```bash
# すべてのテストを実行
./taskai-server/scripts/test.sh

# ユニットテストのみ実行（推奨・高速）
./taskai-server/scripts/test-unit.sh

# カバレッジ付きテスト実行
./taskai-server/scripts/test-coverage.sh
```

### Makeコマンドで実行

```bash
cd taskai-server

# すべてのテストを実行
make test

# ユニットテストのみ実行
make test-unit

# カバレッジ付きテスト実行
make test-coverage

# ヘルプを表示
make help
```

## 実装済みテスト

### ✅ Markdownパーサー (`internal/parser`)
- YAMLフロントマター抽出
- タスクメタデータ検証
- Acceptance Criteria抽出

### ✅ クエリパーサー (`internal/query`)
- クエリ文字列のパース
- フィルター、ソート、リミット処理
- SQLビルダー（パラメータ化クエリ生成）

### ✅ 認証 (`internal/auth`)
- JWT生成・検証
- パスワードハッシュ（Argon2id）
- トークン有効期限チェック

### ✅ WebSocket (`internal/websocket`)
- Hub管理（接続登録・削除）
- メッセージブロードキャスト
- プロジェクト別接続管理

### ✅ サービス層 (`internal/service`)
- リビジョン比較
- 変更検出（フィールドレベル）
- テキストDiff生成

## テスト結果の例

```
✓ parser:     2 tests    PASS
✓ query:      6 tests    PASS
✓ auth:       7 tests    PASS
✓ websocket:  7 tests    PASS
✓ service:    4 tests    PASS
─────────────────────────
  合計:      26 tests    PASS
```

## カバレッジレポート

カバレッジ付きテスト実行後、以下のファイルが生成されます：

```
taskai-server/coverage/
├── coverage.out      # 生カバレッジデータ
├── coverage.txt      # テキストレポート
└── coverage.html     # HTMLレポート（ブラウザで閲覧可能）
```

HTMLレポートを開く：
```bash
# macOS
open taskai-server/coverage/coverage.html

# Linux
xdg-open taskai-server/coverage/coverage.html

# Windows (WSL)
explorer.exe taskai-server/coverage/coverage.html
```

## トラブルシューティング

### スクリプトに実行権限がない場合

```bash
chmod +x taskai-server/scripts/*.sh
```

### Go依存関係が不足している場合

```bash
cd taskai-server
go mod download
go mod tidy
```

### テストキャッシュをクリアしたい場合

```bash
cd taskai-server
go clean -testcache
```

## より詳しい情報

詳細なテストガイドは `taskai-server/TESTING.md` を参照してください。
