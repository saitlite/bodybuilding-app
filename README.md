# 減量管理アプリ

Next.js 15で構築された、栄養管理とボディメイクをサポートするWebアプリケーションです。

## 機能

### ✅ 実装済み機能

- **食事記録**
  - Azure OpenAI APIによる栄養価自動取得
  - カロリー、PFC（タンパク質・脂質・炭水化物）記録
  - 14種類のミクロ栄養素追跡
  - 食材名サジェスト機能
  
- **目標設定**
  - 除脂肪体重によるPFCバランス計算
  - 身長・体重・年齢による基礎代謝計算
  - メンテナンスカロリーとの差分表示

- **日次記録**
  - 体重（朝）記録
  - 睡眠時間記録
  - 有酸素運動時間記録
  - 消費カロリー自動計算
  - メモ機能

- **統計・分析**
  - 体重推移グラフ
  - カロリー推移グラフ
  - PFC推移グラフ
  - 睡眠推移グラフ
  - PFCバランス円グラフ
  - ミクロ栄養素集計
  - 柔軟な集計範囲設定（日/月/年、全期間）

- **AIアドバイザー**
  - Azure OpenAI連携
  - トークルーム管理
  - メッセージ履歴保存
  - Markdown形式対応

- **PWA対応**
  - ホーム画面追加可能
  - オフライン対応準備

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router), React, TypeScript
- **スタイリング**: Tailwind CSS v4
- **グラフ**: Recharts
- **データベース**: 
  - ローカル: SQLite (better-sqlite3)
  - Vercel: PostgreSQL (@vercel/postgres)
- **AI**: Azure OpenAI API
- **デプロイ**: Vercel

## セットアップ

### ローカル環境

1. **リポジトリのクローン**
```bash
git clone <repository-url>
cd bodybuilding-app
```

2. **依存関係のインストール**
```bash
npm install
```

3. **環境変数の設定**
`.env.local`ファイルを作成：
```env
# Azure OpenAI設定
AZURE_ENDPOINT=https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2024-02-15-preview
AZURE_API_KEY=your-api-key
```

4. **開発サーバーの起動**
```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

### Vercelデプロイ

詳細は [`docs/VERCEL_POSTGRES_SETUP.md`](docs/VERCEL_POSTGRES_SETUP.md) を参照してください。

#### クイックスタート

1. **Vercel Postgresの作成**
   - Vercelダッシュボード → Storage → Create Database → Postgres

2. **スキーマの初期化**
   - Queryタブで `scripts/init-postgres.sql` を実行

3. **環境変数の設定**
   - Azure OpenAI設定を追加（PostgreSQL設定は自動）

4. **デプロイ**
```bash
vercel --prod
```

## データベース

### ローカル環境
- SQLiteを使用（`database.sqlite`）
- データは自動的にローカルファイルに保存

### Vercel環境
- PostgreSQLを使用
- 環境変数`POSTGRES_URL`が存在する場合、自動的にPostgreSQLに切り替わる

### データ移行
ローカルのデータをインポートする場合：
```bash
# CSVインポート（ローカルのみ）
node scripts/import-csv.js
```

## プロジェクト構造

```
bodybuilding-app/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── chat/         # AIチャット
│   │   ├── chat-rooms/   # トークルーム管理
│   │   ├── config/       # ユーザー設定
│   │   ├── daily/        # 日次記録
│   │   ├── foods/        # 食事記録
│   │   └── nutrition/    # 栄養価取得
│   ├── components/        # Reactコンポーネント
│   ├── globals.css       # グローバルスタイル
│   ├── layout.tsx        # ルートレイアウト
│   └── page.tsx          # メインページ
├── lib/                   # ライブラリ
│   ├── db.ts             # SQLite接続（ローカル用）
│   ├── db-wrapper.ts     # DB抽象化レイヤー
│   └── openai.ts         # Azure OpenAI設定
├── public/                # 静的ファイル
│   └── manifest.json     # PWA設定
├── scripts/               # ユーティリティスクリプト
│   ├── import-csv.js     # CSVインポート
│   └── init-postgres.sql # PostgreSQL初期化
└── docs/                  # ドキュメント
    └── VERCEL_POSTGRES_SETUP.md
```

## 使い方

### 初期設定

1. **設定画面を開く**
   - 右上の「設定」ボタンをクリック

2. **体組成情報を入力**
   - 除脂肪体重（PFC目標計算用）
   - 身長・体重・年齢（基礎代謝計算用）

### 日々の記録

1. **体重・活動を記録**
   - 体重（朝）
   - 睡眠時間
   - 有酸素運動時間

2. **食事を記録**
   - 食材名を入力（サジェスト機能あり）
   - 数量と単位を選択
   - 「取得して追加」でAIが栄養価を自動取得

3. **メモを記録**
   - 体調やトレーニング内容などを自由に記入

### 統計の確認

1. **統計タブを開く**
2. **集計範囲を設定**
   - 数値入力（例: 30）
   - 単位選択（日/月/年）
   - または「全期間」ボタン

### AIアドバイス

1. **AIアドバイスタブを開く**
2. **新しい会話を作成**
3. **質問を入力**
   - 現在のデータを元にアドバイス提供

## ライセンス

MIT

## 作者
