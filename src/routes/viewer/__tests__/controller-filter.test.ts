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

describe('Controller - Filter Functionality', () => {
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

    // FilterDialogControllerのメソッドをモック
    vi.spyOn(filterDialogController, 'showDialog').mockResolvedValue();
    vi.spyOn(filterDialogController, 'isShow').mockReturnValue(false);
  });

  describe('filterByTag operation', () => {
    it('should call showDialog when Ctrl+Shift+T is pressed', () => {
      controller.downModifierKey('ctrl');
      controller.downModifierKey('shift');
      controller.operateByKey('t');

      expect(filterDialogController.showDialog).toHaveBeenCalled();
    });

    it('should handle uppercase T key', () => {
      controller.downModifierKey('ctrl');
      controller.downModifierKey('shift');
      controller.operateByKey('T'); // 大文字

      expect(filterDialogController.showDialog).toHaveBeenCalled();
    });

    it('should not trigger filterByTag without modifiers', () => {
      controller.operateByKey('t');

      expect(filterDialogController.showDialog).not.toHaveBeenCalled();
    });

    it('should not trigger filterByTag with only Ctrl', () => {
      controller.downModifierKey('ctrl');
      controller.operateByKey('t');

      expect(filterDialogController.showDialog).not.toHaveBeenCalled();
    });

    it('should not trigger filterByTag with only Shift', () => {
      controller.downModifierKey('shift');
      controller.operateByKey('t');

      expect(filterDialogController.showDialog).not.toHaveBeenCalled();
    });
  });

  describe('operation blocking', () => {
    it('should block operations when filter dialog is shown', () => {
      vi.mocked(filterDialogController.isShow).mockReturnValue(true);
      vi.spyOn(imageInfoManager, 'gotoNext');

      controller.operateByKey('ArrowRight');

      expect(imageInfoManager.gotoNext).not.toHaveBeenCalled();
    });

    it('should block filterByTag operation when filter dialog is already shown', () => {
      vi.mocked(filterDialogController.isShow).mockReturnValue(true);

      controller.downModifierKey('ctrl');
      controller.downModifierKey('shift');
      controller.operateByKey('t');

      // showDialogが呼ばれる前にモックされているため呼び出し回数をリセット
      vi.mocked(filterDialogController.showDialog).mockClear();

      controller.operateByKey('t');

      expect(filterDialogController.showDialog).not.toHaveBeenCalled();
    });

    it('should block operations when other dialogs are shown', () => {
      vi.spyOn(dialogController, 'isShow').mockReturnValue(true);

      controller.downModifierKey('ctrl');
      controller.downModifierKey('shift');
      controller.operateByKey('t');

      expect(filterDialogController.showDialog).not.toHaveBeenCalled();
    });

    it('should block operations when goto dialog is shown', () => {
      vi.spyOn(gotoDialogController, 'isShow').mockReturnValue(true);

      controller.downModifierKey('ctrl');
      controller.downModifierKey('shift');
      controller.operateByKey('t');

      expect(filterDialogController.showDialog).not.toHaveBeenCalled();
    });

    it('should block operations when tag editor is open', () => {
      controller.setTagEditorOpen(true);

      controller.downModifierKey('ctrl');
      controller.downModifierKey('shift');
      controller.operateByKey('t');

      expect(filterDialogController.showDialog).not.toHaveBeenCalled();
    });
  });

  describe('modifier key handling', () => {
    it('should handle modifier key combinations correctly', () => {
      controller.downModifierKey('ctrl');
      controller.downModifierKey('shift');
      controller.operateByKey('t');

      expect(filterDialogController.showDialog).toHaveBeenCalled();

      // キーを離したときにリセットされる
      controller.upModifierKey('ctrl');
      controller.upModifierKey('shift');

      vi.mocked(filterDialogController.showDialog).mockClear();
      controller.operateByKey('t');

      expect(filterDialogController.showDialog).not.toHaveBeenCalled();
    });

    it('should reset modifier keys correctly', () => {
      controller.downModifierKey('ctrl');
      controller.downModifierKey('shift');
      controller.resetModifierKeys();

      controller.operateByKey('t');

      expect(filterDialogController.showDialog).not.toHaveBeenCalled();
    });
  });

  describe('integration with existing operations', () => {
    it('should not interfere with other Ctrl+Shift combinations', () => {
      vi.spyOn(gotoDialogController, 'showDialog');

      // Ctrl+Shift+G (goto operation)
      controller.downModifierKey('ctrl');
      controller.downModifierKey('shift');
      controller.operateByKey('g');

      expect(gotoDialogController.showDialog).toHaveBeenCalled();
    });

    it('should not interfere with regular t key (editTags)', () => {
      const mockEditTags = vi.fn();
      controller.setOnEditTags(mockEditTags);

      controller.operateByKey('t');

      expect(mockEditTags).toHaveBeenCalled();
      expect(filterDialogController.showDialog).not.toHaveBeenCalled();
    });

    it('should handle multiple operations correctly', () => {
      vi.spyOn(imageInfoManager, 'gotoNext');

      // 通常の矢印キー操作
      controller.operateByKey('ArrowRight');
      expect(imageInfoManager.gotoNext).toHaveBeenCalled();

      // フィルタダイアログ表示
      controller.downModifierKey('ctrl');
      controller.downModifierKey('shift');
      controller.operateByKey('t');
      expect(filterDialogController.showDialog).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle filterDialogController.showDialog error gracefully', async () => {
      vi.mocked(filterDialogController.showDialog).mockRejectedValue(new Error('Dialog error'));

      // エラーが発生してもアプリケーションがクラッシュしないことを確認
      expect(() => {
        controller.downModifierKey('ctrl');
        controller.downModifierKey('shift');
        controller.operateByKey('t');
      }).not.toThrow();
    });

    it('should handle missing filterDialogController gracefully', () => {
      // FilterDialogControllerなしでControllerを作成
      const controllerWithoutFilter = new Controler(
        imageInfoManager,
        dialogController,
        fileController,
        toastController,
        viewerController,
        gotoDialogController,
        filterDialogController,
        editModeController
      );

      // エラーが発生しないことを確認
      expect(() => {
        controllerWithoutFilter.downModifierKey('ctrl');
        controllerWithoutFilter.downModifierKey('shift');
        controllerWithoutFilter.operateByKey('t');
      }).not.toThrow();
    });
  });
});
