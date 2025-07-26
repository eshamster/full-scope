# タグによる絞り込み機能 - 詳細設計ドキュメント

## 概要
画像ビューアにタグによる絞り込み機能を追加する。ユーザーは`Ctrl+Shift+t`でダイアログを開き、表示中の画像リストに含まれるタグから選択して絞り込みを実行できる。

## 機能要件

### 基本機能
- **ショートカット**: `Ctrl+Shift+t`でダイアログ表示
- **タグ一覧表示**: 現在のリスト内画像のタグを重複排除・文字列順ソートで表示
- **タグ選択**: クリックまたは頭文字タイプでトグル選択
- **絞り込み実行**: 選択タグでOR条件絞り込み（未選択時は絞り込み解除）
- **ナビゲーション**: 絞り込み後リストを対象としたナビゲーション

### UI仕様
- **ダイアログデザイン**: 既存のGotoDialog準拠
- **タグボタン**:
  - 非選択: 黒枠、白背景、黒文字
  - 選択: 枠なし、黒背景、白文字
- **キーボード操作**: 
  - 頭文字タイプによるトグル（英数字のみ、同一頭文字は先頭1つのみ）
  - OK/Enterで実行、Escapeでキャンセル

### 動作仕様
- **絞り込み対象**: 現在表示中の画像リスト全体（既に絞り込み中の場合は元のリストをベース）
- **絞り込み条件**: 複数タグ選択時はOR条件
- **状態保持**: Viewer内でのみ保持、Viewer終了時にリセット
- **件数表示**: 絞り込み後の件数で表示更新

## アーキテクチャ設計

### 主要コンポーネント

#### 1. FilterDialogController (`filter-dialog-controller.svelte.ts`)
```typescript
export class FilterDialogController {
  private show: boolean = $state(false);
  private availableTags: string[] = $state([]);
  private selectedTags: Set<string> = $state(new Set());
  
  public showDialog(): void
  public hideDialog(): void
  public toggleTag(tag: string): void
  public executeFilter(): void
  public isShow(): boolean
}
```

**責務**:
- ダイアログの表示状態管理
- 利用可能タグリストの管理
- 選択タグの状態管理
- フィルタ実行の統制

#### 2. FilterByTagDialog (`FilterByTagDialog.svelte`)
```typescript
// Props
interface Props {
  controller: FilterDialogController;
}
```

**責務**:
- タグ選択UIの描画
- キーボードイベントハンドリング
- ダイアログモーダル表示

#### 3. ImageInfoManager拡張 (`image-info-manager.svelte.ts`)
```typescript
export class ImageInfoManager {
  // 既存プロパティをリネーム・拡張
  private originalList: ImageInfo[] = $state([]);  // 元のlistをリネーム
  private filteredList: ImageInfo[] = $state([]);  // 絞り込み後リスト
  private caret: number = $state(0);
  
  // 新規追加プロパティ
  private activeFilterTags: Set<string> = $state(new Set());
  private isFiltered: boolean = $state(false);
  
  // 新規追加メソッド
  public applyTagFilter(tags: string[]): void
  public clearFilter(): void
  public getAvailableTags(): Promise<string[]>
  private updateDisplayList(): void
  
  // 既存メソッドの修正（filteredListを参照するように変更）
  public getList(): ImageInfo[] // filteredListを返すように変更
  public getListLength(): number // filteredList.lengthを返すように変更
}
```

**責務**:
- 元リスト(`originalList`)と絞り込み後リスト(`filteredList`)の管理
- タグによる絞り込みロジック
- 既存ナビゲーション機能の`filteredList`への切り替え
- 利用可能タグの収集

#### 4. Controller拡張 (`controller.ts`)
```typescript
// 既存のOperation型に追加
export type Operation = 
  | 'editTags'
  | 'filterByTag'  // 新規追加
  | ...;

// キー設定に追加
const keyConfigs: keyConfig[] = [
  { key: 't', operation: 'filterByTag', modifierKeys: ['ctrl', 'shift'] },
  // ...
];
```

**責務**:
- 新しいショートカットの管理
- ダイアログ表示状態の統合管理

## 詳細実装仕様

### 1. データフロー

#### タグ絞り込み実行フロー
```
1. Ctrl+Shift+t押下
   ↓
2. Controller.operate('filterByTag')
   ↓
3. FilterDialogController.showDialog()
   ↓
4. ImageInfoManager.getAvailableTags()
   ↓ 効率的なディレクトリ単位タグ取得
5. FilterByTagDialog表示
   ↓ ユーザー操作
6. FilterDialogController.executeFilter()
   ↓
7. ImageInfoManager.applyTagFilter(selectedTags)
   ↓
8. 絞り込み実行・リスト更新・UI反映
```

#### 絞り込み解除フロー
```
1. タグ未選択でOK
   ↓
2. ImageInfoManager.clearFilter()
   ↓
3. filteredList = originalListで復元・UI更新
```

### 2. 絞り込みロジック詳細

