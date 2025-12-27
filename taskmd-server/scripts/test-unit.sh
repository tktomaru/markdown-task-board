#!/bin/bash

# ユニットテストのみを実行するスクリプト
# データベース接続が不要なテストのみ実行

set -e

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  TaskMD Server - ユニットテスト${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# プロジェクトルートへ移動
cd "$(dirname "$0")/.."

# ユニットテストのみ実行（-shortフラグでスキップされるテストを除外）
echo -e "${YELLOW}ユニットテストを実行中...${NC}"
echo ""

# データベースやネットワークが不要なパッケージのテスト
UNIT_TEST_PACKAGES=(
    "./internal/parser"
    "./internal/query"
    "./internal/auth"
    "./internal/websocket"
    "./internal/service"
)

for package in "${UNIT_TEST_PACKAGES[@]}"; do
    echo -e "${BLUE}Testing ${package}...${NC}"
    go test -v -short "$package"
    echo ""
done

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  ✓ ユニットテスト成功${NC}"
    echo -e "${GREEN}========================================${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  ✗ ユニットテスト失敗${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi
