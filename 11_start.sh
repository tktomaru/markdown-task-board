#!/bin/bash

# TaskMD統合環境起動スクリプト

set -e

echo "========================================="
echo "TaskMD統合環境セットアップ"
echo "========================================="
echo ""

# 必要なディレクトリを作成
echo "必要なディレクトリを作成中..."
sudo mkdir -p ./docker/postgres_data
sudo mkdir -p ./docker/meilisearch_data

echo "不要なディレクトリを削除中..."
sudo rm -rf ./taskmd-web/node_modules
# sudo rm -rf ./taskmd-server/.env

sudo chmod 777 -R ./db/schema

# 環境変数ファイルの確認
echo "1. 環境変数ファイルを確認中..."
if [ ! -f .env ]; then
    echo "   ⚠ .env ファイルが見つかりません"
    echo "   .env.example から .env を作成してください:"
    echo "   cp .env.example .env"
    echo ""
    echo "   その後、.env ファイルを編集して DB_PASSWORD などを設定してください"
    exit 1
else
    echo "   ✓ .env ファイルが存在します"
fi
echo ""

# 必要なディレクトリを作成
echo "2. 必要なディレクトリを確認中..."
if [ ! -d ./db/schema ]; then
    echo "   ⚠ ./db/schema ディレクトリが見つかりません"
    echo "   データベーススキーマファイルを配置してください"
fi
echo "   ✓ ディレクトリ構造を確認しました"
echo ""

# データベース初期化スクリプトのパーミッションを設定
if [ -f ./db/init.sh ]; then
    echo "3. データベース初期化スクリプトのパーミッションを設定中..."
    sudo chmod +x ./db/init.sh
    echo "   ✓ パーミッションを設定しました"
    echo ""
fi

# Docker ネットワークの作成（docker-compose.ymlで自動作成されるためコメントアウト）
# echo "4. Docker ネットワークを作成中..."
# if ! docker network inspect taskai-network >/dev/null 2>&1; then
#     docker network create taskai-network
#     echo "   ✓ ネットワーク 'taskai-network' を作成しました"
# else
#     echo "   ✓ ネットワーク 'taskai-network' は既に存在します"
# fi
# echo ""

# サービスの起動
echo "4. サービスをビルド・起動中..."
sudo docker compose build --progress=plain
sudo docker compose up -d --force-recreate
echo "   ✓ すべてのサービスをビルド・起動しました"
echo ""

#########
# sudo rm -rf ./pgadmin/data
# sudo mkdir -p ./pgadmin/data
# sudo chmod 777 -R ./pgadmin/data
# sudo docker compose -f docker-compose-pgadmin.yml --progress=plain build
# sudo docker compose -f docker-compose-pgadmin.yml up  -d --force-recreate

# 起動待ち
echo "5. サービスの起動を待機中..."
sleep 10

# ヘルスチェック
echo "6. ヘルスチェック..."
echo "   - PostgreSQL..."
if sudo docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "     ✓ PostgreSQL は正常に起動しました"
else
    echo "     ⚠ PostgreSQL の起動を確認できませんでした"
fi

echo "   - Meilisearch..."
if curl -s http://localhost:7700/health > /dev/null 2>&1; then
    echo "     ✓ Meilisearch は正常に起動しました"
else
    echo "     ⚠ Meilisearch の起動を確認できませんでした"
fi

echo "   - API Server..."
if curl -s http://localhost:8080/healthz > /dev/null 2>&1; then
    echo "     ✓ API Server は正常に起動しました"
else
    echo "     ⚠ API Server の起動を確認できませんでした"
    echo "     ログを確認してください: docker compose logs api"
fi

echo "   - Web Application..."
if curl -s http://localhost/ > /dev/null 2>&1; then
    echo "     ✓ Web Application は正常に起動しました"
else
    echo "     ⚠ Web Application の起動を確認できませんでした"
    echo "     ログを確認してください: docker compose logs web"
fi
echo ""

# 完了メッセージ
echo "========================================="
echo "起動完了！"
echo "========================================="
echo ""
echo "アクセス URL:"
echo "  - Web UI:        http://localhost/"
echo "  - API:           http://localhost:8080/"
echo "  - API Health:    http://localhost:8080/healthz"
echo "  - Meilisearch:   http://localhost:7700/"
echo "  - Database:      localhost:5432"
echo ""
echo "ログを確認:"
echo "  docker compose logs -f"
echo "  docker compose logs -f api      # API サーバーのログのみ"
echo "  docker compose logs -f web      # Web アプリのログのみ"
echo ""
echo "サービスのステータス確認:"
echo "  docker compose ps"
echo ""
echo "停止:"
echo "  docker compose down"
echo ""
echo "完全削除（データも含む）:"
echo "  docker compose down -v"
echo ""
