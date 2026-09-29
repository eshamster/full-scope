import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Controler } from '../controller';
import { ImageInfoManager } from '../image-info-manager.svelte';
import { ImageInfo } from '../image-info.svelte';
import { DialogController } from '../dialog-controller.svelte';
import { GotoDialogController } from '../goto-dialog-controller.svelte';
import { FilterDialogController } from '../filter-dialog-controller.svelte';
import { FileController } from '../file-controller';
import { ToastController } from '../toast-controller.svelte';
import { ViewerController } from '../viewer-controller.svelte';
import { EditModeController } from '../edit-mode-controller.svelte';
import { HelpOverlayController } from '../help-overlay-controller.svelte';
import { ZoomModeController } from '../zoom-mode-controller.svelte';

describe('Controller - Zoom mode', () => {
  let controller: Controler;
  let manager: ImageInfoManager;
  let viewerController: ViewerController;
  let editModeController: EditModeController;
  let zoomModeController: ZoomModeController;
  let toastController: ToastController;

  // 左クリックは Shift 扱いのため、左+中クリックは Shift+中クリックになる
  const enterZoom = () => {
    controller.downModifierKey('shift');
    controller.operateByKey('MiddleClick');
    controller.upModifierKey('shift');
  };

  beforeEach(async () => {
    manager = new ImageInfoManager();
    await manager.addImages(
      Array.from({ length: 10 }, (_, i) => new ImageInfo(`/path/to/image${i + 1}.jpg`))
    );
    viewerController = new ViewerController();
    editModeController = new EditModeController();
    zoomModeController = new ZoomModeController();
    toastController = new ToastController();
    vi.spyOn(toastController, 'showToast').mockImplementation(() => {});

    controller = new Controler(
      manager,
      new DialogController(),
      new FileController(),
      toastController,
      viewerController,
      new GotoDialogController(),
      new FilterDialogController(manager, new ToastController()),
      editModeController,
      new HelpOverlayController(),
      zoomModeController
    );
  });

  describe('開始・終了', () => {
    it('Shift+中クリックで開始し、中クリックで終了する', () => {
      enterZoom();
      expect(controller.getCurrentMode()).toBe('Zoom');
      expect(toastController.showToast).toHaveBeenCalledWith('ズームモードを開始しました');

      controller.operateByKey('MiddleClick');
      expect(controller.getCurrentMode()).toBe('View');
      expect(toastController.showToast).toHaveBeenCalledWith('ズームモードを終了しました');
    });

    it('Esc で終了する', () => {
      enterZoom();
      controller.operateByKey('Escape');
      expect(zoomModeController.isActive()).toBe(false);
    });

    it('通常モードの中クリック (ブックマーク) はズームモードを開始しない', () => {
      controller.operateByKey('MiddleClick');
      expect(zoomModeController.isActive()).toBe(false);
      expect(manager.getCurrent().isBookmarked()).toBe(true);
    });

    it('編集モード中は開始できない', () => {
      editModeController.enterEditMode();
      enterZoom();
      expect(zoomModeController.isActive()).toBe(false);
    });

    it('終了時に拡縮・移動をリセットする', () => {
      enterZoom();
      controller.operateByKey('WheelUp');
      zoomModeController.move(10, 10);
      controller.exitZoomMode();
      expect(zoomModeController.getScalePercent()).toBe(100);
      expect(zoomModeController.getOffsetX()).toBe(0);
    });

    it('モード外で exitZoomMode を呼んでも何もしない', () => {
      controller.exitZoomMode();
      expect(toastController.showToast).not.toHaveBeenCalled();
    });
  });

  describe('モード中の操作', () => {
    it('ホイール奥で拡大、手前で縮小する', () => {
      enterZoom();
      controller.operateByKey('WheelUp');
      controller.operateByKey('WheelUp');
      expect(zoomModeController.getScalePercent()).toBe(140);
      controller.operateByKey('WheelDown');
      expect(zoomModeController.getScalePercent()).toBe(120);
      expect(manager.getCaret()).toBe(0);
    });

    it('左クリック・→ で次、右クリック・← で前のページへ表示枚数分移動する', () => {
      viewerController.incrementRows();
      viewerController.incrementCols();
      enterZoom();

      controller.operateByKey('LeftClick');
      expect(manager.getCaret()).toBe(4);
      controller.operateByKey('ArrowRight');
      expect(manager.getCaret()).toBe(8);
      controller.operateByKey('LeftClick');
      expect(manager.getCaret()).toBe(0);
      controller.operateByKey('RightClick');
      expect(manager.getCaret()).toBe(8);
      controller.operateByKey('ArrowLeft');
      expect(manager.getCaret()).toBe(4);
    });

    it('開始時の組の区切りを維持してページ送りする', () => {
      viewerController.incrementCols();
      manager.gotoNext(); // 2 枚目から開始: 1, 2-3, 4-5, ...
      enterZoom();

      controller.operateByKey('LeftClick');
      expect(manager.getCaret()).toBe(3);
      controller.operateByKey('RightClick');
      controller.operateByKey('RightClick');
      expect(manager.getCaret()).toBe(0);
    });

    it('ページ遷移時に拡縮・移動をリセットする', () => {
      enterZoom();
      controller.operateByKey('WheelUp');
      zoomModeController.move(10, 10);
      controller.operateByKey('LeftClick');
      expect(zoomModeController.getScalePercent()).toBe(100);
      expect(zoomModeController.getOffsetX()).toBe(0);
    });

    it('ブックマークの切り替えではリセットしない', () => {
      enterZoom();
      controller.operateByKey('WheelUp');
      controller.downModifierKey('shift');
      controller.operateByKey('b');
      controller.upModifierKey('shift');
      expect(manager.getCurrent().isBookmarked()).toBe(true);
      expect(zoomModeController.getScalePercent()).toBe(120);
    });

    it('ジャンプ先は組の先頭に揃え、現在の組のブックマークは飛ばす', () => {
      viewerController.incrementCols();
      manager.getList()[1].bookmark();
      manager.getList()[6].bookmark();
      enterZoom();

      controller.operateByKey('b');
      expect(manager.getCaret()).toBe(6);
      controller.operateByKey('b');
      expect(manager.getCaret()).toBe(0);
    });

    it('ランダムジャンプは現在と異なる組の先頭へ移動する', () => {
      viewerController.incrementCols();
      enterZoom();
      for (let i = 0; i < 20; i++) {
        const before = manager.getCaret();
        controller.operateByKey('q');
        expect(manager.getCaret()).not.toBe(before);
        expect(manager.getCaret() % 2).toBe(0);
      }
    });

    it('履歴の移動先も組の先頭に揃える', () => {
      viewerController.incrementCols();
      enterZoom();
      vi.spyOn(Math, 'random').mockReturnValue(0.5); // 4 or 5 枚目 -> 組の先頭 4
      controller.operateByKey('q');
      vi.restoreAllMocks();
      expect(manager.getCaret()).toBe(4);

      controller.operateByKey('h');
      expect(manager.getCaret()).toBe(0);
      controller.downModifierKey('shift');
      controller.operateByKey('h');
      expect(manager.getCaret()).toBe(4);
    });

    it('終了後はジャンプ先を揃えない', () => {
      viewerController.incrementCols();
      manager.getList()[3].bookmark();
      enterZoom();
      controller.exitZoomMode();

      controller.operateByKey('b');
      expect(manager.getCaret()).toBe(3);
    });

    it.each(['r', 'l', 'f', 'Delete', 'x', 'i'])('%s キーの操作は無効になる', key => {
      enterZoom();
      const rows = viewerController.getRows();
      const cols = viewerController.getCols();
      controller.operateByKey(key);
      expect(viewerController.getRows()).toBe(rows);
      expect(viewerController.getCols()).toBe(cols);
      expect(viewerController.isFlipped()).toBe(false);
      expect(manager.getCaret()).toBe(0);
      expect(manager.isImageInfoDisplayed()).toBe(false);
    });

    it('編集モードへは遷移しない', () => {
      enterZoom();
      controller.downModifierKey('ctrl');
      controller.downModifierKey('shift');
      controller.operateByKey('e');
      expect(editModeController.isInEditMode()).toBe(false);
    });
  });
});
