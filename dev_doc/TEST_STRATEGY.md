# Full Scope テスト戦略

## 概要
フルスクリーン画像ビューアプロジェクト（Rust/Tauri v2 + SvelteKit v5）の包括的なテスト戦略。2025年のベストプラクティスに基づき、信頼性の高いテストスイートを構築する。

## テストピラミッド

```
     E2E (少数)
   ─────────────
  統合テスト (中程度)
 ───────────────────
単体テスト (大多数)
```

## フロントエンド テスト戦略 (SvelteKit v5)

### 1. 単体テスト - Vitest + Testing Library

#### 対象
- ビジネスロジッククラス
- ユーティリティ関数
- 状態管理ロジック

#### ツールセット
```json
{
  "devDependencies": {
    "vitest": "^2.0.0",
    "@testing-library/svelte": "^5.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jsdom": "^25.0.0"
  }
}
```

#### 重点テスト領域

**ImageInfoManager** (`src/routes/viewer/image-info-manager.svelte.ts`)
- ✅ `addImages()`: 重複画像の除外
- ✅ `getCurrent()`: 空リスト時のエラーハンドリング
- ✅ `gotoNext()/gotoPrev()`: 境界値処理
- ✅ `gotoRandom()`: 現在位置を避けたランダム移動
- ✅ `deleteCurrent()`: リストとセットの同期

**ImageShowHistory** (`src/routes/viewer/image-show-history.ts`)
- ✅ 履歴追加/取得ロジック
- ✅ 履歴ナビゲーション

**Controller** (`src/routes/viewer/controller.ts`)
- ✅ キーボードショートカットマッピング
- ✅ アクション実行ロジック

### 2. コンポーネントテスト - Vitest Browser Mode

#### 対象
- ユーザーインタラクション
- DOM操作を伴うコンポーネント
- SvelteKit v5 ルーン動作確認

#### 重点テスト領域

**ConfirmDialog** (`src/routes/viewer/ConfirmDialog.svelte`)
- ✅ 表示/非表示制御
- ✅ 確認/キャンセルアクション
- ✅ キーボード操作（ESC, Enter）

**CornerToast** (`src/routes/viewer/CornerToast.svelte`)
- ✅ 自動非表示タイマー
- ✅ 複数通知の管理

**PreloadImage** (`src/routes/viewer/PreloadImage.svelte`)
- ✅ 画像読み込み状態管理
- ✅ エラーハンドリング

### 3. E2Eテスト - Playwright

#### 対象
- フルアプリケーションフロー
- ユーザーシナリオ

#### 重点テスト領域
- ✅ ドラッグ&ドロップ → ビューア起動
- ✅ 画像ナビゲーション（矢印キー、スペース）
- ✅ ブックマーク機能
- ✅ ファイル削除フロー

## バックエンド テスト戦略 (Tauri v2/Rust)

### 1. 単体テスト - Rust標準テスト

#### 対象
- 純粋関数
- ビジネスロジック
- エラーハンドリング

#### 重点テスト領域

**extract_image_files** (`src-tauri/src/lib.rs:56`)
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_image_files_with_valid_extensions() {
        // 対応拡張子のテスト
    }

    #[test]
    fn test_extract_image_files_with_directory() {
        // ディレクトリ内画像抽出のテスト
    }

    #[test]
    fn test_extract_image_files_with_invalid_path() {
        // 無効パスのエラーハンドリング
    }
}
```

### 2. 統合テスト - tauri::test

#### セットアップ
```toml
# Cargo.toml
[dev-dependencies]
tauri = { version = "2", features = ["test"] }
```

#### 重点テスト領域

**Tauriコマンドテスト**
```rust
#[cfg(test)]
mod integration_tests {
    use tauri::test::{mock_context, MockRuntime};

    #[tokio::test]
    async fn test_drop_command() {
        // drop コマンドの統合テスト
    }

    #[test]
    fn test_get_prev_image_paths() {
        // get_prev_image_paths の状態管理テスト
    }

    #[test]
    fn test_delete_file_command() {
        // delete_file のファイル操作テスト
    }
}
```

### 3. E2Eテスト - WebDriver

#### セットアップ
```json
{
  "devDependencies": {
    "@wdio/cli": "^8.0.0",
    "tauri-driver": "^0.1.0"
  }
}
```

## テスト設定ファイル

### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts}'],
    browser: {
      enabled: true,
      name: 'chromium',
      provider: 'playwright'
    }
  }
});
```

### playwright.config.ts
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'npm run build && npm run preview',
    port: 4173
  },
  use: {
    baseURL: 'http://localhost:4173',
  }
});
```

## 実装ロードマップ

### フェーズ1: 基盤構築
1. ✅ Vitest + Testing Library セットアップ
2. ✅ ImageInfoManager 単体テスト実装
3. ✅ Rust 単体テスト実装

### フェーズ2: コンポーネントテスト
1. ✅ Vitest Browser Mode セットアップ
2. ✅ 主要コンポーネントテスト実装
3. ✅ Tauri コマンド統合テスト

### フェーズ3: E2Eテスト
1. ✅ Playwright セットアップ
2. ✅ 主要ユーザーフロー実装
3. ✅ WebDriver統合テスト

## CI/CD 統合

### GitHub Actions
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:component

  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cargo test

  test-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:e2e
```

## メトリクス目標

- **単体テストカバレッジ**: 80%以上
- **コンポーネントテスト**: 主要UI要素100%
- **E2Eテスト成功率**: 99%以上
- **テスト実行時間**: 5分以内（CI環境）

## ベストプラクティス

### SvelteKit v5 ルーン対応
- `$state` / `$derived` / `$effect` を適切にモック
- レガシー `$:` 構文は使用しない

### Tauri特有の考慮点
- ファイルシステム操作は一時ディレクトリで実行
- 並行処理はセマフォでテスト
- プラットフォーム依存機能は条件付きテスト

### テストデータ管理
- テスト用画像ファイルは `tests/fixtures/` に配置
- 一時ファイルは各テスト後にクリーンアップ
- モックデータは型安全性を保つ