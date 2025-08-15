import { ImageInfoManager } from './image-info-manager.svelte';
import { DialogController } from './dialog-controller.svelte';
import { FileController } from './file-controller';
import { ToastController } from './toast-controller.svelte';
import { ViewerController } from './viewer-controller.svelte';
import { GotoDialogController } from './goto-dialog-controller.svelte';
import { FilterDialogController } from './filter-dialog-controller.svelte';
import { EditModeController } from './edit-mode-controller.svelte';

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
  | 'toggleImageInfo'
  | 'goto'
  | 'filterByTag'
  | 'rotateGlobalRight'
  | 'rotateGlobalLeft'
  | 'rotateLocalRight'
  | 'rotateLocalLeft'
  | 'enterEditMode'
  | 'exitEditMode'
  | 'scaleUp'
  | 'scaleDown'
  | 'resetTransform';

export type Mode = 'View' | 'Edit';

export type ModifierKey = 'ctrl' | 'shift' | 'alt';

type keyConfig = {
  key: string;
  operation: Operation;
  modifierKeys: ModifierKey[];
};

// TODO: ファイルから読み込むようにする
const viewModeKeyConfigs: keyConfig[] = [
  { key: 'e', operation: 'enterEditMode', modifierKeys: ['ctrl', 'shift'] },
  { key: 'ArrowRight', operation: 'next', modifierKeys: [] },
  { key: 'WheelDown', operation: 'next', modifierKeys: [] },
  { key: 'x', operation: 'next', modifierKeys: [] },
  { key: 'ArrowLeft', operation: 'prev', modifierKeys: [] },
  { key: 'WheelUp', operation: 'prev', modifierKeys: [] },
  { key: 'z', operation: 'prev', modifierKeys: [] },
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
  { key: 'g', operation: 'goto', modifierKeys: ['ctrl', 'shift'] },
  { key: 't', operation: 'filterByTag', modifierKeys: ['ctrl', 'shift'] },
  { key: 'ArrowRight', operation: 'rotateGlobalRight', modifierKeys: ['ctrl', 'shift'] },
  { key: 'ArrowLeft', operation: 'rotateGlobalLeft', modifierKeys: ['ctrl', 'shift'] },
  { key: 'ArrowRight', operation: 'rotateLocalRight', modifierKeys: ['ctrl'] },
  { key: 'f', operation: 'rotateLocalRight', modifierKeys: ['ctrl', 'shift'] },
  { key: 'ArrowLeft', operation: 'rotateLocalLeft', modifierKeys: ['ctrl'] },
  { key: 'b', operation: 'rotateLocalLeft', modifierKeys: ['ctrl', 'shift'] },
];

const editModeKeyConfigs: keyConfig[] = [
  { key: 'Escape', operation: 'exitEditMode', modifierKeys: [] },
  { key: 'e', operation: 'exitEditMode', modifierKeys: ['ctrl', 'shift'] },
  { key: 'r', operation: 'resetTransform', modifierKeys: ['ctrl'] },
  { key: 'WheelUp', operation: 'scaleUp', modifierKeys: [] },
  { key: 'WheelDown', operation: 'scaleDown', modifierKeys: [] },
  { key: 'ArrowRight', operation: 'rotateLocalRight', modifierKeys: ['ctrl'] },
  { key: 'ArrowLeft', operation: 'rotateLocalLeft', modifierKeys: ['ctrl'] },
  { key: 'f', operation: 'rotateLocalRight', modifierKeys: ['ctrl', 'shift'] },
  { key: 'b', operation: 'rotateLocalLeft', modifierKeys: ['ctrl', 'shift'] },
];

export class Controler {
  private keyToOperations = new Map<Mode, Map<string, Operation>>();
  private modfierKeyMap = new Map<ModifierKey, boolean>();
  private onEditTags?: () => void;
  private isTagEditorOpen = false;

