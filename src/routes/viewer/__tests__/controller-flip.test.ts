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

describe('Controller - Flip', () => {
  let controller: Controler;
  let viewerController: ViewerController;
  let toastController: ToastController;
  let imageInfoManager: ImageInfoManager;

  beforeEach(() => {
    imageInfoManager = new ImageInfoManager();
    viewerController = new ViewerController();
    toastController = new ToastController();

    controller = new Controler(
      imageInfoManager,
      new DialogController(),
      new FileController(),
      toastController,
      viewerController,
      new GotoDialogController(),
      new FilterDialogController(imageInfoManager, new ToastController()),
      new EditModeController()
    );

    vi.spyOn(toastController, 'showToast').mockImplementation(() => {});
  });

  it('初期状態はフリップしていない', () => {
    expect(viewerController.isFlipped()).toBe(false);
  });

  it('f キーでフリップの ON/OFF を切り替え、トーストで通知する', () => {
    controller.operateByKey('f');
    expect(viewerController.isFlipped()).toBe(true);
    expect(toastController.showToast).toHaveBeenLastCalledWith('フリップ: ON');

    controller.operateByKey('f');
    expect(viewerController.isFlipped()).toBe(false);
    expect(toastController.showToast).toHaveBeenLastCalledWith('フリップ: OFF');
  });

  it('Ctrl+Shift+F ではフリップしない', () => {
    vi.spyOn(imageInfoManager, 'rotateVisibleLocalRight').mockImplementation(() => {});
    controller.downModifierKey('ctrl');
    controller.downModifierKey('shift');
    controller.operateByKey('f');

    expect(viewerController.isFlipped()).toBe(false);
  });
});
