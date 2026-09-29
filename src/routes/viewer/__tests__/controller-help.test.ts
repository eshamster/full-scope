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
import { HelpOverlayController } from '../help-overlay-controller.svelte';

describe('Controller - Help overlay', () => {
  let controller: Controler;
  let imageInfoManager: ImageInfoManager;
  let editModeController: EditModeController;
  let helpOverlayController: HelpOverlayController;

  const pressQuestion = () => {
    controller.downModifierKey('shift');
    controller.operateByKey('?');
    controller.upModifierKey('shift');
  };

  beforeEach(() => {
    imageInfoManager = new ImageInfoManager();
    editModeController = new EditModeController();
    helpOverlayController = new HelpOverlayController();
    const toastController = new ToastController();

    controller = new Controler(
      imageInfoManager,
      new DialogController(),
      new FileController(),
      toastController,
      new ViewerController(),
      new GotoDialogController(),
      new FilterDialogController(imageInfoManager, new ToastController()),
      editModeController,
      helpOverlayController
    );

    vi.spyOn(toastController, 'showToast').mockImplementation(() => {});
    vi.spyOn(imageInfoManager, 'gotoNext').mockImplementation(() => {});
  });

  it('? キーでコマンド一覧を開く', () => {
    pressQuestion();
    expect(helpOverlayController.isShow()).toBe(true);
  });

  it('編集モード中も ? キーでコマンド一覧を開く', () => {
    editModeController.enterEditMode();
    pressQuestion();
    expect(helpOverlayController.isShow()).toBe(true);
  });

  it('表示中は任意のキーで閉じ、そのキーの操作は実行しない', () => {
    pressQuestion();
    controller.operateByKey('x');
    expect(helpOverlayController.isShow()).toBe(false);
    expect(imageInfoManager.gotoNext).not.toHaveBeenCalled();
  });

  it('表示中にもう一度 ? キーを押すと閉じる', () => {
    pressQuestion();
    pressQuestion();
    expect(helpOverlayController.isShow()).toBe(false);
  });

  it('表示中に Escape キーを押すと閉じ、編集モードは終了しない', () => {
    editModeController.enterEditMode();
    pressQuestion();
    controller.operateByKey('Escape');
    expect(helpOverlayController.isShow()).toBe(false);
    expect(editModeController.isInEditMode()).toBe(true);
  });

  it('表示中はホイールでは閉じず、操作も実行しない', () => {
    pressQuestion();
    controller.operateByKey('WheelDown');
    expect(helpOverlayController.isShow()).toBe(true);
    expect(imageInfoManager.gotoNext).not.toHaveBeenCalled();
  });

  it('表示中は修飾キー単独では閉じない', () => {
    pressQuestion();
    controller.operateByKey('Shift');
    expect(helpOverlayController.isShow()).toBe(true);
  });

  it('表示中は右クリックで閉じ、その操作は実行しない', () => {
    vi.spyOn(imageInfoManager, 'gotoRandom').mockImplementation(() => {});
    pressQuestion();
    controller.operateByKey('RightClick');
    expect(helpOverlayController.isShow()).toBe(false);
    expect(imageInfoManager.gotoRandom).not.toHaveBeenCalled();
  });
});
