# 画像回転機能設計書

**作成日**: 2025-08-10
**バージョン**: 1.0

## 1. 概要

Full Scope フルスクリーン画像ビューアに、画像を90度単位で回転して表示する機能を追加する。

### 1.1 機能の特徴
- 90度単位での画像回転表示
- グローバル回転とローカル回転の2層構造
- キーボードショートカットによる操作
- グリッド表示時の複数画像同時回転対応
- 揮発性の回転情報（ビューア終了時にリセット）

## 2. 設計方針

### 2.1 回転情報の管理方式

**2層構造による回転状態管理**：
- **グローバル回転**: 全画像に共通して適用される回転角度
- **ローカル回転**: 各画像個別の回転角度
- **実際の表示角度**: `グローバル回転 + ローカル回転`

### 2.2 操作インターフェース

既存の`Controller`クラスの`Operation`型を拡張し、4つの回転操作を提供：
- グローバル右90度回転
- グローバル左90度回転  
- ローカル右90度回転
- ローカル左90度回転

### 2.3 データの永続化

回転情報は揮発性として扱い、ビューアが閉じられると初期化される。

## 3. 詳細設計

### 3.1 ImageInfoクラスの拡張

**ファイル**: `src/routes/viewer/image-info.ts`

```typescript
export class ImageInfo {
  private tempBookmark: boolean = false;
  private localRotation: number = 0; // ローカル回転角度（0, 90, 180, 270度）

  constructor(public path: string) {}

  // 既存メソッド（省略）...

  // 新規追加メソッド
  public rotateLocalRight(): void {
    this.localRotation = (this.localRotation + 90) % 360;
  }

  public rotateLocalLeft(): void {
    this.localRotation = (this.localRotation - 90 + 360) % 360;
  }

  public getLocalRotation(): number {
    return this.localRotation;
  }
}
```

### 3.2 ImageInfoManagerクラスの拡張

**ファイル**: `src/routes/viewer/image-info-manager.svelte.ts`

```typescript
export class ImageInfoManager {
  private list: ImageInfo[] = $state([]);
  private caret: number = $state(0);
  private globalRotation: number = $state(0); // グローバル回転角度

  // 既存メソッド（省略）...

  // 新規追加メソッド
  
  // グローバル回転操作
  public rotateGlobalRight(): void {
    this.globalRotation = (this.globalRotation + 90) % 360;
  }

  public rotateGlobalLeft(): void {
    this.globalRotation = (this.globalRotation - 90 + 360) % 360;
  }

  public getGlobalRotation(): number {
    return this.globalRotation;
  }

  // ローカル回転操作
  public rotateCurrentLocalRight(): void {
    if (this.list.length > 0) {
      this.getCurrent().rotateLocalRight();
    }
  }

  public rotateCurrentLocalLeft(): void {
    if (this.list.length > 0) {
      this.getCurrent().rotateLocalLeft();
    }
  }

  // グリッド表示対応のローカル回転操作
  public rotateVisibleLocalRight(visibleIndices: number[]): void {
    visibleIndices.forEach(index => {
      if (index < this.list.length) {
        this.list[index].rotateLocalRight();
      }
    });
  }

  public rotateVisibleLocalLeft(visibleIndices: number[]): void {
    visibleIndices.forEach(index => {
      if (index < this.list.length) {
        this.list[index].rotateLocalLeft();
      }
    });
  }

  // 合成回転角度の取得
  public getTotalRotation(imageInfo: ImageInfo): number {
    return (this.globalRotation + imageInfo.getLocalRotation()) % 360;
  }
}
```

### 3.3 Controllerクラスの拡張

**ファイル**: `src/routes/viewer/controller.ts`

#### 3.3.1 Operation型の拡張

```typescript
export type Operation =
  | 'next'
  | 'prev'
  // ... 既存の操作
  | 'rotateGlobalRight'   // 新規追加
  | 'rotateGlobalLeft'    // 新規追加
  | 'rotateLocalRight'    // 新規追加
  | 'rotateLocalLeft';    // 新規追加
```

#### 3.3.2 キーバインド設定の追加

