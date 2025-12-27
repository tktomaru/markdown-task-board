# TaskMD（仮）— Markdownを唯一の真実にする、AI引き渡し特化タスク管理

TaskMD（仮）は、Redmineのように「人が管理するタスク」を、**AIに渡しやすいMarkdown**として扱うためのタスク管理サイトです。
タスク本文は**Markdown原文を壊さず保存**し、担当者・期間・優先度・進行度（open/review等）で瞬時に絞り込み、**お気に入り（Saved View）**で"一発表示"。
さらに、AI向けに情報を束ねた **Task Pack** をボタン一つで生成し、コピペで渡せます。

---

## クイックスタート

### 必要な環境

- Docker & Docker Compose
- （開発時）Go 1.22+, Node.js 20+

### 3ステップで起動

```bash
# 1. 環境変数を設定
cp .env.example .env
# .envファイルを編集してDB_PASSWORDを設定

# 2. データベースを初期化（サンプルデータ込み）
./db/init.sh --seed

# 3. すべてのサービスを起動
make up
# または: docker compose up -d
```

アプリケーションが起動したら：
- Web UI: http://localhost
- API: http://localhost:8080
- Database: localhost:5432

### よく使うコマンド

```bash
make help              # すべてのコマンドを表示
make logs              # ログを確認
make status            # サービスのステータス確認
make health            # ヘルスチェック
make down              # すべてのサービスを停止
```

詳細は各コンポーネントのREADMEを参照：
- [データベース設計](./db/README.md)
- [バックエンド（Go）](./taskai-server/README.md)
- [フロントエンド（React）](./taskai-web/README.md)
- [クラウド/インフラ設計](./CLOUD.md)

---

