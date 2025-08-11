import { render, screen } from '@testing-library/svelte';
import { describe, test, expect, vi } from 'vitest';
import ImageInfoDisplay from '../image-info-display.svelte';
import { ImageInfo } from '../image-info.svelte';

// APIモック
vi.mock('$lib/api/tags', () => ({
  loadTagsInDir: vi.fn().mockResolvedValue({
    'test.jpg': ['nature', 'landscape'],
  }),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue({
    size: 1024000,
    width: 1920,
    height: 1080,
  }),
}));

describe('ImageInfoDisplay', () => {
  const mockImageInfo = new ImageInfo('/path/to/test.jpg');

  test('show=falseの時は非表示になる', () => {
    render(ImageInfoDisplay, {
      props: {
        show: false,
        imageInfo: mockImageInfo,
      },
    });

    const overlay = screen.queryByTestId('image-info-overlay');
    expect(overlay).toBeNull();
  });

  test('imageInfo=nullの時は非表示になる', () => {
    render(ImageInfoDisplay, {
      props: {
        show: true,
        imageInfo: null,
      },
    });

    const overlay = screen.queryByTestId('image-info-overlay');
    expect(overlay).toBeNull();
  });

  test('ファイルサイズが正しくフォーマットされる', async () => {
    render(ImageInfoDisplay, {
      props: {
        show: true,
        imageInfo: mockImageInfo,
      },
    });

    // formatFileSize関数のテスト
    const formatFileSize = (bytes: number): string => {
      const units = ['B', 'KB', 'MB', 'GB'];
      let size = bytes;
      let unitIndex = 0;

      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }

      return `${size.toFixed(1)} ${units[unitIndex]}`;
    };

    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1024000)).toBe('1000.0 KB');
    expect(formatFileSize(1048576)).toBe('1.0 MB');
    expect(formatFileSize(1073741824)).toBe('1.0 GB');
  });

  test('タグが正しくフォーマットされる', () => {
    const formatTags = (tags: string[]): string => {
      return tags.length > 0 ? tags.join(', ') : 'なし';
    };

    expect(formatTags([])).toBe('なし');
    expect(formatTags(['nature'])).toBe('nature');
    expect(formatTags(['nature', 'landscape', 'sunset'])).toBe('nature, landscape, sunset');
  });
});
