import { ImageInfoManager } from './image-info-manager.svelte';
import { DialogController } from './dialog-controller.svelte';
import { FileController } from './file-controller';
import { ToastController } from './toast-controller.svelte';
import { ViewerController } from './viewer-controller.svelte';
import { GotoDialogController } from './goto-dialog-controller.svelte';
import { FilterDialogController } from './filter-dialog-controller.svelte';
import { EditModeController } from './edit-mode-controller.svelte';
import { HelpOverlayController } from './help-overlay-controller.svelte';
import { ZoomModeController } from './zoom-mode-controller.svelte';

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
  | 'toggleFlip'
  | 'toggleAdjacent'
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
  | 'resetTransform'
  | 'enterZoomMode'
  | 'exitZoomMode'
  | 'zoomIn'
  | 'zoomOut'
  | 'nextPage'
  | 'prevPage'
  | 'showHelp';

export type Mode = 'View' | 'Edit' | 'Zoom';

// 1枚表示時のジャンプ移動量。複数枚表示時は表示枚数分だけ移動する
const SINGLE_VIEW_JUMP_STEP = 10;

export type ModifierKey = 'ctrl' | 'shift' | 'alt';

export type keyConfig = {
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
  // 左クリックは Shift 扱いのため、左+中クリックでも開始できる
  { key: 'MiddleClick', operation: 'enterZoomMode', modifierKeys: ['shift'] },
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
  { key: 'f', operation: 'toggleFlip', modifierKeys: [] },
  { key: 'a', operation: 'toggleAdjacent', modifierKeys: [] },
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
  { key: '?', operation: 'showHelp', modifierKeys: ['shift'] },
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
  { key: '?', operation: 'showHelp', modifierKeys: ['shift'] },
];

// ズームモードでは表示とぶつからない移動系の操作のみ有効にする
const zoomModeKeyConfigs: keyConfig[] = [
  { key: 'MiddleClick', operation: 'exitZoomMode', modifierKeys: [] },
  { key: 'MiddleClick', operation: 'exitZoomMode', modifierKeys: ['shift'] },
  { key: 'Escape', operation: 'exitZoomMode', modifierKeys: [] },
  { key: 'WheelUp', operation: 'zoomIn', modifierKeys: [] },
  { key: 'WheelDown', operation: 'zoomOut', modifierKeys: [] },
  { key: 'LeftClick', operation: 'nextPage', modifierKeys: [] },
  { key: 'ArrowRight', operation: 'nextPage', modifierKeys: [] },
  { key: 'RightClick', operation: 'prevPage', modifierKeys: [] },
  { key: 'ArrowLeft', operation: 'prevPage', modifierKeys: [] },
  { key: 'q', operation: 'randomJump', modifierKeys: [] },
  { key: 'b', operation: 'bookmark', modifierKeys: ['shift'] },
  { key: 'b', operation: 'gotoBookmark', modifierKeys: [] },
  { key: 'h', operation: 'prevHistory', modifierKeys: [] },
  { key: 'h', operation: 'nextHistory', modifierKeys: ['shift'] },
];

const keyConfigsByMode: Record<Mode, keyConfig[]> = {
  View: viewModeKeyConfigs,
  Edit: editModeKeyConfigs,
  Zoom: zoomModeKeyConfigs,
};

