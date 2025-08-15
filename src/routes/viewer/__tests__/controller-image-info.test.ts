import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Controler } from '../controller';
import { ImageInfoManager } from '../image-info-manager.svelte';
import { DialogController } from '../dialog-controller.svelte';
import { GotoDialogController } from '../goto-dialog-controller.svelte';
import { FilterDialogController } from '../filter-dialog-controller.svelte';
import { FileController } from '../file-controller';
import { ToastController } from '../toast-controller.svelte';
import { ViewerController } from '../viewer-controller.svelte';
import { EditModeController } from '../edit-mode-controller.svelte';

describe('Controller - Image Info Display', () => {
  let controller: Controler;
  let imageInfoManager: ImageInfoManager;
  let dialogController: DialogController;
  let gotoDialogController: GotoDialogController;
  let filterDialogController: FilterDialogController;
  let fileController: FileController;
  let toastController: ToastController;
  let viewerController: ViewerController;
  let editModeController: EditModeController;

  beforeEach(() => {
    imageInfoManager = new ImageInfoManager();
    dialogController = new DialogController();
    gotoDialogController = new GotoDialogController();
    filterDialogController = new FilterDialogController(imageInfoManager);
    fileController = new FileController();
    toastController = new ToastController();
    viewerController = new ViewerController();
    editModeController = new EditModeController();

    controller = new Controler(
      imageInfoManager,
      dialogController,
      fileController,
      toastController,
      viewerController,
      gotoDialogController,
      filterDialogController,
      editModeController
    );

    // ImageInfoManagerのメソッドをモック
    vi.spyOn(imageInfoManager, 'toggleImageInfoDisplay');
  });

  it('should call toggleImageInfoDisplay when i key is pressed', () => {
    controller.operateByKey('i');

    expect(imageInfoManager.toggleImageInfoDisplay).toHaveBeenCalledTimes(1);
  });

  it('should not call toggleImageInfoDisplay when dialog is shown', () => {
    // ダイアログを表示状態にする
    vi.spyOn(dialogController, 'isShow').mockReturnValue(true);

    controller.operateByKey('i');

    expect(imageInfoManager.toggleImageInfoDisplay).not.toHaveBeenCalled();
  });

  it('should not call toggleImageInfoDisplay when tag editor is open', () => {
    // タグエディタを開いている状態にする
    controller.setTagEditorOpen(true);

    controller.operateByKey('i');

    expect(imageInfoManager.toggleImageInfoDisplay).not.toHaveBeenCalled();
  });

  it('should handle uppercase I key', () => {
    controller.operateByKey('I');

    expect(imageInfoManager.toggleImageInfoDisplay).toHaveBeenCalledTimes(1);
  });

  it('should not interfere with other key operations', () => {
    vi.spyOn(imageInfoManager, 'gotoNext');
    vi.spyOn(imageInfoManager, 'gotoPrev');

    // 他のキー操作をテスト
    controller.operateByKey('ArrowRight');
    controller.operateByKey('ArrowLeft');

    expect(imageInfoManager.gotoNext).toHaveBeenCalledTimes(1);
    expect(imageInfoManager.gotoPrev).toHaveBeenCalledTimes(1);
    expect(imageInfoManager.toggleImageInfoDisplay).not.toHaveBeenCalled();
  });
});
