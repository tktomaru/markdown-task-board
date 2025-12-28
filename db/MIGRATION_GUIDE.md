# データベースマイグレーションガイド

このガイドでは、TaskMDデータベースの初期化、データのエクスポート、およびマイグレーション方法について説明します。

## 目次

1. [データベース初期化](#データベース初期化)
2. [現在のデータをエクスポート](#現在のデータをエクスポート)
3. [プロダクションデータで初期化](#プロダクションデータで初期化)
4. [使用例](#使用例)

## データベース初期化

### 基本的な使い方

```bash
# スキーマのみ初期化（データなし）
./db/init.sh

# 開発用サンプルデータ込みで初期化
./db/init.sh --seed

# プロダクションデータで初期化（要: production_seed.sql）
./db/init.sh --seed-prod

# 既存のDBを削除して再作成
./db/init.sh --drop --seed
```

### オプション

- `--seed`: 開発用サンプルデータ（`dev_seed.sql`）を読み込む
- `--seed-prod`: プロダクションデータ（`production_seed.sql`）を読み込む
- `--drop`: 既存のデータベースを削除してから作成（**警告: 全データが削除されます**）
- `--help`, `-h`: ヘルプメッセージを表示

### 環境変数

以下の環境変数でデータベース接続情報を設定できます：

```bash
DB_HOST=localhost        # デフォルト: localhost
DB_PORT=5432            # デフォルト: 5432
DB_NAME=taskmd          # デフォルト: taskmd
DB_USER=postgres        # デフォルト: postgres
DB_PASSWORD=your_pass   # デフォルト: なし
```

## 現在のデータをエクスポート

現在のデータベースの内容をSQLファイルとしてエクスポートします。

### 基本的な使い方

```bash
# デフォルトの出力先（db/seeds/production_seed.sql）にエクスポート
./db/export_data.sh

# カスタムファイル名で出力
./db/export_data.sh --output db/seeds/my_backup.sql

# タイムスタンプ付きでバックアップ
./db/export_data.sh --timestamp
# 出力例: db/seeds/backup_20251228_143052.sql
```

### オプション

- `--output FILE`, `-o FILE`: 出力ファイルのパスを指定
- `--timestamp`: ファイル名にタイムスタンプを追加
- `--help`, `-h`: ヘルプメッセージを表示

### エクスポートされるデータ

以下のテーブルのデータがエクスポートされます：

1. **users** - ユーザー情報
2. **projects** - プロジェクト情報（アーカイブ済みを除く）
3. **tasks** - タスク情報（アーカイブ済みを除く）
4. **saved_views** - 保存ビュー

## プロダクションデータで初期化

プロダクション環境のデータを新しいデータベースに移行する手順：

### ステップ1: 現在のデータをエクスポート

```bash
# プロダクション環境で実行
cd /path/to/taskmd
./db/export_data.sh
```

これにより `db/seeds/production_seed.sql` が作成されます。

### ステップ2: エクスポートファイルを新環境にコピー

```bash
# 新しい環境にファイルをコピー
scp db/seeds/production_seed.sql user@new-server:/path/to/taskmd/db/seeds/
```

### ステップ3: 新環境でデータベースを初期化

```bash
# 新しい環境で実行
cd /path/to/taskmd

# プロダクションデータで初期化
./db/init.sh --seed-prod
```

## 使用例

### 例1: 開発環境のセットアップ

```bash
# 1. データベースを作成してサンプルデータを投入
./db/init.sh --seed

# 2. アプリケーションを起動
cd taskmd-server
go run cmd/server/main.go
```

### 例2: ステージング環境へのデプロイ

```bash
# 1. プロダクションからデータをエクスポート
ssh prod-server "cd /app/taskmd && ./db/export_data.sh --timestamp"

# 2. バックアップファイルをダウンロード
scp prod-server:/app/taskmd/db/seeds/backup_*.sql ./db/seeds/production_seed.sql

# 3. ステージング環境で初期化
./db/init.sh --drop --seed-prod
```

### 例3: 定期バックアップ

```bash
# cronで毎日バックアップを取る
0 2 * * * cd /app/taskmd && ./db/export_data.sh --timestamp
```

### 例4: データベースのリセット

```bash
# 開発中にデータベースをクリーンな状態に戻す
./db/init.sh --drop --seed

# または、プロダクションデータで再作成
./db/init.sh --drop --seed-prod
```

## トラブルシューティング

### エクスポートが失敗する

```bash
# PostgreSQLへの接続を確認
psql -h localhost -U postgres -d taskmd -c '\dt'

# 環境変数を設定
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=taskmd
export DB_USER=postgres
export DB_PASSWORD=your_password

# 再度実行
./db/export_data.sh
```

### production_seed.sql が見つからない

```bash
# まずエクスポートを実行
./db/export_data.sh

# ファイルが作成されたか確認
ls -lh db/seeds/production_seed.sql

# その後、初期化を実行
./db/init.sh --seed-prod
```

### データ量が多い場合

大量のデータをエクスポート/インポートする場合は、PostgreSQLの標準ツールを使用することも検討してください：

```bash
# pg_dumpを使用してバックアップ
pg_dump -h localhost -U postgres -d taskmd -F c -f taskmd_backup.dump

# pg_restoreでリストア
pg_restore -h localhost -U postgres -d taskmd_new taskmd_backup.dump
```

## 注意事項

- `--drop` オプションは既存のデータベースを完全に削除します。使用前に必ずバックアップを取ってください。
- エクスポートされたSQLファイルには機密情報（パスワードハッシュなど）が含まれる可能性があります。取り扱いに注意してください。
- アーカイブ済みのプロジェクトとタスクはエクスポートされません。必要な場合はスクリプトを修正してください。

## スクリプトファイル

- `db/init.sh` - データベース初期化スクリプト
- `db/export_data.sh` - データエクスポートスクリプト
- `db/schema/` - スキーマ定義SQLファイル
- `db/seeds/` - シードデータSQLファイル
  - `dev_seed.sql` - 開発用サンプルデータ
  - `production_seed.sql` - プロダクションデータ（エクスポートで作成）
