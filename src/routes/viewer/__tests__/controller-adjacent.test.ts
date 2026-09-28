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

describe('Controller - Adjacent', () => {
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

  it('初期状態は隣接表示していない', () => {
    expect(viewerController.isAdjacent()).toBe(false);
  });

  it('a キーで隣接表示の ON/OFF を切り替え、トーストで通知する', () => {
    controller.operateByKey('a');
    expect(viewerController.isAdjacent()).toBe(true);
    expect(toastController.showToast).toHaveBeenLastCalledWith('隣接表示: ON');

    controller.operateByKey('a');
    expect(viewerController.isAdjacent()).toBe(false);
    expect(toastController.showToast).toHaveBeenLastCalledWith('隣接表示: OFF');
  });
});

describe('ViewerController - getHorizontalAlign', () => {
  let viewerController: ViewerController;

  // 2行3列のグリッドにする
  const setup2x3 = () => {
    viewerController.incrementRows();
    viewerController.incrementCols();
    viewerController.incrementCols();
  };
  const alignsOf = (cells: number) =>
    Array.from({ length: cells }, (_, i) => viewerController.getHorizontalAlign(i));

  beforeEach(() => {
    viewerController = new ViewerController();
  });

  it('通常時は全て中央寄せ', () => {
    setup2x3();
    expect(alignsOf(6)).toEqual(['center', 'center', 'center', 'center', 'center', 'center']);
  });

  it('隣接表示時は通し番号の奇数セルが右寄せ、偶数セルが左寄せ (奇数列数では行をまたいで交互になる)', () => {
    setup2x3();
    viewerController.toggleAdjacent();
    expect(alignsOf(6)).toEqual(['right', 'left', 'right', 'left', 'right', 'left']);
  });

  it('隣接+フリップ時は寄せ方向が逆になる', () => {
    setup2x3();
    viewerController.toggleAdjacent();
    viewerController.toggleFlip();
    expect(alignsOf(6)).toEqual(['left', 'right', 'left', 'right', 'left', 'right']);
  });

  it('フリップのみでは中央寄せのまま', () => {
    setup2x3();
    viewerController.toggleFlip();
    expect(alignsOf(6)).toEqual(['center', 'center', 'center', 'center', 'center', 'center']);
  });

  it('1列表示では行ごとに交互に寄せる', () => {
    viewerController.incrementRows();
    viewerController.toggleAdjacent();
    expect(alignsOf(2)).toEqual(['right', 'left']);

    viewerController.toggleFlip();
    expect(alignsOf(2)).toEqual(['left', 'right']);
  });
});
