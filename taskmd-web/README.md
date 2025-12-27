# TaskMD Web

TaskMDのフロントエンドアプリケーション（React + TypeScript + Vite）

## 概要

TaskMD Webは、Markdownを中心としたタスク管理システムのWebインターフェースです。

### 主な機能

- **タスク管理**: Markdownでタスクを作成・編集
- **SavedView**: よく使うクエリを保存して瞬時に呼び出し
- **リアルタイムフィルタ**: 複雑な条件でタスクを絞り込み
- **Task Pack生成**: AI引き渡し用のフォーマット済みMarkdownをワンクリック生成
- **レスポンシブデザイン**: デスクトップとモバイルに対応

## 技術スタック

- **React 18**: UIライブラリ
- **TypeScript**: 型安全性
- **Vite**: 高速ビルドツール
- **React Router**: ルーティング
- **TanStack Query**: データフェッチングとキャッシング
- **Zustand**: 状態管理
- **Axios**: HTTPクライアント
- **React Markdown**: Markdownレンダリング

## ディレクトリ構成

```
taskai-web/
├── src/
│   ├── components/      # 再利用可能なUIコンポーネント
│   ├── pages/           # ページコンポーネント
│   ├── hooks/           # カスタムReact hooks
│   ├── lib/             # ユーティリティ関数とAPIクライアント
│   ├── types/           # TypeScript型定義
│   ├── store/           # Zustand状態管理
│   ├── App.tsx          # アプリケーションルート
│   ├── main.tsx         # エントリーポイント
│   └── index.css        # グローバルスタイル
├── public/              # 静的アセット
├── index.html           # HTMLテンプレート
├── vite.config.ts       # Vite設定
├── tsconfig.json        # TypeScript設定
├── package.json         # 依存関係
├── Dockerfile           # Dockerイメージビルド用
└── README.md            # このファイル
```

## セットアップ

### 前提条件

- Node.js 20以上
- npm または yarn
- （オプション）Docker

### ローカル開発

1. **依存関係のインストール**

```bash
cd taskai-web
npm install
```

2. **環境変数の設定**

```bash
cp .env.example .env
# .envファイルを編集して、VITE_API_BASEを設定
```

3. **開発サーバーの起動**

```bash
npm run dev
```

アプリケーションは `http://localhost:5173` で起動します。

### ビルド

```bash
# プロダクションビルド
npm run build

# ビルド結果をプレビュー
npm run preview
```

### Docker での起動

```bash
# イメージをビルド
docker build -t taskai-web .

# コンテナを起動
docker run -p 80:80 taskai-web
```

アプリケーションは `http://localhost` で利用可能になります。

## 開発

### 型チェック

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### コードフォーマット

```bash
npm run format  # (要設定)
```

## プロジェクト構造

### ページ

- **HomePage**: ダッシュボード、プロジェクト一覧
- **ProjectPage**: プロジェクト詳細、タスク一覧
- **TaskPage**: タスク詳細、編集

### コンポーネント

- **Layout**: アプリケーション全体のレイアウト
- **Header**: ヘッダーナビゲーション
- **Sidebar**: SavedViewのリスト
- **TaskList**: タスク一覧表示
- **TaskCard**: タスクカード（ボードビュー用）
- **TaskEditor**: タスク編集フォーム
- **MarkdownPreview**: Markdownプレビュー

### API統合

`src/lib/api.ts` にすべてのAPI呼び出しが集約されています。

```typescript
import { tasksApi } from '@/lib/api'

// タスク一覧取得
const tasks = await tasksApi.list(projectId)

// タスク作成
const newTask = await tasksApi.create(projectId, {
  title: 'New Task',
  markdown_body: '## Description\n...',
})
```

### 状態管理

Zustandを使用した軽量な状態管理：

```typescript
// 今後実装予定
```

### クエリキャッシング

TanStack Query（React Query）でサーバーステートを管理：

```typescript
import { useQuery } from '@tanstack/react-query'
import { tasksApi } from '@/lib/api'

function TaskList({ projectId }: { projectId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list(projectId),
  })

  // ...
}
```

## 環境変数

`.env.example` を参照してください。

- `VITE_API_BASE`: バックエンドAPIのベースURL

## デプロイ

### 本番ビルド

```bash
npm run build
```

ビルド結果は `dist/` ディレクトリに出力されます。

### Nginx設定

`nginx.conf` を参照してください。SPAルーティングに対応しています。

### Docker

```bash
docker build -t taskai-web:latest .
docker push your-registry/taskai-web:latest
```

## 今後の実装予定

### Phase 1: MVP

- [x] プロジェクト構成
- [x] ルーティング
- [x] 基本的なページ構造
- [ ] タスク一覧表示
- [ ] タスク詳細表示
- [ ] タスク編集フォーム
- [ ] SavedView実装

### Phase 2: コア機能

- [ ] Markdownエディタ
- [ ] Task Pack生成UI
- [ ] フィルタ・検索UI
- [ ] ボードビュー（カンバン）
- [ ] タスク関連表示

### Phase 3: 拡張機能

- [ ] リアルタイム更新（WebSocket）
- [ ] コメント機能
- [ ] 添付ファイルアップロード
- [ ] キーボードショートカット
- [ ] ダークモード

## トラブルシューティング

### ポートがすでに使用されている

```bash
# ポートを変更
PORT=3000 npm run dev
```

### APIに接続できない

`.env` ファイルの `VITE_API_BASE` が正しいか確認してください。

### ビルドエラー

```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

## ライセンス

MIT

## 貢献

プルリクエストを歓迎します！
