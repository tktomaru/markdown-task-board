.PHONY: test test-unit test-coverage test-verbose help clean

# デフォルトターゲット
.DEFAULT_GOAL := help

## help: このヘルプメッセージを表示
help:
	@echo "利用可能なコマンド:"
	@echo ""
	@echo "  make test           - すべてのテストを実行"
	@echo "  make test-unit      - ユニットテストのみ実行"
	@echo "  make test-coverage  - カバレッジ付きテスト実行"
	@echo "  make test-verbose   - 詳細出力付きテスト実行"
	@echo "  make clean          - テスト成果物を削除"
	@echo "  make run            - サーバーを起動"
	@echo "  make build          - バイナリをビルド"
	@echo ""

## test: すべてのテストを実行
test:
	@chmod +x scripts/test.sh
	@./scripts/test.sh

## test-unit: ユニットテストのみ実行
test-unit:
	@chmod +x scripts/test-unit.sh
	@./scripts/test-unit.sh

## test-coverage: カバレッジ付きテスト実行
test-coverage:
	@chmod +x scripts/test-coverage.sh
	@./scripts/test-coverage.sh

## test-verbose: 詳細出力付きテスト実行
test-verbose:
	@go test -v -race ./...

## clean: テスト成果物を削除
clean:
	@echo "テスト成果物を削除中..."
	@rm -rf coverage/
	@echo "✓ 削除完了"

## build: サーバーバイナリをビルド
build:
	@echo "サーバーをビルド中..."
	@go build -o bin/server ./cmd/server
	@echo "✓ ビルド完了: bin/server"

## run: サーバーを起動（開発モード）
run:
	@go run ./cmd/server/main.go

## deps: 依存関係をダウンロード
deps:
	@echo "依存関係をダウンロード中..."
	@go mod download
	@go mod verify
	@echo "✓ 依存関係のダウンロード完了"

## fmt: コードをフォーマット
fmt:
	@echo "コードをフォーマット中..."
	@go fmt ./...
	@echo "✓ フォーマット完了"

## lint: コードを静的解析
lint:
	@echo "コードを静的解析中..."
	@go vet ./...
	@echo "✓ 静的解析完了"

## all: フォーマット、リント、テストを実行
all: fmt lint test
	@echo "✓ すべてのチェック完了"