```typescript
const additionalKeyConfigs: keyConfig[] = [
  { key: 'ArrowRight', operation: 'rotateGlobalRight', modifierKeys: ['ctrl', 'shift'] },
  { key: 'ArrowLeft', operation: 'rotateGlobalLeft', modifierKeys: ['ctrl', 'shift'] },
  { key: 'ArrowRight', operation: 'rotateLocalRight', modifierKeys: ['ctrl'] },
  { key: 'f', operation: 'rotateLocalRight', modifierKeys: ['ctrl', 'shift'] },
  { key: 'ArrowLeft', operation: 'rotateLocalLeft', modifierKeys: ['ctrl'] },
  { key: 'b', operation: 'rotateLocalLeft', modifierKeys: ['ctrl', 'shift'] },
];
```

#### 3.3.3 operate()メソッドの拡張

```typescript
private operate(operation: Operation): void {
  // ... 既存のswitch文に以下を追加

  case 'rotateGlobalRight':
    this.imageInfoManager.rotateGlobalRight();
    break;
  case 'rotateGlobalLeft':
    this.imageInfoManager.rotateGlobalLeft();
    break;
  case 'rotateLocalRight': {
    const visibleIndices = this.viewerController.getVisibleImageIndices();
    this.imageInfoManager.rotateVisibleLocalRight(visibleIndices);
    break;
  }
  case 'rotateLocalLeft': {
    const visibleIndices = this.viewerController.getVisibleImageIndices();
    this.imageInfoManager.rotateVisibleLocalLeft(visibleIndices);
    break;
  }
}
```

### 3.4 ViewerControllerクラスの拡張

**ファイル**: `src/routes/viewer/viewer-controller.svelte.ts`

```typescript
export class ViewerController {
  // 既存のプロパティ...

  // 新規追加メソッド
  public getVisibleImageIndices(): number[] {
    const indices: number[] = [];
    const totalCells = this.rows * this.cols;
    const startIndex = this.imageInfoManager.getCaret();
    
    for (let i = 0; i < totalCells && startIndex + i < this.imageInfoManager.getList().length; i++) {
      indices.push(startIndex + i);
    }
    
    return indices;
  }
}
```

### 3.5 Svelteテンプレートでの回転適用

**ファイル**: `src/routes/viewer/+page.svelte`

```svelte
<!-- img要素に回転スタイルを適用 -->
<img
  src="asset://localhost/{imageInfo.path}"
  alt="画像"
  style="transform: rotate({imageInfoManager.getTotalRotation(imageInfo)}deg);"
/>
```

## 4. キーボードショートカット

| 操作 | ショートカットキー | 説明 |
|------|------------------|------|
| グローバル右90度回転 | `Ctrl+Shift+Right` | 全画像を右に90度回転 |
| グローバル左90度回転 | `Ctrl+Shift+Left` | 全画像を左に90度回転 |
| ローカル右90度回転 | `Ctrl+Right`<br>`Ctrl+Shift+F` | 表示中の画像を右に90度回転 |
| ローカル左90度回転 | `Ctrl+Left`<br>`Ctrl+Shift+B` | 表示中の画像を左に90度回転 |

## 5. 実装時の注意事項

### 5.1 角度計算の安全性
- 回転角度は常に0, 90, 180, 270度の4値に制限
- 外部からは`right`/`left`方向のみを受け取り、内部で90度単位の計算を実行

### 5.2 グリッド表示対応
- ローカル回転操作時は、現在表示されている全ての画像に対して操作を適用
- `ViewerController.getVisibleImageIndices()`で表示中の画像インデックスを取得

### 5.3 既存機能との整合性
- 既存のキーバインドシステムとの統合
- SvelteKit v5のルーンシステムに準拠した状態管理

### 5.4 開発プロセス
- featureブランチで開発を実施
- 実装完了後は適切なテストを実行してからマージ

## 6. テスト観点

### 6.1 単体テスト
- `ImageInfo`クラスの回転メソッドのテスト
- `ImageInfoManager`クラスの回転管理機能のテスト
- 角度計算の正確性検証

### 6.2 統合テスト
- キーボードショートカットの動作確認
- グリッド表示時の複数画像回転テスト
- 回転状態のリセット動作確認

### 6.3 UI/UXテスト
- 回転表示の視覚的確認
- 操作レスポンスの確認
- 既存機能への影響確認

---

この設計書は、Full Scope画像ビューアに画像回転機能を安全かつ効率的に統合するための包括的な指針を提供します。