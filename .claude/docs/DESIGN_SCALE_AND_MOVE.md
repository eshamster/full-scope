# 画像拡大・縮小・平行移動機能 設計書

## 概要

画像ビューアに画像の拡大・縮小と平行移動機能を追加する。この機能は編集モードとして実装し、通常のナビゲーション操作とは分離して動作する。

## 機能要件

### 基本機能
- 画像の拡大・縮小（マウスホイール操作）
- 画像の平行移動（ドラッグ操作）
- 変形情報のリセット（Ctrl+R）
- 編集モードの開始・終了（Ctrl+Shift+E, Escape）

### 操作仕様
- **編集モード開始**: Ctrl+Shift+E
- **編集モード終了**: Ctrl+Shift+E または Escape
- **ドラッグ**: 画像を移動（編集モード中のみ）
- **マウスホイール**: 拡大（上）10%、縮小（下）10%（編集モード中のみ）
- **Ctrl+R**: 変形情報をリセット（編集モード中のみ）
- **ローカル回転**: Ctrl+矢印キー、Ctrl+Shift+F/B（編集モード中のみ）

### 動作仕様
- 拡大率は100%をデフォルトとし、10%刻みで変更（下限10%、上限なし）
- 変形情報は画像単位で保持
- 複数画像表示時は表示中の全画像に同じ変形を適用
- 変形情報はビューア終了時に揮発
- 編集モード中は変形操作以外のショートカットは無効

### UI表示
- 右上に編集モード状態と操作方法を表示
- 表示内容: "編集モード - ドラッグ:移動 ホイール:拡大縮小 Ctrl+R:リセット Esc:終了"

## アーキテクチャ設計

### 1. コンポーネント構成

```
EditModeController    # 編集モード状態管理
    ↕
Controller           # キーボード・マウス操作管理（モード別）
    ↕
ImageInfo           # 画像情報と変形状態
```

### 2. クラス設計

#### EditModeController
```typescript
export class EditModeController {
  private isEditMode = $state(false);
  
  public enterEditMode(): void
  public exitEditMode(): void
  public isInEditMode(): boolean
  public getEditModeDisplayText(): string
}
```

#### ImageInfo拡張
```typescript
export class ImageInfo {
  // 変形状態（パーセント単位）
  private scalePercent: number = $state(100);  // デフォルト100%
  private positionX: number = $state(0);
  private positionY: number = $state(0);
  
  // 変形操作
  public scaleUp(): void                       // +10%
  public scaleDown(): void                     // -10%（下限10%）
  public movePosition(deltaX, deltaY, rotation): void
  public resetTransform(): void
  
  // ゲッター
  public getScalePercent(): number
  public getScaleRatio(): number               // percent / 100
  public getPositionX(): number
  public getPositionY(): number
}
```

#### Controller拡張（モード別管理）
```typescript
export type Mode = 'View' | 'Edit';

export class Controler {
  private keyToOperations = new Map<Mode, Map<string, Operation>>();
  
  // モード別キー設定初期化
  constructor(..., editModeController: EditModeController)
  
  // モード別操作処理
  public operateByKey(rawKey: string): void
  private operate(operation: Operation): void
}
```

### 3. キー設定管理

#### 通常モード（viewModeKeyConfigs）
```typescript
[
  { key: 'e', operation: 'enterEditMode', modifierKeys: ['ctrl', 'shift'] },
  // 既存のナビゲーション操作...
]
```

#### 編集モード（editModeKeyConfigs）
```typescript
[
  { key: 'Escape', operation: 'exitEditMode', modifierKeys: [] },
  { key: 'e', operation: 'exitEditMode', modifierKeys: ['ctrl', 'shift'] },
  { key: 'r', operation: 'resetTransform', modifierKeys: ['ctrl'] },
  { key: 'WheelUp', operation: 'scaleUp', modifierKeys: [] },
  { key: 'WheelDown', operation: 'scaleDown', modifierKeys: [] },
  // ローカル回転のみ
  { key: 'ArrowRight', operation: 'rotateLocalRight', modifierKeys: ['ctrl'] },
  { key: 'ArrowLeft', operation: 'rotateLocalLeft', modifierKeys: ['ctrl'] },
]
```

