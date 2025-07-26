import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FilterDialogController } from '../filter-dialog-controller.svelte';
import { ImageInfoManager } from '../image-info-manager.svelte';
import { TagController } from '../tag-controller.svelte';
import { ToastController } from '../toast-controller.svelte';

describe('FilterDialogController', () => {
  let controller: FilterDialogController;
  let imageInfoManager: ImageInfoManager;
  let tagController: TagController;
  let toastController: ToastController;

  beforeEach(() => {
    toastController = new ToastController();
    tagController = new TagController(toastController);
    imageInfoManager = new ImageInfoManager();
    imageInfoManager.setTagController(tagController);
    controller = new FilterDialogController(imageInfoManager);

    // ImageInfoManagerのメソッドをモック
    vi.spyOn(imageInfoManager, 'getAvailableTags').mockResolvedValue(['tag1', 'tag2', 'tag3']);
    vi.spyOn(imageInfoManager, 'applyTagFilter').mockResolvedValue();
  });

  describe('初期状態', () => {
    it('should start with dialog hidden', () => {
      expect(controller.isShow()).toBe(false);
    });

    it('should have empty available tags initially', () => {
      expect(controller.getAvailableTags()).toEqual([]);
    });

    it('should have no selected tags initially', () => {
      expect(controller.isTagSelected('any-tag')).toBe(false);
    });
  });

  describe('showDialog', () => {
    it('should show dialog and load available tags', async () => {
      await controller.showDialog();

      expect(controller.isShow()).toBe(true);
      expect(imageInfoManager.getAvailableTags).toHaveBeenCalled();
      expect(controller.getAvailableTags()).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should clear selected tags when showing dialog', async () => {
      // まずタグを選択
      await controller.showDialog();
      controller.toggleTag('tag1');
      expect(controller.isTagSelected('tag1')).toBe(true);

      // ダイアログを閉じて再度開く
      controller.hideDialog();
      await controller.showDialog();

      expect(controller.isTagSelected('tag1')).toBe(false);
    });
  });

  describe('hideDialog', () => {
    it('should hide dialog and clear selected tags', async () => {
      await controller.showDialog();
      controller.toggleTag('tag1');

      controller.hideDialog();

      expect(controller.isShow()).toBe(false);
      expect(controller.isTagSelected('tag1')).toBe(false);
    });
  });

  describe('toggleTag', () => {
    beforeEach(async () => {
      await controller.showDialog();
    });

    it('should select unselected tag', () => {
      controller.toggleTag('tag1');
      expect(controller.isTagSelected('tag1')).toBe(true);
    });

    it('should unselect selected tag', () => {
      controller.toggleTag('tag1');
      controller.toggleTag('tag1');
      expect(controller.isTagSelected('tag1')).toBe(false);
    });

    it('should handle multiple tag selections', () => {
      controller.toggleTag('tag1');
      controller.toggleTag('tag2');

      expect(controller.isTagSelected('tag1')).toBe(true);
      expect(controller.isTagSelected('tag2')).toBe(true);
      expect(controller.isTagSelected('tag3')).toBe(false);
    });
  });

  describe('executeFilter', () => {
    beforeEach(async () => {
      await controller.showDialog();
    });

    it('should apply filter with selected tags', async () => {
      controller.toggleTag('tag1');
      controller.toggleTag('tag2');

      await controller.executeFilter();

      expect(imageInfoManager.applyTagFilter).toHaveBeenCalledWith(['tag1', 'tag2']);
      expect(controller.isShow()).toBe(false);
    });

    it('should apply filter with empty array when no tags selected', async () => {
      await controller.executeFilter();

      expect(imageInfoManager.applyTagFilter).toHaveBeenCalledWith([]);
      expect(controller.isShow()).toBe(false);
    });

    it('should hide dialog after executing filter', async () => {
      controller.toggleTag('tag1');
      await controller.executeFilter();

      expect(controller.isShow()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle getAvailableTags error gracefully', async () => {
      vi.mocked(imageInfoManager.getAvailableTags).mockRejectedValue(new Error('API Error'));

      // エラーが発生した場合はPromiseがrejectされる
      await expect(controller.showDialog()).rejects.toThrow('API Error');
      // ダイアログは表示状態になる（show = trueが先に実行される）
      expect(controller.isShow()).toBe(true);
    });

    it('should handle applyTagFilter error gracefully', async () => {
      await controller.showDialog();
      controller.toggleTag('tag1');
      vi.mocked(imageInfoManager.applyTagFilter).mockRejectedValue(new Error('Filter Error'));

      await expect(controller.executeFilter()).rejects.toThrow('Filter Error');
      // エラーが発生してもダイアログは閉じられる（hideDialogが先に実行される）
      expect(controller.isShow()).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle non-existent tag toggle gracefully', async () => {
      await controller.showDialog();

      controller.toggleTag('non-existent-tag');
      expect(controller.isTagSelected('non-existent-tag')).toBe(true);
    });

    it('should handle empty available tags list', async () => {
      vi.mocked(imageInfoManager.getAvailableTags).mockResolvedValue([]);

      await controller.showDialog();
      expect(controller.getAvailableTags()).toEqual([]);
    });
  });
});
