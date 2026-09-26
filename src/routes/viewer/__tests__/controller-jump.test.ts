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

describe('Controller - Jump step', () => {
  let controller: Controler;
  let imageInfoManager: ImageInfoManager;
  let viewerController: ViewerController;

  beforeEach(() => {
    imageInfoManager = new ImageInfoManager();
    viewerController = new ViewerController();

    controller = new Controler(
      imageInfoManager,
      new DialogController(),
      new FileController(),
      new ToastController(),
      viewerController,
      new GotoDialogController(),
      new FilterDialogController(imageInfoManager),
      new EditModeController()
    );

    vi.spyOn(imageInfoManager, 'gotoNext');
    vi.spyOn(imageInfoManager, 'gotoPrev');
  });

  it('1枚表示では設定値 (10) 分ジャンプする', () => {
    controller.operateByKey('ArrowDown');
    controller.operateByKey('ArrowUp');

    expect(imageInfoManager.gotoNext).toHaveBeenCalledWith(10);
    expect(imageInfoManager.gotoPrev).toHaveBeenCalledWith(10);
  });

  it('2x2 表示では表示枚数 (4) 分ジャンプする', () => {
    viewerController.incrementRows();
    viewerController.incrementCols();
    expect(viewerController.getCells()).toBe(4);

    controller.operateByKey('ArrowDown');
    controller.operateByKey('ArrowUp');

    expect(imageInfoManager.gotoNext).toHaveBeenCalledWith(4);
    expect(imageInfoManager.gotoPrev).toHaveBeenCalledWith(4);
  });

  it('1x2 表示では表示枚数 (2) 分ジャンプする', () => {
    viewerController.incrementCols();
    expect(viewerController.getCells()).toBe(2);

    controller.operateByKey('ArrowDown');

    expect(imageInfoManager.gotoNext).toHaveBeenCalledWith(2);
  });

  it('表示枚数が設定値を超える場合は表示枚数分ジャンプする', () => {
    for (let i = 1; i < 4; i++) {
      viewerController.incrementRows();
      viewerController.incrementCols();
    }
    expect(viewerController.getCells()).toBe(16);

    controller.operateByKey('ArrowDown');

    expect(imageInfoManager.gotoNext).toHaveBeenCalledWith(16);
  });
});
