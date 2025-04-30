# Codex

このドキュメントは、プロジェクト「Full Scope」の基本要素をまとめた参照用コーデックスです。
今後の指示や理解のために参照してください。

---

## プロジェクト概要
- 名称：Full Scope
- 説明：フルスクリーン画像ビューア。Rust (Tauri) と SvelteKit/TypeScript の学習用サンプル。
- ライセンス：MIT

## 技術スタック
- フロントエンド：SvelteKit, TypeScript, Vite
- バックエンド：Rust, Tauri v2, tauri-plugin-opener
- パッケージ管理：pnpm
- ビルドツール：Makefile（`make run`, `make build`）

## ディレクトリ構成
```
.
├─ codex.md           # 本ファイル
├─ README.md          # プロジェクト概要・セットアップ
├─ src/               # SvelteKit アプリケーション
│   ├─ app.html       # HTML テンプレート
│   └─ routes/
│       ├─ +page.svelte           # トップページ (Drag & Drop)
│       └─ viewer/                # ビューア用ページ・コンポーネント群
├─ build/             # Vite/SvelteKit ビルド出力
├─ static/            # 静的アセット (favicon, logo など)
├─ src-tauri/         # Tauri (Rust) アプリケーション
│   ├─ src/
│   │   ├─ main.rs    # エントリポイント
│   │   └─ lib.rs     # Tauri コマンド実装
│   └─ tauri.conf.json
├─ package.json, pnpm-lock.yaml
└─ Makefile
```

## 主な機能フロー
1. トップページに画像ファイルやフォルダをドラッグ & ドロップ
2. SvelteKit から Tauri コマンド `drop(paths)` を呼び出し
3. Rust 側でファイル拡張子をチェックし、画像パスを抽出
4. ビューアウィンドウを生成／表示し、`new-images` イベントを emit
5. /viewer ページで受信し、ImageInfoManager に登録して表示
6. キー／ホイール／マウス操作で画像の切り替え、履歴、ランダム、ブックマーク、削除などを実行

## 主なコンポーネント／クラス
- ImageInfoManager：画像リスト・カーソル位置・履歴管理
- Controler：キー操作⇔アプリ動作マッピング（次へ／前へ／削除／ブックマーク 等）
- DialogController / ConfirmDialog：削除確認ダイアログ
- ToastController / CornerToast：一時通知 (ブックマーク成功メッセージ 等)
- FileController：Tauri コマンド経由でゴミ箱へ移動
- Rust (`lib.rs`)：`drop`, `get_prev_image_paths`, `delete_file` コマンド実装

## 開発・ビルド
- 依存インストール：`pnpm install`
- Tauri 初期化（Android 含む）：`pnpm tauri android init`
- 開発モード起動：`pnpm tauri dev` または `make run`
- 本番ビルド：`pnpm tauri build` または `make build`

---
## 更新履歴
- 2025-04-30: codex.md 作成・基本要素をまとめる