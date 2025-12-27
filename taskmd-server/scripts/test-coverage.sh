#!/bin/bash

# カバレッジ付きテスト実行スクリプト
# テストカバレッジレポートを生成します

set -e

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  TaskMD Server - カバレッジテスト${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# プロジェクトルートへ移動
cd "$(dirname "$0")/.."

# Goがインストールされているか確認
if ! command -v go &> /dev/null; then
    echo -e "${RED}エラー: Goがインストールされていません${NC}"
    exit 1
fi

echo -e "${GREEN}Go version:${NC}"
go version
echo ""

# カバレッジディレクトリ作成
COVERAGE_DIR="coverage"
mkdir -p "$COVERAGE_DIR"

echo -e "${YELLOW}依存関係をダウンロード中...${NC}"
go mod download
echo -e "${GREEN}✓ 依存関係のダウンロード完了${NC}"
echo ""

# カバレッジ付きテスト実行
echo -e "${YELLOW}カバレッジ付きテストを実行中...${NC}"
echo ""

go test -v -coverprofile="$COVERAGE_DIR/coverage.out" -covermode=atomic ./...

# テスト結果を確認
if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  ✗ テストが失敗しました${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}カバレッジレポートを生成中...${NC}"

# テキストカバレッジレポート
go tool cover -func="$COVERAGE_DIR/coverage.out" > "$COVERAGE_DIR/coverage.txt"

# HTMLカバレッジレポート
go tool cover -html="$COVERAGE_DIR/coverage.out" -o "$COVERAGE_DIR/coverage.html"

echo -e "${GREEN}✓ カバレッジレポート生成完了${NC}"
echo ""

# カバレッジサマリー表示
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  カバレッジサマリー${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 総合カバレッジ率を計算して表示
TOTAL_COVERAGE=$(go tool cover -func="$COVERAGE_DIR/coverage.out" | grep total | awk '{print $3}')
echo -e "${GREEN}総合カバレッジ: ${TOTAL_COVERAGE}${NC}"
echo ""

# パッケージ別カバレッジを表示
echo -e "${YELLOW}パッケージ別カバレッジ:${NC}"
go tool cover -func="$COVERAGE_DIR/coverage.out" | grep -v "total:" | tail -20

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✓ テスト完了${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "詳細なレポート:"
echo -e "  テキスト: ${COVERAGE_DIR}/coverage.txt"
echo -e "  HTML:     ${COVERAGE_DIR}/coverage.html"
echo ""
echo -e "HTMLレポートを開くには:"
echo -e "  ${YELLOW}open ${COVERAGE_DIR}/coverage.html${NC} (macOS)"
echo -e "  ${YELLOW}xdg-open ${COVERAGE_DIR}/coverage.html${NC} (Linux)"
echo -e "  ${YELLOW}start ${COVERAGE_DIR}/coverage.html${NC} (Windows)"
echo ""
