import { ImageInfoManager } from './image-info-manager.svelte';
import { DialogController } from './dialog-controller.svelte';
import { FileController } from './file-controller';
import { ToastController } from './toast-controller.svelte';
import { ViewerController } from './viewer-controller.svelte';

export type Operation =
  | 'next'
  | 'prev'
  | 'nextJump'
  | 'prevJump'
  | 'randomJump'
  | 'delete'
  | 'bookmark'
  | 'gotoBookmark'
  | 'nextHistory'
  | 'prevHistory'
  | 'incrementRows'
  | 'decrementRows'
  | 'incrementCols'
  | 'decrementCols'
  | 'editTags'
  | 'toggleImageInfo';

export type ModifierKey = 'ctrl' | 'shift' | 'alt';

type keyConfig = {
  key: string;
  operation: Operation;
  modifierKeys: ModifierKey[];
};

// TODO: ファイルから読み込むようにする
const keyConfigs: keyConfig[] = [
  { key: 'ArrowRight', operation: 'next', modifierKeys: [] },
  { key: 'WheelDown', operation: 'next', modifierKeys: [] },
  { key: 'ArrowLeft', operation: 'prev', modifierKeys: [] },
  { key: 'WheelUp', operation: 'prev', modifierKeys: [] },
  { key: 'ArrowDown', operation: 'nextJump', modifierKeys: [] },
  { key: 'WheelDown', operation: 'nextJump', modifierKeys: ['shift'] },
  { key: 'ArrowUp', operation: 'prevJump', modifierKeys: [] },
  { key: 'WheelUp', operation: 'prevJump', modifierKeys: ['shift'] },
  { key: 'q', operation: 'randomJump', modifierKeys: [] },
  { key: 'RightClick', operation: 'randomJump', modifierKeys: [] },
  { key: 'MiddleClick', operation: 'bookmark', modifierKeys: [] },
  { key: 'b', operation: 'bookmark', modifierKeys: ['shift'] },
  { key: 'b', operation: 'gotoBookmark', modifierKeys: [] },
  { key: 'RightClick', operation: 'gotoBookmark', modifierKeys: ['shift'] },
  { key: 'h', operation: 'prevHistory', modifierKeys: [] },
  { key: 'h', operation: 'nextHistory', modifierKeys: ['shift'] },
  { key: 'Delete', operation: 'delete', modifierKeys: [] },
  { key: 'r', operation: 'incrementRows', modifierKeys: [] },
  { key: 'r', operation: 'decrementRows', modifierKeys: ['shift'] },
  { key: 'l', operation: 'incrementCols', modifierKeys: [] },
  { key: 'l', operation: 'decrementCols', modifierKeys: ['shift'] },
  { key: 't', operation: 'editTags', modifierKeys: [] },
  { key: 'i', operation: 'toggleImageInfo', modifierKeys: [] },
];

export class Controler {
  private keyToOperations = new Map<string, Operation>();
  private modfierKeyMap = new Map<ModifierKey, boolean>();
  private onEditTags?: () => void;
  private isTagEditorOpen = false;

  constructor(
    private imageInfoManager: ImageInfoManager,
    private dialogController: DialogController,
    private fileController: FileController,
    private toastController: ToastController,
    private viewerController: ViewerController
  ) {
    this.readKeyConfigs(keyConfigs);
  }

  public setOnEditTags(callback: () => void): void {
    this.onEditTags = callback;
  }

  public setTagEditorOpen(isOpen: boolean): void {
    this.isTagEditorOpen = isOpen;
  }

  private readKeyConfigs(configs: keyConfig[]): void {
    configs.forEach(({ key, operation, modifierKeys }) => {
      this.setKeyBind(this.keyToString(key, modifierKeys), operation);
    });
  }

  private setKeyBind(key: string, operation: Operation): void {
    this.keyToOperations.set(key.toLowerCase(), operation);
  }

  public operateByKey(rawKey: string): void {
    // modifierKeyの場合は何もしない
    if (['control', 'shift', 'alt'].includes(rawKey.toLowerCase())) {
      return;
    }

    const key = this.keyToString(rawKey);

    const operation = this.keyToOperations.get(key);
    // console.log(`key: ${key}, operation: ${operation}`); // debug
    if (operation) {
      this.operate(operation);
    }
  }

  private operate(operation: Operation): void {
    if (this.dialogController.isShow() || this.isTagEditorOpen) {
      return;
    }

    switch (operation) {
      case 'next':
        this.imageInfoManager.gotoNext();
        break;
      case 'prev':
        this.imageInfoManager.gotoPrev();
        break;
      case 'nextJump':
        this.imageInfoManager.gotoNext(10);
        break;
      case 'prevJump':
        this.imageInfoManager.gotoPrev(10);
        break;
      case 'randomJump':
        this.imageInfoManager.gotoRandom();
        break;
      case 'delete': {
        const path = this.imageInfoManager.getCurrent().path;
        this.dialogController.showDialog(
          `本当に画像をゴミ箱に移動しますか？\n${path}`,
          (result: boolean) => {
            if (result) {
              this.imageInfoManager.deleteCurrent();
              this.fileController.deleteFile(path);
            }
          }
        );
        break;
      }
      case 'bookmark': {
        const current = this.imageInfoManager.getCurrent();
        const count = this.imageInfoManager.countBookmarked();
        const message = current.isBookmarked()
          ? `ブックマークを解除しました: ${count}->${count - 1}`
          : `ブックマークしました: ${count}->${count + 1}`;
        this.toastController.showToast(message);

        this.imageInfoManager.bookmarkCurrent();
        break;
      }
      case 'gotoBookmark':
        this.imageInfoManager.gotoNextBookmark();
        break;
      case 'nextHistory':
        this.imageInfoManager.gotoNextHistory();
        break;
      case 'prevHistory':
        this.imageInfoManager.gotoPrevHistory();
        break;
      case 'incrementRows':
        this.viewerController.incrementRows();
        break;
      case 'decrementRows':
        this.viewerController.decrementRows();
        break;
      case 'incrementCols':
        this.viewerController.incrementCols();
        break;
      case 'decrementCols':
        this.viewerController.decrementCols();
        break;
      case 'editTags':
        if (this.onEditTags) {
          this.onEditTags();
        }
        break;
      case 'toggleImageInfo':
        this.imageInfoManager.toggleImageInfoDisplay();
        break;
    }
  }

  private keyToString(key: string, modifierKeys: ModifierKey[] = this.getModfierKeys()): string {
    const modified = modifierKeys.length === 0 ? key : `${modifierKeys.join(',')}:${key}`;
    return modified.toLowerCase();
  }

  // --- 修飾キー関連の操作 --- //

  private getModfierKeys(): ModifierKey[] {
    // this.modfierKeyMapからtrueのものだけを取り出しsortして返す
    return Array.from(this.modfierKeyMap.entries())
      .filter(([_, value]) => value)
      .map(([key, _]) => key)
      .sort();
  }

  public downModifierKey(key: ModifierKey): void {
    this.modfierKeyMap.set(key, true);
  }
  public upModifierKey(key: ModifierKey): void {
    this.modfierKeyMap.set(key, false);
  }
  public resetModifierKeys(): void {
    this.modfierKeyMap.clear();
  }
}