#### ImageInfoManager.applyTagFilter()実装
```typescript
public async applyTagFilter(tags: string[]): Promise<void> {
  if (tags.length === 0) {
    this.clearFilter();
    return;
  }
  
  // タグ情報を効率的に取得（ディレクトリ単位でキャッシュ活用）
  const tagResults = await this.getTagsForAllImages();
  
  // OR条件で絞り込み
  this.filteredList = this.originalList.filter((img, index) => {
    const imageTags = tagResults[index];
    return tags.some(filterTag => imageTags.includes(filterTag));
  });
  
  this.activeFilterTags = new Set(tags);
  this.isFiltered = true;
  this.updateDisplayList();
}

private async getTagsForAllImages(): Promise<string[][]> {
  // ディレクトリごとにグループ化してバッチ取得
  const dirGroups = new Map<string, { images: ImageInfo[], indices: number[] }>();
  
  this.originalList.forEach((img, index) => {
    const dirPath = getDirPath(img.path);
    if (!dirGroups.has(dirPath)) {
      dirGroups.set(dirPath, { images: [], indices: [] });
    }
    dirGroups.get(dirPath)!.images.push(img);
    dirGroups.get(dirPath)!.indices.push(index);
  });
  
  const results: string[][] = new Array(this.originalList.length);
  
  // ディレクトリ単位で並行取得
  await Promise.all(
    Array.from(dirGroups.entries()).map(async ([dirPath, group]) => {
      const dirTags = await this.tagController.loadTagsInDir(dirPath);
      group.images.forEach((img, i) => {
        const fileName = getFileName(img.path);
        results[group.indices[i]] = dirTags[fileName] || [];
      });
    })
  );
  
  return results;
}
```

#### タグ収集ロジック
```typescript
public async getAvailableTags(): Promise<string[]> {
  // 元リスト全体からタグを収集（絞り込み対象は常に全体）
  const tagResults = await this.getTagsForAllImages();
  
  const allTags = new Set<string>();
  tagResults.forEach(tags => tags.forEach(tag => allTags.add(tag)));
  
  return Array.from(allTags).sort();
}
```

### 3. UI実装詳細

#### タグボタンスタイル
```css
.tag-button {
  padding: 8px 16px;
  margin: 4px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.tag-button.unselected {
  border: 1px solid black;
  background: white;
  color: black;
}

.tag-button.selected {
  border: none;
  background: black;
  color: white;
}
```

#### キーボードイベントハンドリング
```typescript
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    controller.hideDialog();
    return;
  }
  
  if (event.key === 'Enter') {
    controller.executeFilter();
    return;
  }
  
  // 頭文字タイプによるトグル（英数字のみ）
  if (/^[a-zA-Z0-9]$/.test(event.key)) {
    const targetTag = availableTags.find(tag => 
      tag.toLowerCase().startsWith(event.key.toLowerCase())
    );
    if (targetTag) {
      controller.toggleTag(targetTag);
    }
  }
}
```

### 4. 統合ポイント

#### Controller統合
```typescript
private operate(operation: Operation): void {
  if (
    this.dialogController.isShow() ||
    this.isTagEditorOpen ||
    this.gotoDialogController.isShow() ||
    this.filterDialogController.isShow()  // 追加
  ) {
    return;
  }
  
  switch (operation) {
    // ...
    case 'filterByTag':
      this.filterDialogController.showDialog();
      break;
  }
}
```

#### 件数表示更新
```typescript
// +page.svelte内 - 既存コードをそのまま活用
$derived(() => {
  const current = imageInfoManager.getCaret() + 1;
  const total = imageInfoManager.getListLength(); // filteredList.lengthを返すように変更
  return `${current} / ${total}`;
});
```

## 実装順序

### Phase 1: 基盤実装
1. `FilterDialogController`クラス作成
2. `ImageInfoManager`のリスト管理を2リスト構成に変更
   - `list` → `originalList`にリネーム
   - `filteredList`追加
   - 既存メソッドを`filteredList`参照に変更
3. `Controller`にショートカット追加

### Phase 2: UI実装
1. `FilterByTagDialog.svelte`作成
2. タグボタンスタイル実装
3. キーボードイベントハンドリング

### Phase 3: 統合・テスト
1. メインページに統合
2. 既存テストの`list`参照を`filteredList`参照に更新
3. 動作テスト・デバッグ
4. エッジケース対応

## テスト観点

### 機能テスト
- [ ] ショートカットキーでダイアログ表示
- [ ] タグ一覧の正しい表示（重複排除・ソート）
- [ ] タグ選択・選択解除の動作
- [ ] 頭文字タイプによるタグトグル
- [ ] OR条件での正しい絞り込み
- [ ] 絞り込み解除の動作
- [ ] 件数表示の更新

### UI/UXテスト
- [ ] ダイアログ表示中のショートカット無効化
- [ ] タグボタンの視覚的フィードバック
- [ ] キーボードナビゲーション
- [ ] レスポンシブデザイン

### エッジケース
- [ ] タグが存在しない場合
- [ ] 大量のタグがある場合
- [ ] 特殊文字を含むタグ名
- [ ] 絞り込み結果が0件の場合

## パフォーマンス考慮

### 最適化ポイント
- TagControllerの既存ディレクトリ単位キャッシュ機能活用
- ディレクトリ単位でのバッチタグ取得によるプロセス間通信コスト削減
- 並行ディレクトリ処理によるレスポンス向上
- 不要な再計算の回避

### メモリ管理
- `originalList`と`filteredList`の2リスト管理（重複データなし）
- ダイアログ非表示時の選択状態クリア
- TagControllerの既存キャッシュシステム活用

---

**作成日**: 2025-07-24  
**バージョン**: 1.0  
**対象ブランチ**: feature/filter-by-tag