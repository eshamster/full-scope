# Full Scope Codex

## 概要
- フルスクリーン画像ビューア（Rust/Tauri + SvelteKit）
- 学習用サンプルを兼ねる

## 技術スタック
- FE: SvelteKit v5, TypeScript, Vite
- BE: Rust, Tauri v2
- 管理: pnpm, Makefile

## ディレクトリ構成（主要）
- src/ → SvelteKit アプリ
- src-tauri/ → Rust（Tauri）コード
- static/ → 静的アセット
- package.json, Makefile

## 主要フロー
1. 画像を Drag & Drop
2. SvelteKit → Tauri \\`drop(paths)\\` → パス抽出
3. ビューア生成 → \\`new-images\\` emit
4. /viewer 受信 → ImageInfoManager 登録・表示
5. 操作（次へ/前へ/削除/ブックマーク）

## 主要コンポーネント
- ImageInfoManager：画像リスト・履歴管理
- Controller：キー操作⇔アクション
- FileController：ゴミ箱移動（Tauri command）
- DialogController：削除確認ダイアログ
- ToastController：一時通知

## よく使うコマンド
- \\`make run\\` → 開発モード
- \\`make build\\` → 本番ビルド

## よくある間違いと対策
### SvelteKit v5 でLegacyとなっている書き方をしない

`$:` 記法は利用しない。
`$derived`, `$effect` で代替する

- NG1: `$derived` で置き換える例

```js
let count = 1;
$: double = cound * 2;
```

- OK1

```js
let count = $state(1);
let double = $derived(count * 2);
```

- NG2: `$effect` で置き換える例

```js
let count = 1;
$: { console.log(`count changed → ${count}`); }
```

- OK2

```js
let count = $state(1);
$effect(() => { console.log(`count changed → ${count}`); });
```
