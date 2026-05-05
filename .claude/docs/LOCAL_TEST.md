# ローカルテスト実行ガイド

CI 側でのエラー修正による手戻りを防ぐため、commit 後に変更箇所に応じたテストをローカルで実行する。
変更がフロントのみ・バックエンドのみであれば、それぞれの該当セクションのみで十分。

## フロントエンドの変更時

### commit 前
```sh
npm run format
```

### commit 後
```sh
npm run format         # フォーマット確認
npm run lint:fix       # ESLint チェック・修正
npm run check          # 型チェック
npm run test           # テスト実行
npm run test:coverage  # カバレッジ付き
```

## バックエンドの変更時

### commit 後
```sh
cd src-tauri
cargo test
cargo fmt --check
cargo clippy -- -D warnings
```