## 目次
- [1. 目的](#1-目的)
- [2. 体験のゴール（サクッと）](#2-体験のゴールサクッと)
- [3. 使用固め（ユースケース）](#3-使用固めユースケース)
- [4. ゴールデンモデル（基本方針）](#4-ゴールデンモデル基本方針)
- [5. 情報モデル（データ設計）](#5-情報モデルデータ設計)
- [6. 進行度・優先度の標準](#6-進行度優先度の標準)
- [7. Markdown仕様（タスクの書式）](#7-markdown仕様タスクの書式)
- [8. クエリ仕様（SavedView Query）](#8-クエリ仕様savedview-query)
- [9. お気に入り（Saved View）](#9-お気に入りsaved-view)
- [10. Task Pack（AI引き渡し）](#10-task-packai引き渡し)
- [11. UI黄金配置（画面構成）](#11-ui黄金配置画面構成)
- [12. MVPスコープ](#12-mvpスコープ)
- [13. インフラ方針（CLOUD概要）](#13-インフラ方針cloud概要)
- [付録：テンプレと例](#付録テンプレと例)

---

## 1. 目的
- **Markdownが唯一の真実**：タスク本文をMarkdown原文のまま保管・共有する
- **AIに渡しやすい**：Task Pack生成で、AIが迷いにくい入力を一発で作る
- **人にも読みやすい**：Redmine的にタスクを管理しつつ、軽快に絞り込み・お気に入り表示する

---

## 2. 体験のゴール（サクッと）
- 10秒で「今日やるべきタスク」が出る
- 5秒で「AIに渡せるMarkdown」がクリップボードに載る
- 3クリック以内で「お気に入りビュー」を切り替えられる

---

## 3. 使用固め（ユースケース）

### UC-01: Markdownでタスクを書く
- タスクは「メタ（YAML）」＋「本文（Markdown）」で管理
- 背景・やること・受け入れ条件（AC）をMarkdownで記述

### UC-02: 任意の条件で絞り込む
- 人（担当）・期間（due/start）・優先度（P0..P4）・進行度（open/review等）で複合フィルタ
- 検索（text/title/body）を併用

### UC-03: お気に入り（Saved View）で一発表示
- よく使う条件＋表示形式（列/並び/グループ）を保存
- サイドバーから即呼び出し

### UC-04: AIへTask Packをコピペ
- タスク本文に加えて、制約・関係・AC・出力フォーマットを束ねてコピー
- 複数タスクやSavedView単位でも生成可能

---

## 4. ゴールデンモデル（基本方針）
- **Markdownファースト**：本文は加工しない（原文保持）
- **構造化は最小**：検索/フィルタに必要な分だけをメタデータとして持つ
- **AI引き渡しは一級**：単なるエクスポートではなく、用途別テンプレで“組み立てる”
- **SavedViewが中核**：クエリ＋表示設定を保存し、「探す時間」を消す

---

## 5. 情報モデル（データ設計）

### 5.1 エンティティ
- **Project**
  - `id, name, members, visibility`
- **Task**
  - `id, title, status, priority, assignees, start, due, labels, markdown_body`
  - `relations (parent/child, blocks/blocked_by, related)`
  - `created_at, updated_at`
- **SavedView**
  - `id, name, raw_query, normalized_query, presentation (sort/group/cols/view/limit), owner, scope`
- （推奨）**AuditLog / Revisions**
  - 変更履歴・監査ログ（誰がいつ何を）

---

## 6. 進行度・優先度の標準

### 6.1 Status（進行度）
- `open`：未着手
- `in_progress`：着手中
- `review`：レビュー/確認待ち
- `blocked`：進行不能（理由は本文に）
- `done`：完了
- `archived`：保管（既定で非表示）

推奨遷移：`open → in_progress → review → done`（必要なら途中でblocked）

### 6.2 Priority（優先度）
- `P0`：緊急
- `P1`：今すぐ重要
- `P2`：計画内重要
- `P3`：余裕があれば
- `P4`：いつか

---

## 7. Markdown仕様（タスクの書式）

### 7.1 1タスク = 1ブロック（YAML + Markdown）
- タイトル：`## ID: タイトル`
- メタ：fenced code の `yaml`
- 本文：背景／やること／受け入れ条件 を推奨

#### 例
```md
## T-1042: Markdownタスクのパーサ実装

```yaml
id: T-1042
status: open
priority: P1
assignees: [taku]
start: 2025-12-27
due: 2026-01-05
labels: [backend, parser]


### 7.2 必須フィールド（MVP）
- `id, status, priority, assignees, due（任意）, labels（任意）`

---

## 8. クエリ仕様（SavedView Query）

### 8.1 基本ルール
- 空白区切りは **AND**
- `key:(a b c)` は **OR**
- `-key:value` は **NOT**
- 比較：`due:<=YYYY-MM-DD` など
- 相対：`due:today`, `due:this_week`, `updated:last_7d`

### 8.2 フィルタキー（主要）
- `id`
- `status`（enum）
- `priority`（enum）
- `assignee`（user / `me`）
- `label`
- `due`, `start`（date/rel + 比較）
- `created`, `updated`（datetime/rel）
- `has`（flag：`has:due` 等）
- `text`, `title`, `body`（検索）

### 8.3 表示キー（SavedViewの見た目）
- `sort:due_asc | updated_desc | priority_desc ...`
- `group:status | assignee | priority | label | due_bucket | none`
- `cols:(id title status priority due ...)`
- `view:table | board`
- `limit:50`

### 8.4 代表クエリ
- My Work (Today)
  - `assignee:me due:today -status:(done archived) sort:priority_desc`
- Review Queue
  - `status:review sort:updated_desc`
- Overdue
  - `due:overdue -status:(done archived) sort:due_asc`
- P0/P1 Active
  - `priority:(P0 P1) status:(open in_progress blocked) sort:priority_desc`

### 8.5 バリデーション方針
- **ERROR**：構文破壊（括弧/引用符/コロン未成立）→ 保存不可
- **WARN**：型不正（enum外、日付形式不正）→ 保存可だが修正提案

---

## 9. お気に入り（Saved View）
SavedViewは「条件」だけでなく「表示形式」も保存します。

### 9.1 種類
- **個人ビュー**（private）
- **共有ビュー**（project shared）

### 9.2 既定ビュー（鉄板）
- My Work (Today)
- My Work (This Week)
- Review Queue
- Blocked
- P0/P1 Open

---

## 10. Task Pack（AI引き渡し）

### 10.1 共通セクション（固定）
- 0. 指示（目的/ゴール/期待する出力/制約）
- 1. コンテキスト（プロジェクト/関連/期限/優先度/進行度）
- 2. タスク本文（原文）
- 3. 受け入れ条件（AC）
- 4. AIの回答フォーマット（固定）

### 10.2 テンプレ体系（用途別）
- **IMPLEMENT**：機能追加・改修
- **BUGFIX**：不具合修正（再現/原因/修正/回帰防止）
- **RESEARCH**：調査（比較/推奨/リスク/次アクション）
- **REVIEW**：レビュー依頼（Must/Should/Nice/リスク/テスト）

### 10.3 例：Task Pack（骨格）
```md
# Task Pack: T-1042 — Markdownタスクのパーサ実装

## 0. 指示（最重要）
- 目的：YAMLメタとMarkdown本文を安全に取り込み一覧検索できるようにする
- ゴール：受け入れ条件を満たす実装案を提示
- 期待する出力：方針／変更点（ファイル単位）／主要コード／エッジケース／テスト観点
- 制約：既存のMarkdown原文を破壊しない

## 1. コンテキスト
- プロジェクト：TaskMD
- 期限：2026-01-05 / 優先度：P1 / 進行度：open

## 2. タスク本文（原文）
（タスクMarkdownを貼る）

## 3. 受け入れ条件（確認事項）
（ACを抽出して貼る）

## 4. AIの回答フォーマット
1) 方針
2) 変更点（ファイル単位）
3) 実装詳細（重要部分のコード）
4) エッジケース
5) テスト観点