## 実装詳細

### 1. 平行移動の座標変換

回転を考慮した移動量の計算：

```typescript
public movePosition(deltaX: number, deltaY: number, rotation: number): void {
  const radians = (rotation * Math.PI) / 180;
  
  // 回転を考慮した座標変換
  const adjustedDeltaX = deltaX * Math.cos(-radians) - deltaY * Math.sin(-radians);
  const adjustedDeltaY = deltaX * Math.sin(-radians) + deltaY * Math.cos(-radians);
  
  this.positionX += adjustedDeltaX;
  this.positionY += adjustedDeltaY;
}
```

### 2. CSS変形の適用

```typescript
function getDynamicImageStyle(img: ImageInfo, element?: HTMLImageElement): string {
  const rotation = manager.getTotalRotation(img);
  const scaleRatio = img.getScaleRatio();
  const posX = img.getPositionX();
  const posY = img.getPositionY();
  
  // 既存のサイズ計算...
  
  const style = `
    width: ${optimal.actualImageWidth}px;
    height: ${optimal.actualImageHeight}px;
    object-fit: fill;
    transform: translate(calc(-50% + ${posX}px), calc(-50% + ${posY}px)) 
               rotate(${rotation}deg) 
               scale(${scaleRatio});
  `.trim();
  
  return style;
}
```

### 3. マウスイベント処理

```typescript
// ドラッグ処理
function handleMouseDown(event: MouseEvent) {
  if (editModeController.isInEditMode() && event.button === 0) {
    isDragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    return;
  }
  // 通常モードの処理...
}

function handleMouseMove(event: MouseEvent) {
  if (!isDragging || !editModeController.isInEditMode()) return;
  
  const deltaX = event.clientX - dragStartX;
  const deltaY = event.clientY - dragStartY;
  
  // 表示中の全画像を移動
  currentImages.forEach(img => {
    const rotation = manager.getTotalRotation(img);
    img.movePosition(deltaX, deltaY, rotation);
  });
  
  dragStartX = event.clientX;
  dragStartY = event.clientY;
}
```

### 4. UI表示

```svelte
<!-- 編集モード表示 -->
{#if editModeController.isInEditMode()}
  <div id="edit-mode-info">
    {editModeController.getEditModeDisplayText()}
  </div>
{/if}

<style>
  #edit-mode-info {
    position: absolute;
    top: 2em;
    left: 0;
    color: black;
    background-color: rgba(255, 255, 255, 0.8);
    padding: 0.2em;
    font-size: 0.9em;
  }
</style>
```

## ファイル変更一覧

### 新規作成
- `src/routes/viewer/edit-mode-controller.svelte.ts`

### 変更対象
- `src/routes/viewer/image-info.svelte.ts` - 変形状態とメソッド追加
- `src/routes/viewer/controller.ts` - モード別キー管理とEditMode操作追加
- `src/routes/viewer/+page.svelte` - EditModeController統合、マウスイベント拡張、UI表示追加

## 実装時の注意事項

1. **featureブランチ作成**: `feature/image-scale-and-move` ブランチで作業
2. **SvelteKit v5ルーン**: `$state`, `$derived`, `$effect` の使用
3. **TypeScript厳密性**: 全ての型を明示
4. **フォーマット**: 実装後に `npm run format` を実行
5. **テスト**: 既存の回転機能との競合がないか確認
6. **既存機能への影響**: 通常モードでの動作に変更がないか確認

## 更新履歴

- 2025-01-14: 初版作成
- パーセント単位での拡大率管理
- モード別キー設定管理の実装
- 編集モードでのグローバル回転無効化
- 回転・拡大率を考慮した平行移動処理