export function getKeyConfigs(mode: Mode): keyConfig[] {
  return keyConfigsByMode[mode];
}

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
    private editModeController: EditModeController,
    private helpOverlayController: HelpOverlayController = new HelpOverlayController(),
    private zoomModeController: ZoomModeController = new ZoomModeController()
  ) {
    (Object.keys(keyConfigsByMode) as Mode[]).forEach(mode => {
      this.keyToOperations.set(mode, new Map<string, Operation>());
      this.readKeyConfigs(mode, keyConfigsByMode[mode]);
    });
  }

  public getCurrentMode(): Mode {
    if (this.zoomModeController.isActive()) {
      return 'Zoom';
    }
    return this.editModeController.isInEditMode() ? 'Edit' : 'View';
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

    // コマンド一覧の表示中はホイール以外の入力で閉じ、その入力の操作は実行しない
    if (this.helpOverlayController.isShow()) {
      if (!['WheelUp', 'WheelDown'].includes(rawKey)) {
        this.helpOverlayController.close();
      }
      return;
    }

    const key = this.keyToString(rawKey);
    const currentMode = this.getCurrentMode();
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

  // ジャンプの移動量: 1枚表示なら設定値、複数枚表示なら表示枚数分
  private getJumpStep(): number {
    const cells = this.viewerController.getCells();
    return cells > 1 ? cells : SINGLE_VIEW_JUMP_STEP;
  }

  private operate(operation: Operation): void {
    if (
      this.dialogController.isShow() ||
      this.isTagEditorOpen ||
      this.gotoDialogController.isShow() ||
      this.filterDialogController.isShow() ||
      this.helpOverlayController.isShow()
    ) {
      console.log(`Controller operate: blocking operation=${operation} due to dialog open`); // debug
      return;
    }

    console.log(`Controller operate: executing operation=${operation}`); // debug

    const caretBefore = this.imageInfoManager.getCaret();
    this.operateWithoutCheck(operation);
    // ズームモード中のページ遷移ではキャンバスの拡縮・移動を元に戻す
    if (this.zoomModeController.isActive() && this.imageInfoManager.getCaret() !== caretBefore) {
      this.zoomModeController.resetTransform();
    }
  }

  private operateWithoutCheck(operation: Operation): void {
    switch (operation) {
      case 'next':
        this.imageInfoManager.gotoNext();
        break;
      case 'prev':
        this.imageInfoManager.gotoPrev();
        break;
      case 'nextJump':
        this.imageInfoManager.gotoNext(this.getJumpStep());
        break;
      case 'prevJump':
        this.imageInfoManager.gotoPrev(this.getJumpStep());
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
      case 'toggleFlip':
        this.viewerController.toggleFlip();
        this.viewerController.showCellNumbers();
        this.toastController.showToast(
          `フリップ: ${this.viewerController.isFlipped() ? 'ON' : 'OFF'}`
        );
        break;
      case 'toggleAdjacent':
        this.viewerController.toggleAdjacent();
        this.toastController.showToast(
          `隣接表示: ${this.viewerController.isAdjacent() ? 'ON' : 'OFF'}`
        );
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
      case 'enterZoomMode':
        this.enterZoomMode();
        break;
      case 'exitZoomMode':
        this.exitZoomMode();
        break;
      case 'zoomIn':
        this.zoomModeController.zoomIn();
        break;
      case 'zoomOut':
        this.zoomModeController.zoomOut();
        break;
      case 'nextPage': {
        const group = this.zoomModeController.getGroup();
        if (group) {
          const length = this.imageInfoManager.getListLength();
          this.imageInfoManager.gotoIndex(group.next(this.imageInfoManager.getCaret(), length));
        }
        break;
      }
      case 'prevPage': {
        const group = this.zoomModeController.getGroup();
        if (group) {
          const length = this.imageInfoManager.getListLength();
          this.imageInfoManager.gotoIndex(group.prev(this.imageInfoManager.getCaret(), length));
        }
        break;
      }
      case 'showHelp':
        this.helpOverlayController.open();
        break;
    }
  }

  // --- ズームモード関連 --- //

  private enterZoomMode(): void {
    if (this.imageInfoManager.getListLength() === 0) {
      return;
    }
    this.zoomModeController.enter(
      this.imageInfoManager.getCaret(),
      this.viewerController.getCells()
    );
    const group = this.zoomModeController.getGroup();
    this.imageInfoManager.setCaretAligner(group ? index => group.align(index) : null);
    this.toastController.showToast('ズームモードを開始しました');
  }

  /**
   * ズームモードを終了する (Pointer Lock の解除時など、キー操作以外からも呼ばれる)
   */
  public exitZoomMode(): void {
    if (!this.zoomModeController.isActive()) {
      return;
    }
    this.zoomModeController.exit();
    this.imageInfoManager.setCaretAligner(null);
    this.toastController.showToast('ズームモードを終了しました');
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
