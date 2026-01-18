# Vercel PostgreSQL セットアップ手順

このアプリは、ローカル環境ではSQLite、Vercelデプロイ時はPostgreSQLを使用できます。

## 1. Vercel Postgresの作成

1. Vercelダッシュボードにログイン
2. プロジェクトの「Storage」タブを開く
3. 「Create Database」をクリック
4. 「Postgres」を選択
5. データベース名を入力（例：bodybuilding-app-db）
6. 「Create」をクリック

## 2. 環境変数の設定

Vercelが自動的に以下の環境変数を設定します：
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

これらは自動的にプロジェクトに追加されます。

## 3. スキーマの初期化

### 方法1: Vercelダッシュボードから実行

1. Storageタブで作成したPostgresデータベースを開く
2. 「Query」タブを開く
3. `scripts/init-postgres.sql`の内容をコピー&ペースト
4. 「Run Query」をクリック

### 方法2: ローカルから実行（推奨）

```bash
# Vercel CLIをインストール（未インストールの場合）
npm install -g vercel

# Vercelにログイン
vercel login

# プロジェクトをリンク
vercel link

# 環境変数を取得
vercel env pull .env.local

# PostgreSQLに接続してスキーマを実行
# （POSTGRES_URL環境変数が必要）
psql $POSTGRES_URL -f scripts/init-postgres.sql
```

## 4. デプロイ

```bash
# Vercelにデプロイ
vercel --prod
```

## 5. 動作確認

1. デプロイしたURLにアクセス
2. 設定画面で除脂肪体重や身長・体重・年齢を入力
3. 食事を記録してデータが保存されることを確認

## ローカル環境での開発

ローカル環境では引き続きSQLiteを使用します：

```bash
# 開発サーバー起動
npm run dev
```

## トラブルシューティング

### データが保存されない

- Vercelダッシュボードで環境変数が正しく設定されているか確認
- `POSTGRES_URL`が存在するか確認
- スキーマが正しく初期化されているか確認

### SQLエラーが発生する

- `scripts/init-postgres.sql`を再実行
- Vercelのログを確認（`vercel logs`）

### ローカルとVercelでデータが異なる

これは正常な動作です。ローカルはSQLite（`database.sqlite`）、VercelはPostgreSQLを使用しているため、データは別々に管理されます。

## データ移行

ローカルのSQLiteデータをVercel PostgreSQLに移行する場合：

1. ローカルでデータをエクスポート
2. PostgreSQL形式に変換
3. Vercelのデータベースにインポート

詳細は別途ドキュメントを参照してください。
