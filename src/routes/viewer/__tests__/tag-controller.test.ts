import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TagController } from '../tag-controller.svelte';
import { ToastController } from '../toast-controller.svelte';
import * as tagsApi from '@/lib/api/tags';

// API関数をモック
vi.mock('@/lib/api/tags', () => ({
  loadTagsInDir: vi.fn(),
  saveTags: vi.fn(),
}));

describe('TagController', () => {
  let tagController: TagController;
  let mockToastController: ToastController;

  beforeEach(() => {
    // ToastControllerをモック
    mockToastController = {
      showToast: vi.fn(),
      isShow: vi.fn().mockReturnValue(false),
      getMessage: vi.fn().mockReturnValue(''),
    } as unknown as ToastController;

    tagController = new TagController(mockToastController);

    // モックをリセット
    vi.clearAllMocks();
  });

  describe('getImageTags', () => {
    it('should load tags for new directory and return image tags', async () => {
      // Arrange
      const imagePath = 'D:\\images\\test\\photo.jpg';
      const expectedDirPath = 'D:\\images\\test\\';
      const mockTagsMap = {
        'photo.jpg': ['nature', 'landscape'],
        'other.jpg': ['portrait'],
      };

      vi.mocked(tagsApi.loadTagsInDir).mockResolvedValue(mockTagsMap);

      // Act
      const result = await tagController.getImageTags(imagePath);

      // Assert
      expect(tagsApi.loadTagsInDir).toHaveBeenCalledWith(expectedDirPath);
      expect(result).toEqual(['nature', 'landscape']);
    });

    it('should return empty array for image without tags', async () => {
      // Arrange
      const imagePath = 'D:\\images\\test\\new-photo.jpg';
      const mockTagsMap = {
        'other.jpg': ['portrait'],
      };

      vi.mocked(tagsApi.loadTagsInDir).mockResolvedValue(mockTagsMap);

      // Act
      const result = await tagController.getImageTags(imagePath);

      // Assert
      expect(result).toEqual([]);
    });

    it('should use cache for same directory', async () => {
      // Arrange
      const imagePath1 = 'D:\\images\\test\\photo1.jpg';
      const imagePath2 = 'D:\\images\\test\\photo2.jpg';
      const mockTagsMap = {
        'photo1.jpg': ['tag1'],
        'photo2.jpg': ['tag2'],
      };

      vi.mocked(tagsApi.loadTagsInDir).mockResolvedValue(mockTagsMap);

      // Act
      await tagController.getImageTags(imagePath1);
      await tagController.getImageTags(imagePath2);

      // Assert
      expect(tagsApi.loadTagsInDir).toHaveBeenCalledTimes(1);
    });

    it('should handle API error gracefully', async () => {
      // Arrange
      const imagePath = 'D:\\images\\test\\photo.jpg';
      const errorMessage = 'Directory not found';

      vi.mocked(tagsApi.loadTagsInDir).mockRejectedValue(new Error(errorMessage));

      // Act
      const result = await tagController.getImageTags(imagePath);

      // Assert
      expect(result).toEqual([]);
      expect(mockToastController.showToast).toHaveBeenCalledWith('タグの読み込みに失敗しました');
    });
  });

  describe('saveImageTags', () => {
    it('should save tags and update cache', async () => {
      // Arrange
      const imagePath = 'D:\\images\\test\\photo.jpg';
      const tags = ['nature', 'sunset'];

      vi.mocked(tagsApi.saveTags).mockResolvedValue();

      // 先にキャッシュを作成
      vi.mocked(tagsApi.loadTagsInDir).mockResolvedValue({ 'photo.jpg': ['old'] });
      await tagController.getImageTags(imagePath);

      // Act
      await tagController.saveImageTags(imagePath, tags);

      // Assert
      expect(tagsApi.saveTags).toHaveBeenCalledWith(imagePath, tags);
      expect(mockToastController.showToast).toHaveBeenCalledWith('タグを保存しました');

      // キャッシュが更新されているか確認
      const updatedTags = await tagController.getImageTags(imagePath);
      expect(updatedTags).toEqual(tags);
    });

    it('should handle save error and show toast', async () => {
      // Arrange
      const imagePath = 'D:\\images\\test\\photo.jpg';
      const tags = ['nature'];
      const errorMessage = 'Permission denied';

      vi.mocked(tagsApi.saveTags).mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(tagController.saveImageTags(imagePath, tags)).rejects.toThrow();
      expect(mockToastController.showToast).toHaveBeenCalledWith('タグの保存に失敗しました');
    });
  });

  describe('path processing', () => {
    it('should correctly extract directory path and filename (Windows)', async () => {
      // Arrange
      const imagePath = 'D:\\images\\test\\photo.jpg';
      const mockTagsMap = { 'photo.jpg': ['test'] };

      vi.mocked(tagsApi.loadTagsInDir).mockResolvedValue(mockTagsMap);

      // Act
      await tagController.getImageTags(imagePath);

      // Assert
      expect(tagsApi.loadTagsInDir).toHaveBeenCalledWith('D:\\images\\test\\');
    });

    it('should correctly extract directory path and filename (Unix)', async () => {
      // Arrange
      const imagePath = '/home/user/images/photo.jpg';
      const mockTagsMap = { 'photo.jpg': ['test'] };

      vi.mocked(tagsApi.loadTagsInDir).mockResolvedValue(mockTagsMap);

      // Act
      await tagController.getImageTags(imagePath);

      // Assert
      expect(tagsApi.loadTagsInDir).toHaveBeenCalledWith('/home/user/images/');
    });
  });

  describe('cache management', () => {
    it('should clear specific directory cache', async () => {
      // Arrange
      const imagePath = 'D:\\images\\test\\photo.jpg';
      const mockTagsMap = { 'photo.jpg': ['test'] };

      vi.mocked(tagsApi.loadTagsInDir).mockResolvedValue(mockTagsMap);

      // キャッシュを作成
      await tagController.getImageTags(imagePath);
      expect(tagsApi.loadTagsInDir).toHaveBeenCalledTimes(1);

      // キャッシュをクリア
      const actualDirPath = 'D:\\images\\test\\';
      tagController.clearCache(actualDirPath);

      // Act - 再度呼び出し
      await tagController.getImageTags(imagePath);

      // Assert - APIが再度呼ばれる
      expect(tagsApi.loadTagsInDir).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache', async () => {
      // Arrange
      const imagePath1 = 'D:\\images\\test1\\photo.jpg';
      const imagePath2 = 'D:\\images\\test2\\photo.jpg';

      vi.mocked(tagsApi.loadTagsInDir).mockResolvedValue({ 'photo.jpg': ['test'] });

      // 複数のディレクトリでキャッシュを作成
      await tagController.getImageTags(imagePath1);
      await tagController.getImageTags(imagePath2);
      expect(tagsApi.loadTagsInDir).toHaveBeenCalledTimes(2);

      // 全キャッシュをクリア
      tagController.clearAllCache();

      // Act - 再度呼び出し
      await tagController.getImageTags(imagePath1);
      await tagController.getImageTags(imagePath2);

      // Assert - APIが再度呼ばれる
      expect(tagsApi.loadTagsInDir).toHaveBeenCalledTimes(4);
    });
  });

  describe('loadTagsInDir', () => {
    it('should load and cache tags for directory', async () => {
      // Arrange
      const dirPath = '/test/directory/';
      const mockTagsMap = {
        'image1.jpg': ['nature', 'landscape'],
        'image2.png': ['portrait', 'people'],
      };

      vi.mocked(tagsApi.loadTagsInDir).mockResolvedValue(mockTagsMap);

      // Act
      const result = await tagController.loadTagsInDir(dirPath);

      // Assert
      expect(result).toEqual(mockTagsMap);
      expect(tagsApi.loadTagsInDir).toHaveBeenCalledWith(dirPath);
      expect(tagsApi.loadTagsInDir).toHaveBeenCalledTimes(1);
    });

    it('should return cached data on subsequent calls', async () => {
      // Arrange
      const dirPath = '/test/directory/';
      const mockTagsMap = {
        'image1.jpg': ['nature', 'landscape'],
      };

      vi.mocked(tagsApi.loadTagsInDir).mockResolvedValue(mockTagsMap);

      // Act - 最初の呼び出し
      await tagController.loadTagsInDir(dirPath);
      // Act - 2回目の呼び出し
      const result = await tagController.loadTagsInDir(dirPath);

      // Assert
      expect(result).toEqual(mockTagsMap);
      expect(tagsApi.loadTagsInDir).toHaveBeenCalledTimes(1); // キャッシュから取得
    });

    it('should handle different directories separately', async () => {
      // Arrange
      const dirPath1 = '/test/directory1/';
      const dirPath2 = '/test/directory2/';
      const mockTagsMap1 = { 'image1.jpg': ['nature'] };
      const mockTagsMap2 = { 'image2.jpg': ['portrait'] };

      vi.mocked(tagsApi.loadTagsInDir)
        .mockResolvedValueOnce(mockTagsMap1)
        .mockResolvedValueOnce(mockTagsMap2);

      // Act
      const result1 = await tagController.loadTagsInDir(dirPath1);
      const result2 = await tagController.loadTagsInDir(dirPath2);

      // Assert
      expect(result1).toEqual(mockTagsMap1);
      expect(result2).toEqual(mockTagsMap2);
      expect(tagsApi.loadTagsInDir).toHaveBeenCalledTimes(2);
      expect(tagsApi.loadTagsInDir).toHaveBeenNthCalledWith(1, dirPath1);
      expect(tagsApi.loadTagsInDir).toHaveBeenNthCalledWith(2, dirPath2);
    });

    it('should handle API error gracefully', async () => {
      // Arrange
      const dirPath = '/test/directory/';
      const errorMessage = 'Directory not found';

      vi.mocked(tagsApi.loadTagsInDir).mockRejectedValue(new Error(errorMessage));
      const showToastSpy = vi.spyOn(mockToastController, 'showToast');

      // Act
      const result = await tagController.loadTagsInDir(dirPath);

      // Assert
      expect(result).toEqual({});
      expect(showToastSpy).toHaveBeenCalledWith('ディレクトリのタグ読み込みに失敗しました');
    });

    it('should handle empty directory results', async () => {
      // Arrange
      const dirPath = '/empty/directory/';
      const emptyTagsMap = {};

      vi.mocked(tagsApi.loadTagsInDir).mockResolvedValue(emptyTagsMap);

      // Act
      const result = await tagController.loadTagsInDir(dirPath);

      // Assert
      expect(result).toEqual({});
      expect(tagsApi.loadTagsInDir).toHaveBeenCalledWith(dirPath);
    });

    it('should integrate with cache clearing methods', async () => {
      // Arrange
      const dirPath = '/test/directory/';
      const mockTagsMap = { 'image1.jpg': ['nature'] };

      vi.mocked(tagsApi.loadTagsInDir).mockResolvedValue(mockTagsMap);

      // Act - 初回読み込み
      await tagController.loadTagsInDir(dirPath);
      expect(tagsApi.loadTagsInDir).toHaveBeenCalledTimes(1);

      // キャッシュをクリア
      tagController.clearCache(dirPath);

      // 再度読み込み
      await tagController.loadTagsInDir(dirPath);

      // Assert - APIが再度呼ばれる
      expect(tagsApi.loadTagsInDir).toHaveBeenCalledTimes(2);
    });

    it('should work with Windows paths', async () => {
      // Arrange
      const dirPath = 'C:\\Users\\test\\images\\';
      const mockTagsMap = { 'photo.jpg': ['vacation'] };

      vi.mocked(tagsApi.loadTagsInDir).mockResolvedValue(mockTagsMap);

      // Act
      const result = await tagController.loadTagsInDir(dirPath);

      // Assert
      expect(result).toEqual(mockTagsMap);
      expect(tagsApi.loadTagsInDir).toHaveBeenCalledWith(dirPath);
    });

    it('should maintain consistency with getImageTags cache', async () => {
      // Arrange
      const imagePath = '/test/directory/image1.jpg';
      const dirPath = '/test/directory/';
      const mockTagsMap = {
        'image1.jpg': ['nature', 'landscape'],
        'image2.jpg': ['portrait'],
      };

      vi.mocked(tagsApi.loadTagsInDir).mockResolvedValue(mockTagsMap);

      // Act - loadTagsInDirで先にキャッシュ
      await tagController.loadTagsInDir(dirPath);

      // getImageTagsを呼び出し（同じキャッシュを使用するはず）
      const imageTags = await tagController.getImageTags(imagePath);

      // Assert
      expect(imageTags).toEqual(['nature', 'landscape']);
      expect(tagsApi.loadTagsInDir).toHaveBeenCalledTimes(1); // キャッシュが共有されている
    });
  });
});
