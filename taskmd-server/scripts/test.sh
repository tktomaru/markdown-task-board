#!/bin/bash

# テスト実行スクリプト
# すべてのテストを実行します

set -e

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  TaskMD Server - テスト実行${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# プロジェクトルートへ移動
cd "$(dirname "$0")/.."

# Goがインストールされているか確認
if ! command -v go &> /dev/null; then
    echo -e "${RED}エラー: Goがインストールされていません${NC}"
    echo "https://golang.org/dl/ からGoをインストールしてください"
    exit 1
fi

echo -e "${GREEN}Go version:${NC}"
go version
echo ""

# 依存関係のダウンロード
echo -e "${YELLOW}依存関係をダウンロード中...${NC}"
go mod download
echo -e "${GREEN}✓ 依存関係のダウンロード完了${NC}"
echo ""

# テスト実行
echo -e "${YELLOW}テストを実行中...${NC}"
echo ""

# すべてのパッケージのテストを実行
go test -v ./...

# テスト結果を確認
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  ✓ すべてのテストが成功しました${NC}"
    echo -e "${GREEN}========================================${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  ✗ テストが失敗しました${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi
