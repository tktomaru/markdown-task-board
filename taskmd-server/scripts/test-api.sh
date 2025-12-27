#!/bin/bash

# API統合テストスクリプト
# すべてのAPIエンドポイントを順番にテストします

set -e

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# デフォルト設定
API_BASE="${API_BASE:-http://localhost:8080/api/v1}"
VERBOSE="${VERBOSE:-false}"

# グローバル変数
TOKEN=""
PROJECT_ID=""
TASK_ID=""
VIEW_ID=""
REV_ID=""
TEST_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0

# ヘルプメッセージ
show_help() {
    echo "使い方: $0 [OPTIONS]"
    echo ""
    echo "オプション:"
    echo "  -h, --help          このヘルプを表示"
    echo "  -v, --verbose       詳細出力を有効化"
    echo "  -u, --url URL       APIベースURL (デフォルト: http://localhost:8080/api/v1)"
    echo ""
    echo "環境変数:"
    echo "  API_BASE            APIベースURL"
    echo "  VERBOSE             詳細出力 (true/false)"
    echo ""
    echo "例:"
    echo "  $0"
    echo "  $0 -v"
    echo "  $0 -u http://localhost:8080/api/v1"
    echo "  API_BASE=http://localhost:8080/api/v1 $0"
}

# コマンドライン引数解析
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -u|--url)
            API_BASE="$2"
            shift 2
            ;;
        *)
            echo "不明なオプション: $1"
            show_help
            exit 1
            ;;
    esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  TaskMD API 統合テスト${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${CYAN}API Base URL: ${API_BASE}${NC}"
echo ""

# HTTPリクエストを実行
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4

    TEST_COUNT=$((TEST_COUNT + 1))

    echo -e "${YELLOW}[Test ${TEST_COUNT}]${NC} ${description}"

    local url="${API_BASE}${endpoint}"
    local response
    local http_code

    if [ "$VERBOSE" = true ]; then
        echo -e "${CYAN}  → ${method} ${endpoint}${NC}"
        if [ -n "$data" ]; then
            echo -e "${CYAN}  → Data: ${data}${NC}"
        fi
    fi

    if [ -n "$data" ]; then
        if [ -n "$TOKEN" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $TOKEN" \
                -d "$data")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
                -H "Content-Type: application/json" \
                -d "$data")
        fi
    else
        if [ -n "$TOKEN" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
                -H "Authorization: Bearer $TOKEN")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$url")
        fi
    fi

    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')

    if [ "$VERBOSE" = true ]; then
        echo -e "${CYAN}  ← Status: ${http_code}${NC}"
        echo -e "${CYAN}  ← Body: ${body}${NC}"
    fi

    # ステータスコードチェック
    if [[ "$http_code" =~ ^2[0-9][0-9]$ ]]; then
        echo -e "${GREEN}  ✓ PASS${NC} (HTTP ${http_code})"
        PASS_COUNT=$((PASS_COUNT + 1))
        echo "$body"
    else
        echo -e "${RED}  ✗ FAIL${NC} (HTTP ${http_code})"
        echo -e "${RED}  Response: ${body}${NC}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        echo ""
        return 1
    fi

    echo ""
}

# JSONから値を抽出（簡易版）
extract_json() {
    local json=$1
    local key=$2
    echo "$json" | grep -o "\"$key\":\"[^\"]*\"" | cut -d'"' -f4 | head -1
}

echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}  1. ヘルスチェック${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

api_call "GET" "/healthz" "" "ヘルスチェック" || true
api_call "GET" "/readyz" "" "レディチェック" || true

echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}  2. 認証テスト${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ユーザー登録
REGISTER_DATA='{
  "email": "test@example.com",
  "password": "TestPassword123!",
  "username": "testuser"
}'

REGISTER_RESPONSE=$(api_call "POST" "/auth/register" "$REGISTER_DATA" "ユーザー登録") || true

# ログイン
LOGIN_DATA='{
  "email": "test@example.com",
  "password": "TestPassword123!"
}'

LOGIN_RESPONSE=$(api_call "POST" "/auth/login" "$LOGIN_DATA" "ログイン") || true
TOKEN=$(extract_json "$LOGIN_RESPONSE" "token")

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✓ トークン取得成功${NC}"
    if [ "$VERBOSE" = true ]; then
        echo -e "${CYAN}Token: ${TOKEN}${NC}"
    fi
    echo ""
fi

# 現在のユーザー情報取得
api_call "GET" "/auth/me" "" "現在のユーザー情報取得" || true

echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}  3. プロジェクトテスト${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# プロジェクト一覧取得
api_call "GET" "/projects" "" "プロジェクト一覧取得" || true

# プロジェクト作成
PROJECT_DATA='{
  "id": "test-project",
  "name": "Test Project",
  "description": "API test project"
}'

PROJECT_RESPONSE=$(api_call "POST" "/projects" "$PROJECT_DATA" "プロジェクト作成") || true
PROJECT_ID=$(extract_json "$PROJECT_RESPONSE" "id")

if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID="test-project"
fi

echo -e "${GREEN}✓ プロジェクトID: ${PROJECT_ID}${NC}"
echo ""

# プロジェクト取得
api_call "GET" "/projects/${PROJECT_ID}" "" "プロジェクト詳細取得" || true

# プロジェクト更新
PROJECT_UPDATE_DATA='{
  "name": "Updated Test Project",
  "description": "Updated description"
}'

api_call "PUT" "/projects/${PROJECT_ID}" "$PROJECT_UPDATE_DATA" "プロジェクト更新" || true

echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}  4. タスクテスト${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# タスク一覧取得
api_call "GET" "/projects/${PROJECT_ID}/tasks" "" "タスク一覧取得" || true

# タスク作成
TASK_DATA='{
  "markdown_body": "## TASK-001: Test Task\n\n```yaml\nid: TASK-001\nstatus: open\npriority: P1\nassignees: [testuser]\nlabels: [test, api]\n```\n\nThis is a test task.\n\n## Acceptance Criteria\n\n- [ ] Test criterion 1\n- [ ] Test criterion 2"
}'

TASK_RESPONSE=$(api_call "POST" "/projects/${PROJECT_ID}/tasks" "$TASK_DATA" "タスク作成") || true
TASK_ID=$(extract_json "$TASK_RESPONSE" "id")

if [ -z "$TASK_ID" ]; then
    TASK_ID="TASK-001"
fi

echo -e "${GREEN}✓ タスクID: ${TASK_ID}${NC}"
echo ""

# タスク取得
api_call "GET" "/projects/${PROJECT_ID}/tasks/${TASK_ID}" "" "タスク詳細取得" || true

# タスク更新
TASK_UPDATE_DATA='{
  "markdown_body": "## TASK-001: Updated Test Task\n\n```yaml\nid: TASK-001\nstatus: in_progress\npriority: P1\nassignees: [testuser]\nlabels: [test, api, updated]\n```\n\nUpdated task content."
}'

api_call "PUT" "/projects/${PROJECT_ID}/tasks/${TASK_ID}" "$TASK_UPDATE_DATA" "タスク更新" || true

# タスクフィルタリング
api_call "GET" "/projects/${PROJECT_ID}/tasks?status=open&priority=P1" "" "タスクフィルタリング" || true

echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}  5. リビジョンテスト${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# タスクのリビジョン一覧取得
REVISIONS_RESPONSE=$(api_call "GET" "/projects/${PROJECT_ID}/tasks/${TASK_ID}/revisions" "" "リビジョン一覧取得") || true

# リビジョンIDを抽出（簡易版）
REV_ID=$(echo "$REVISIONS_RESPONSE" | grep -o '"rev_id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -n "$REV_ID" ]; then
    echo -e "${GREEN}✓ リビジョンID: ${REV_ID}${NC}"
    echo ""

    # 特定リビジョン取得
    api_call "GET" "/revisions/${REV_ID}" "" "特定リビジョン取得" || true

    # 現在バージョンとの比較
    api_call "GET" "/projects/${PROJECT_ID}/tasks/${TASK_ID}/revisions/${REV_ID}/compare" "" "現在バージョンとの比較" || true
fi

echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}  6. SavedViewテスト${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# View一覧取得
api_call "GET" "/projects/${PROJECT_ID}/views" "" "View一覧取得" || true

# View作成
VIEW_DATA='{
  "name": "Test View",
  "query_string": "status:open priority:P1",
  "view_type": "list",
  "scope": "private"
}'

VIEW_RESPONSE=$(api_call "POST" "/projects/${PROJECT_ID}/views" "$VIEW_DATA" "View作成") || true
VIEW_ID=$(extract_json "$VIEW_RESPONSE" "id")

if [ -n "$VIEW_ID" ]; then
    echo -e "${GREEN}✓ ViewID: ${VIEW_ID}${NC}"
    echo ""

    # View取得
    api_call "GET" "/projects/${PROJECT_ID}/views/${VIEW_ID}" "" "View詳細取得" || true

    # View実行
    api_call "POST" "/projects/${PROJECT_ID}/views/${VIEW_ID}/execute" "" "View実行" || true

    # View更新
    VIEW_UPDATE_DATA='{
      "name": "Updated Test View",
      "query_string": "status:open"
    }'

    api_call "PUT" "/projects/${PROJECT_ID}/views/${VIEW_ID}" "$VIEW_UPDATE_DATA" "View更新" || true
fi

echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}  7. 検索テスト${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 全文検索
SEARCH_DATA='{
  "query": "test",
  "project_id": "'${PROJECT_ID}'",
  "limit": 10
}'

api_call "POST" "/search" "$SEARCH_DATA" "全文検索" || true

# プロジェクトの再インデックス
api_call "POST" "/projects/${PROJECT_ID}/reindex" "" "プロジェクト再インデックス" || true

echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}  8. WebSocket統計テスト${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# WebSocket統計取得
api_call "GET" "/ws/stats?project_id=${PROJECT_ID}" "" "WebSocket統計取得" || true

echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}  9. クリーンアップ${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# タスク削除
if [ -n "$TASK_ID" ]; then
    api_call "DELETE" "/projects/${PROJECT_ID}/tasks/${TASK_ID}" "" "タスク削除" || true
fi

# View削除
if [ -n "$VIEW_ID" ]; then
    api_call "DELETE" "/projects/${PROJECT_ID}/views/${VIEW_ID}" "" "View削除" || true
fi

# プロジェクト削除
if [ -n "$PROJECT_ID" ]; then
    api_call "DELETE" "/projects/${PROJECT_ID}" "" "プロジェクト削除" || true
fi

# ログアウト
api_call "POST" "/auth/logout" "" "ログアウト" || true

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  テスト結果サマリー${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "総テスト数: ${TEST_COUNT}"
echo -e "${GREEN}成功: ${PASS_COUNT}${NC}"
echo -e "${RED}失敗: ${FAIL_COUNT}${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  ✓ すべてのテストが成功しました${NC}"
    echo -e "${GREEN}========================================${NC}"
    exit 0
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  ✗ 一部のテストが失敗しました${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi
