# Full Scope - フルスクリーン画像ビューア

## プロジェクト概要
Rust/Tauri v2 バックエンドと SvelteKit v5 フロントエンドで構築されたフルスクリーン画像ビューア。画像のドラッグ&ドロップ読み込み、ナビゲーション、ブックマーク、ファイル管理機能を提供。

## 技術スタック
- **フロントエンド**: SvelteKit v5, TypeScript, Vite
- **バックエンド**: Rust, Tauri v2
- **パッケージ管理**: pnpm
- **ビルドシステム**: Makefile, npm scripts

## プロジェクト構成
```
src/                     # SvelteKit アプリケーション
├── routes/             
│   ├── +page.svelte    # ドラッグ&ドロップ対応のランディングページ
│   └── viewer/         # 画像ビューア コンポーネント
│       ├── +page.svelte
│       ├── image-info-manager.svelte.ts
│       ├── controller.ts
│       └── ...
├── lib/
│   └── api/            # Tauri API ラッパー
src-tauri/              # Rust/Tauri バックエンド
├── src/
│   ├── main.rs
│   └── lib.rs
static/                 # 静的アセット
dev_doc/                # 開発ドキュメント
├── TEST_STRATEGY.md    # テスト戦略
└── ...                 # その他開発関連ドキュメント
```

## アプリケーション主要フロー
1. **画像読み込み**: ランディングページで画像をドラッグ&ドロップ
2. **パス処理**: SvelteKit → Tauri `drop(paths)` コマンド実行
3. **ビューア生成**: ImageInfo オブジェクト生成 → `new-images` イベント発行
4. **ナビゲーション**: `/viewer` ルートが画像を受信 → ImageInfoManager が表示管理
5. **ユーザー操作**: ナビゲート（次へ/前へ）、削除、ブックマーク

## 主要コンポーネント

### フロントエンド (SvelteKit v5)
- **ImageInfoManager** (`src/routes/viewer/image-info-manager.svelte.ts`): 画像リスト、ナビゲーション、履歴のコア状態管理
- **Controller** (`src/routes/viewer/controller.ts`): キーボードショートカットとアクション
- **FileController** (`src/routes/viewer/file-controller.ts`): Tauri コマンド経由のファイル操作
- **DialogController** (`src/routes/viewer/dialog-controller.svelte.ts`): 削除確認UI
- **ToastController** (`src/routes/viewer/toast-controller.svelte.ts`): 一時通知

### バックエンド (Tauri/Rust)
- **メインエントリ** (`src-tauri/src/main.rs`): アプリケーションエントリポイント
- **ライブラリ** (`src-tauri/src/lib.rs`): コア Tauri アプリケーションロジックとコマンド

## 利用可能コマンド
```bash
# 開発
make run          # 開発サーバー起動 (npm run tauri dev)
npm run dev       # SvelteKit 開発のみ
npm run check     # 型チェック

# プロダクション
make build        # アプリケーションビルド (npm run tauri build) 
npm run build     # SvelteKit ビルドのみ

# テスト
npm run check:watch  # 監視モード型チェック
```

## SvelteKit v5 移行ガイドライン

**重要**: このプロジェクトは新しいルーンシステムを使用する SvelteKit v5 を採用。レガシーパターンは避ける：

### 状態管理
```typescript
// ❌ レガシーなリアクティブ構文
let count = 1;
$: double = count * 2;

// ✅ モダンなルーン
let count = $state(1);
let double = $derived(count * 2);
```

### 副作用
```typescript
// ❌ レガシーなリアクティブ文
let count = 1;
$: { console.log(`count changed → ${count}`); }

// ✅ モダンなエフェクト
let count = $state(1);
$effect(() => { console.log(`count changed → ${count}`); });
```

### コンポーネント状態
```typescript
// ✅ クラスベースの状態管理（このプロジェクトで使用）
export class ImageInfoManager {
  private list: ImageInfo[] = $state([]);
  private caret: number = $state(0);
  // ...
}
```

## API パターン
- **Tauri コマンド**: `src/lib/api/` に配置 (files.ts, tags.ts)
- **イベントシステム**: フロントエンド-バックエンド間通信にTauriのイベントシステムを使用
- **ファイル操作**: 型安全性のためTypeScript APIでラップ

## 開発ガイドライン
- ルーンを使用した既存の SvelteKit v5 パターンに従う
- TypeScript を厳密に使用 - 全ファイルは `.ts` または `.svelte` であること
- UI コンポーネント（`.svelte`）とロジック（`.ts`）の分離を維持
- 必要に応じてセマフォを使用した並行操作
- ファイル操作は非同期で実行し、適切にエラーハンドリングを行う
- **Rustファイル編集後**: `src-tauri` フォルダ配下で `cargo fmt` を実行してコードフォーマットを適用
- **フロントエンドファイル編集後**: commit前に `npm run format` を実行してコードフォーマットを適用
- **TODO**: hooks設定でファイル編集時の自動フォーマット実行を設定する（Rustは `cargo fmt`、フロントエンドは `npm run format`）

## ローカルテスト実行ガイドライン

CI側でのエラー修正による手戻りを防ぐため、変更のcommit後に必要なテストをローカルで実行する：

### フロントエンドの変更時
commit前に以下のコマンドを実行：

```bash
# コードフォーマット実行
npm run format
```

commit後に以下のコマンドを順次実行：

```bash
# 依存関係インストール（必要に応じて）
pnpm install

# ESLintチェック・修正
npm run lint:fix

# 型チェック
npm run check

# フロントエンドテスト実行
npm run test

# カバレッジ付きテスト実行
npm run test:coverage
```

### バックエンドの変更時
commit後に以下のコマンドを順次実行：

```bash
# src-tauriディレクトリに移動
cd src-tauri

# バックエンドテスト実行
cargo test

# コードフォーマットチェック
cargo fmt --check

# Clippy（静的解析）実行
cargo clippy -- -D warnings
```

**注意**: これらのテストは変更内容に応じて選択的に実行。フロントエンドのみの変更ならフロントエンドテストのみ、バックエンドのみの変更ならバックエンドテストのみを実行すれば十分。

## 開発ドキュメント管理

### dev_doc/ フォルダ
開発に関するドキュメントは `dev_doc/` フォルダに格納：

- **テスト関連**: `TEST_STRATEGY.md` - 包括的なテスト戦略とセットアップガイド
- **アーキテクチャ**: 設計判断、技術選択の記録
- **デプロイメント**: CI/CD、リリースプロセス
- **トラブルシューティング**: 既知の問題と解決策

### ドキュメント作成ガイドライン
- 開発系ドキュメントは必ず `dev_doc/` 配下に作成
- ユーザー向けドキュメント（README等）はプロジェクトルートに配置
- 日本語での記述を基本とする
- 更新日時とバージョン情報を含める

## ファイル参照形式
コードの場所を参照する際は `ファイルパス:行番号` の形式を使用：
- 例: `src/routes/viewer/image-info-manager.svelte.ts:164`
