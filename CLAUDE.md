# Full Scope - フルスクリーン画像ビューア

Rust/Tauri v2 + SvelteKit v5 (ルーン) で構築されたフルスクリーン画像ビューア。
ユーザー向け概要は `README.md` を参照。

## アーキテクチャ

### 主要フロー
1. **画像読み込み**: ランディングページ (`src/routes/+page.svelte`) で画像をドラッグ&ドロップ
2. **パス処理**: SvelteKit → Tauri `drop(paths)` コマンド実行
3. **ビューア生成**: `ImageInfo` 生成 → `new-images` イベント発行
4. **ナビゲーション**: `/viewer` ルートが受信 → `ImageInfoManager` が表示管理
5. **ユーザー操作**: ナビゲート、削除、ブックマーク

### 主要コンポーネント (`src/routes/viewer/`)
- `ImageInfoManager` (`image-info-manager.svelte.ts`): 画像リスト・ナビゲーション・履歴の状態管理
- `Controller` (`controller.ts`): キーボードショートカットとアクション
- `FileController` (`file-controller.ts`): Tauri 経由のファイル操作
- `DialogController` (`dialog-controller.svelte.ts`): 削除確認 UI
- `ToastController` (`toast-controller.svelte.ts`): 一時通知

### API パターン
- Tauri コマンドは型安全のため `src/lib/api/` でラップ
- フロント-バック間通信は Tauri のイベントシステムを使用

## コーディングルール

### SvelteKit v5 ルーン (重要)
レガシー構文 (`$:` リアクティブ文) は使わず、ルーンを使用する：
```typescript
let count = $state(1);
let double = $derived(count * 2);
$effect(() => { /* 副作用 */ });
```
状態管理はクラスベース (例: `ImageInfoManager`) を採用し、フィールドに `$state` を付与する。

### その他
- UI (`.svelte`) とロジック (`.ts`) のファイル分離を維持
- 並行操作には `await-semaphore` を使用
- ファイル参照は `ファイルパス:行番号` 形式 (例: `src/routes/viewer/image-info-manager.svelte.ts:164`)

## 開発ワークフロー

- **編集後フォーマット (必須)**:
  - フロント編集後 (commit 前): `npm run format`
  - Rust 編集後: `cd src-tauri && cargo fmt`
- **commit 後のチェック**: 変更箇所に応じて選択的に実行 → `.claude/docs/LOCAL_TEST.md`
- **feature ブランチのマージ**: `--no-ff` を使い、マージコミットを作成して履歴を保持

## ドキュメント

開発系ドキュメントは `.claude/docs/` 配下 (日本語で記述)：
- `LOCAL_TEST.md` - ローカルテスト実行ガイド
- `TEST_STRATEGY.md` - テスト戦略
- `TODO.md` - タスクリスト
- `DESIGN_*.md` - 機能設計

ユーザー向けドキュメント (README 等) はプロジェクトルートに配置する。