  constructor(
    private imageInfoManager: ImageInfoManager,
    private dialogController: DialogController,
    private fileController: FileController,
    private toastController: ToastController,
    private viewerController: ViewerController,
    private gotoDialogController: GotoDialogController,
    private filterDialogController: FilterDialogController,
    private editModeController: EditModeController
  ) {
    this.keyToOperations.set('View', new Map<string, Operation>());
    this.keyToOperations.set('Edit', new Map<string, Operation>());

    this.readKeyConfigs('View', viewModeKeyConfigs);
    this.readKeyConfigs('Edit', editModeKeyConfigs);
  }

  public setOnEditTags(callback: () => void): void {
    this.onEditTags = callback;
  }

  public setTagEditorOpen(isOpen: boolean): void {
    this.isTagEditorOpen = isOpen;
  }

  private readKeyConfigs(mode: Mode, configs: keyConfig[]): void {
    configs.forEach(({ key, operation, modifierKeys }) => {
      this.setKeyBind(mode, this.keyToString(key, modifierKeys), operation);
    });
  }

  private setKeyBind(mode: Mode, key: string, operation: Operation): void {
    const modeMap = this.keyToOperations.get(mode);
    if (!modeMap) {
      throw new Error(`Mode map not found for mode: ${mode}. Controller not properly initialized.`);
    }
    modeMap.set(key.toLowerCase(), operation);
  }

  public operateByKey(rawKey: string): void {
    // modifierKeyの場合は何もしない
    if (['control', 'shift', 'alt'].includes(rawKey.toLowerCase())) {
      return;
    }

    const key = this.keyToString(rawKey);
    const currentMode: Mode = this.editModeController.isInEditMode() ? 'Edit' : 'View';
    const modeMap = this.keyToOperations.get(currentMode);

    if (!modeMap) {
      throw new Error(
        `Mode map not found for mode: ${currentMode}. Controller not properly initialized.`
      );
    }

    const operation = modeMap.get(key);
    console.log(
      `Controller operateByKey: mode=${currentMode}, key=${key}, operation=${operation}, gotoDialogShow=${this.gotoDialogController.isShow()}`
    ); // debug
    if (operation) {
      this.operate(operation);
    }
  }

  private operate(operation: Operation): void {
    if (
      this.dialogController.isShow() ||
      this.isTagEditorOpen ||
      this.gotoDialogController.isShow() ||
      this.filterDialogController.isShow()
    ) {
      console.log(`Controller operate: blocking operation=${operation} due to dialog open`); // debug
      return;
    }

    console.log(`Controller operate: executing operation=${operation}`); // debug

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
      case 'goto': {
        const maxIndex = this.imageInfoManager.getList().length;
        this.gotoDialogController.showDialog(maxIndex, (imageNumber: number | null) => {
          if (imageNumber !== null) {
            this.imageInfoManager.gotoAt(imageNumber);
          }
        });
        break;
      }
      case 'filterByTag':
        this.filterDialogController.showDialog();
        break;
      case 'rotateGlobalRight':
        this.imageInfoManager.rotateGlobalRight();
        break;
      case 'rotateGlobalLeft':
        this.imageInfoManager.rotateGlobalLeft();
        break;
      case 'rotateLocalRight': {
        const cellCount = this.viewerController.getCells();
        this.imageInfoManager.rotateVisibleLocalRight(cellCount);
        break;
      }
      case 'rotateLocalLeft': {
        const cellCount = this.viewerController.getCells();
        this.imageInfoManager.rotateVisibleLocalLeft(cellCount);
        break;
      }
      case 'enterEditMode':
        this.editModeController.enterEditMode();
        this.toastController.showToast('編集モードを開始しました');
        break;
      case 'exitEditMode':
        this.editModeController.exitEditMode();
        this.toastController.showToast('編集モードを終了しました');
        break;
      case 'scaleUp': {
        const cellCount = this.viewerController.getCells();
        this.imageInfoManager.scaleVisibleUp(cellCount);
        break;
      }
      case 'scaleDown': {
        const cellCount = this.viewerController.getCells();
        this.imageInfoManager.scaleVisibleDown(cellCount);
        break;
      }
      case 'resetTransform': {
        const cellCount = this.viewerController.getCells();
        this.imageInfoManager.resetVisibleTransform(cellCount);
        this.toastController.showToast('変形をリセットしました');
        break;
      }
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
